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

const ACCOUNT_BUCKETS = [
  { key: 'personal', label: 'Personal', color: '#356957' },
  { key: 'shared', label: 'Shared', color: '#8eaa9b' },
  { key: 'savings', label: 'Savings', color: '#c6a642' },
];

function accountBucket(account) {
  const name = String(account.name || '').toLowerCase();
  if (/saving/.test(name)) return 'savings';
  if (/joint|shared/.test(name)) return 'shared';
  return 'personal';
}

function arcPath(startAngle, endAngle) {
  const centerX = 120;
  const centerY = 112;
  const radius = 82;
  const point = (angle) => {
    const radians = (angle * Math.PI) / 180;
    return [centerX + radius * Math.cos(radians), centerY + radius * Math.sin(radians)];
  };
  const [startX, startY] = point(startAngle);
  const [endX, endY] = point(endAngle);
  return `M ${startX.toFixed(2)} ${startY.toFixed(2)} A ${radius} ${radius} 0 0 1 ${endX.toFixed(2)} ${endY.toFixed(2)}`;
}

function AccountBreakdownChart({ bucket }) {
  const [hoveredId, setHoveredId] = useState(null);
  const rows = bucket.accounts.map((account) => ({
    account,
    total: Math.max(0, Number(account.current_balance || 0)),
  }));
  const total = rows.reduce((sum, row) => sum + row.total, 0);
  const selected = rows.find((row) => row.account.id === hoveredId) || { account: { name: bucket.label }, total };
  let cursor = 180;

  return (
    <div className="account-breakdown">
      <div className="account-breakdown-heading"><div><span className="eyebrow">{bucket.label} accounts</span><h4>Balance weight</h4></div><span>{rows.length} accounts</span></div>
      <div className="account-weight-chart account-breakdown-chart">
        <svg viewBox="0 0 240 140" role="img" aria-label={`${bucket.label} account balance composition`}>
          {rows.map((row) => {
            const share = total ? row.total / total : 0;
            const start = cursor + 2;
            const end = cursor + Math.max(0, share * 180 - 4);
            cursor += share * 180;
            return share > 0 ? (
              <path
                key={row.account.id}
                d={arcPath(start, end)}
                className={hoveredId && hoveredId !== row.account.id ? 'account-weight-segment is-muted' : 'account-weight-segment'}
                style={{ stroke: categoryColor(row.account.name) }}
                onMouseEnter={() => setHoveredId(row.account.id)}
                onMouseLeave={() => setHoveredId(null)}
                onFocus={() => setHoveredId(row.account.id)}
                onBlur={() => setHoveredId(null)}
                tabIndex="0"
                aria-label={`${row.account.name}: ${formatCurrency(row.total)}, ${Math.round(share * 100)} percent`}
              />
            ) : null;
          })}
        </svg>
        <div className="account-weight-center"><strong>{formatCurrency(selected.total, selected.account.currency_code)}</strong><span>{selected.account.name}</span><small>{total ? `${((selected.total / total) * 100).toFixed(1)}%` : '0.0%'}</small></div>
      </div>
      <div className="account-weight-legend account-sublegend">
        {rows.map((row) => <button key={row.account.id} className={hoveredId === row.account.id ? 'is-active' : ''} onMouseEnter={() => setHoveredId(row.account.id)} onMouseLeave={() => setHoveredId(null)} onFocus={() => setHoveredId(row.account.id)} onBlur={() => setHoveredId(null)}><i style={{ backgroundColor: categoryColor(row.account.name) }} /><span>{row.account.name}<small>{total ? `${((row.total / total) * 100).toFixed(1)}% of ${bucket.label.toLowerCase()}` : '0.0%'}</small></span><strong>{formatCurrency(row.total, row.account.currency_code)}</strong></button>)}
      </div>
    </div>
  );
}

function AccountWeightChart({ accounts }) {
  const [hoveredKey, setHoveredKey] = useState(null);
  const [selectedKey, setSelectedKey] = useState(null);
  const buckets = ACCOUNT_BUCKETS.map((bucket) => ({
    ...bucket,
    accounts: accounts.filter((account) => accountBucket(account) === bucket.key),
  })).map((bucket) => ({
    ...bucket,
    total: bucket.accounts.reduce((sum, account) => sum + Math.max(0, Number(account.current_balance || 0)), 0),
  }));
  const total = buckets.reduce((sum, bucket) => sum + bucket.total, 0);
  const selected = buckets.find((bucket) => bucket.key === hoveredKey) || { label: 'Total', total, accounts: accounts.filter((account) => buckets.some((bucket) => bucket.accounts.includes(account))) };
  let cursor = 180;

  return (
    <section className="panel account-weight-panel">
      <div className="panel-heading-row">
        <div><span className="eyebrow">Balance composition</span><h3>Accounts</h3></div>
        <span>Personal · shared · savings</span>
      </div>
      <div className="account-weight-chart">
        <svg viewBox="0 0 240 140" role="img" aria-label="Account balance composition">
          {buckets.map((bucket) => {
            const share = total ? bucket.total / total : 0;
            const start = cursor + 2;
            const end = cursor + Math.max(0, share * 180 - 4);
            cursor += share * 180;
            return share > 0 ? (
              <path
                key={bucket.key}
                d={arcPath(start, end)}
                className={hoveredKey && hoveredKey !== bucket.key ? 'account-weight-segment is-muted' : 'account-weight-segment'}
                style={{ stroke: bucket.color }}
                onMouseEnter={() => setHoveredKey(bucket.key)}
                onMouseLeave={() => setHoveredKey(null)}
                onFocus={() => setHoveredKey(bucket.key)}
                onBlur={() => setHoveredKey(null)}
                tabIndex="0"
                aria-label={`${bucket.label}: ${formatCurrency(bucket.total)}, ${Math.round(share * 100)} percent`}
              />
            ) : null;
          })}
        </svg>
        <div className="account-weight-center"><strong>{formatCurrency(selected.total)}</strong><span>{selected.label}</span><small>{total ? `${((selected.total / total) * 100).toFixed(1)}%` : '0.0%'}</small></div>
      </div>
      <div className="account-weight-legend">
        {buckets.map((bucket) => <button key={bucket.key} className={`${hoveredKey === bucket.key ? 'is-active' : ''} ${selectedKey === bucket.key ? 'is-selected' : ''}`} onClick={() => setSelectedKey(selectedKey === bucket.key ? null : bucket.key)} onMouseEnter={() => setHoveredKey(bucket.key)} onMouseLeave={() => setHoveredKey(null)} onFocus={() => setHoveredKey(bucket.key)} onBlur={() => setHoveredKey(null)}><i style={{ backgroundColor: bucket.color }} /><span>{bucket.label}<small>{bucket.accounts.length} accounts · click to inspect</small></span><strong>{formatCurrency(bucket.total)}</strong></button>)}
      </div>
      {selectedKey && <AccountBreakdownChart bucket={buckets.find((bucket) => bucket.key === selectedKey)} />}
    </section>
  );
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
        const isExpense = tx.type === 'withdrawal' || (tx.type === 'transfer' && tx.source_name === account.name);
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
        <>
          <AccountWeightChart accounts={visibleAccounts.filter((account) => ['asset', 'cash'].includes(account.type))} />
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
        </>
      )}
    </div>
  );
}
