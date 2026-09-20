import React, { useEffect, useRef, useState } from 'react';

function BellIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3a5 5 0 0 0-5 5v2.7c0 .6-.18 1.19-.52 1.68L5 15.2c-.6.87.02 2.05 1.08 2.05h11.84c1.06 0 1.68-1.18 1.08-2.05l-1.48-2.82A3 3 0 0 1 17 10.7V8a5 5 0 0 0-5-5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M9.5 19a2.5 2.5 0 0 0 5 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export default function NotificationBell({ notifications }) {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState([]);
  const rootRef = useRef(null);

  const visible = notifications.filter((notification) => !dismissed.includes(notification.id));

  useEffect(() => {
    function handleOutsideClick(event) {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false);
    }
    function handleEscape(event) {
      if (event.key === 'Escape') setOpen(false);
    }
    if (open) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  // Notifications can disappear on their own (e.g. a sync completes) — if the
  // panel is open and the active list empties out, close it rather than leaving
  // an empty dropdown hanging open.
  useEffect(() => {
    if (open && visible.length === 0) setOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible.length]);

  const hasCritical = visible.some((n) => n.level === 'critical');

  return (
    <div className="notification-bell-root" ref={rootRef}>
      <button
        type="button"
        className={`notification-bell ${visible.length ? 'notification-bell-active' : ''}`}
        aria-label={visible.length ? `${visible.length} notifications` : 'No notifications'}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <BellIcon />
        {visible.length > 0 && (
          <span className={`notification-badge ${hasCritical ? 'notification-badge-critical' : ''}`}>
            {visible.length}
          </span>
        )}
      </button>

      {open && (
        <div className="notification-dropdown" role="menu" aria-label="Dashboard notifications">
          <div className="notification-dropdown-heading">
            <span>Notifications</span>
            <span className="notification-count">{visible.length} active</span>
          </div>
          {visible.length === 0 ? (
            <p className="notification-empty">You're all caught up.</p>
          ) : (
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
          )}
        </div>
      )}
    </div>
  );
}
