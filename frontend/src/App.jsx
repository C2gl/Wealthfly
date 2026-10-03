import React, { useState } from 'react';
import Sidebar from './components/Sidebar.jsx';
import SyncBar from './components/SyncBar.jsx';
import CategoryPanel from './components/CategoryPanel.jsx';
import TrendsPanel from './components/TrendsPanel.jsx';
import TrendsDrawer from './components/TrendsDrawer.jsx';
import TransactionsTable from './components/TransactionsTable.jsx';
import CategoryInsightsPanel from './components/CategoryInsightsPanel.jsx';
import AccountsPage from './components/AccountsPage.jsx';
import SavingsPage from './components/SavingsPage.jsx';
import SettingsPage from './components/SettingsPage.jsx';
import NotificationBell from './components/NotificationBell.jsx';
import ThemeToggle from './components/ThemeToggle.jsx';
import OverviewView from './views/OverviewView.jsx';
import SpendingView from './views/SpendingView.jsx';
import { useAppConfig } from './hooks/useAppConfig.js';
import { useDashboardData } from './hooks/useDashboardData.js';
import { useFormatters } from './hooks/useFormatters.js';
import { useSync } from './hooks/useSync.js';
import { buildBudgetRows } from './lib/budgets.js';
import { RANGES, getPreviousRange } from './lib/dateRanges.js';
import { buildNotifications } from './lib/notifications.js';

export default function App() {
  const { t, language, formatCurrency } = useFormatters();
  const [view, setView] = useState('overview');
  const [rangeKey, setRangeKey] = useState('thisMonth');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showTrends, setShowTrends] = useState(false);

  const { savingsAccountWords, syncLookbackDays, authStatus } = useAppConfig();

  const activeRange = RANGES.find((r) => r.key === rangeKey);
  const range = { start: activeRange.start(), end: activeRange.end() };
  const previousRange = getPreviousRange(range, rangeKey);
  const rangeLabel = t(`periods.${rangeKey}`);

  const { data, error, setError, load, reconciliation, loadReconciliation } = useDashboardData({ range, previousRange, rangeKey });
  const sync = useSync({ load, loadReconciliation, setError });

  const budgetRows = buildBudgetRows(data.budgets, range);
  const notifications = buildNotifications({
    error,
    stats: data.stats,
    budgetRows,
    transactions: data.transactions,
    rangeLabel,
    syncNotification: sync.syncNotification,
    authStatus,
    reconciliation,
    formatCurrency,
  });

  const renderView = () => {
    switch (view) {
      case 'accounts':
        return <AccountsPage accounts={data.accounts} accountFlows={data.accountFlows} range={range} rangeLabel={rangeLabel} />;
      case 'savings':
        return <SavingsPage accounts={data.accounts} accountFlows={data.accountFlows} range={range} rangeLabel={rangeLabel} language={language} savingsAccountWords={savingsAccountWords} />;
      case 'categories':
        return <CategoryPanel rows={data.byCategory} previousRows={data.previousByCategory} trendRows={data.categoryTrends} previousTrendRows={data.previousCategoryTrends} rangeLabel={rangeLabel} onCategoryClick={setSelectedCategory} />;
      case 'trends':
        return <TrendsPanel current={data.spendingByDay} previous={data.previousSpendingByDay} rangeLabel={rangeLabel} />;
      case 'overview':
        return <OverviewView data={data} rangeKey={rangeKey} range={range} rangeLabel={rangeLabel} savingsAccountWords={savingsAccountWords} onNavigate={setView} />;
      case 'spending':
        return <SpendingView data={data} budgetRows={budgetRows} rangeLabel={rangeLabel} onSelectCategory={setSelectedCategory} onShowTrends={() => setShowTrends(true)} onNavigate={setView} />;
      case 'settings':
        return (
          <SettingsPage
            onForceFullSync={() => sync.handleSync(true)}
            syncing={sync.syncing}
            onPurge={sync.handlePurge}
            purging={sync.purging}
            syncLookbackDays={syncLookbackDays}
          />
        );
      default:
        return <TransactionsTable transactions={data.transactions} />;
    }
  };

  return (
    <div className="layout">
      <Sidebar
        active={view}
        onNavigate={setView}
        lastSync={data.stats?.lastSync}
        onSync={() => sync.handleSync()}
        syncing={sync.syncing}
      />

      <main className="main">
        <SyncBar syncing={sync.syncing} syncProgress={sync.syncProgress} syncNotification={sync.syncNotification} />
        <header className="top-bar">
          <h1>{t(`nav.${view}`)}</h1>
          <div className="top-bar-actions">
            <div className="range-toggle">
              {RANGES.map((r) => (
                <button
                  key={r.key}
                  className={`range-btn ${rangeKey === r.key ? 'range-btn-active' : ''}`}
                  onClick={() => setRangeKey(r.key)}
                >
                  {t(`periods.${r.key}`)}
                </button>
              ))}
            </div>
            <ThemeToggle />
            <NotificationBell notifications={notifications} />
          </div>
        </header>

        {renderView()}
      </main>
      {selectedCategory && <CategoryInsightsPanel rows={data.byCategory} category={selectedCategory} transactions={data.transactions} onClose={() => setSelectedCategory(null)} />}
      {showTrends && <TrendsDrawer current={data.spendingByDay} previous={data.previousSpendingByDay} rangeLabel={rangeLabel} onClose={() => setShowTrends(false)} />}
    </div>
  );
}
