import React from 'react';
import StatRow from '../components/StatRow.jsx';
import NetWorthChart from '../components/NetWorthChart.jsx';
import OverviewPreview from '../components/OverviewPreview.jsx';
import DeltaPill from '../components/DeltaPill.jsx';
import RecentActivity from '../components/RecentActivity.jsx';
import { useFormatters } from '../hooks/useFormatters.js';
import { padNetWorthToMonthEnd, sumTotals } from '../lib/dateRanges.js';
import { categoryColor, isNamedSavingsAccount } from '../utils.js';

export default function OverviewView({ data, rangeKey, range, rangeLabel, savingsAccountWords, onNavigate }) {
  const { formatCurrency } = useFormatters();
  const { stats, netWorth, spendingByDay, previousSpendingByDay, byCategory, transactions, accounts } = data;

  const periodSpent = sumTotals(spendingByDay);
  const previousSpent = sumTotals(previousSpendingByDay);
  const overviewAccounts = accounts.filter((account) => account.type === 'asset' && !isNamedSavingsAccount(account, savingsAccountWords));
  const chartNetWorth = padNetWorthToMonthEnd(netWorth, rangeKey, range.start);

  const topCategories = byCategory.slice(0, 4);
  const topCategoryColors = topCategories.reduce((colors, row) => {
    colors.push(categoryColor(row.category, colors.at(-1)));
    return colors;
  }, []);

  const maxDailySpend = Math.max(1, ...spendingByDay.map((item) => Number(item.total || 0)));

  const hasPrevious = previousSpendingByDay.length > 0;
  const changePercent = ((periodSpent - previousSpent) / Math.max(1, previousSpent)) * 100;
  const changeLabel = hasPrevious ? `${periodSpent >= previousSpent ? '+' : ''}${changePercent.toFixed(1)}%` : '—';
  const comparisonMax = Math.max(1, periodSpent, previousSpent);

  return (
    <>
      <StatRow stats={stats} rangeLabel={rangeLabel} />
      <div className="overview-preview-grid">
        <OverviewPreview label="Where it went" foot="Open category trends" className="overview-preview-category" onClick={() => onNavigate('categories')}>
          <strong>{formatCurrency(periodSpent)}</strong>
          <span className="overview-preview-caption">{byCategory.length} categories · {rangeLabel}</span>
          <div className="overview-preview-bars">
            {topCategoryColors.map((color, index) => (
              <span key={topCategories[index].category} style={{ width: `${periodSpent ? (Number(topCategories[index].total || 0) / periodSpent) * 100 : 0}%`, backgroundColor: color }} />
            ))}
          </div>
        </OverviewPreview>

        <OverviewPreview label="Spending rhythm" foot="Open spending analysis" onClick={() => onNavigate('spending')}>
          <strong>{spendingByDay.length} active days</strong>
          <span className="overview-preview-caption">{formatCurrency(periodSpent)} spent in {rangeLabel}</span>
          <div className="overview-preview-sparkline">
            {spendingByDay.slice(-18).map((row, index) => (
              <i key={`${row.date}-${index}`} style={{ height: `${Math.max(8, (Number(row.total || 0) / maxDailySpend) * 42)}px` }} />
            ))}
          </div>
        </OverviewPreview>

        <OverviewPreview label="Accounts" foot="Open account details" onClick={() => onNavigate('accounts')}>
          <strong>{overviewAccounts.length} accounts</strong>
          <span className="overview-preview-caption">Balances and account activity</span>
          <div className="overview-account-list">
            {overviewAccounts.slice(0, 3).map((account) => (
              <span key={account.id}><b>{account.name}</b><em>{formatCurrency(account.current_balance, account.currency_code)}</em></span>
            ))}
          </div>
        </OverviewPreview>

        <OverviewPreview label="Period change" foot="Open trend comparison" onClick={() => onNavigate('trends')}>
          <strong>{changeLabel}</strong>
          <span className="overview-preview-caption">
            <DeltaPill
              value={hasPrevious ? periodSpent - previousSpent : null}
              label={hasPrevious ? `${formatCurrency(Math.abs(periodSpent - previousSpent))} ${periodSpent >= previousSpent ? 'more' : 'less'} than before` : 'No prior period'}
              goodWhen="down"
            />
          </span>
          <div className="overview-preview-comparison">
            <span style={{ width: `${Math.min(100, (periodSpent / comparisonMax) * 100)}%` }} />
            <i style={{ left: `${(previousSpent / comparisonMax) * 100}%` }} />
          </div>
        </OverviewPreview>
      </div>
      <NetWorthChart data={chartNetWorth} />
      <RecentActivity transactions={transactions} limit={5} onViewAll={() => onNavigate('transactions')} />
    </>
  );
}
