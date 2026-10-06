const test = require('node:test');
const assert = require('node:assert/strict');

// If better-sqlite3 native bindings are not compiled on the current platform,
// allow tests to run with MOCK_SQLITE=true
process.env.MOCK_SQLITE = 'true';
process.env.DB_PATH = ':memory:';

const {
  isSyncInProgress,
  getSyncState,
  SyncInProgressError,
  MAX_SYNC_DURATION_MS,
  _syncState,
} = require('../src/sync');

test.beforeEach(() => {
  // Ensure lock state is clean before each test
  _syncState.inProgress = false;
  _syncState.startedAt = null;
  _syncState.source = null;
  _syncState.currentStep = 'initializing';
  _syncState.progress = 0;
  _syncState.transactionsProcessed = null;
});

test('SyncInProgressError has proper name and error code', () => {
  const err = new SyncInProgressError('Custom sync error');
  assert.equal(err.name, 'SyncInProgressError');
  assert.equal(err.code, 'SYNC_IN_PROGRESS');
  assert.equal(err.message, 'Custom sync error');
});

test('sync lock defaults to idle state', () => {
  assert.equal(isSyncInProgress(), false);
  const state = getSyncState();
  assert.deepEqual(state, {
    inProgress: false,
    startedAt: null,
    source: null,
    currentStep: 'initializing',
    progress: 0,
    transactionsProcessed: null,
  });
});

test('isSyncInProgress returns true and tracks metadata while active', () => {
  const justNow = new Date().toISOString();
  _syncState.inProgress = true;
  _syncState.startedAt = justNow;
  _syncState.source = 'cron';
  assert.equal(isSyncInProgress(), true);
});

test('getSyncState tracks transactionsProcessed during sync', async () => {
  // Manually simulate a sync in progress with transaction count
  _syncState.inProgress = true;
  _syncState.source = 'api';
  _syncState.currentStep = 'syncing_transactions';
  _syncState.progress = 75;
  _syncState.transactionsProcessed = 128;

  const state = getSyncState();
  assert.strictEqual(state.transactionsProcessed, 128);
});

test('MAX_SYNC_DURATION_MS defaults to 10 minutes (600,000ms)', () => {
  assert.strictEqual(MAX_SYNC_DURATION_MS, 10 * 60 * 1000);
});

test('isSyncInProgress releases stale lock after timeout', async () => {
  // Simulate a sync started before the watchdog timeout
  _syncState.inProgress = true;
  const oldStart = new Date(Date.now() - MAX_SYNC_DURATION_MS * 1.5).toISOString();
  _syncState.startedAt = oldStart;
  _syncState.source = 'api';

  // Call isSyncInProgress — it should detect the stale lock and release it
  assert.equal(isSyncInProgress(), false);
});