import React, { useEffect, useState, useCallback } from 'react';
import LoginScreen from './LoginScreen.jsx';

export default function AuthGate({ children }) {
  const [status, setStatus] = useState('checking'); // checking | locked | unlocked

  const checkSession = useCallback(async () => {
    try {
      const res = await fetch('/api/session');
      const body = await res.json();
      setStatus(!body.authRequired || body.authenticated ? 'unlocked' : 'locked');
    } catch {
      // If the session check itself fails, fail open rather than stranding the
      // user on a blank screen — the actual data calls will still 401 if auth
      // is required, and that surfaces the login screen via handleUnauthorized.
      setStatus('unlocked');
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  // Any protected fetch elsewhere in the app can call this (via a 401 response)
  // to drop back to the login screen once a session has expired.
  useEffect(() => {
    function handleUnauthorized() {
      setStatus('locked');
    }
    window.addEventListener('wealthfly:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('wealthfly:unauthorized', handleUnauthorized);
  }, []);

  if (status === 'checking') return null;
  if (status === 'locked') {
    return <LoginScreen onLoggedIn={() => setStatus('unlocked')} />;
  }
  return children;
}
