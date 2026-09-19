import React from 'react';
import { categoryColor, formatCurrency } from '../utils';

export default function BreakdownBars({ title, rows, labelKey, valueKey = 'total', limit = 8 }) {
  const top = [...(rows || [])]
    .filter((r) => r[labelKey])
    .slice(0, limit);
  const total = top.reduce((sum, row) => sum + Number(row[valueKey] || 0), 0);

  return (
    <div className="panel">
      <div className="panel-heading-row breakdown-heading">
        <h2>{title}</h2>
        <div className="breakdown-view-toggle"><button className="is-active">List</button><button>Map</button><button>View all →</button></div>
      </div>
      {top.length === 0 ? (
        <p className="empty-state">No expenses in this range.</p>
      ) : (
        <div className="breakdown-content">
          <div className="share-bar" aria-label="Category share">
            {top.map((row) => (
              <span
                key={row[labelKey]}
                className="share-segment"
                style={{ width: `${(Number(row[valueKey]) / total) * 100}%`, backgroundColor: categoryColor(row[labelKey]) }}
                title={`${row[labelKey]}: ${formatCurrency(row[valueKey])}`}
              />
            ))}
          </div>
          <div className="category-list">
          {top.map((row) => (
            <div className="bar-row" key={row[labelKey]}>
              <div className="bar-row-labels">
                <span className="bar-row-name"><span className="category-dot" style={{ backgroundColor: categoryColor(row[labelKey]) }} />{row[labelKey]}</span>
                <span className="bar-row-metrics"><span>{((Number(row[valueKey]) / total) * 100).toFixed(1)}%</span><strong>{formatCurrency(row[valueKey])}</strong></span>
              </div>
            </div>
          ))}
          </div>
        </div>
      )}
    </div>
  );
}
