import React from 'react';
import { categoryColor, formatCurrency } from '../utils';

export default function CategoryPanel({ rows }) {
  const categories = (rows || []).filter((row) => row.category);
  const total = categories.reduce((sum, row) => sum + Number(row.total || 0), 0);

  return (
    <section className="panel category-panel">
      <div className="panel-heading-row">
        <div>
          <span className="eyebrow">Where it went</span>
          <h2>Categories</h2>
        </div>
        <span>{categories.length} total</span>
      </div>
      {categories.length === 0 ? (
        <p className="empty-state">No expenses in this range.</p>
      ) : (
        <div className="category-detail-list">
          {categories.map((row) => {
            const amount = Number(row.total || 0);
            const share = total ? (amount / total) * 100 : 0;
            return (
              <div className="category-detail-row" key={row.category}>
                <div className="category-detail-heading">
                  <span className="bar-row-name"><span className="category-dot" style={{ backgroundColor: categoryColor(row.category) }} />{row.category}</span>
                  <strong>{formatCurrency(amount)}</strong>
                </div>
                <div className="category-detail-meta">
                  <span className="category-detail-track"><span style={{ width: `${share}%`, backgroundColor: categoryColor(row.category) }} /></span>
                  <span>{share.toFixed(1)}% · {row.count || 0} {Number(row.count) === 1 ? 'transaction' : 'transactions'}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
