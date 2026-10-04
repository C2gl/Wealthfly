import React, { useId, useMemo, useState } from 'react';
import { categoryColor, formatCurrency } from '../utils';
import DeltaPill from './DeltaPill.jsx';
import { aggregateTrendRows, categoryEntryNames, groupCategoryRows } from '../lib/categoryGroups.js';

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
        {hasComparison && <polyline points={previousPoints} fill="none" stroke="var(--gold)" strokeWidth="1.5" strokeDasharray="4 3" vectorEffect="non-scaling-stroke" />}
        <polyline points={currentPoints} fill="none" stroke={color} strokeWidth="1.8" vectorEffect="non-scaling-stroke" />
      </svg>
      {hasComparison && <span className="category-sparkline-legend"><i className="category-sparkline-current" />now <i className="category-sparkline-previous" />prior</span>}
    </div>
  );
}

function changeInfo(amount, previousAmount, hasComparison) {
  const change = amount - previousAmount;
  const label = !hasComparison ? 'No prior data' : `${change > 0 ? '+' : ''}${formatCurrency(change)}`;
  return { value: hasComparison ? change : null, label };
}

function transactionsLabel(count) {
  return `${count} ${count === 1 ? 'transaction' : 'transactions'}`;
}

function CategoryBlock({ entry, color, total, hasComparison, trendRows, previousTrendRows, onClick }) {
  const share = total ? (entry.amount / total) * 100 : 0;
  const change = changeInfo(entry.amount, entry.previousAmount, hasComparison);

  return (
    <button className="category-detail-row category-block" type="button" onClick={onClick}>
      <div className="category-detail-heading">
        <span className="bar-row-name"><span className="category-dot" style={{ backgroundColor: color }} />{entry.name}</span>
        <div className="category-detail-amounts"><strong>{formatCurrency(entry.amount)}</strong><DeltaPill value={change.value} label={change.label} goodWhen="down" /></div>
      </div>
      <CategorySparkline category={entry.name} color={color} currentRows={trendRows} previousRows={previousTrendRows} hasComparison={hasComparison} />
      <div className="category-detail-meta">
        <span className="category-detail-track"><span style={{ width: `${share}%`, backgroundColor: color }} /></span>
        <span>{share.toFixed(1)}% · {transactionsLabel(entry.count)}{hasComparison ? ` · prior ${formatCurrency(entry.previousAmount)}` : ''}</span>
      </div>
    </button>
  );
}

function CategoryGroupBlock({ entry, color, total, hasComparison, trendRows, previousTrendRows, open, onToggle, onCategoryClick }) {
  const childrenId = useId();
  const share = total ? (entry.amount / total) * 100 : 0;
  const change = changeInfo(entry.amount, entry.previousAmount, hasComparison);

  return (
    <div className={`category-detail-row category-block category-group${open ? ' category-group-open' : ''}`}>
      <button type="button" className="category-group-toggle" aria-expanded={open} aria-controls={childrenId} onClick={onToggle}>
        <div className="category-detail-heading">
          <span className="bar-row-name">
            <span className="category-group-chevron" aria-hidden="true" />
            <span className="category-dot" style={{ backgroundColor: color }} />
            {entry.name}
            <span className="category-group-count">{entry.children.length} categories</span>
          </span>
          <div className="category-detail-amounts"><strong>{formatCurrency(entry.amount)}</strong><DeltaPill value={change.value} label={change.label} goodWhen="down" /></div>
        </div>
        <CategorySparkline category={entry.name} color={color} currentRows={trendRows} previousRows={previousTrendRows} hasComparison={hasComparison} />
        <div className="category-detail-meta">
          <span className="category-detail-track"><span style={{ width: `${share}%`, backgroundColor: color }} /></span>
          <span>{share.toFixed(1)}% · {transactionsLabel(entry.count)}{hasComparison ? ` · prior ${formatCurrency(entry.previousAmount)}` : ''}</span>
        </div>
      </button>
      {open && (
        <div id={childrenId} className="category-children">
          {entry.children.map((child, index) => {
            const childShare = entry.amount ? (child.amount / entry.amount) * 100 : 0;
            const childChange = changeInfo(child.amount, child.previousAmount, hasComparison);
            const tint = Math.max(0.45, 1 - index * 0.12);
            return (
              <button key={child.category} type="button" className="category-child-row" onClick={() => onCategoryClick?.(child.category)}>
                <span className="category-child-name"><span className="category-dot category-dot-small" style={{ backgroundColor: color, opacity: tint }} /><span className="category-child-label">{child.label}</span></span>
                <span className="category-child-amount"><strong>{formatCurrency(child.amount)}</strong><DeltaPill value={childChange.value} label={childChange.label} goodWhen="down" /></span>
                <span className="category-detail-track"><span style={{ width: `${childShare}%`, backgroundColor: color, opacity: tint }} /></span>
                <span className="category-child-meta">{childShare.toFixed(0)}% of {entry.name} · {transactionsLabel(child.count)}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function CategoryPanel({ rows, previousRows = [], trendRows = [], previousTrendRows = [], rangeLabel = 'selected period', onCategoryClick }) {
  const [grouped, setGrouped] = useState(true);
  const [openGroups, setOpenGroups] = useState(() => new Set());

  const currentCategories = (rows || []).filter((row) => row.category);
  const previousCategories = (previousRows || []).filter((row) => row.category);
  const hasComparison = previousRows !== null && previousCategories.length > 0;
  const total = currentCategories.reduce((sum, row) => sum + Number(row.total || 0), 0);

  const flatEntries = useMemo(() => groupCategoryRows(rows, previousRows, { grouped: false }), [rows, previousRows]);
  const groupedEntries = useMemo(() => groupCategoryRows(rows, previousRows), [rows, previousRows]);
  const entries = grouped ? groupedEntries : flatEntries;

  // In grouped mode a group's sparkline adds up the daily rows of all its categories.
  const { currentTrend, previousTrend } = useMemo(() => {
    if (!grouped) return { currentTrend: trendRows, previousTrend: previousTrendRows };
    const names = categoryEntryNames(groupedEntries);
    return { currentTrend: aggregateTrendRows(trendRows, names), previousTrend: aggregateTrendRows(previousTrendRows, names) };
  }, [grouped, groupedEntries, trendRows, previousTrendRows]);

  const colors = entries.reduce((list, entry) => {
    list.push(categoryColor(entry.name, list.at(-1)));
    return list;
  }, []);

  const toggleGroup = (key) => setOpenGroups((current) => {
    const next = new Set(current);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    return next;
  });

  const hasGroups = groupedEntries.some((entry) => entry.kind === 'group');

  return (
    <section className="panel category-panel">
      <div className="panel-heading-row">
        <div>
          <span className="eyebrow">Where it went</span>
          <h2>Categories</h2>
        </div>
        <div className="category-heading-tools">
          <span>{flatEntries.length} total · {rangeLabel}</span>
          {hasGroups && (
            <div className="breakdown-view-toggle" role="group" aria-label="Category layout">
              <button type="button" className={grouped ? 'is-active' : ''} aria-pressed={grouped} onClick={() => setGrouped(true)}>Grouped</button>
              <button type="button" className={!grouped ? 'is-active' : ''} aria-pressed={!grouped} onClick={() => setGrouped(false)}>Flat</button>
            </div>
          )}
        </div>
      </div>
      {entries.length === 0 ? (
        <p className="empty-state">No expenses in this range.</p>
      ) : (
        <div className="category-detail-list category-block-grid">
          {entries.map((entry, index) => (entry.kind === 'group' ? (
            <CategoryGroupBlock
              key={entry.key}
              entry={entry}
              color={colors[index]}
              total={total}
              hasComparison={hasComparison}
              trendRows={currentTrend}
              previousTrendRows={previousTrend}
              open={openGroups.has(entry.key)}
              onToggle={() => toggleGroup(entry.key)}
              onCategoryClick={onCategoryClick}
            />
          ) : (
            <CategoryBlock
              key={entry.key}
              entry={entry}
              color={colors[index]}
              total={total}
              hasComparison={hasComparison}
              trendRows={currentTrend}
              previousTrendRows={previousTrend}
              onClick={() => onCategoryClick?.(entry.name)}
            />
          )))}
        </div>
      )}
    </section>
  );
}
