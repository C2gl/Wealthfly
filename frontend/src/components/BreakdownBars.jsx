import React from 'react';
import { categoryColor, formatCurrency } from '../utils';

export default function BreakdownBars({ title, rows, labelKey, valueKey = 'total', limit = 8, initialMode = 'bar', onViewAll, currency, language = 'en' }) {
  const [mode, setMode] = React.useState(initialMode);
  const [hoveredLabel, setHoveredLabel] = React.useState(null);
  const top = [...(rows || [])]
    .filter((r) => r[labelKey])
    .slice(0, limit);
  const total = top.reduce((sum, row) => sum + Number(row[valueKey] || 0), 0);
  const hoveredRow = top.find((row) => row[labelKey] === hoveredLabel);
  const setHovered = (label) => setHoveredLabel(label);
  const clearHovered = () => setHoveredLabel(null);

  return (
    <div className="panel">
      <div className="panel-heading-row breakdown-heading">
        <h2>{title}</h2>
        <div className="breakdown-view-toggle">
          <button className={mode === 'bar' ? 'is-active' : ''} onClick={() => setMode('bar')}>Bar</button>
          <button className={mode === 'donut' ? 'is-active' : ''} onClick={() => setMode('donut')}>Donut</button>
          {onViewAll && <button onClick={onViewAll}>View all →</button>}
        </div>
      </div>
      {top.length === 0 ? (
        <p className="empty-state">No expenses in this range.</p>
      ) : (
        <div className="breakdown-content">
          <div className="breakdown-hover-info" aria-live="polite">
            {hoveredRow ? <><strong>{hoveredRow[labelKey]}</strong><span>{((Number(hoveredRow[valueKey]) / total) * 100).toFixed(1)}%</span><span>{formatCurrency(hoveredRow[valueKey], currency, language)}</span></> : <span>Hover an item to inspect its share</span>}
          </div>
          {mode === 'donut' ? (
            <div className="donut-layout">
              <div className="donut-chart" style={{ background: `conic-gradient(${top.map((row, index) => `${categoryColor(row[labelKey])} ${top.slice(0, index).reduce((sum, item) => sum + Number(item[valueKey] || 0), 0) / total * 360}deg ${(top.slice(0, index + 1).reduce((sum, item) => sum + Number(item[valueKey] || 0), 0) / total) * 360}deg`).join(', ')})` }}>
                <div className="donut-hole"><strong>{formatCurrency(total, currency, language)}</strong><span>Total</span></div>
              </div>
              <div className="donut-legend">{top.map((row) => <span key={row[labelKey]} onMouseEnter={() => setHovered(row[labelKey])} onMouseLeave={clearHovered} onFocus={() => setHovered(row[labelKey])} onBlur={clearHovered} tabIndex="0"><i style={{ backgroundColor: categoryColor(row[labelKey]) }} />{row[labelKey]}</span>)}</div>
            </div>
          ) : (
            <div className="share-bar" aria-label="Category share">
              {top.map((row) => (
                <span key={row[labelKey]} className="share-segment" style={{ width: `${(Number(row[valueKey]) / total) * 100}%`, backgroundColor: categoryColor(row[labelKey]) }} title={`${row[labelKey]}: ${formatCurrency(row[valueKey], currency, language)}`} onMouseEnter={() => setHovered(row[labelKey])} onMouseLeave={clearHovered} onFocus={() => setHovered(row[labelKey])} onBlur={clearHovered} tabIndex="0" role="img" aria-label={`${row[labelKey]}: ${formatCurrency(row[valueKey], currency, language)}, ${((Number(row[valueKey]) / total) * 100).toFixed(1)} percent`} />
              ))}
            </div>
          )}
          <div className="category-list">
          {top.map((row) => (
            <div className="bar-row" key={row[labelKey]}>
              <div className="bar-row-labels">
                <span className="bar-row-name"><span className="category-dot" style={{ backgroundColor: categoryColor(row[labelKey]) }} />{row[labelKey]}</span>
                <span className="bar-row-metrics"><span>{((Number(row[valueKey]) / total) * 100).toFixed(1)}%</span><strong>{formatCurrency(row[valueKey], currency, language)}</strong></span>
              </div>
            </div>
          ))}
          </div>
        </div>
      )}
    </div>
  );
}
