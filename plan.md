# Suggested next priorities
- [x] Implemented a lightweight dashboard notification panel for API failures, stale or missing syncs, overspent budgets, and empty periods. Notices can be dismissed for the current session.
- [ ] Remaining notification work: persist read state, add notification history, and expose richer sync diagnostics from the backend.
- [ ] Add backend sync-health diagnostics to support richer notifications
- [ ] Add backend route/API tests and a few contract checks
- [ ] Add sync-health and freshness indicators
- [ ] Keep refining the transaction/account visual consistency, which is now much closer
- [ ] add a progress bar for sync
- [ ] add auth system
- [ ] update readme and add secutity warning about exposing it
- [ ] add support for nested category names (see more info in ## 1 nested category name)
- [ ] add subscriptions insights plane ##2


## 1 nested category names 
firefly III itself does not support nested category names, but we should support it when users manually implement it in their naming scheme, example seperating category and sub category using `-` by example `[CATEGORY] - [SUBCATEGORY]`

## 2 subscription plane
adding a plane for monthly subscriptions, showing a wweight graph showing you what subscriptions cost most 