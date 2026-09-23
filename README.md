# Wealthfly - AI generated

A self-hosted dashboard that pulls your expense data out of [Firefly III](https://www.firefly-iii.org/)
via its REST API and displays it in a Wealthfolio-style dashboard: net worth over time, spending by
category, spending by target account, spending by tag, and a searchable transaction table.

It ships as a single Docker container: an Express API that syncs Firefly III data into a local SQLite
cache, serving a built React + Recharts frontend.

> **⚠️ Security warning: there is no authentication.**
> Wealthfly has no login, no API key, and no built-in access control of any kind. Anyone who can
> reach `http://<host>:4400` can view your full financial data and trigger a sync. Do not expose
> this port to the public internet.
>
> - **Recommended**: only bind it to `localhost` or your local network, and access it remotely (if
>   needed) over a VPN (e.g. WireGuard, Tailscale) or an SSH tunnel.
> - **If you must expose it externally**, put it behind a reverse proxy (e.g. Caddy, Traefik, Nginx)
>   configured with its own authentication (basic auth, OAuth2 Proxy, Authelia, etc.) — never port-forward
>   `4400` (or the port your selected) directly to the internet.
> - A built-in auth system is on the roadmap (see `plan.md`) but is not implemented yet.

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

### Branch workflow

Keep `main` deployable and create a branch for each feature or fix:

```bash
git switch main
git pull --ff-only
git switch -c feature/short-description
```

Commit focused changes on the branch, run the local checks, then open a pull request into `main`. Do not commit `.env`, database files, or generated build output.

Docker images pushed from `main` are published as `:latest`. Images pushed from other branches are
published as `:dev` (and also receive their branch and commit tags), so branch testing does not replace
the production image tag. To run the branch image locally:

```bash
WEALTHFLY_IMAGE_TAG=dev docker compose pull
WEALTHFLY_IMAGE_TAG=dev docker compose up -d
```

## Notes / things you may want to tune

- **Multi-currency**: amounts are stored and summed as-is per Firefly's reported values; if you run
  multiple currencies the totals in the charts will mix them. If that matters to you, filter by
  account/currency, or extend `sync.js` to convert to a base currency using Firefly's exchange rate
  data.
- **Account types included in net worth**: Firefly `asset`, `cash`, and `liability` accounts are
  included when their `include_net_worth` flag is enabled. Liability subtypes (`loan`, `debt`, and
  `mortgage`) are represented by Firefly as `type: liability`.
- **Sync frequency**: set `SYNC_CRON` in `.env` (standard cron syntax).
