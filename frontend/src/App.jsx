import React, { useEffect, useState, useCallback } from 'react';
import Sidebar from './components/Sidebar.jsx';
import StatRow from './components/StatRow.jsx';
import NetWorthChart from './components/NetWorthChart.jsx';
import SpendingChart from './components/SpendingChart.jsx';
import BreakdownBars from './components/BreakdownBars.jsx';
import TransactionsTable from './components/TransactionsTable.jsx';
import { api } from './api.js';
import { daysAgo, formatCurrency, formatDate, today } from './utils.js';

const RANGES = [
  { key: '30d', label: '30D', start: () => daysAgo(30) },
  { key: '90d', label: '90D', start: () => daysAgo(90) },
  { key: 'ytd', label: 'YTD', start: () => `${new Date().getFullYear()}-01-01` },
  { key: 'all', label: 'ALL', start: () => '0000-01-01' },
];

export default function App() {
  const [view, setView] = useState('overview');
  const [rangeKey, setRangeKey] = useState('90d');
  const [stats, setStats] = useState(null);
  const [netWorth, setNetWorth] = useState([]);
  const [spendingByDay, setSpendingByDay] = useState([]);
  const [byCategory, setByCategory] = useState([]);
  const [byTargetAccount, setByTargetAccount] = useState([]);
  const [byTag, setByTag] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);

  const range = { start: RANGES.find((r) => r.key === rangeKey).start(), end: today() };

  const load = useCallback(async () => {
    try {
      setError(null);
      const [s, nw, daily, cat, tgt, tag, tx] = await Promise.all([
        api.stats(range),
        api.netWorth(range),
        api.expensesByDay(range),
        api.expensesByCategory(range),
        api.expensesByTargetAccount(range),
        api.expensesByTag(range),
        api.transactions({ ...range, limit: 200 }),
      ]);
      setStats(s);
      setNetWorth(nw);
      setSpendingByDay(daily);
      setByCategory(cat);
      setByTargetAccount(tgt);
      setByTag(tag);
      setTransactions(tx);
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
          <h1>{view === 'overview' ? 'Overview' : view === 'spending' ? 'Spending' : 'Transactions'}</h1>
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

        {view === 'overview' ? (
          <>
            <StatRow stats={stats} />
            <NetWorthChart data={netWorth} />
            <div className="grid-two">
              <BreakdownBars title="Spending by category" rows={byCategory} labelKey="category" />
              <BreakdownBars
                title="Spending by target account"
                rows={byTargetAccount}
                labelKey="account"
              />
            </div>
            <BreakdownBars title="Spending by tag" rows={byTag} labelKey="tag" limit={10} />
          </>
        ) : view === 'spending' ? (
          <>
            <div className="spending-summary">
              <div className="summary-total">
                <span className="eyebrow">Spent · selected period</span>
                <strong>{formatCurrency(spendingByDay.reduce((sum, row) => sum + Number(row.total || 0), 0))}</strong>
              </div>
              <div><span>Income</span><strong className="stat-positive">+{formatCurrency(stats?.monthIncome)}</strong></div>
              <div><span>Spending</span><strong>{formatCurrency(stats?.monthExpenses)}</strong></div>
              <div><span>Net</span><strong className={(stats?.monthIncome || 0) - (stats?.monthExpenses || 0) >= 0 ? 'stat-positive' : 'stat-negative'}>{formatCurrency((stats?.monthIncome || 0) - (stats?.monthExpenses || 0))}</strong></div>
            </div>
            <SpendingChart data={spendingByDay} />
            <div className="spending-grid">
              <BreakdownBars title="Where it went" rows={byCategory} labelKey="category" limit={6} />
              <div className="side-stack">
                <section className="insight-panel">
                  <div className="panel-heading-row"><h2>Monthly budget</h2><span>Selected period</span></div>
                  <p>No monthly target set for this budget month.</p>
                  <button className="text-button">Set a budget →</button>
                </section>
                <section className="insight-panel">
                  <div className="panel-heading-row"><h2>Worth a look</h2><span>{byCategory.length} categories</span></div>
                  <p>{transactions.length ? `${transactions.length} transactions in this period.` : 'No transactions in this period.'}</p>
                  <button className="text-button">View trends →</button>
                </section>
              </div>
            </div>
            <section className="panel recent-panel">
              <div className="panel-heading-row"><h2>Recent activity</h2><button className="text-button" onClick={() => setView('transactions')}>View all →</button></div>
              <div className="recent-list">
                {transactions.slice(0, 6).map((tx) => (
                  <div className="recent-row" key={`${tx.id}-${tx.split_index}`}>
                    <div><span className="recent-date">{formatDate(tx.date)}</span><strong>{tx.description}</strong><small>{tx.category_name || 'Uncategorized'}</small></div>
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
    </div>
  );
}
