const test = require('node:test');
const assert = require('node:assert/strict');

// If better-sqlite3 native bindings are not compiled on the current platform,
// allow tests to run with MOCK_SQLITE=true
process.env.MOCK_SQLITE = 'true';
process.env.DB_PATH = ':memory:';

const {
  runFullSync,
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
  });
});

test('isSyncInProgress returns true and tracks metadata while active', () => {
  _syncState.inProgress = true;
  _syncState.startedAt = '2026-09-25T10:00:00.000Z';
  _syncState.source = 'cron';

  assert.equal(isSyncInProgress(), true);
  const state = getSyncState();
  assert.equal(state.inProgress, true);
  assert.equal(state.startedAt, '2026-09-25T10:00:00.000Z');
  assert.equal(state.source, 'cron');
});

test('watchdog timeout auto-releases stale lock if duration exceeds threshold', () => {
  // Set startedAt to 15 minutes ago (exceeds 10m threshold)
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  _syncState.inProgress = true;
  _syncState.startedAt = fifteenMinutesAgo;
  _syncState.source = 'api';

  assert.equal(isSyncInProgress(), false);
  assert.equal(_syncState.inProgress, false);
  assert.equal(_syncState.startedAt, null);
  assert.equal(_syncState.source, null);
});

test('watchdog keeps lock active if within timeout threshold', () => {
  // Set startedAt to 2 minutes ago (well within 10m threshold)
  const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
  _syncState.inProgress = true;
  _syncState.startedAt = twoMinutesAgo;
  _syncState.source = 'api';

  assert.equal(isSyncInProgress(), true);
  assert.equal(_syncState.inProgress, true);
});

test('runFullSync rejects concurrent execution with SyncInProgressError', async () => {
  // Simulate active lock
  _syncState.inProgress = true;
  _syncState.startedAt = new Date().toISOString();
  _syncState.source = 'api';

  await assert.rejects(
    async () => {
      await runFullSync();
    },
    (err) => {
      assert.ok(err instanceof SyncInProgressError);
      assert.equal(err.code, 'SYNC_IN_PROGRESS');
      return true;
    }
  );
});

test('runFullSync releases lock in finally block even when sync fails', async () => {
  const failingFirefly = {
    getAccounts: async () => {
      throw new Error('Firefly API network error');
    },
  };

  assert.equal(isSyncInProgress(), false);

  await assert.rejects(
    async () => {
      await runFullSync(failingFirefly, { source: 'api' });
    },
    (err) => {
      assert.equal(err.message, 'Firefly API network error');
      return true;
    }
  );

  // Lock must be released
  assert.equal(isSyncInProgress(), false);
  assert.equal(_syncState.inProgress, false);
  assert.equal(_syncState.startedAt, null);
  assert.equal(_syncState.source, null);
});
