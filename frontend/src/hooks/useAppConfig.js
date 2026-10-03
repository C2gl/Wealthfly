import { useEffect, useState } from 'react';
import { api } from '../api.js';

// Server-provided settings and login state; fetched once on mount.
export function useAppConfig() {
  const [savingsAccountWords, setSavingsAccountWords] = useState(null);
  const [syncLookbackDays, setSyncLookbackDays] = useState(null);
  const [authStatus, setAuthStatus] = useState(null);

  useEffect(() => {
    api.config()
      .then((config) => {
        setSavingsAccountWords(config.savingsAccountWords);
        setSyncLookbackDays(config.syncLookbackDays);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    api.session()
      .then((session) => setAuthStatus(session))
      .catch(() => {});
  }, []);

  return { savingsAccountWords, syncLookbackDays, authStatus };
}
