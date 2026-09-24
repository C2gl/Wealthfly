import React, { useState } from 'react';
import { useTranslation } from '../i18n.jsx';

export default function LoginScreen({ onLoggedIn }) {
  const { t } = useTranslation();
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
      setError(err.message === 'invalid password' ? t('auth.incorrectPassword') : t('auth.loginFailed'));
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
        <p className="login-subtitle">{t('auth.subtitle')}</p>
        <input
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t('auth.passwordPlaceholder')}
          className="login-input"
        />
        {error ? <div className="login-error">{error}</div> : null}
        <button type="submit" className="login-submit" disabled={submitting || !password}>
          {submitting ? t('auth.checking') : t('auth.unlock')}
        </button>
      </form>
    </div>
  );
}