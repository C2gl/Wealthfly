const db = require('./db');
const defaultFirefly = require('./fireflyClient');

// A small tolerance absorbs rounding/penny differences; anything past it is a
// real mismatch worth surfacing rather than silently ignoring.
const TOLERANCE = 0.5;

// monthsAgo = 0 -> current month, 1 -> previous month, etc. (server-local time,
// same convention as the frontend's startOfMonth/endOfMonth in utils.js).
function startOfMonth(monthsAgo = 0) {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - monthsAgo);
  return d.toISOString().slice(0, 10);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

// Firefly's /summary/basic returns a flat object keyed like "spent-in-EUR",
// "earned-in-EUR", "net-worth-in-EUR" — one entry per metric per currency.
// Wealthfly doesn't convert currencies anywhere else either, so summing across
// whatever currencies are present mirrors that same existing assumption.
function sumFireflyMetric(summary, prefix) {
  return Object.values(summary || {})
    .filter((entry) => entry && typeof entry.key === 'string' && entry.key.startsWith(prefix))
    .reduce((sum, entry) => sum + Math.abs(Number(entry.monetary_value || 0)), 0);
}

function localTotals(start, end) {
  const expenses = db
    .prepare(
      `SELECT SUM(amount) as total FROM transactions WHERE type = 'withdrawal' AND substr(date, 1, 10) BETWEEN ? AND ?`
    )
    .get(start, end);
  const income = db
    .prepare(
      `SELECT SUM(amount) as total FROM transactions WHERE type = 'deposit' AND substr(date, 1, 10) BETWEEN ? AND ?`
    )
    .get(start, end);
  const netWorth = db
    .prepare(
      `SELECT SUM((SELECT bh.balance
                  FROM balance_history bh
                  WHERE bh.account_id = accounts.id AND bh.date <= ?
                  ORDER BY bh.date DESC LIMIT 1)) as total
       FROM accounts WHERE accounts.include_net_worth = 1`
    )
    .get(end);

  return {
    expenses: expenses.total || 0,
    income: income.total || 0,
    netWorth: netWorth.total || 0,
  };
}

function compare(local, firefly) {
  const diff = Number((local - firefly).toFixed(2));
  return {
    local: Number(local.toFixed(2)),
    firefly: Number(firefly.toFixed(2)),
    diff,
    drift: Math.abs(diff) > TOLERANCE,
  };
}

// Checks the current calendar month by default — matches Wealthfly's default
// view and Firefly's own month-based reporting, so it's the most useful window
// for a manual sanity check.
async function checkReconciliation({ start = startOfMonth(0), end = today() } = {}, firefly = defaultFirefly) {
  const local = localTotals(start, end);
  const summary = await firefly.getSummaryBasic({ start, end });

  const fireflyExpenses = sumFireflyMetric(summary, 'spent-in-');
  const fireflyIncome = sumFireflyMetric(summary, 'earned-in-');
  const fireflyNetWorth =
    sumFireflyMetric(summary, 'net-worth-in-') || sumFireflyMetric(summary, 'balance-in-');

  const result = {
    start,
    end,
    checkedAt: new Date().toISOString(),
    expenses: compare(local.expenses, fireflyExpenses),
    income: compare(local.income, fireflyIncome),
    netWorth: compare(local.netWorth, fireflyNetWorth),
  };
  result.drift = result.expenses.drift || result.income.drift || result.netWorth.drift;
  return result;
}

function storeResult(result) {
  db.prepare(
    `INSERT INTO sync_meta (key, value) VALUES ('last_reconciliation', ?)
     ON CONFLICT(key) DO UPDATE SET value=excluded.value`
  ).run(JSON.stringify(result));
}

function getStoredResult() {
  const row = db.prepare("SELECT value FROM sync_meta WHERE key = 'last_reconciliation'").get();
  if (!row) return null;
  try {
    return JSON.parse(row.value);
  } catch {
    return null;
  }
}

module.exports = { checkReconciliation, storeResult, getStoredResult };
