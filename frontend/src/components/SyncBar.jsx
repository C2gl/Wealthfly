import React from 'react';
import { useTranslation } from '../i18n.jsx';

export default function SyncBar({ syncing, syncNotification }) {
  const { t } = useTranslation();

  if (!syncing && !syncNotification) return null;

  return (
    <div className="sync-bar">
      {syncing ? (
        <div className="sync-bar-loading">
          <span className="sync-bar-spinner"></span>
          <span className="sync-bar-text">{t('sync.inProgress')}</span>
        </div>
      ) : syncNotification ? (
        <div className={`sync-bar-notification notification-${syncNotification.level}`}>
          <span className="sync-bar-marker" aria-hidden="true" />
          <div className="sync-bar-content">
            <strong className="sync-bar-title">{syncNotification.title}</strong>
            <p className="sync-bar-message">{syncNotification.message}</p>
          </div>
        </div>
      ) : (
        null
      )}
    </div>
  );
}
