import React, { useEffect, useState, useCallback } from 'react';
import Sidebar from './components/Sidebar.jsx';
import StatRow from './components/StatRow.jsx';
import NetWorthChart from './components/NetWorthChart.jsx';
import SpendingChart from './components/SpendingChart.jsx';
import BreakdownBars from './components/BreakdownBars.jsx';
import CategoryPanel from './components/CategoryPanel.jsx';
import TrendsPanel from './components/TrendsPanel.jsx';
import TransactionsTable from './components/TransactionsTable.jsx';
import CategoryInsightsPanel from './components/CategoryInsightsPanel.jsx';
import AccountsPage from './components/AccountsPage.jsx';
import { api } from './api.js';
import { categoryColor, daysAgo, formatCurrency, formatDate, today } from './utils.js';

const RANGES = [
  { key: '30d', label: '30D', start: () => daysAgo(30) },
  { key: '90d', label: '90D', start: () => daysAgo(90) },
  { key: 'ytd', label: 'YTD', start: () => `${new Date().getFullYear()}-01-01` },
  { key: 'all', label: 'ALL', start: () => '0000-01-01' },
];

function budgetAmount(value) {
  if (Array.isArray(value)) return value.reduce((sum, item) => sum + budgetAmount(item), 0);
  const raw = value && typeof value === 'object' ? value.amount ?? value.sum ?? value.value : value;
  if (raw !== value) return budgetAmount(raw);
  const numeric = Number(raw);
  return Number.isFinite(numeric) ? Math.abs(numeric) : 0;
}

function shiftDate(dateString, days) {
  const date = new Date(`${dateString}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export default function App() {
  const [view, setView] = useState('overview');
  const [rangeKey, setRangeKey] = useState('30d');
  const [stats, setStats] = useState(null);
  const [netWorth, setNetWorth] = useState([]);
  const [spendingByDay, setSpendingByDay] = useState([]);
  const [previousSpendingByDay, setPreviousSpendingByDay] = useState([]);
  const [byCategory, setByCategory] = useState([]);
  const [previousByCategory, setPreviousByCategory] = useState([]);
  const [categoryTrends, setCategoryTrends] = useState([]);
  const [previousCategoryTrends, setPreviousCategoryTrends] = useState([]);
  const [accountFlows, setAccountFlows] = useState([]);
  const [byTargetAccount, setByTargetAccount] = useState([]);
  const [byTag, setByTag] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);
  const [showCategoryInsights, setShowCategoryInsights] = useState(false);
  const [showTrends, setShowTrends] = useState(false);

  const range = { start: RANGES.find((r) => r.key === rangeKey).start(), end: today() };
  const rangeLabel = RANGES.find((r) => r.key === rangeKey).label;
  const viewTitle = {
    overview: 'Overview',
    accounts: 'Accounts',
    spending: 'Spending',
    categories: 'Categories',
    trends: 'Trends',
    transactions: 'Transactions',
  }[view];
  const previousRange = rangeKey === 'all'
    ? null
    : { start: shiftDate(range.start, -(Math.max(1, Math.round((new Date(`${range.end}T00:00:00Z`) - new Date(`${range.start}T00:00:00Z`)) / 86400000)))), end: shiftDate(range.start, -1) };
  const periodSpent = spendingByDay.reduce((sum, row) => sum + Number(row.total || 0), 0);
  const overviewAccounts = accounts.filter((account) => account.type === 'asset' && !/saving/i.test(account.name || ''));
  const budgetRows = budgets
    .filter((budget) => budget.active !== false)
    .map((budget, index) => {
      const currentLimit = (budget.limits || []).find((limit) => {
        const start = String(limit.start || '').slice(0, 10);
        const end = String(limit.end || '').slice(0, 10);
        return start <= range.end && end >= range.end;
      }) || [...(budget.limits || [])].sort((a, b) => String(b.end || '').localeCompare(String(a.end || '')))[0];
      const spent = currentLimit
        ? budgetAmount(currentLimit.spent)
        : (budget.spent || []).reduce((sum, item) => sum + budgetAmount(item), 0);
      const target = currentLimit
        ? budgetAmount(currentLimit.amount)
        : budgetAmount(budget.auto_budget_amount);
      const currency = currentLimit?.currency_code || budget.spent?.[0]?.currency_code;
      return {
        id: budget.id,
        name: budget.name,
        spent,
        target,
        remaining: target - spent,
        percent: target > 0 ? (spent / target) * 100 : 0,
        currency,
        color: ['#8da34d', '#c6a642', '#62615d'][index % 3],
      };
    });

  const load = useCallback(async () => {
    try {
      setError(null);
      const [s, nw, daily, previousDaily, cat, previousCat, categoryTrend, previousCategoryTrend, flows, tgt, tag, tx, accountRows, budgetRows] = await Promise.all([
        api.stats(range),
        api.netWorth(range),
        api.expensesByDay(range),
        previousRange ? api.expensesByDay(previousRange) : Promise.resolve([]),
        api.expensesByCategory(range),
        previousRange ? api.expensesByCategory(previousRange) : Promise.resolve([]),
        api.expensesByCategoryByDay(range),
        previousRange ? api.expensesByCategoryByDay(previousRange) : Promise.resolve([]),
        api.accountFlows(range),
        api.expensesByTargetAccount(range),
        api.expensesByTag(range),
        api.transactions({ ...range, limit: 200 }),
        api.accounts(),
        api.budgets(range),
      ]);
      setStats(s);
      setNetWorth(nw);
      setSpendingByDay(daily);
      setPreviousSpendingByDay(previousDaily);
      setByCategory(cat);
      setPreviousByCategory(previousCat);
      setCategoryTrends(categoryTrend);
      setPreviousCategoryTrends(previousCategoryTrend);
      setAccountFlows(flows);
      setByTargetAccount(tgt);
      setByTag(tag);
      setTransactions(tx);
      setAccounts(accountRows);
      setBudgets(budgetRows);
    } catch (e) {
      setError(e.message);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeKey]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await api.triggerSync();
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="layout">
      <Sidebar
        active={view}
        onNavigate={setView}
        lastSync={stats?.lastSync}
        onSync={handleSync}
        syncing={syncing}
      />

      <main className="main">
        <header className="top-bar">
          <h1>{viewTitle}</h1>
          <div className="range-toggle">
            {RANGES.map((r) => (
              <button
                key={r.key}
                className={`range-btn ${rangeKey === r.key ? 'range-btn-active' : ''}`}
                onClick={() => setRangeKey(r.key)}
              >
                {r.label}
              </button>
            ))}
          </div>
        </header>

        {error && <div className="error-banner">Could not reach the API: {error}</div>}

        {view === 'accounts' ? (
          <AccountsPage accounts={accounts} accountFlows={accountFlows} range={range} rangeLabel={rangeLabel} />
        ) : view === 'categories' ? (
          <CategoryPanel rows={byCategory} previousRows={previousByCategory} trendRows={categoryTrends} previousTrendRows={previousCategoryTrends} rangeLabel={rangeLabel} />
        ) : view === 'trends' ? (
          <TrendsPanel current={spendingByDay} previous={previousSpendingByDay} rangeLabel={rangeLabel} />
        ) : view === 'overview' ? (
          <>
            <StatRow stats={stats} rangeLabel={rangeLabel} />
            <div className="overview-preview-grid">
              <button className="overview-preview overview-preview-category" onClick={() => setView('categories')}>
                <div className="overview-preview-heading"><span className="eyebrow">Where it went</span><span className="overview-preview-arrow">→</span></div>
                <strong>{formatCurrency(periodSpent)}</strong>
                <span className="overview-preview-caption">{byCategory.length} categories · {rangeLabel}</span>
                <div className="overview-preview-bars">{byCategory.slice(0, 4).reduce((colors, row) => {
                  const color = categoryColor(row.category, colors.at(-1));
                  colors.push(color);
                  return colors;
                }, []).map((color, index) => <span key={byCategory[index].category} style={{ width: `${periodSpent ? (Number(byCategory[index].total || 0) / periodSpent) * 100 : 0}%`, backgroundColor: color }} />)}</div>
                <span className="overview-preview-foot">Open category trends</span>
              </button>
              <button className="overview-preview" onClick={() => setView('spending')}>
                <div className="overview-preview-heading"><span className="eyebrow">Spending rhythm</span><span className="overview-preview-arrow">→</span></div>
                <strong>{spendingByDay.length} active days</strong>
                <span className="overview-preview-caption">{formatCurrency(periodSpent)} spent in {rangeLabel}</span>
                <div className="overview-preview-sparkline">{spendingByDay.slice(-18).map((row, index) => <i key={`${row.date}-${index}`} style={{ height: `${Math.max(8, (Number(row.total || 0) / Math.max(1, ...spendingByDay.map((item) => Number(item.total || 0)))) * 42)}px` }} />)}</div>
                <span className="overview-preview-foot">Open spending analysis</span>
              </button>
              <button className="overview-preview" onClick={() => setView('accounts')}>
                <div className="overview-preview-heading"><span className="eyebrow">Accounts</span><span className="overview-preview-arrow">→</span></div>
                <strong>{overviewAccounts.length} accounts</strong>
                <span className="overview-preview-caption">Balances and account activity</span>
                <div className="overview-account-list">{overviewAccounts.slice(0, 3).map((account) => <span key={account.id}><b>{account.name}</b><em>{formatCurrency(account.current_balance, account.currency_code)}</em></span>)}</div>
                <span className="overview-preview-foot">Open account details</span>
              </button>
              <button className="overview-preview" onClick={() => setView('trends')}>
                <div className="overview-preview-heading"><span className="eyebrow">Period change</span><span className="overview-preview-arrow">→</span></div>
                <strong>{previousSpendingByDay.length ? `${periodSpent >= previousSpendingByDay.reduce((sum, row) => sum + Number(row.total || 0), 0) ? '+' : ''}${(((periodSpent - previousSpendingByDay.reduce((sum, row) => sum + Number(row.total || 0), 0)) / Math.max(1, previousSpendingByDay.reduce((sum, row) => sum + Number(row.total || 0), 0))) * 100).toFixed(1)}%` : '—'}</strong>
                <span className="overview-preview-caption">Spending versus previous period</span>
                <div className="overview-preview-comparison"><span style={{ width: `${Math.min(100, (periodSpent / Math.max(1, periodSpent, previousSpendingByDay.reduce((sum, row) => sum + Number(row.total || 0), 0))) * 100)}%` }} /><i style={{ left: `${(previousSpendingByDay.length ? previousSpendingByDay.reduce((sum, row) => sum + Number(row.total || 0), 0) : 0) / Math.max(1, periodSpent, previousSpendingByDay.reduce((sum, row) => sum + Number(row.total || 0), 0)) * 100}%` }} /></div>
                <span className="overview-preview-foot">Open trend comparison</span>
              </button>
            </div>
            <NetWorthChart data={netWorth} />
            <section className="panel recent-panel">
              <div className="panel-heading-row"><h2>Recent activity</h2><button className="text-button" onClick={() => setView('transactions')}>View all →</button></div>
              <div className="recent-list">
                {transactions.slice(0, 5).map((tx) => (
                  <div className="recent-row" key={`${tx.id}-${tx.split_index}`}>
                    <div><span className="recent-date">{formatDate(tx.date)}</span><strong>{tx.description}</strong><small><span className="category-chip" style={{ '--category-color': categoryColor(tx.category_name) }} />{tx.category_name || 'Uncategorized'}</small></div>
                    <strong className={tx.type === 'withdrawal' ? 'stat-negative' : 'stat-positive'}>{tx.type === 'withdrawal' ? '-' : '+'}{formatCurrency(tx.amount, tx.currency_code)}</strong>
                  </div>
                ))}
              </div>
            </section>
          </>
        ) : view === 'spending' ? (
          <>
            <div className="spending-summary">
              <div className="summary-total">
                <span className="eyebrow">Spent · selected period</span>
                <strong>{formatCurrency(spendingByDay.reduce((sum, row) => sum + Number(row.total || 0), 0))}</strong>
              </div>
              <div><span>Income · {rangeLabel}</span><strong className="stat-positive">+{formatCurrency(stats?.monthIncome)}</strong></div>
              <div><span>Spending · {rangeLabel}</span><strong>{formatCurrency(stats?.monthExpenses)}</strong></div>
              <div><span>Net · {rangeLabel}</span><strong className={(stats?.monthIncome || 0) - (stats?.monthExpenses || 0) >= 0 ? 'stat-positive' : 'stat-negative'}>{formatCurrency((stats?.monthIncome || 0) - (stats?.monthExpenses || 0))}</strong></div>
            </div>
            <SpendingChart data={spendingByDay} />
            <div className="spending-grid">
              <BreakdownBars title="Where it went" rows={byCategory} labelKey="category" limit={6} initialMode="bar" onViewAll={() => setShowCategoryInsights(true)} />
              <div className="side-stack">
                <section className="insight-panel budget-panel">
                  <div className="panel-heading-row"><h2>Budget pulse</h2><span>{rangeLabel} · Firefly III</span></div>
                  {budgetRows.length ? (
                    <div className="budget-meter" aria-label="Firefly III budget comparison">
                      {budgetRows.map((row) => {
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
                <section className="insight-panel">
                  <div className="panel-heading-row"><h2>Worth a look</h2><span>{byCategory.length} categories</span></div>
                  <p>{transactions.length ? `${transactions.length} transactions in this period.` : 'No transactions in this period.'}</p>
                  <button className="text-button" onClick={() => setShowTrends(true)}>View trends →</button>
                </section>
              </div>
            </div>
            <section className="panel recent-panel">
              <div className="panel-heading-row"><h2>Recent activity</h2><button className="text-button" onClick={() => setView('transactions')}>View all →</button></div>
              <div className="recent-list">
                {transactions.slice(0, 6).map((tx) => (
                  <div className="recent-row" key={`${tx.id}-${tx.split_index}`}>
                    <div><span className="recent-date">{formatDate(tx.date)}</span><strong>{tx.description}</strong><small><span className="category-chip" style={{ '--category-color': categoryColor(tx.category_name) }} />{tx.category_name || 'Uncategorized'}</small></div>
                    <strong className={tx.type === 'withdrawal' ? 'stat-negative' : 'stat-positive'}>{tx.type === 'withdrawal' ? '-' : '+'}{formatCurrency(tx.amount, tx.currency_code)}</strong>
                  </div>
                ))}
              </div>
            </section>
          </>
        ) : (
          <TransactionsTable transactions={transactions} />
        )}
      </main>
      {showCategoryInsights && <CategoryInsightsPanel rows={byCategory} onClose={() => setShowCategoryInsights(false)} />}
      {showTrends && <div className="drawer-backdrop" onClick={() => setShowTrends(false)}><aside className="insights-drawer" onClick={(event) => event.stopPropagation()}><div className="drawer-header"><div><span className="eyebrow">Spending trends</span><h2>Selected period</h2></div><button className="icon-button" onClick={() => setShowTrends(false)} aria-label="Close spending trends">×</button></div><TrendsPanel current={spendingByDay} previous={previousSpendingByDay} rangeLabel={rangeLabel} /></aside></div>}
    </div>
  );
}
