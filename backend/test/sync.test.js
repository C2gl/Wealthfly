// Point the db module at an in-memory database before anything requires it, so
// these tests never touch a real data file.
process.env.DB_PATH = ':memory:';

const test = require('node:test');
const assert = require('node:assert/strict');

const db = require('../src/db');
const {
  syncAccounts,
  syncTransactions,
  rebuildBalanceHistory,
  runFullSync,
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

// Minimal fake of the fireflyClient module shape used by sync.js. Only the
// methods a given test needs have to return anything meaningful — the rest
// default to empty lists so unrelated sync steps are no-ops.
function fakeFirefly(overrides = {}) {
  return {
    getAccounts: async () => [],
    getCategories: async () => [],
    getTags: async () => [],
    getTransactions: async () => [],
    ...overrides,
  };
}

function fireflyAccount(id, attrs) {
  return { id, attributes: attrs };
}

function fireflyTransactionGroup(id, splits) {
  return { id, attributes: { transactions: splits } };
}

test('syncAccounts inserts accounts and defaults include_net_worth to true when unset', async () => {
  const firefly = fakeFirefly({
    getAccounts: async () => [
      fireflyAccount('1', {
        name: 'Checking',
        type: 'asset',
        currency_code: 'USD',
        opening_balance: '1000.00',
        opening_balance_date: '2023-01-01',
        current_balance: '1200.50',
        active: true,
        // include_net_worth intentionally omitted
      }),
    ],
  });

  const count = await syncAccounts(firefly);
  assert.equal(count, 1);

  const row = db.prepare('SELECT * FROM accounts WHERE id = ?').get('1');
  assert.equal(row.name, 'Checking');
  assert.equal(row.opening_balance, 1000);
  assert.equal(row.current_balance, 1200.5);
  assert.equal(row.include_net_worth, 1);
  assert.equal(row.active, 1);
});

test('syncAccounts respects include_net_worth: false from Firefly', async () => {
  const firefly = fakeFirefly({
    getAccounts: async () => [
      fireflyAccount('2', { name: 'Old savings', type: 'asset', include_net_worth: false, active: false }),
    ],
  });

  await syncAccounts(firefly);

  const row = db.prepare('SELECT * FROM accounts WHERE id = ?').get('2');
  assert.equal(row.include_net_worth, 0);
  assert.equal(row.active, 0);
});

test('syncAccounts clears accounts that disappeared from Firefly on the next sync', async () => {
  await syncAccounts(fakeFirefly({ getAccounts: async () => [fireflyAccount('1', { name: 'A', type: 'asset' })] }));
  assert.equal(db.prepare('SELECT COUNT(*) as c FROM accounts').get().c, 1);

  // Second sync returns a different account set — the stale row should be gone.
  await syncAccounts(fakeFirefly({ getAccounts: async () => [fireflyAccount('2', { name: 'B', type: 'asset' })] }));

  const rows = db.prepare('SELECT id FROM accounts').all();
  assert.deepEqual(rows.map((r) => r.id), ['2']);
});

test('syncTransactions inserts one row per split with an incrementing split_index', async () => {
  const firefly = fakeFirefly({
    getTransactions: async () => [
      fireflyTransactionGroup('100', [
        { type: 'withdrawal', date: '2024-01-05', amount: '20.00', source_id: '1', destination_id: '9', tags: [] },
        { type: 'withdrawal', date: '2024-01-05', amount: '5.00', source_id: '1', destination_id: '9', tags: ['tip'] },
      ]),
    ],
  });

  const count = await syncTransactions(firefly);
  assert.equal(count, 2);

  const rows = db.prepare('SELECT * FROM transactions WHERE id = ? ORDER BY split_index').all('100');
  assert.equal(rows.length, 2);
  assert.equal(rows[0].split_index, 0);
  assert.equal(rows[1].split_index, 1);
  assert.equal(rows[1].amount, 5);
  assert.deepEqual(JSON.parse(rows[1].tags), ['tip']);
});

test('rebuildBalanceHistory replays transactions into a per-account, per-day balance', () => {
  db.prepare(
    `INSERT INTO accounts (id, name, type, opening_balance, opening_balance_date, include_net_worth, active)
     VALUES (?, ?, ?, ?, ?, 1, 1)`
  ).run('checking', 'Checking', 'asset', 500, '2024-01-01');

  const insertTx = db.prepare(
    `INSERT INTO transactions (id, split_index, type, date, amount, source_id, destination_id)
     VALUES (?, 0, ?, ?, ?, ?, ?)`
  );
  insertTx.run('t1', 'withdrawal', '2024-01-03', 50, 'checking', 'grocery-store');
  insertTx.run('t2', 'deposit', '2024-01-10', 200, 'employer', 'checking');

  rebuildBalanceHistory();

  const rows = db
    .prepare('SELECT date, balance FROM balance_history WHERE account_id = ? ORDER BY date')
    .all('checking');

  assert.deepEqual(rows, [
    { date: '2024-01-01', balance: 500 },
    { date: '2024-01-03', balance: 450 },
    { date: '2024-01-10', balance: 650 },
  ]);
});

test('rebuildBalanceHistory excludes accounts with include_net_worth = 0', () => {
  db.prepare(
    `INSERT INTO accounts (id, name, type, opening_balance, opening_balance_date, include_net_worth, active)
     VALUES ('excluded-acc', 'Old account', 'asset', 100, '2024-01-01', 0, 1)`
  ).run();

  rebuildBalanceHistory();

  const rows = db.prepare('SELECT * FROM balance_history WHERE account_id = ?').all('excluded-acc');
  assert.equal(rows.length, 0);
});

test('rebuildBalanceHistory ignores transactions dated before the opening balance', () => {
  db.prepare(
    `INSERT INTO accounts (id, name, type, opening_balance, opening_balance_date, include_net_worth, active)
     VALUES ('checking', 'Checking', 'asset', 500, '2024-06-01', 1, 1)`
  ).run();

  db.prepare(
    `INSERT INTO transactions (id, split_index, type, date, amount, source_id, destination_id)
     VALUES ('old-tx', 0, 'withdrawal', '2023-01-01', 999, 'checking', 'expense-1')`
  ).run();

  rebuildBalanceHistory();

  const rows = db
    .prepare('SELECT date, balance FROM balance_history WHERE account_id = ? ORDER BY date')
    .all('checking');

  // Only the opening-balance point should exist; the pre-opening transaction is ignored.
  assert.deepEqual(rows, [{ date: '2024-06-01', balance: 500 }]);
});

test('rebuildBalanceHistory nets a self-referencing transaction to zero without double-counting', () => {
  // Regression test: the account lookup is `WHERE source_id = ? OR destination_id = ?`.
  // A row that is its own source AND destination must be fetched once, not twice,
  // otherwise both balance branches in computeBalancePoints would double-apply.
  db.prepare(
    `INSERT INTO accounts (id, name, type, opening_balance, opening_balance_date, include_net_worth, active)
     VALUES ('checking', 'Checking', 'asset', 500, '2024-01-01', 1, 1)`
  ).run();

  db.prepare(
    `INSERT INTO transactions (id, split_index, type, date, amount, source_id, destination_id)
     VALUES ('self-tx', 0, 'reconciliation', '2024-01-05', 9999, 'checking', 'checking')`
  ).run();

  rebuildBalanceHistory();

  const row = db
    .prepare('SELECT balance FROM balance_history WHERE account_id = ? AND date = ?')
    .get('checking', '2024-01-05');

  assert.equal(row.balance, 500);
});

test('runFullSync pulls accounts and transactions, then rebuilds balance history end-to-end', async () => {
  const firefly = fakeFirefly({
    getAccounts: async () => [
      fireflyAccount('checking', {
        name: 'Checking',
        type: 'asset',
        opening_balance: '500.00',
        opening_balance_date: '2024-01-01',
        current_balance: '450.00',
        active: true,
      }),
    ],
    getTransactions: async () => [
      fireflyTransactionGroup('t1', [
        { type: 'withdrawal', date: '2024-01-05', amount: '50.00', source_id: 'checking', destination_id: 'store', tags: [] },
      ]),
    ],
  });

  const result = await runFullSync(firefly);

  assert.equal(result.accounts, 1);
  assert.equal(result.transactions, 1);

  const balanceRow = db
    .prepare('SELECT balance FROM balance_history WHERE account_id = ? AND date = ?')
    .get('checking', '2024-01-05');
  assert.equal(balanceRow.balance, 450);

  const lastSync = db.prepare("SELECT value FROM sync_meta WHERE key = 'last_sync'").get();
  assert.ok(lastSync && lastSync.value);
});
