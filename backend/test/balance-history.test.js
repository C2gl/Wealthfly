const test = require('node:test');
const assert = require('node:assert/strict');

const { computeBalancePoints } = require('../src/sync');

test('computeBalancePoints returns just the opening point when there are no transactions', () => {
  const points = computeBalancePoints('acc-1', 100, '2024-01-01', []);

  assert.deepEqual(points, [{ date: '2024-01-01', balance: 100 }]);
});

test('a withdrawal (source) decreases the balance', () => {
  const transactions = [{ date: '2024-01-05', amount: 30, source_id: 'acc-1', destination_id: 'expense-1' }];

  const points = computeBalancePoints('acc-1', 100, '2024-01-01', transactions);

  assert.deepEqual(points, [
    { date: '2024-01-01', balance: 100 },
    { date: '2024-01-05', balance: 70 },
  ]);
});

test('a deposit (destination) increases the balance', () => {
  const transactions = [{ date: '2024-01-05', amount: 50, source_id: 'revenue-1', destination_id: 'acc-1' }];

  const points = computeBalancePoints('acc-1', 100, '2024-01-01', transactions);

  assert.deepEqual(points, [
    { date: '2024-01-01', balance: 100 },
    { date: '2024-01-05', balance: 150 },
  ]);
});

test('multiple transactions on the same day collapse into one point with the running total', () => {
  const transactions = [
    { date: '2024-01-05', amount: 20, source_id: 'acc-1', destination_id: 'expense-1' },
    { date: '2024-01-05', amount: 5, source_id: 'acc-1', destination_id: 'expense-2' },
  ];

  const points = computeBalancePoints('acc-1', 100, '2024-01-01', transactions);

  assert.deepEqual(points, [
    { date: '2024-01-01', balance: 100 },
    { date: '2024-01-05', balance: 75 },
  ]);
});

test('balance carries forward correctly across several days', () => {
  const transactions = [
    { date: '2024-01-02', amount: 20, source_id: 'acc-1', destination_id: 'expense-1' },
    { date: '2024-01-04', amount: 40, source_id: 'revenue-1', destination_id: 'acc-1' },
    { date: '2024-01-10', amount: 5, source_id: 'acc-1', destination_id: 'expense-2' },
  ];

  const points = computeBalancePoints('acc-1', 100, '2024-01-01', transactions);

  assert.deepEqual(points, [
    { date: '2024-01-01', balance: 100 },
    { date: '2024-01-02', balance: 80 },
    { date: '2024-01-04', balance: 120 },
    { date: '2024-01-10', balance: 115 },
  ]);
});

test('a transaction that is both source and destination for the account nets to no change', () => {
  // e.g. a reconciliation/self-transfer row. Both branches fire, so it should be a no-op.
  const transactions = [{ date: '2024-01-05', amount: 999, source_id: 'acc-1', destination_id: 'acc-1' }];

  const points = computeBalancePoints('acc-1', 100, '2024-01-01', transactions);

  assert.deepEqual(points, [
    { date: '2024-01-01', balance: 100 },
    { date: '2024-01-05', balance: 100 },
  ]);
});

test('only accepts a time-ordered transaction list — later same-day rows win that day', () => {
  // computeBalancePoints trusts its caller to pass transactions in ascending date order;
  // this pins down that the *last* row for a given day determines that day's point.
  const transactions = [
    { date: '2024-01-05', amount: 10, source_id: 'acc-1', destination_id: 'expense-1' },
    { date: '2024-01-05', amount: 100, source_id: 'acc-1', destination_id: 'expense-2' },
  ];

  const points = computeBalancePoints('acc-1', 100, '2024-01-01', transactions);

  const day = points.find((p) => p.date === '2024-01-05');
  assert.equal(day.balance, -10); // 100 - 10 - 100, applied in list order
});
