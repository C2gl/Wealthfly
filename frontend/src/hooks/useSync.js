import { useEffect, useState } from 'react';
import { api } from '../api.js';

function countLabel(count, singular, plural = `${singular}s`) {
  if (count === null || count === undefined) return '';
  const n = Number(count);
  return `${n} ${n === 1 ? singular : plural}`;
}

function shortDate(date) {
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
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
          setSyncProgress({
            currentStep: status.currentStep,
            progress: status.progress,
            transactionsProcessed: status.transactionsProcessed ?? null,
          });
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

      const counts = [
        countLabel(result.accounts, 'account'),
        countLabel(result.categories, 'category', 'categories'),
        countLabel(result.tags, 'tag'),
        countLabel(result.transactions, 'transaction'),
      ];
      const summary = `Synced ${counts[0]}, ${counts[1]}, ${counts[2]}, and ${counts[3]}`;

      let message;
      if (full || !result.incremental || !result.lookbackStart) {
        message = `${summary} (full resync).`;
      } else {
        const start = new Date(result.lookbackStart);
        const diffDays = Math.max(0, Math.floor((Date.now() - start.getTime()) / 86400000));
        message = `${summary} from the last ${diffDays} days (since ${shortDate(start)}).`;
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
      await load();
      loadReconciliation();
    } catch (e) {
      setSyncNotification({
        id: `purge-failure-${Date.now()}`,
        level: 'critical',
        title: 'Purge failed',
        message: e.message,
      });
      setError(e.message);
    } finally {
      setPurging(false);
    }
  };

  return { syncing, syncProgress, syncNotification, purging, handleSync, handlePurge };
}
