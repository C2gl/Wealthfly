import { formatCurrency as defaultFormatCurrency } from '../utils.js';

const DAY_MS = 24 * 60 * 60 * 1000;

export function buildNotifications({
  error,
  stats,
  budgetRows,
  transactions,
  rangeLabel,
  syncNotification,
  authStatus,
  reconciliation,
  formatCurrency = defaultFormatCurrency,
}) {
  const notifications = [];

  if (syncNotification) notifications.push(syncNotification);

  if (authStatus && !authStatus.authRequired) {
    notifications.push({
      id: 'no-auth',
      level: 'warning',
      title: 'No password set',
      message: 'Wealthfly is running without a login — anyone who can reach it can view your data. Set WEALTHFLY_PASSWORD in .env.',
    });
  }

  if (reconciliation && reconciliation.drift) {
    const labels = { income: 'income', expenses: 'expenses', netWorth: 'net worth' };
    const mismatches = Object.keys(labels).filter((key) => reconciliation[key]?.drift);
    const detail = mismatches
      .map((key) => `${labels[key]}: ${reconciliation[key].local} vs Firefly's ${reconciliation[key].firefly}`)
      .join('; ');
    notifications.push({
      id: 'reconciliation-drift',
      level: 'warning',
      title: "Totals don't match Firefly",
      message: `For ${reconciliation.start} to ${reconciliation.end} — ${detail}. Usually means a sync didn't fully complete; try running a sync.`,
    });
  }

  if (error && syncNotification?.level !== 'critical') {
    notifications.push({
      id: 'api-error',
      level: 'critical',
      title: 'Dashboard data is unavailable',
      message: error,
    });
  }

  if (stats) {
    const lastSyncTime = stats.lastSync ? new Date(stats.lastSync).getTime() : 0;
    const syncAge = lastSyncTime ? Date.now() - lastSyncTime : Infinity;
    if (!lastSyncTime || syncAge > DAY_MS) {
      notifications.push({
        id: 'stale-sync',
        level: 'warning',
        title: stats.lastSync ? 'Data may be stale' : 'Data has not synced yet',
        message: stats.lastSync
          ? `Last successful sync: ${new Date(stats.lastSync).toLocaleString()}.`
          : 'Run a sync to load the latest Firefly III data.',
      });
    }
  }

  budgetRows.filter((row) => row.target > 0 && row.spent > row.target).forEach((row) => {
    notifications.push({
      id: `budget-${row.id}`,
      level: 'warning',
      title: `${row.name} is over budget`,
      message: `${formatCurrency(row.spent, row.currency)} spent against a ${formatCurrency(row.target, row.currency)} target.`,
    });
  });

  if (stats && transactions.length === 0) {
    notifications.push({
      id: 'empty-period',
      level: 'info',
      title: `No transactions in ${rangeLabel}`,
      message: 'Try a wider date range or check that the latest sync completed.',
    });
  }

  return notifications;
}
