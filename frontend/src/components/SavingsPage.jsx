import React from 'react';
import { AccountWeightChart } from './AccountsPage.jsx';
import { categoryColor, formatCurrency, isSavingsAccount } from '../utils.js';

function sumByCurrency(accounts, getValue) {
  return accounts.reduce((totals, account) => {
    const currency = account.currency_code || '';
    totals[currency] = (totals[currency] || 0) + Number(getValue(account) || 0);
    return totals;
  }, {});
}

function CurrencyTotals({ totals, language }) {
  return Object.entries(totals).map(([currency, value]) => (
    <span key={currency || 'unknown'}>{formatCurrency(value, currency, language)}</span>
  ));
}

export default function SavingsPage({ accounts, accountFlows, rangeLabel, language }) {
  const savingsAccounts = accounts.filter((account) => isSavingsAccount(account));
  const flowByAccount = new Map(accountFlows.map((flow) => [flow.account, flow]));
  const balances = sumByCurrency(savingsAccounts, (account) => account.current_balance);
  const contributions = sumByCurrency(savingsAccounts, (account) => flowByAccount.get(account.name)?.income);
  const withdrawals = sumByCurrency(savingsAccounts, (account) => flowByAccount.get(account.name)?.spending);
  const netMovement = Object.keys({ ...contributions, ...withdrawals }).reduce((totals, currency) => {
    totals[currency] = (contributions[currency] || 0) - (withdrawals[currency] || 0);
    return totals;
  }, {});
  const transactionCount = savingsAccounts.reduce((sum, account) => sum + Number(flowByAccount.get(account.name)?.transaction_count || 0), 0);
  const maxFlow = Math.max(1, ...savingsAccounts.map((account) => {
    const flow = flowByAccount.get(account.name);
    return Math.max(Number(flow?.income || 0), Number(flow?.spending || 0));
  }));

  return (
    <div className="savings-page">
      <section className="accounts-intro">
        <div>
          <span className="eyebrow">Savings accounts</span>
          <h2>Build your buffer</h2>
          <p>Track balances, contributions, and withdrawals across your savings accounts.</p>
        </div>
        <div className="accounts-count"><strong>{savingsAccounts.length}</strong><span>accounts</span></div>
      </section>

      {savingsAccounts.length === 0 ? (
        <div className="panel empty-state">No savings accounts found. Name an account with “savings” or “epargne” to include it here.</div>
      ) : (
        <>
          <AccountWeightChart
            accounts={savingsAccounts}
            bucketDefinitions={savingsAccounts.reduce((buckets, account) => {
              buckets.push({ key: account.id, label: account.name, color: categoryColor(account.name, buckets.at(-1)?.color) });
              return buckets;
            }, [])}
            bucketForAccount={(account) => account.id}
            title="Savings accounts"
            eyebrow="Balance composition"
            description="Savings account weight"
          />
          <section className="savings-metrics">
            <div className="savings-metric panel"><span className="eyebrow">Total saved</span><strong><CurrencyTotals totals={balances} language={language} /></strong><small>Across your savings accounts</small></div>
            <div className="savings-metric panel"><span className="eyebrow">Added · {rangeLabel}</span><strong><CurrencyTotals totals={contributions} language={language} /></strong><small>Deposits and transfers in</small></div>
            <div className="savings-metric panel"><span className="eyebrow">Net movement</span><strong className={Object.values(netMovement).some((value) => value < 0) ? 'stat-negative' : 'stat-positive'}><CurrencyTotals totals={netMovement} language={language} /></strong><small>{transactionCount} account movements</small></div>
          </section>

          <section className="panel savings-accounts-panel">
            <div className="panel-heading-row"><div><span className="eyebrow">Account pulse</span><h2>Where your savings sit</h2></div><span>{rangeLabel}</span></div>
            <div className="savings-account-list">
              {savingsAccounts.map((account) => {
                const flow = flowByAccount.get(account.name) || {};
                const income = Number(flow.income || 0);
                const spending = Number(flow.spending || 0);
                return (
                  <article className="savings-account-row" key={account.id}>
                    <div className="savings-account-heading"><span className="account-icon">{(account.name || '?').slice(0, 1).toUpperCase()}</span><div><strong>{account.name}</strong><small>{account.active ? 'Active' : 'Inactive'} · {account.currency_code || 'No currency'}</small></div></div>
                    <strong className="savings-account-balance">{formatCurrency(account.current_balance, account.currency_code, language)}</strong>
                    <div className="savings-flow"><div className="account-flow-bars"><span className="account-flow-bar account-flow-income" style={{ width: `${(income / maxFlow) * 100}%` }} /><span className="account-flow-bar account-flow-spending" style={{ width: `${(spending / maxFlow) * 100}%` }} /></div><span className="account-flow-values"><span className="stat-positive">+{formatCurrency(income, account.currency_code, language)}</span><span className="stat-negative">-{formatCurrency(spending, account.currency_code, language)}</span></span></div>
                  </article>
                );
              })}
            </div>
            <div className="savings-legend"><span><i className="savings-legend-income" />Money in</span><span><i className="savings-legend-spending" />Money out</span></div>
          </section>
        </>
      )}
    </div>
  );
}
