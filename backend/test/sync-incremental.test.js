process.env.DB_PATH = ':memory:';

const test = require('node:test');
const assert = require('node:assert/strict');

const db = require('../src/db');
const {
  syncTransactionsIncremental,
  runSync,
  runFullSync,
  hasSyncedBefore,
} = require('../src/sync');

function resetDb() {
  db.exec(`
    DELETE FROM accounts;
    DELETE FROM categories;
    DELETE FROM tags;
    DELETE FROM transactions;
    DELETE FROM balance_history;
    DELETE FROM sync_meta;
  `);
}

test.beforeEach(() => {
  resetDb();
});

test.after(() => {
  if (db.open) db.close();
});

function fakeFirefly(overrides = {}) {
  return {
    getAccounts: async () => [],
    getCategories: async () => [],
    getTags: async () => [],
    getTransactions: async () => [],
    getSummaryBasic: async () => ({}),
    ...overrides,
  };
}

function fireflyTransactionGroup(id, splits) {
  return { id, attributes: { transactions: splits } };
}

function insertRawTransaction(id, date, amount = 10) {
  db.prepare(
    `INSERT INTO transactions (id, split_index, type, date, amount, source_id, destination_id, tags)
     VALUES (?, 0, 'withdrawal', ?, ?, 'checking', 'store', '[]')`
  ).run(id, date, amount);
}

test('syncTransactionsIncremental only replaces transactions within the lookback window', async () => {
  // Pre-existing local data: one very old row, one that will fall inside the window.
  insertRawTransaction('old-tx', '2020-01-01', 999);
  insertRawTransaction('recent-tx', '2024-01-01', 5); // will be superseded by the fetch below

  const windowStart = '2023-01-01'; // whatever lookbackDays resolves to in this test
  const firefly = fakeFirefly({
    getTransactions: async ({ start }) => {
      assert.equal(start, windowStart);
      return [fireflyTransactionGroup('recent-tx', [
        { type: 'withdrawal', date: '2024-06-01', amount: '42.00', source_id: 'checking', destination_id: 'store', tags: [] },
      ])];
    },
  });

  // Force a fixed window by stubbing lookbackDays via the exported helper's
  // contract: pass lookbackDays explicitly rather than relying on "today".
  const today = new Date().toISOString().slice(0, 10);
  const lookbackDays = Math.round((new Date(today) - new Date(windowStart)) / 86400000);

  const { count } = await syncTransactionsIncremental(firefly, lookbackDays);
  assert.equal(count, 1);

  // The untouched old row survives...
  const old = db.prepare('SELECT * FROM transactions WHERE id = ?').get('old-tx');
  assert.ok(old, 'transaction older than the window should be left alone');
  assert.equal(old.amount, 999);

  // ...and the in-window row was replaced by the freshly fetched version, not left stale.
  const refreshed = db.prepare('SELECT * FROM transactions WHERE id = ?').get('recent-tx');
  assert.equal(refreshed.amount, 42);
  assert.equal(refreshed.date, '2024-06-01');
});

test('runSync does a full sync on the very first run (no prior sync recorded)', async () => {
  assert.equal(hasSyncedBefore(), false);

  const firefly = fakeFirefly();
  const result = await runSync(firefly, { source: 'api' });

  assert.equal(result.incremental, false);
  assert.equal(hasSyncedBefore(), true);
});

test('runSync does an incremental sync once a prior sync exists', async () => {
  await runFullSync(fakeFirefly(), { source: 'api' });
  assert.equal(hasSyncedBefore(), true);

  const result = await runSync(fakeFirefly(), { source: 'api' });
  assert.equal(result.incremental, true);
  assert.ok(result.lookbackStart);
});

test('runSync forces a full sync when full: true, even if a prior sync exists', async () => {
  await runFullSync(fakeFirefly(), { source: 'api' });

  const result = await runSync(fakeFirefly(), { source: 'api', full: true });
  assert.equal(result.incremental, false);
});
