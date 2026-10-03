import React from 'react';
import { useFormatters } from '../hooks/useFormatters.js';

export default function BudgetPulse({ rows, rangeLabel }) {
  const { formatCurrency } = useFormatters();

  return (
    <section className="insight-panel budget-panel">
      <div className="panel-heading-row"><h2>Budget pulse</h2><span>{rangeLabel} · Firefly III</span></div>
      {rows.length ? (
        <div className="budget-meter" aria-label="Firefly III budget comparison">
          {rows.map((row) => {
            const isOverspent = row.target > 0 && row.spent > row.target;
            const scale = Math.max(row.spent, row.target, 1);
            const fillWidth = row.target > 0 ? Math.min(row.percent, 100) : 0;
            const currentInfo = `${row.name}: ${formatCurrency(row.spent, row.currency)} spent, ${formatCurrency(row.target, row.currency)} target, ${formatCurrency(row.remaining, row.currency)} remaining`;
            return (
              <div className="budget-meter-row" key={row.id}>
                <span className="budget-meter-label"><i style={{ backgroundColor: row.color }} />{row.name}</span>
                <div className="budget-track" aria-label={currentInfo} title={currentInfo}>
                  <span className="budget-fill" style={{ width: `${fillWidth}%`, backgroundColor: row.color }} title={`Current spent: ${formatCurrency(row.spent, row.currency)}`} />
                  {isOverspent && <span className="budget-target" style={{ left: `${(row.target / scale) * 100}%` }} title={`Target before overspending: ${formatCurrency(row.target, row.currency)}`} />}
                </div>
                <span className="budget-meter-value">{row.target > 0 ? `${Math.round(row.percent)}%` : '—'}</span>
              </div>
            );
          })}
        </div>
      ) : <p className="budget-empty">No Firefly III budgets are configured for this period.</p>}
    </section>
  );
}
