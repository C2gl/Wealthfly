import React from 'react';
import { useTranslation } from '../i18n.jsx';

const NAV = [
  { key: 'overview' },
  { key: 'accounts' },
  { key: 'spending' },
  { key: 'categories' },
  { key: 'trends' },
  { key: 'transactions' },
];

export default function Sidebar({ active, onNavigate, lastSync, onSync, syncing }) {
  const { t, formatDate } = useTranslation();

  return (
    <aside className="sidebar">
      <div className="wordmark">
        <span className="wordmark-mark">W</span>
        <span className="wordmark-text">Wealthfly</span>
      </div>

      <nav className="nav">
        {NAV.map((item) => (
          <button
            key={item.key}
            className={`nav-item ${active === item.key ? 'nav-item-active' : ''}`}
            onClick={() => onNavigate(item.key)}
          >
            {t(`nav.${item.key}`)}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sync-status">
          <span className="sync-label">{t('sync.lastSynced')}</span>
          <span className="sync-value">
            {lastSync ? formatDate(new Date(lastSync), { dateStyle: 'medium', timeStyle: 'short' }) : t('sync.never')}
          </span>
        </div>
        <button className="sync-button" onClick={onSync} disabled={syncing}>
          {syncing ? t('sync.inProgress') : t('sync.now')}
        </button>
      </div>
    </aside>
  );
}
