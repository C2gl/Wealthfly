const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');

const dataRoutes = require('./routes/data');
const summaryRoutes = require('./routes/summary');
const { runFullSync } = require('./sync');

const PORT = process.env.PORT || 4400;
const SYNC_CRON = process.env.SYNC_CRON || '0 */6 * * *'; // every 6 hours by default

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api', dataRoutes);
app.use('/api/summary', summaryRoutes);

// Serve the built React app (see frontend/ -> copied into ./public at build time).
const staticDir = path.join(__dirname, '..', 'public');
app.use(express.static(staticDir));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(staticDir, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`[wealthfly] listening on port ${PORT}`);

  if (cron.validate(SYNC_CRON)) {
    cron.schedule(SYNC_CRON, () => {
      console.log('[sync] scheduled sync starting...');
      runFullSync()
        .then((r) => console.log('[sync] complete', r))
        .catch((e) => console.error('[sync] failed', e.message));
    });
    console.log(`[wealthfly] scheduled sync: "${SYNC_CRON}"`);
  }

  // Kick off an initial sync shortly after boot if we have credentials.
  if (process.env.FIREFLY_URL && process.env.FIREFLY_TOKEN) {
    setTimeout(() => {
      runFullSync()
        .then((r) => console.log('[sync] initial sync complete', r))
        .catch((e) => console.error('[sync] initial sync failed', e.message));
    }, 2000);
  }
});
