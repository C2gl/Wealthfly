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
- [x] **Sync Lock / Mutex**: Implemented in-memory/DB sync lock (`isSyncing`) with 10-minute watchdog timeout, graceful cron/boot skipping, HTTP 409 Conflict handling on `/api/sync`, sync status reporting (`GET /api/sync/status`), frontend polling every 2s, and comprehensive unit tests.
- [x] **Incremental sync**: every sync after the first only re-fetches and re-applies a trailing window (`SYNC_LOOKBACK_DAYS` in `.env`, default 30) instead of the full history, catching backdated/edited transactions within that window. First-ever sync (and `POST /api/sync?full=true`) still does a complete historical sync. See `runSync`/`runIncrementalSync` in `sync.js`.

## Now
- [ ] **Fix CI Docker Push on PR**: Update `.github/workflows/test.yml` so pull requests do not push images to GHCR (`push: ${{ github.event_name != 'pull_request' }}`).
- [ ] **Timezone-safe Date Formatting**: Replace `new Date().toISOString().slice(0, 10)` in `utils.js` and `reconcile.js` with local year/month/day formatting to avoid off-by-one date and month boundary bugs for users in non-UTC time zones.
- [ ] **Dynamic Savings Bucket Matching**: Update `accountBucket` in `AccountsPage.jsx` to use `RECURENT_WORD_IN_SAVING_ACCOUNTS` (from `/api/config`) instead of hardcoded regex `/saving/`.
- [ ] Add backend sync-health diagnostics to support richer notifications
- [ ] Remaining notification work: persist read state, add notification history
- [ ] Add backend route/API tests and a few contract checks

## Next
- [ ] **Cache Budgets in SQLite**: Persist budgets and limits in SQLite during `runFullSync` rather than making live N+1 HTTP calls to Firefly on every dashboard render (`GET /api/budgets`).
- [ ] **Dashboard Composite Endpoint**: Consolidate summary queries into a single endpoint (e.g., `GET /api/summary/dashboard`) to eliminate the 14 concurrent HTTP requests fired by `App.jsx` on date range changes.
- [ ] **CI Frontend Validation**: Add frontend build (`npm run build`) and lint verification to CI before building the Docker image.
- [ ] Add a progress bar for sync
- [ ] Add sync-health and freshness indicators

## Later / backlog
- [ ] **Multi-Currency Support**: Add primary currency filtering or currency conversion awareness to avoid blending distinct currencies (e.g., EUR and USD) 1:1.
- [ ] **ID-based Account Flows**: Aggregate account flows in `summary.js` by `source_id`/`destination_id` rather than account names to avoid collision/rename bugs.
- [ ] **Sync Endpoint Rate Limiting**: Protect `POST /api/sync` against rapid repeated triggers.
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

---

## Architectural Feedback & Observations

### 1. Data Integrity & Sync Mechanics
- **Sync Concurrency**: `runFullSync()` lacks a concurrency lock. Simultaneous syncs wipe SQLite tables concurrently and can cause `SQLITE_BUSY` errors or corrupted transient states.
- **Memory on Large Ledgers**: `fetchAllPages` accumulates all transaction groups into a single JavaScript array in memory before insertion. Now only the first sync (and a forced `full=true` resync) pays this cost against the entire history — regular syncs only buffer the `SYNC_LOOKBACK_DAYS` window. Still worth paging directly into SQLite batches for very large full-history syncs.
- **Budgets Bypass Local Cache**: Unlike accounts and transactions, `/budgets` performs live Firefly API queries with N+1 calls for budget limits. This contradicts the local SQLite cache design and makes the dashboard vulnerable to external latency/outages.

### 2. Frontend & API Performance
- **14-Request Fan-out**: Switching date filters in `App.jsx` triggers 14 concurrent HTTP calls via `Promise.all`. Under HTTP/1.1 without multiplexing, this saturates browser socket pools and causes redundant SQLite queries. A single composite dashboard endpoint would significantly improve load times.

### 3. Date & Timezone Handling
- **ISO Slice Date Traps**: Deriving YYYY-MM-DD via `toISOString().slice(0, 10)` on local `Date` instances causes off-by-one errors near midnight for users in timezones with non-zero UTC offsets. Local date parts (`getFullYear()`, `getMonth()`, `getDate()`) should be used instead.

### 4. CI/CD & Pipeline Safety
- **Docker Push on PRs**: The workflow in `.github/workflows/test.yml` currently sets `push: true` for all trigger types including `pull_request`, risking failed runs or unintended image pushes from branches/forks.
- **Frontend Build in CI**: Frontend builds are only validated inside Docker rather than as a standalone test matrix step.
