import React from 'react';
import { formatCurrency } from '../utils';

export default function StatRow({ stats, rangeLabel }) {
  const net = (stats?.monthIncome || 0) - (stats?.monthExpenses || 0);

  return (
    <div className="stat-row">
      <div className="stat">
        <span className="stat-label">Net worth</span>
        <span className="stat-value">{formatCurrency(stats?.netWorth)}</span>
      </div>
      <div className="stat">
        <span className="stat-label">Income · {rangeLabel}</span>
        <span className="stat-value stat-positive">{formatCurrency(stats?.monthIncome)}</span>
      </div>
      <div className="stat">
        <span className="stat-label">Expenses · {rangeLabel}</span>
        <span className="stat-value stat-negative">{formatCurrency(stats?.monthExpenses)}</span>
      </div>
      <div className="stat">
        <span className="stat-label">Net · {rangeLabel}</span>
        <span className={`stat-value ${net >= 0 ? 'stat-positive' : 'stat-negative'}`}>
          {formatCurrency(net)}
        </span>
      </div>
    </div>
  );
}
