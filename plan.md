# Wealthfly product plan

## remainder / roadmap

- [x] accounts
- [ ] trends
- [x] categories
- [x] overview organisation
- [ ] savings plan

## accounts
show spendings and income per account, maybe in bar style when in collapsed view, but let the user uncollapse the account on the account plane to see all transactions in the current period for that account.

## trends
add stronger multi-period trend analysis, including comparing the selected period to the previous period and highlighting major changes by category, account and spending rhythm.

## categories
have the categories plane include some kind of trend too, per category to show the difference between current period and previous period.

## organise overview
the current overview plane got cluttered by the addition of features and features. we should consider making smaller widgeted previews of the different information, and have them be clickable to the proper side panel when more insight is wanted by the user.

## savings
add savings goals and planned contributions, so the dashboard can move beyond spending analysis into financial planning.

## product review / feedback

### what is strong
- the project has a clear value proposition: a self-hosted dashboard that syncs Firefly III data into a local cache and visualizes net worth, spending and transactions.
- the architecture is clean and understandable: backend sync + API + frontend dashboard + Docker packaging.
- the repo has a real MVP feel, not just a demo: it is already useful for an individual or household managing finances.
- the Docker setup is simple and low-friction for deployment.

### main gaps / missing pieces
- no automated tests or CI pipeline; this makes regressions hard to catch.
- no auth or hardened deployment strategy; useful for private usage, but not robust enough for a public-facing deployment.
- no retry / backoff / sync-lock handling in the Firefly sync flow; a flaky API or overlapping syncs could create inconsistent numbers.
- data correctness limitations are not fully addressed: multi-currency totals are mixed as-is, and financial edge cases such as transfers, liabilities, and anomalies are not strongly validated.
- operational tooling is thin: no database backup strategy, health checks, schema migration story, or recovery plan.
- product UX is still dashboard-heavy and more “data display” than “decision support.”

### biggest priorities
1. add tests and CI for backend and frontend
2. add sync safety: retries, locking, partial-failure handling, and better logging
3. harden deployment: auth, reverse proxy guidance, secure configuration, rate limiting
4. improve data correctness: better multi-currency handling, reconciliation checks, anomaly detection
5. add more real financial-product features: goals, savings planning, trend alerts, and more actionable insights

### honest assessment
this is a very solid MVP, but it still reads like an internal tool or prototype rather than a durable personal finance product. the biggest missing step is not more charts; it is reliability, trust, and product hardening. if the goal is long-term usefulness, the next focus should be tests, sync correctness, and better decision-support features rather than only adding more widgets.

---

## next actions
- [ ] add backend/frontend test setup
- [ ] add sync retries and conflict protection
- [ ] improve data validation and reconciliation logging
- [ ] add auth / deployment hardening guidance
- [ ] add user-facing notification system for sync and data issues
- [ ] work on savings goals and targeted insights
- [ ] refine overview layout into clearer, smaller actionable widgets

## notification system / issue surfacing

we should also add a notification layer so the app communicates problems to the user directly on the dashboard, instead of only failing silently or logging to the backend console.

### why this matters
- when sync fails, users should see a warning immediately
- when data is stale, partial, or mismatched, the app should say so
- dashboards should surface trust issues as clearly as they surface financial metrics
- testing and API monitoring become much more valuable when they produce visible product feedback

### suggested design
- a `notifications` table in SQLite, storing:
  - id
  - type (`info`, `warning`, `error`)
  - source (`sync`, `firefly`, `data`, `budget`, `system`)
  - title
  - message
  - created_at
  - resolved_at
  - acknowledged
- an API endpoint such as `/api/notifications` to list active issues
- a dashboard banner / toast stack / alert center to render them at the top of the app
- a sync health status card showing last successful sync, current state, and warning count

### notification triggers
- Firefly API unavailable or token invalid
- sync started but failed partway through
- stale cache (last sync older than a threshold)
- missing / partial account or transaction data
- suspicious net-worth calculations or currency mismatches
- budget or category totals look implausible
- database or migration errors

### user experience
- warnings should be visible without opening a settings screen
- critical failures should pin banner state at the top of the overview
- less severe messages can appear as small toasts or a dedicated alert panel
- the UI should distinguish between informational, recoverable, and blocking issues

### implementation idea
- backend emits notifications when sync or validation fails
- frontend polls `/api/notifications` or receives the status with the main data payload
- the dashboard renders a single alert region and optionally an alert log drawer
- users can dismiss or acknowledge issues, but serious failures remain until resolved

this should be treated as part of the trust layer: if the app can detect a risk, it should tell the user in the interface before they trust the wrong numbers.