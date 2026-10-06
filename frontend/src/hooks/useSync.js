import { useEffect, useState } from 'react';
import { api } from '../api.js';

// Format a lookback start date into a human-readable string like "14 days ago (Oct 9)" or "just now"
function formatLookbackWindow(startDate) {
  if (!startDate) return '';
  const start = new Date(startDate);
  const today = new Date();
  const diffMs = today.getTime() - start.getTime();
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays <= 1) {
    return `~${diffDays} days ago (${start.toLocaleDateString([], { month: 'short', day: 'numeric' })})`;
  }
  if (diffDays <= 7) {
    return `~${diffDays} days ago (${start.toLocaleDateString([], { month: 'short', day: 'numeric' })})`;
  }

  const todayShort = today.toLocaleDateString([], { month: 'short', day: 'numeric' });
  return `${diffDays} days ago (${todayShort}, from ${start.toLocaleDateString([], { month: 'short', day: 'numeric' })})`;
}

function countLabel(count, singular) {
  if (count === null || count === undefined) return '';
  const n = Number(count);
  return `${n} ${singular}${n !== 1 && n > 0 ? 's' : ''}`;
}

// Sync / purge state, the manual actions, and the status polling.
// `load` and `loadReconciliation` refresh the dashboard once a sync or purge finishes.
export function useSync({ load, loadReconciliation, setError }) {
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(null);
  const [syncNotification, setSyncNotification] = useState(null);
  const [purging, setPurging] = useState(false);

  // Pick up a sync that is already running when the page opens.
  useEffect(() => {
    api.syncStatus()
      .then((status) => {
        if (status?.inProgress) {
          setSyncing(true);
        }
      })
      .catch(() => {});
  }, []);

  // Poll always: fast while a sync is visible, slowly otherwise so syncs started
  // elsewhere (the cron job, another tab) still make the bar appear.
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const status = await api.syncStatus();
        if (status?.inProgress) {
          setSyncProgress({ currentStep: status.currentStep, progress: status.progress });
          if (!syncing) setSyncing(true);
        } else if (syncing) {
          setSyncing(false);
          setSyncProgress(null);
          await load();
          loadReconciliation();
        }
      } catch {
        // Keep polling on transient failure
      }
    }, syncing ? 1000 : 10000);
    return () => clearInterval(interval);
  }, [syncing, load, loadReconciliation]);

  const handleSync = async (full = false) => {
    setSyncing(true);
    try {
      const result = await api.triggerSync({ full });
      if (result.inProgress) {
        setSyncNotification({
          id: `sync-info-${Date.now()}`,
          level: 'info',
          title: 'Sync in progress',
          message: 'A sync is already running in the background. Results will refresh automatically when finished.',
        });
        return;
      }

      let message;
      if (full || !result.incremental) {
        // Full resync — show all counts
        message = `Synced ${countLabel(result.accounts, 'account')} accounts, ${countLabel(result.categories, 'category')} categories, ${countLabel(result.tags, 'tag')} tags, and ${countLabel(result.transactions, 'transaction')} transactions (full resync).`;
      } else {
        // Incremental sync — show window context + transaction count
        const start = new Date(result.lookbackStart);
        const diffDays = Math.floor((new Date() - start) / 86400000);

        message = `Synced ${countLabel(result.accounts, 'account')} accounts, ${countLabel(result.categories, 'category')} categories, ${countLabel(result.tags, 'tag')} tags, and **${countLabel(result.transactions, 'transaction')} transactions** from the last ${diffDays} days (${start.toLocaleDateString([], { month: 'short', day: 'numeric' })}).`;
      }

      setSyncNotification({
        id: `sync-success-${Date.now()}`,
        level: 'success',
        title: 'Sync completed',
        message,
      });

      await load();
      loadReconciliation();
    } catch (e) {
      setSyncNotification({
        id: `sync-failure-${Date.now()}`,
        level: 'critical',
        title: 'Sync failed',
        message: e.message,
      });
      setError(e.message);
    } finally {
      setSyncing(false);
    }
  };

  const handlePurge = async () => {
    setPurging(true);
    try {
      const result = await api.purge();
      if (result.inProgress) {
        setSyncNotification({
          id: `purge-info-${Date.now()}`,
          level: 'info',
          title: 'Sync in progress',
          message: 'Cannot purge while a sync is running. Try again once it finishes.',
        });
        return;
      }

      setSyncNotification({
        id: `purge-success-${Date.now()}`,
        level: 'success',
        title: 'Data purged',
        message: 'All locally cached data was cleared. Run a sync to rebuild it from Firefly III.',
      });
    } catch (e) {
      setSyncNotification({
        id: `purge-failure-${Date.now()}`,
        level: 'critical',
        title: 'Purge failed',
        message: e.message,
      });
    } finally {
      setPurging(false);
    }
  };

  return { syncing, syncProgress, syncNotification, purging, handleSync, handlePurge };
}
