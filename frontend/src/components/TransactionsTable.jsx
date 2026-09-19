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
              const name = tx.description || tx.name || 'Unnamed transaction';
              const destination = tx.destination_name || tx.destination || tx.source_name || '—';
              const category = tx.category_name || tx.category || 'Uncategorized';
              return (
                <tr key={`${tx.id}-${tx.split_index}`}>
                  <td className="transaction-name">{name}</td>
                  <td>{destination}</td>
                  <td
                    className={`mono align-right ${
                      isExpense ? 'stat-negative' : isIncome ? 'stat-positive' : ''
                    }`}
                  >
                    {isExpense ? '-' : isIncome ? '+' : ''}
                    {formatCurrency(Number(tx.amount || 0), tx.currency_code)}
                  </td>
                  <td><span className="category-chip" style={{ '--category-color': categoryColor(category) }}>{category}</span></td>
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
