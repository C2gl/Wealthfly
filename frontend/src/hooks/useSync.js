import { useEffect, useState } from 'react';
import { api } from '../api.js';

export function useSync({ load, loadReconciliation, setError }) {
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(null);
  const [syncNotification, setSyncNotification] = useState(null);
  const [purging, setPurging] = useState(false);

  useEffect(() => {
    api.syncStatus().then((status) => {
      if (status?.inProgress) setSyncing(true);
    }).catch(() => {});
  }, []);

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
      } catch { /* transient failure */ }
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
          message: 'A sync is already running in the background.',
        });
        return;
      }

      const msg = full || !result.incremental 
        ? `Full resync complete.`
        : `Synced from last ${getDaysSince(result.lookbackStart)} days.`;

      setSyncNotification({
        id: `sync-success-${Date.now()}`,
        level: 'success',
        title: 'Sync completed',
        message: msg,
        dismissedAt: Date.now(),
      });
    } catch (e) {
      setError(e);
    } finally {
      setSyncing(false);
    }
  };

  const handlePurge = async () => {
    setPurging(true);
    try { await api.purge(); await load(); loadReconciliation(); }
    catch (e) { /* error handled by notification */ } finally { setPurging(false); }
  };

  return { syncing, syncProgress, syncNotification, purging, handleSync, handlePurge };
}