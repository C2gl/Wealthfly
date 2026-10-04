# Wealthfly - AI generated

A self-hosted dashboard that pulls your expense data out of [Firefly III](https://www.firefly-iii.org/)
via its REST API and displays it in a Wealthfolio-style dashboard: net worth over time, spending by
category, spending by target account, spending by tag, and a searchable transaction table.

It ships as a single Docker container: an Express API that syncs Firefly III data into a local SQLite
cache, serving a built React + Recharts frontend.

> **⚠️ Security warning: authentication is off by default.**
> Wealthfly ships with a single shared-password login (see [Authentication](#authentication)
> below), but it does nothing until you configure it — until then, anyone who can reach
> `http://<host>:4400` can view your full financial data and trigger a sync. Even with the
> password enabled, don't expose this port directly to the public internet: put it behind a VPN
> (e.g. WireGuard, Tailscale), an SSH tunnel, or a reverse-proxy with TLS.

## 1. Get a Firefly III Personal Access Token

In your Firefly III instance: **Options → Profile → OAuth → Personal Access Tokens → Create New Token**.
Copy the token — Firefly only shows it once.

## 2. Configure

```bash
cp .env.example .env
```

Edit `.env`:

```
FIREFLY_URL=https://firefly.example.com
FIREFLY_TOKEN=eyJ0eXAiOiJKV1Q...

# Dashboard language (available catalogs: en, fr)
WEALTHFLY_LANGUAGE=en
```

`FIREFLY_URL` is the base URL of your Firefly III instance — no trailing slash, no `/api` suffix.
`WEALTHFLY_LANGUAGE` is read by the running container, so it also works when using a prebuilt image.
`RECURENT_WORD_IN_SAVING_ACCOUNTS` is a comma-separated list of words used to identify savings
accounts by name, for example `RECURENT_WORD_IN_SAVING_ACCOUNTS=savings, investment`.
`FIREFLY_REQUEST_DELAY_MS` throttles the sync by waiting that many milliseconds between paginated
requests to Firefly (0 by default). Raise it if syncing noticeably strains a small/self-hosted
Firefly instance.
`SYNC_ON_STARTUP` (default `true`) controls the sync Wealthfly runs ~2s after boot, on top of the
`SYNC_CRON` schedule. Set it to `false` to skip that boot-time sync.

## Authentication

Wealthfly supports a single shared password (there are no separate user accounts — it's meant for
one household/instance). It's optional but strongly recommended.

Add these two lines to `.env`:

```
WEALTHFLY_PASSWORD=choose-a-strong-password
WEALTHFLY_SESSION_SECRET=some-long-random-string
```

Generate a good value for `WEALTHFLY_SESSION_SECRET` with:

```bash
openssl rand -hex 32
```

Restart the container (`docker compose up -d`). You'll now get a login screen; sessions are stored
in a signed, httpOnly cookie and last 30 days.

Leaving `WEALTHFLY_PASSWORD` unset keeps Wealthfly in its original, no-login mode (a warning is
logged on startup to remind you).

## 3. Run

```bash
docker compose pull
docker compose up -d
```

Wealthfly will be available at `http://<host>:4400`. On first boot it automatically runs an initial
sync (a few seconds to a couple of minutes depending on how many transactions you have), then
re-syncs on the schedule set by `SYNC_CRON` in `.env` (default: every 6 hours). You can also trigger a
sync any time from the "Sync now" button in the sidebar, or by calling:

```bash
curl -X POST http://<host>:4400/api/sync
```

> Remember: `4400` is unauthenticated — keep it on a trusted network or behind a proxy with auth
> (see the security warning above) before binding it to anything but `localhost`.

## How the data maps

Firefly III doesn't expose a single "net worth over time" endpoint, so this app reconstructs it: for
every asset/liability account it starts from that account's opening balance and replays every
transaction touching the account in date order. The daily balances across all accounts are then
summed into the net worth series shown on the dashboard.

For expenses, each transaction (`type: withdrawal`) has:
- a **source account** — the asset account money left from (e.g. "Checking")
- a **destination / target account** — the Firefly "expense account" it went to (e.g. "Landlord", "Grocery Store")
- an optional **category** and any number of **tags**

The dashboard breaks expenses down by category, by target account, and by tag, all filterable by
date range.

## Project layout

```
wealthfly/
├── backend/            # Express API + Firefly III sync + SQLite cache
│   └── src/
│       ├── fireflyClient.js   # paginated Firefly III v1 API client
│       ├── db.js              # SQLite schema
│       ├── sync.js            # pull + balance-history reconstruction
│       ├── index.js           # server entrypoint, cron schedule, static serving
│       └── routes/
├── frontend/           # React + Recharts dashboard (Vite)
│   └── src/
│       ├── locales/         # One JSON catalog per supported language
│       ├── i18n.jsx         # Translation provider and locale-aware formatters
├── Dockerfile          # multi-stage: builds frontend, bundles into backend image
├── docker-compose.yml
└── .env.example
```

### Adding a translation

User-facing UI text belongs in a catalog under `frontend/src/locales/`. Add the same key to
`en.json` and every supported catalog, then use `useTranslation().t('section.key')` in a component.
Keep keys grouped by feature and use `{{name}}` placeholders for dynamic values. Dates and numbers
should use the locale-aware formatters exposed by the translation context or the helpers in
`frontend/src/utils.js`; do not hard-code `en-US` in components.

To select a catalog in Docker Compose, set `WEALTHFLY_LANGUAGE` in `.env` and recreate the container:

```bash
WEALTHFLY_LANGUAGE=fr docker compose up -d
```

## Local development (without Docker)

Create a local environment file from the checked-in template:

```bash
cp .env.example .env
```

Fill in `FIREFLY_URL` and `FIREFLY_TOKEN` in `.env`. The backend loads this file automatically when started from the repository.

```bash
# terminal 1 — backend
cd backend
npm install
node src/index.js
node src/index.js

# terminal 2 — frontend (proxies /api to localhost:4400)
cd frontend
npm install
npm run dev
```

### Testing

```bash
cd backend && npm test    # node's built-in test runner
cd frontend && npm test   # vitest
```

CI runs both on every push and pull request, and only builds/pushes the Docker image if both pass.

### Branch workflow

Keep `main` deployable and create a branch for each feature or fix:

```bash
git switch main
git pull --ff-only
git switch -c feature/short-description
```

Commit focused changes on the branch, run the local checks, then open a pull request into `main`. Do not commit `.env`, database files, or generated build output.


## Releases & Versions

### Versioning Scheme

Wealthfly follows [Semantic Versioning (SemVer)](https://semver.org/spec/v2.0.0.html):

```
MAJOR.MINOR.PATCH
```

- **MAJOR**: Increment for breaking changes (incompatible with previous version)
- **MINOR**: Increment for new features (backward-compatible)
- **PATCH**: Increment for bug fixes only (backward-compatible)

### Docker Tags

| Tag | Description | Source | Use Case |
|-----|-------------|--------|----------|
| `latest` | Most recent production release | `main` branch | Production deployment |
| `dev` | Development builds | `develop` branch | Testing new features |
| `vX.Y.Z` | Tagged releases | Git tags | Specific stable version |

### Recommended Workflow

1. **Develop**: Work on feature branches (`feature/*`, `bugfix/*`), PR to `develop`
2. **Test Dev**: Use `:dev` image for testing new features
3. **Release**: When ready, merge to `main` and tag with `vX.Y.Z`

### Pulling Specific Versions

```bash
# Latest production
WEALTHFLY_IMAGE_TAG=latest docker compose pull

# Development
WEALTHFLY_IMAGE_TAG=dev docker compose pull

# Specific release
WEALTHFLY_IMAGE_TAG=v1.2.3 docker compose pull
```

### Checking the Current Version

```bash
# View the running container's version
docker inspect wealthfly | grep -A 1 "Env"

# Or check the Docker Hub/GitHub Packages
git tag # see available tags
```

### Releasing a New Version

1. Update `CHANGELOG.md` with your changes
2. Bump the version in the tag (e.g., `git tag -a v1.2.3 -m "Release 1.2.3"`)
3. Push the tag: `git push origin v1.2.3`
4. CI will:
   - Validate the tag format
   - Run tests
   - Build and push the Docker image
   - Create a GitHub Release with changelog notes

### Tag Format

- **Production releases**: Must be in `vMAJOR.MINOR.PATCH` format (e.g., `v1.2.3`)
- **Invalid tags** (not matching SemVer on `main`) will fail CI

### Development Tags

- Feature/bug branches (e.g., `feature/new-feature`, `bugfix-123`) trigger `:dev` builds
- Only `:dev` images are pushed from feature branches
- Never push feature branches directly to `main`

```bash
WEALTHFLY_IMAGE_TAG=dev docker compose pull
WEALTHFLY_IMAGE_TAG=dev docker compose up -d
```

