import React from 'react';
import { categoryColor, formatCurrency, formatDate, transactionAmountMeta } from '../utils';

export default function CategoryInsightsPanel({ rows, category, transactions, onClose }) {
  const selectedRow = rows.find((row) => row.category === category);
  const categoryTransactions = transactions.filter((transaction) => (transaction.category_name || 'Uncategorized') === category);
  const accountRows = Array.from(categoryTransactions.reduce((accounts, transaction) => {
    const account = transaction.source_name || 'Unknown account';
    const current = accounts.get(account) || { account, total: 0, count: 0 };
    current.total += Math.abs(Number(transaction.amount || 0));
    current.count += 1;
    accounts.set(account, current);
    return accounts;
  }, new Map()).values()).sort((a, b) => b.total - a.total);
  const total = Number(selectedRow?.total || categoryTransactions.reduce((sum, row) => sum + Math.abs(Number(row.amount || 0)), 0));

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside className="insights-drawer" onClick={(event) => event.stopPropagation()}>
        <div className="drawer-header">
          <div>
            <span className="eyebrow">Category insights</span>
            <h2>{category}</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close category insights">×</button>
        </div>
        <p className="drawer-intro">Transactions and source accounts for this category in the selected period.</p>
        <div className="drawer-total"><span>{categoryTransactions.length} {categoryTransactions.length === 1 ? 'transaction' : 'transactions'}</span><strong>{formatCurrency(total)}</strong></div>
        <section className="drawer-section">
          <div className="drawer-section-heading"><span className="eyebrow">Source accounts</span><span>share of category</span></div>
          <div className="source-account-list">
            {accountRows.map((row) => {
              const share = total ? (row.total / total) * 100 : 0;
              return (
                <div className="source-account-row" key={row.account}>
                  <div className="source-account-label"><span><i style={{ backgroundColor: categoryColor(row.account) }} />{row.account}</span><strong>{share.toFixed(1)}%</strong></div>
                  <div className="source-account-track"><span style={{ width: `${share}%`, backgroundColor: categoryColor(row.account) }} /></div>
                  <small>{formatCurrency(row.total)} · {row.count} {row.count === 1 ? 'transaction' : 'transactions'}</small>
                </div>
              );
            })}
            {!accountRows.length && <p className="empty-state">No source account data for this category.</p>}
          </div>
        </section>
        <section className="drawer-section">
          <div className="drawer-section-heading"><span className="eyebrow">Transactions</span><span>{categoryTransactions.length} records</span></div>
          <div className="category-transaction-list">
            {categoryTransactions.map((transaction) => {
              const meta = transactionAmountMeta(transaction);
              return (
                <article className="category-transaction-row" key={`${transaction.id}-${transaction.split_index}`}>
                  <div><span>{formatDate(transaction.date)}</span><strong>{transaction.description || 'Unnamed transaction'}</strong><small>{transaction.source_name || 'Unknown account'}</small></div>
                  <strong className={meta.tone}>{meta.display}</strong>
                </article>
              );
            })}
            {!categoryTransactions.length && <p className="empty-state">No transactions in this category.</p>}
          </div>
        </section>
      </aside>
    </div>
  );
}
