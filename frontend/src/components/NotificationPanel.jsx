import React, { useState } from 'react';

export default function NotificationPanel({ notifications }) {
  const [dismissed, setDismissed] = useState([]);

  const visible = notifications.filter((notification) => !dismissed.includes(notification.id));
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
        {visible.map((notification) => (
          <article className={`notification-item notification-${notification.level}`} key={notification.id}>
            <span className="notification-marker" aria-hidden="true" />
            <div>
              <strong>{notification.title}</strong>
              <p>{notification.message}</p>
            </div>
            <button
              className="notification-dismiss"
              type="button"
              aria-label={`Dismiss ${notification.title}`}
              onClick={() => setDismissed((current) => [...current, notification.id])}
            >
              ×
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
