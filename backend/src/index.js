const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const cron = require('node-cron');

const authRoutes = require('./routes/auth');
const dataRoutes = require('./routes/data');
const summaryRoutes = require('./routes/summary');
const db = require('./db');
const { runFullSync, isSyncInProgress } = require('./sync');
const { authEnabled, requireAuth } = require('./auth');

const PORT = process.env.PORT || 4400;
const SYNC_CRON = process.env.SYNC_CRON || '0 */6 * * *'; // every 6 hours by default
const SAVINGS_ACCOUNT_WORDS = (process.env.RECURENT_WORD_IN_SAVING_ACCOUNTS || 'saving,epargne,épargne')
  .split(',')
  .map((word) => word.trim())
  .filter(Boolean);

const SESSION_SECRET = process.env.WEALTHFLY_SESSION_SECRET || 'insecure-dev-secret-change-me';
if (authEnabled() && !process.env.WEALTHFLY_SESSION_SECRET) {
  console.warn(
    '[auth] WEALTHFLY_PASSWORD is set but WEALTHFLY_SESSION_SECRET is not. ' +
      'Using an insecure default — set WEALTHFLY_SESSION_SECRET in .env (e.g. `openssl rand -hex 32`).'
  );
}
if (!authEnabled()) {
  console.warn(
    '[auth] No WEALTHFLY_PASSWORD set — Wealthfly is running with NO LOGIN. ' +
      'Anyone who can reach this port can view your data. See README for how to enable auth.'
  );
}

const app = express();
app.use(cors());
app.use(express.json());
app.use(cookieParser(SESSION_SECRET));

// Auth routes (login/logout/session-status) must stay public.
app.use('/api', authRoutes);

app.get('/api/config', (req, res) => {
  res.json({
    language: process.env.WEALTHFLY_LANGUAGE || 'en',
    savingsAccountWords: SAVINGS_ACCOUNT_WORDS,
  });
});

app.use('/api', requireAuth, dataRoutes);
app.use('/api/summary', requireAuth, summaryRoutes);

// Serve the built React app (see frontend/ -> copied into ./public at build time).
const staticDir = path.join(__dirname, '..', 'public');
app.use(express.static(staticDir));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(staticDir, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`[wealthfly] listening on port ${PORT}`);

  // Reset any leftover dirty sync status from a prior crash
  try {
    db.prepare(
      "INSERT INTO sync_meta (key, value) VALUES ('sync_status', 'idle') ON CONFLICT(key) DO UPDATE SET value='idle'"
    ).run();
  } catch (err) {
    console.warn('[sync] could not reset sync_status on boot:', err.message);
  }

  if (cron.validate(SYNC_CRON)) {
    cron.schedule(SYNC_CRON, () => {
      console.log('[sync] scheduled sync triggered');
      if (isSyncInProgress()) {
        console.log('[sync] scheduled sync skipped: a sync is already in progress');
        return;
      }
      runFullSync(undefined, { source: 'cron' })
        .then((r) => console.log('[sync] scheduled sync complete', r))
        .catch((e) => {
          if (e.code === 'SYNC_IN_PROGRESS') {
            console.log('[sync] scheduled sync skipped: a sync is already in progress');
          } else {
            console.error('[sync] scheduled sync failed', e.message);
          }
        });
    });
    console.log(`[wealthfly] scheduled sync: "${SYNC_CRON}"`);
  }

  // Kick off an initial sync shortly after boot if we have credentials.
  if (process.env.FIREFLY_URL && process.env.FIREFLY_TOKEN) {
    setTimeout(() => {
      if (isSyncInProgress()) {
        console.log('[sync] initial sync skipped: a sync is already in progress');
        return;
      }
      runFullSync(undefined, { source: 'initial' })
        .then((r) => console.log('[sync] initial sync complete', r))
        .catch((e) => {
          if (e.code === 'SYNC_IN_PROGRESS') {
            console.log('[sync] initial sync skipped: a sync is already in progress');
          } else {
            console.error('[sync] initial sync failed', e.message);
          }
        });
    }, 2000);
  }
});
