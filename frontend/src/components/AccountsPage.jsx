import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { categoryColor, formatCurrency, formatDate } from '../utils';

const TYPE_ORDER = ['asset', 'cash', 'liability', 'loan', 'debt', 'mortgage'];
const VISIBLE_TYPES = new Set(['asset', 'cash', 'liability', 'liabilities', 'loan', 'debt', 'mortgage']);
const TYPE_LABELS = {
  asset: 'Asset accounts',
  cash: 'Cash accounts',
  liability: 'Liability accounts',
  loan: 'Loan accounts',
  debt: 'Debt accounts',
  mortgage: 'Mortgage accounts',
};

function totalsByCurrency(accounts) {
  return accounts.reduce((totals, account) => {
    const currency = account.currency_code || '';
    totals[currency] = (totals[currency] || 0) + Number(account.current_balance || 0);
    return totals;
  }, {});
}

function formatTotals(accounts) {
  return Object.entries(totalsByCurrency(accounts)).map(([currency, total]) => (
    <span key={currency || 'unknown'}>{formatCurrency(total, currency)}</span>
  ));
}

function AccountTransactions({ account, range }) {
  const [transactions, setTransactions] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.transactions({ ...range, account: account.name, limit: 1000 })
      .then(setTransactions)
      .catch((requestError) => setError(requestError.message));
  }, [account.name, range.start, range.end]);

  if (error) return <div className="account-transactions-empty">Could not load transactions.</div>;
  if (transactions === null) return <div className="account-transactions-empty">Loading transactions...</div>;
  if (transactions.length === 0) return <div className="account-transactions-empty">No transactions in this period.</div>;

  return (
    <div className="account-transactions">
      {transactions.map((tx) => {
        const isExpense = tx.type === 'withdrawal';
        const category = tx.category_name || 'Uncategorized';
        return (
          <div className="account-transaction" key={`${tx.id}-${tx.split_index}`}>
            <span className="account-transaction-date">{formatDate(tx.date)}</span>
            <div className="account-transaction-main">
              <strong>{tx.description || tx.name || 'Unnamed transaction'}</strong>
              <span>{tx.destination_name || tx.source_name || '—'}</span>
            </div>
            <span className="category-chip" style={{ '--category-color': categoryColor(category) }}>{category}</span>
            <strong className={`account-transaction-amount ${isExpense ? 'stat-negative' : 'stat-positive'}`}>
              {isExpense ? '-' : '+'}{formatCurrency(tx.amount, tx.currency_code)}
            </strong>
          </div>
        );
      })}
    </div>
  );
}

export default function AccountsPage({ accounts, accountFlows, range, rangeLabel }) {
  const [expandedId, setExpandedId] = useState(null);
  const visibleAccounts = accounts.filter((account) => VISIBLE_TYPES.has(account.type));
  const flowByAccount = new Map(accountFlows.map((flow) => [flow.account, flow]));
  const maxFlow = Math.max(1, ...accountFlows.flatMap((flow) => [Number(flow.income || 0), Number(flow.spending || 0)]));
  const grouped = visibleAccounts.reduce((groups, account) => {
    const type = account.type || 'other';
    if (!groups[type]) groups[type] = [];
    groups[type].push(account);
    return groups;
  }, {});
  const types = [...new Set([...TYPE_ORDER, ...Object.keys(grouped)])].filter((type) => grouped[type]?.length);

  return (
    <div className="accounts-page">
      <section className="accounts-intro">
        <div>
          <span className="eyebrow">Firefly III accounts</span>
          <h2>All accounts</h2>
          <p>Balances grouped by account type. Flow bars and activity show {rangeLabel}.</p>
        </div>
        <div className="accounts-count"><strong>{visibleAccounts.length}</strong><span>accounts</span></div>
      </section>

      {types.length === 0 ? (
        <div className="panel empty-state">No accounts available. Run a sync to import your Firefly accounts.</div>
      ) : (
        <div className="account-groups">
          {types.map((type) => {
            const typeAccounts = grouped[type];
            return (
              <section className="account-group panel" key={type}>
                <div className="account-group-header">
                  <div>
                    <span className="eyebrow">{type}</span>
                    <h3>{TYPE_LABELS[type] || `${type} accounts`}</h3>
                  </div>
                  <div className="account-group-total">{formatTotals(typeAccounts)}</div>
                </div>
                <div className="account-list">
                  {typeAccounts.map((account) => (
                    <div className={`account-row-wrap ${expandedId === account.id ? 'account-row-wrap-expanded' : ''}`} key={account.id}>
                      <button className="account-row" onClick={() => setExpandedId(expandedId === account.id ? null : account.id)} aria-expanded={expandedId === account.id}>
                        <div className="account-identity">
                          <span className="account-icon">{(account.name || '?').slice(0, 1).toUpperCase()}</span>
                          <div><strong>{account.name}</strong><span>{account.active ? 'Active' : 'Inactive'} · {account.currency_code || 'No currency'}</span></div>
                        </div>
                        <div className="account-flow-summary">
                          <div className="account-flow-bars" aria-label={`${account.name} spending and income for ${rangeLabel}`}>
                            <span className="account-flow-bar account-flow-spending" style={{ width: `${(Number(flowByAccount.get(account.name)?.spending || 0) / maxFlow) * 100}%` }} />
                            <span className="account-flow-bar account-flow-income" style={{ width: `${(Number(flowByAccount.get(account.name)?.income || 0) / maxFlow) * 100}%` }} />
                          </div>
                          <span className="account-flow-values"><span className="stat-negative">-{formatCurrency(flowByAccount.get(account.name)?.spending, account.currency_code)}</span><span className="stat-positive">+{formatCurrency(flowByAccount.get(account.name)?.income, account.currency_code)}</span></span>
                        </div>
                        <strong className={Number(account.current_balance) < 0 ? 'stat-negative' : ''}>
                          {formatCurrency(account.current_balance, account.currency_code)}
                        </strong>
                        <span className="account-expand-icon" aria-hidden="true">{expandedId === account.id ? '−' : '+'}</span>
                      </button>
                      {expandedId === account.id && <div className="account-detail"><div className="account-detail-heading"><span className="eyebrow">{rangeLabel} activity</span><span>{flowByAccount.get(account.name)?.transaction_count || 0} records</span></div><AccountTransactions account={account} range={range} /></div>}
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
