import React from 'react';
import { categoryColor, formatCurrency } from '../utils';

function sparklinePoints(rows, category, maxDay, maxTotal) {
  const valuesByDay = new Map(
    rows.filter((row) => row.category === category).map((row) => [Number(row.day), Number(row.total || 0)])
  );
  return Array.from({ length: maxDay + 1 }, (_, day) => {
    const x = maxDay ? (day / maxDay) * 120 : 0;
    const y = 30 - (Number(valuesByDay.get(day) || 0) / maxTotal) * 26;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
}

function CategorySparkline({ category, color, currentRows, previousRows, hasComparison }) {
  const trendRows = [...currentRows, ...previousRows];
  const maxDay = Math.max(1, ...trendRows.map((row) => Number(row.day || 0)));
  const maxTotal = Math.max(1, ...trendRows.map((row) => Number(row.total || 0)));
  const currentPoints = sparklinePoints(currentRows, category, maxDay, maxTotal);
  const previousPoints = sparklinePoints(previousRows, category, maxDay, maxTotal);

  return (
    <div className="category-sparkline-wrap">
      <svg className="category-sparkline" viewBox="0 0 120 32" role="img" aria-label={`${category} spending trend`}>
        {hasComparison && <polyline points={previousPoints} fill="none" stroke="#c6a642" strokeWidth="1.5" strokeDasharray="4 3" vectorEffect="non-scaling-stroke" />}
        <polyline points={currentPoints} fill="none" stroke={color} strokeWidth="1.8" vectorEffect="non-scaling-stroke" />
      </svg>
      {hasComparison && <span className="category-sparkline-legend"><i className="category-sparkline-current" />now <i className="category-sparkline-previous" />prior</span>}
    </div>
  );
}

export default function CategoryPanel({ rows, previousRows = [], trendRows = [], previousTrendRows = [], rangeLabel = 'selected period', onCategoryClick }) {
  const currentCategories = (rows || []).filter((row) => row.category);
  const previousCategories = (previousRows || []).filter((row) => row.category);
  const previousByCategory = new Map(previousCategories.map((row) => [row.category, row]));
  const categories = [...currentCategories, ...previousCategories
    .filter((row) => !currentCategories.some((currentRow) => currentRow.category === row.category))];
  const total = currentCategories.reduce((sum, row) => sum + Number(row.total || 0), 0);
  const hasComparison = previousRows !== null && previousCategories.length > 0;
  const categoryColors = categories.reduce((colors, row) => {
    colors.push(categoryColor(row.category, colors.at(-1)));
    return colors;
  }, []);

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
        <div className="category-detail-list category-block-grid">
          {categories.map((row, index) => {
            const color = categoryColors[index];
            const amount = Number(row.total || 0);
            const previousAmount = Number(previousByCategory.get(row.category)?.total || 0);
            const change = amount - previousAmount;
            const share = total ? (amount / total) * 100 : 0;
            const changeLabel = !hasComparison ? 'No prior data' : `${change >= 0 ? '+' : ''}${formatCurrency(change)}`;
            return (
              <button className="category-detail-row category-block" key={row.category} type="button" onClick={() => onCategoryClick?.(row.category)}>
                <div className="category-detail-heading">
                  <span className="bar-row-name"><span className="category-dot" style={{ backgroundColor: color }} />{row.category}</span>
                  <div className="category-detail-amounts"><strong>{formatCurrency(amount)}</strong><span className={hasComparison ? (change > 0 ? 'stat-negative' : change < 0 ? 'stat-positive' : '') : ''}>{changeLabel}</span></div>
                </div>
                <CategorySparkline category={row.category} color={color} currentRows={trendRows} previousRows={previousTrendRows} hasComparison={hasComparison} />
                <div className="category-detail-meta">
                  <span className="category-detail-track"><span style={{ width: `${share}%`, backgroundColor: color }} /></span>
                  <span>{share.toFixed(1)}% · {row.count || 0} {Number(row.count) === 1 ? 'transaction' : 'transactions'}{hasComparison ? ` · prior ${formatCurrency(previousAmount)}` : ''}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
