import React, { useState } from 'react';

export default function NotificationPanel({ notifications }) {
  const [dismissed, setDismissed] = useState([]);

  const visible = (notifications || []).filter((notification) => 
    notification && 
    notification.id && 
    !dismissed.includes(notification.id)
  );
  if (visible.length === 0) return null;

  return (
    <section className="notification-panel" aria-label="Dashboard notifications">
      <div className="notification-heading">
        <div>
          <span className="eyebrow">System notices</span>
          <h2>Worth your attention</h2>
        </div>
        <span className="notification-count">{visible.length} active</span>
      </div>
      <div className="notification-list">
        {visible.map((notification) => {
          const title = typeof notification.title === 'string' ? notification.title : String(notification.title ?? '');
          const message = typeof notification.message === 'string' ? notification.message : String(notification.message ?? '');
          const level = notification.level || 'info';
          
          return (
            <article className={`notification-item notification-${level}`} key={notification.id}>
              <span className="notification-marker" aria-hidden="true" />
              <div>
                <strong>{title}</strong>
                <p>{message}</p>
              </div>
              <button
                className="notification-dismiss"
                type="button"
                aria-label={`Dismiss ${title}`}
                onClick={() => setDismissed((current) => [...current, notification.id])}
              >
                ×
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
