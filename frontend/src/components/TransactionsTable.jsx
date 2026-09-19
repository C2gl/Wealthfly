import React from 'react';
import { categoryColor, formatCurrency, formatDate } from '../utils';

export default function TransactionsTable({ transactions }) {
  return (
    <section className="transactions-page">
      <div className="transactions-heading">
        <div><span className="eyebrow">Selected period</span><h2>Transactions</h2></div>
        <span className="transaction-count">{transactions.length} records</span>
      </div>
      <div className="transaction-list">
        {transactions.map((tx) => {
              const isExpense = tx.type === 'withdrawal';
              const isIncome = tx.type === 'deposit';
              const name = tx.description || tx.name || 'Unnamed transaction';
              const destination = tx.destination_name || tx.destination || tx.source_name || '—';
              const category = tx.category_name || tx.category || 'Uncategorized';
              return (
                <article className="transaction-card" key={`${tx.id}-${tx.split_index}`}>
                  <div className="transaction-date">{formatDate(tx.date)}</div>
                  <div className="transaction-main"><strong>{name}</strong><span>{destination}</span></div>
                  <span className="category-chip" style={{ '--category-color': categoryColor(category) }}>{category}</span>
                  <strong className={`transaction-amount mono ${isExpense ? 'stat-negative' : isIncome ? 'stat-positive' : ''}`}>
                    {isExpense ? '-' : isIncome ? '+' : ''}
                    {formatCurrency(Number(tx.amount || 0), tx.currency_code)}
                  </strong>
                </article>
              );
            })}
        {transactions.length === 0 && <div className="empty-state">No transactions in this range.</div>}
      </div>
    </section>
  );
}
