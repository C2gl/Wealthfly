# Suggested next priorities

## Done
- [x] Notification panel for API failures, stale/missing syncs, overspent budgets, and empty periods. Notices can be dismissed for the current session.
- [x] Auth system: single shared password via `.env` (`WEALTHFLY_PASSWORD`), signed session cookie — see README "Authentication"
- [x] README security warning about exposing the app without auth
- [x] Notification warning shown in-app when no password is set
- [x] Login screen strings translated (en/fr) via i18n
- [x] Fixed date-range filtering bug: `transactions` stored full timestamps while range filters compared plain dates, silently dropping the last day of any period from income/expense totals — the root cause of the in/out mismatch vs Firefly. Fixed by filtering on `substr(date, 1, 10)` in `data.js` and `summary.js`.
- [x] Added "This month" and "Previous month" date ranges (now the default view), matching Firefly's own month-based reporting for easier manual sanity checks
- [x] Overview net-worth chart now spans the full current month on the x-axis, with the line stopping at today instead of extending into the future
- [x] Reconciliation check: after each sync, compares Wealthfly's income/expenses/net-worth for the current month against Firefly's own `/summary/basic`, storing the result (`reconcile.js`, `sync.js`) and surfacing drift as a dashboard notification (tolerance: 0.5, currently un-localized like the rest of the notification system)

## Now
- [ ] Add backend sync-health diagnostics to support richer notifications
- [ ] Remaining notification work: persist read state, add notification history
- [ ] Add backend route/API tests and a few contract checks

## Next
- [ ] Add a progress bar for sync
- [ ] Add sync-health and freshness indicators

## Later / backlog
- [ ] Keep refining the transaction/account visual consistency, which is now much closer
- [ ] Add support for nested category names (see below)
- [ ] Add subscriptions insights plane (see below)
- [ ] Clear cache and prune the SQLite DB (see below)

### Nested category names
Firefly III itself does not support nested category names, but we should support it when users manually implement it in their naming scheme, example separating category and sub category using `-`, for example `[CATEGORY] - [SUBCATEGORY]`.

### Subscriptions plane
Adding a plane for monthly subscriptions, showing a chart of which subscriptions cost the most.

### Clear SQLite cache
An option for the user to do a clean sync, to fully prune the DB — should be implemented after a sequential sync.
