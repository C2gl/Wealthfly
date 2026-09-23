import React, { useState } from 'react';

export default function LoginScreen({ onLoggedIn }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'invalid password');
      }
      onLoggedIn();
    } catch (err) {
      setError(err.message === 'invalid password' ? 'Incorrect password.' : 'Login failed — try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-screen">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="wordmark login-wordmark">
          <span className="wordmark-mark" />
          <span className="wordmark-text">Wealthfly</span>
        </div>
        <p className="login-subtitle">Enter the dashboard password to continue.</p>
        <input
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="login-input"
        />
        {error ? <div className="login-error">{error}</div> : null}
        <button type="submit" className="login-submit" disabled={submitting || !password}>
          {submitting ? 'Checking…' : 'Unlock'}
        </button>
      </form>
    </div>
  );
}
