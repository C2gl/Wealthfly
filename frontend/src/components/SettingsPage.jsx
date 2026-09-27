import React, { useState } from 'react';
import { useTranslation } from '../i18n.jsx';

export default function SettingsPage({ onForceFullSync, syncing, onPurge, purging, syncLookbackDays }) {
  const { t } = useTranslation();
  const [confirmingPurge, setConfirmingPurge] = useState(false);

  return (
    <div className="settings-page">
      <section className="panel settings-panel">
        <div className="panel-heading-row"><h2>{t('settings.syncTitle')}</h2></div>
        <p className="settings-description">
          {t('settings.syncDescription', { days: syncLookbackDays ?? 30 })}
        </p>
        <button className="settings-button" onClick={onForceFullSync} disabled={syncing}>
          {syncing ? t('sync.inProgress') : t('settings.forceFullResync')}
        </button>
      </section>

      <section className="panel settings-panel settings-panel-danger">
        <div className="panel-heading-row"><h2>{t('settings.dangerTitle')}</h2></div>
        <p className="settings-description">{t('settings.dangerDescription')}</p>
        {!confirmingPurge ? (
          <button
            className="settings-danger-button"
            onClick={() => setConfirmingPurge(true)}
            disabled={purging}
          >
            {t('settings.purgeButton')}
          </button>
        ) : (
          <div className="settings-confirm-row">
            <span>{t('settings.purgeConfirm')}</span>
            <button
              className="settings-danger-button"
              onClick={() => {
                setConfirmingPurge(false);
                onPurge();
              }}
              disabled={purging}
            >
              {purging ? t('sync.inProgress') : t('settings.purgeConfirmButton')}
            </button>
            <button className="settings-button-secondary" onClick={() => setConfirmingPurge(false)}>
              {t('settings.cancel')}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
