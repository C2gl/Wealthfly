import React, { useEffect, useState, useCallback } from 'react';
import Sidebar from './components/Sidebar.jsx';
import StatRow from './components/StatRow.jsx';
import NetWorthChart from './components/NetWorthChart.jsx';
import BreakdownBars from './components/BreakdownBars.jsx';
import TransactionsTable from './components/TransactionsTable.jsx';
import { api } from './api.js';
import { daysAgo, today } from './utils.js';

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
      const [s, nw, cat, tgt, tag, tx] = await Promise.all([
        api.stats(range),
        api.netWorth(range),
        api.expensesByCategory(range),
        api.expensesByTargetAccount(range),
        api.expensesByTag(range),
        api.transactions({ ...range, limit: 200 }),
      ]);
      setStats(s);
      setNetWorth(nw);
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
          <h1>{view === 'overview' ? 'Overview' : 'Transactions'}</h1>
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
        ) : (
          <TransactionsTable transactions={transactions} />
        )}
      </main>
    </div>
  );
}
