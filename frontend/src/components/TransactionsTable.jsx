import React, { useState } from 'react';
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
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${startX.toFixed(2)} ${startY.toFixed(2)} A ${radius} ${radius} 0 ${largeArc} 1 ${endX.toFixed(2)} ${endY.toFixed(2)}`;
}

function arcSegments(rows, total) {
  const visible = rows.filter((row) => row.total > 0);
  if (!visible.length) return [];

  let cursor = -90;
  return visible.map((row) => {
    const share = total ? row.total / total : 0;
    const span = 360 * share;
    const start = cursor + 1.5;
    const end = cursor + span - 1.5;
    cursor += span;
    return { ...row, share, start, end };
  });
}

export default function TransactionsTable({ transactions }) {
  const [hoveredKey, setHoveredKey] = useState(null);
  const [selectedKey, setSelectedKey] = useState(null);

  const totals = {
    withdrawal: transactions.filter((tx) => tx.type === 'withdrawal').reduce((sum, tx) => sum + Math.abs(Number(tx.amount || 0)), 0),
    deposit: transactions.filter((tx) => tx.type === 'deposit').reduce((sum, tx) => sum + Math.abs(Number(tx.amount || 0)), 0),
    transfer: transactions.filter((tx) => tx.type === 'transfer').reduce((sum, tx) => sum + Math.abs(Number(tx.amount || 0)), 0),
  };

  const distribution = [
    { key: 'withdrawal', label: 'Expenses', color: '#c56c5a', total: totals.withdrawal },
    { key: 'deposit', label: 'Income', color: '#5cae74', total: totals.deposit },
    { key: 'transfer', label: 'Transfers', color: '#6fb2d6', total: totals.transfer },
  ].filter((row) => row.total > 0);

  const total = distribution.reduce((sum, row) => sum + row.total, 0);
  const segments = arcSegments(distribution, total);
  const activeKey = hoveredKey || selectedKey || distribution[0]?.key;
  const activeRow = distribution.find((row) => row.key === activeKey) || distribution[0];

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
              {segments.map((segment) => {
                const isMuted = hoveredKey && hoveredKey !== segment.key && !selectedKey;
                const isSelected = (selectedKey || hoveredKey) === segment.key;
                return (
                  <path
                    key={segment.key}
                    d={arcPath(segment.start, segment.end)}
                    fill="none"
                    stroke={segment.color}
                    strokeWidth="28"
                    strokeLinecap="butt"
                    className={isSelected ? 'transaction-segment is-active' : isMuted ? 'transaction-segment is-muted' : 'transaction-segment'}
                    onMouseEnter={() => setHoveredKey(segment.key)}
                    onMouseLeave={() => setHoveredKey(null)}
                    onFocus={() => setHoveredKey(segment.key)}
                    onBlur={() => setHoveredKey(null)}
                    onClick={() => setSelectedKey((current) => (current === segment.key ? null : segment.key))}
                    tabIndex={0}
                    aria-label={`${segment.label}: ${formatCurrency(segment.total)}`}
                  />
                );
              })}
              <circle cx="95" cy="95" r="48" fill="var(--panel)" />
              <text x="95" y="90" textAnchor="middle" className="transaction-distribution-total-label">{formatCurrency(activeRow?.total || total)}</text>
              <text x="95" y="112" textAnchor="middle" className="transaction-distribution-total-sub">{activeRow?.label || 'total'}</text>
            </svg>
            <div className="transaction-distribution-legend">
              {distribution.map((row) => {
                const isSelected = (selectedKey || hoveredKey) === row.key;
                return (
                  <button
                    key={row.key}
                    className={isSelected ? 'transaction-distribution-item is-active' : 'transaction-distribution-item'}
                    onMouseEnter={() => setHoveredKey(row.key)}
                    onMouseLeave={() => setHoveredKey(null)}
                    onFocus={() => setHoveredKey(row.key)}
                    onBlur={() => setHoveredKey(null)}
                    onClick={() => setSelectedKey((current) => (current === row.key ? null : row.key))}
                    type="button"
                  >
                    <span className="legend-swatch" style={{ backgroundColor: row.color }} />
                    <div>
                      <strong>{row.label}</strong>
                      <small>{row.total ? `${((row.total / total) * 100).toFixed(1)}%` : '0.0%'}</small>
                    </div>
                    <b>{formatCurrency(row.total)}</b>
                  </button>
                );
              })}
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
                    <span className={`transaction-type-badge transaction-type-${tx.type}`}>
                      {isTransfer ? 'Transfer' : tx.type === 'deposit' ? 'Income' : 'Expense'}
                    </span>
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
