import React from 'react';
import { formatCurrency, formatDate } from '../utils';

export default function TransactionsTable({ transactions }) {
  return (
    <div className="panel panel-large">
      <div className="panel-header">
        <h2>Transactions</h2>
      </div>
      <div className="table-wrap">
        <table className="tx-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>From</th>
              <th>To</th>
              <th>Category</th>
              <th>Tags</th>
              <th className="align-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => {
              let tags = [];
              try {
                tags = JSON.parse(tx.tags || '[]');
              } catch {
                tags = [];
              }
              const isExpense = tx.type === 'withdrawal';
              const isIncome = tx.type === 'deposit';
              return (
                <tr key={`${tx.id}-${tx.split_index}`}>
                  <td className="mono">{formatDate(tx.date)}</td>
                  <td>{tx.description}</td>
                  <td>{tx.source_name || '—'}</td>
                  <td>{tx.destination_name || '—'}</td>
                  <td>{tx.category_name || '—'}</td>
                  <td>
                    {tags.map((t) => (
                      <span className="tag-chip" key={t}>
                        {t}
                      </span>
                    ))}
                  </td>
                  <td
                    className={`mono align-right ${
                      isExpense ? 'stat-negative' : isIncome ? 'stat-positive' : ''
                    }`}
                  >
                    {isExpense ? '-' : isIncome ? '+' : ''}
                    {formatCurrency(tx.amount, tx.currency_code)}
                  </td>
                </tr>
              );
            })}
            {transactions.length === 0 && (
              <tr>
                <td colSpan={7} className="empty-state">
                  No transactions in this range.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
