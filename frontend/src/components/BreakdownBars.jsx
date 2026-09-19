import React from 'react';
import { formatCurrency } from '../utils';

export default function BreakdownBars({ title, rows, labelKey, valueKey = 'total', limit = 8 }) {
  const top = [...(rows || [])]
    .filter((r) => r[labelKey])
    .slice(0, limit);
  const max = Math.max(...top.map((r) => r[valueKey]), 1);

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>{title}</h2>
      </div>
      {top.length === 0 ? (
        <p className="empty-state">No expenses in this range.</p>
      ) : (
        <div className="bar-list">
          {top.map((row) => (
            <div className="bar-row" key={row[labelKey]}>
              <div className="bar-row-labels">
                <span className="bar-row-name">{row[labelKey]}</span>
                <span className="bar-row-value">{formatCurrency(row[valueKey])}</span>
              </div>
              <div className="bar-track">
                <div
                  className="bar-fill"
                  style={{ width: `${(row[valueKey] / max) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
