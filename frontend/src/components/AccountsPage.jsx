import React from 'react';
import { formatCurrency } from '../utils';

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

export default function AccountsPage({ accounts }) {
  const visibleAccounts = accounts.filter((account) => VISIBLE_TYPES.has(account.type));
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
          <p>Balances grouped by account type, as reported by Firefly III.</p>
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
                    <div className="account-row" key={account.id}>
                      <div className="account-identity">
                        <span className="account-icon">{(account.name || '?').slice(0, 1).toUpperCase()}</span>
                        <div><strong>{account.name}</strong><span>{account.active ? 'Active' : 'Inactive'} · {account.currency_code || 'No currency'}</span></div>
                      </div>
                      <strong className={Number(account.current_balance) < 0 ? 'stat-negative' : ''}>
                        {formatCurrency(account.current_balance, account.currency_code)}
                      </strong>
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
