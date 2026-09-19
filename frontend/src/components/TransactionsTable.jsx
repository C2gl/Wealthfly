import React from 'react';
import { categoryColor, formatCurrency } from '../utils';

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
              <th>Name</th>
              <th>Destination account</th>
              <th className="align-right">Amount</th>
              <th>Category</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => {
              const isExpense = tx.type === 'withdrawal';
              const isIncome = tx.type === 'deposit';
              return (
                <tr key={`${tx.id}-${tx.split_index}`}>
                  <td>{tx.description}</td>
                  <td>{tx.destination_name || '—'}</td>
                  <td
                    className={`mono align-right ${
                      isExpense ? 'stat-negative' : isIncome ? 'stat-positive' : ''
                    }`}
                  >
                    {isExpense ? '-' : isIncome ? '+' : ''}
                    {formatCurrency(tx.amount, tx.currency_code)}
                  </td>
                  <td><span className="category-chip" style={{ '--category-color': categoryColor(tx.category_name) }}>{tx.category_name || 'Uncategorized'}</span></td>
                </tr>
              );
            })}
            {transactions.length === 0 && (
              <tr>
                <td colSpan={4} className="empty-state">
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
