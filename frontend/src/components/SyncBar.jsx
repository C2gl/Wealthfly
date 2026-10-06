import React, { useEffect, useState } from 'react';
import { useTranslation } from '../i18n.jsx';

const NOTIFICATION_TTL_MS = 6000;

export default function SyncBar({ syncing, syncProgress, syncNotification }) {
  const { t } = useTranslation();
  const [dismissedId, setDismissedId] = useState(null);

  // Result messages disappear on their own; the id changes on every sync so a
  // new result always shows again.
  useEffect(() => {
    if (syncing || !syncNotification) return undefined;
    const timer = setTimeout(() => setDismissedId(syncNotification.id), NOTIFICATION_TTL_MS);
    return () => clearTimeout(timer);
  }, [syncing, syncNotification]);

  const showNotification = !syncing && syncNotification && syncNotification.id !== dismissedId;
  if (!syncing && !showNotification) return null;

  if (syncing) {
    const step = syncProgress?.currentStep;
    const percent = Math.max(0, Math.min(100, Number(syncProgress?.progress) || 0));
    const label = step ? t(`sync.steps.${step}`) : t('sync.inProgress');

    // Show transaction count when in transactions step
    let txInfo = '';
    if (syncProgress && syncProgress.currentStep === 'syncing_transactions' && syncNotification?.transactionsProcessed !== null) {
      const n = Number(syncNotification.transactionsProcessed);
      txInfo = `<span style={{ color: '#666', fontSize: 0.85em }}>({n} transactions)</span>`;
    }

    return (
      <div className="sync-bar sync-bar-running" role="status" aria-live="polite">
        <span className="sync-bar-spinner" aria-hidden="true" />
        <span className="sync-bar-text">{label}</span>
        <div
          className="sync-bar-track"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
        >
          <div className="sync-bar-fill" style={{ width: `${percent}%` }} />
        </div>
        <span className="sync-bar-percent">{percent}%</span>
        {txInfo && <span className="sync-bar-count">{txInfo}</span>}
      </div>
    );
  }

  return (
    <div className={`sync-bar sync-bar-${syncNotification.level}`} role="status" aria-live="polite">
      <span className="sync-bar-marker" aria-hidden="true" />
      <strong className="sync-bar-title">{syncNotification.title}</strong>
      <span className="sync-bar-message">{syncNotification.message}</span>
      <button type="button" className="sync-bar-close" onClick={() => setDismissedId(syncNotification.id)} aria-label="Dismiss">
        ×
      </button>
    </div>
  );
}
