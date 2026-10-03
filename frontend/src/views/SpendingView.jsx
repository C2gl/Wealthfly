import React from 'react';
import SpendingChart from '../components/SpendingChart.jsx';
import BreakdownBars from '../components/BreakdownBars.jsx';
import BudgetPulse from '../components/BudgetPulse.jsx';
import RecentActivity from '../components/RecentActivity.jsx';
import { useFormatters } from '../hooks/useFormatters.js';
import { sumTotals } from '../lib/dateRanges.js';

export default function SpendingView({ data, budgetRows, rangeLabel, onSelectCategory, onShowTrends, onNavigate }) {
  const { formatCurrency } = useFormatters();
  const { stats, spendingByDay, byCategory, transactions } = data;
  const net = (stats?.monthIncome || 0) - (stats?.monthExpenses || 0);

  return (
    <>
      <div className="spending-summary">
        <div className="summary-total">
          <span className="eyebrow">Spent · selected period</span>
          <strong>{formatCurrency(sumTotals(spendingByDay))}</strong>
        </div>
        <div><span>Income · {rangeLabel}</span><strong className="stat-positive">+{formatCurrency(stats?.monthIncome)}</strong></div>
        <div><span>Spending · {rangeLabel}</span><strong>{formatCurrency(stats?.monthExpenses)}</strong></div>
        <div><span>Net · {rangeLabel}</span><strong className={net >= 0 ? 'stat-positive' : 'stat-negative'}>{formatCurrency(net)}</strong></div>
      </div>
      <SpendingChart data={spendingByDay} />
      <div className="spending-grid">
        <BreakdownBars title="Where it went" rows={byCategory} labelKey="category" limit={6} initialMode="bar" onViewAll={() => onSelectCategory(byCategory[0]?.category)} />
        <div className="side-stack">
          <BudgetPulse rows={budgetRows} rangeLabel={rangeLabel} />
          <section className="insight-panel">
            <div className="panel-heading-row"><h2>Worth a look</h2><span>{byCategory.length} categories</span></div>
            <p>{transactions.length ? `${transactions.length} transactions in this period.` : 'No transactions in this period.'}</p>
            <button className="text-button" onClick={onShowTrends}>View trends →</button>
          </section>
        </div>
      </div>
      <RecentActivity transactions={transactions} limit={6} onViewAll={() => onNavigate('transactions')} />
    </>
  );
}
