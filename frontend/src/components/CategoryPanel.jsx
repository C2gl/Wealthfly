import React from 'react';
import { categoryColor, formatCurrency } from '../utils';

export default function CategoryPanel({ rows, previousRows = [], rangeLabel = 'selected period' }) {
  const currentCategories = (rows || []).filter((row) => row.category);
  const previousCategories = (previousRows || []).filter((row) => row.category);
  const previousByCategory = new Map(previousCategories.map((row) => [row.category, row]));
  const categories = [...currentCategories, ...previousCategories
    .filter((row) => !currentCategories.some((currentRow) => currentRow.category === row.category))];
  const total = currentCategories.reduce((sum, row) => sum + Number(row.total || 0), 0);
  const hasComparison = previousRows !== null && previousCategories.length > 0;

  return (
    <section className="panel category-panel">
      <div className="panel-heading-row">
        <div>
          <span className="eyebrow">Where it went</span>
          <h2>Categories</h2>
        </div>
        <span>{categories.length} total · {rangeLabel}</span>
      </div>
      {categories.length === 0 ? (
        <p className="empty-state">No expenses in this range.</p>
      ) : (
        <div className="category-detail-list">
          {categories.map((row) => {
            const amount = Number(row.total || 0);
            const previousAmount = Number(previousByCategory.get(row.category)?.total || 0);
            const change = amount - previousAmount;
            const share = total ? (amount / total) * 100 : 0;
            const changeLabel = !hasComparison ? 'No prior data' : `${change >= 0 ? '+' : ''}${formatCurrency(change)}`;
            return (
              <div className="category-detail-row" key={row.category}>
                <div className="category-detail-heading">
                  <span className="bar-row-name"><span className="category-dot" style={{ backgroundColor: categoryColor(row.category) }} />{row.category}</span>
                  <div className="category-detail-amounts"><strong>{formatCurrency(amount)}</strong><span className={hasComparison ? (change > 0 ? 'stat-negative' : change < 0 ? 'stat-positive' : '') : ''}>{changeLabel}</span></div>
                </div>
                <div className="category-detail-meta">
                  <span className="category-detail-track"><span style={{ width: `${share}%`, backgroundColor: categoryColor(row.category) }} /></span>
                  <span>{share.toFixed(1)}% · {row.count || 0} {Number(row.count) === 1 ? 'transaction' : 'transactions'}{hasComparison ? ` · prior ${formatCurrency(previousAmount)}` : ''}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
