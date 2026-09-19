import React from 'react';

const NAV = [
  { key: 'overview', label: 'Overview' },
  { key: 'spending', label: 'Spending' },
  { key: 'transactions', label: 'Transactions' },
];

export default function Sidebar({ active, onNavigate, lastSync, onSync, syncing }) {
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
            {item.label}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sync-status">
          <span className="sync-label">Last synced</span>
          <span className="sync-value">
            {lastSync ? new Date(lastSync).toLocaleString() : 'never'}
          </span>
        </div>
        <button className="sync-button" onClick={onSync} disabled={syncing}>
          {syncing ? 'Syncing…' : 'Sync now'}
        </button>
      </div>
    </aside>
  );
}
