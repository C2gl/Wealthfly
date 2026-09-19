import React from 'react';
import BreakdownBars from './BreakdownBars.jsx';
import { formatCurrency } from '../utils';

export default function CategoryInsightsPanel({ rows, onClose }) {
  const total = rows.reduce((sum, row) => sum + Number(row.total || 0), 0);

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside className="insights-drawer" onClick={(event) => event.stopPropagation()}>
        <div className="drawer-header">
          <div>
            <span className="eyebrow">Category insights</span>
            <h2>Where your money went</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close category insights">×</button>
        </div>
        <p className="drawer-intro">A closer look at the categories in the selected period.</p>
        <div className="drawer-total"><span>Total spending</span><strong>{formatCurrency(total)}</strong></div>
        <BreakdownBars title="Category share" rows={rows} labelKey="category" limit={12} initialMode="donut" />
        <section className="drawer-placeholder">
          <span className="eyebrow">Coming next</span>
          <h3>Trends, comparisons, and recurring spend</h3>
          <p>This space is ready for deeper category insights.</p>
        </section>
      </aside>
    </div>
  );
}
