# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### [Develop Branch]
- Work in progress, don't use this for production
- Features being worked on will be listed here

## [1.0.0] - 2026-09-XX

### Added
- Initial release with core features
- Dashboard with net-worth chart and spending analytics
- Transaction table with search and filtering
- Account management with sync from Firefly III
- Authentication system with shared password
- Notification panel for API failures and sync issues
- Reconciliation check after each sync
- Sync lock/mutex to prevent concurrent syncs
- Incremental sync support for recent transactions
- Date range filtering (this month, previous month, custom ranges)
- Monthly summary reports
- Category and tag aggregations
- Budget tracking with categories
- Currency awareness (single currency per session)

### Changed
- Date filtering now uses `substr(date, 1, 10)` for timezone-safe comparisons

### Fixed
- Date-range filtering bug: transactions stored full timestamps while range filters compared plain dates, causing last day of any period to be excluded from income/expense totals
- Frontend build and lint verification in CI

### Deprecated
- None

### Removed
- None

### Security
- Authentication warning in README about exposing the app
- Login screen translated (en/fr) via i18n

---

## [0.x.x] - [Previous Versions]

*Details to be filled in as previous versions are added.*

---

## Version Branching

- **Latest**: Most recent production release from `main` branch
- **Dev**: Development builds from `develop` branch (for testing)
- **vX.Y.Z**: Tagged releases following Semantic Versioning

## Tag Format

Tags follow Semantic Versioning (SemVer):
- `vMAJOR.MINOR.PATCH`
  - MAJOR: Breaking changes, incompatible with previous version
  - MINOR: New features, backward-compatible
  - PATCH: Bug fixes only, backward-compatible

Example:
- `v1.0.0` → Initial release
- `v1.1.0` → New feature added
- `v1.0.1` → Bug fixed