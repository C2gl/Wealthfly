import React from 'react';
import { categoryColor, formatCurrency, formatDate, transactionAmountMeta } from '../utils';

function arcPath(startAngle, endAngle) {
  const centerX = 95;
  const centerY = 95;
  const radius = 76;
  const point = (angle) => {
    const radians = (angle * Math.PI) / 180;
    return [centerX + radius * Math.cos(radians), centerY + radius * Math.sin(radians)];
  };
  const [startX, startY] = point(startAngle);
  const [endX, endY] = point(endAngle);
  return `M ${startX.toFixed(2)} ${startY.toFixed(2)} A ${radius} ${radius} 0 0 1 ${endX.toFixed(2)} ${endY.toFixed(2)}`;
}

function arcSegments(rows, total) {
  const visible = rows.filter((row) => row.total > 0);
  if (!visible.length) return [];

  let cursor = 0;
  return visible.map((row) => {
    const share = total ? row.total / total : 0;
    const span = 360 * share;
    const start = cursor;
    const end = cursor + span;
    cursor = end;
    return { ...row, start, end, share };
  });
}

export default function TransactionsTable({ transactions }) {
  const totals = {
    withdrawal: transactions.filter((tx) => tx.type === 'withdrawal').reduce((sum, tx) => sum + Math.abs(Number(tx.amount || 0)), 0),
    deposit: transactions.filter((tx) => tx.type === 'deposit').reduce((sum, tx) => sum + Math.abs(Number(tx.amount || 0)), 0),
    transfer: transactions.filter((tx) => tx.type === 'transfer').reduce((sum, tx) => sum + Math.abs(Number(tx.amount || 0)), 0),
  };

  const distribution = [
    { key: 'withdrawal', label: 'Expenses', color: '#c56c5a', total: totals.withdrawal },
    { key: 'deposit', label: 'Income', color: '#356957', total: totals.deposit },
    { key: 'transfer', label: 'Transfers', color: '#5ca96d', total: totals.transfer },
  ].filter((row) => row.total > 0);

  const total = distribution.reduce((sum, row) => sum + row.total, 0);
  const segments = arcSegments(distribution, total);

  return (
    <section className="transactions-page">
      <div className="transactions-heading">
        <div><span className="eyebrow">Selected period</span><h2>Transactions</h2></div>
        <span className="transaction-count">{transactions.length} records</span>
      </div>

      {distribution.length > 0 && (
        <div className="transaction-distribution-panel panel">
          <div className="transaction-distribution-header">
            <div>
              <span className="eyebrow">Flow mix</span>
              <h3>Deposits · expenses · transfers</h3>
            </div>
          </div>
          <div className="transaction-distribution-wrap">
            <svg viewBox="0 0 190 190" className="transaction-distribution-chart" role="img" aria-label="Transaction distribution by type">
              {segments.map((segment) => (
                <path
                  key={segment.key}
                  d={arcPath(segment.start - 90, segment.end - 90)}
                  fill="none"
                  stroke={segment.color}
                  strokeWidth="28"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}
              <circle cx="95" cy="95" r="48" fill="rgba(251, 250, 241, 0.9)" />
              <text x="95" y="90" textAnchor="middle" className="transaction-distribution-total-label">{formatCurrency(total)}</text>
              <text x="95" y="112" textAnchor="middle" className="transaction-distribution-total-sub">total</text>
            </svg>
            <div className="transaction-distribution-legend">
              {distribution.map((row) => (
                <div key={row.key} className="transaction-distribution-item">
                  <span className="legend-swatch" style={{ backgroundColor: row.color }} />
                  <div>
                    <strong>{row.label}</strong>
                    <small>{row.total ? `${((row.total / total) * 100).toFixed(1)}%` : '0.0%'}</small>
                  </div>
                  <b>{formatCurrency(row.total)}</b>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="transaction-list">
        {transactions.map((tx) => {
              const meta = transactionAmountMeta(tx);
              const name = tx.description || tx.name || 'Unnamed transaction';
              const destination = tx.destination_name || tx.destination || tx.source_name || '—';
              const category = tx.category_name || tx.category || 'Uncategorized';
              const isTransfer = tx.type === 'transfer';
              return (
                <article className="transaction-card" key={`${tx.id}-${tx.split_index}`}>
                  <div className="transaction-date">{formatDate(tx.date)}</div>
                  <div className="transaction-main"><strong>{name}</strong><span>{destination}</span></div>
                  <div className="transaction-meta-cell">
                    <span className="category-chip" style={{ '--category-color': categoryColor(category) }}>{category}</span>
                    {isTransfer && <span className="transfer-badge">Transfer</span>}
                  </div>
                  <strong className={`transaction-amount mono ${meta.tone}`}>{meta.display}</strong>
                </article>
              );
            })}
        {transactions.length === 0 && <div className="empty-state">No transactions in this range.</div>}
      </div>
    </section>
  );
}
