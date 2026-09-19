const express = require('express');
const db = require('../db');

const router = express.Router();

function dateFilter(req) {
  const { start, end } = req.query;
  return { start: start || '0000-01-01', end: end || '9999-12-31' };
}

// Each point uses the latest known balance for every included account, so accounts
// without a transaction on that date still contribute to the total.
router.get('/net-worth', (req, res) => {
  const { start, end } = dateFilter(req);
  const rows = db
    .prepare(
      `WITH dates AS (
         SELECT DISTINCT date FROM balance_history WHERE date BETWEEN ? AND ?
       )
       SELECT dates.date,
              SUM((SELECT bh.balance
                   FROM balance_history bh
                   WHERE bh.account_id = accounts.id AND bh.date <= dates.date
                   ORDER BY bh.date DESC LIMIT 1)) as total
       FROM dates
       CROSS JOIN accounts
       WHERE accounts.include_net_worth = 1
       GROUP BY dates.date ORDER BY dates.date ASC`
    )
    .all(start, end);
  res.json(rows);
});

// Per-account balance series (for a multi-line / stacked view if desired).
router.get('/net-worth-by-account', (req, res) => {
  const { start, end } = dateFilter(req);
  const rows = db
    .prepare(
      `SELECT bh.date, a.name as account, bh.balance
      FROM balance_history bh
      JOIN accounts a ON a.id = bh.account_id AND a.include_net_worth = 1
      WHERE bh.date BETWEEN ? AND ?
      ORDER BY bh.date ASC`
    )
    .all(start, end);
  res.json(rows);
});

router.get('/expenses-by-category', (req, res) => {
  const { start, end } = dateFilter(req);
  const rows = db
    .prepare(
      `SELECT COALESCE(category_name, 'Uncategorized') as category, SUM(amount) as total, COUNT(*) as count
       FROM transactions
       WHERE type = 'withdrawal' AND date BETWEEN ? AND ?
       GROUP BY category ORDER BY total DESC`
    )
    .all(start, end);
  res.json(rows);
});

router.get('/expenses-by-day', (req, res) => {
  const { start, end } = dateFilter(req);
  const rows = db
    .prepare(
      `SELECT date, SUM(amount) as total
       FROM transactions
       WHERE type = 'withdrawal' AND date BETWEEN ? AND ?
       GROUP BY date ORDER BY date ASC`
    )
    .all(start, end);
  res.json(rows);
});

// The asset account money left FROM (e.g. "Checking", "Credit Card").
router.get('/expenses-by-source-account', (req, res) => {
  const { start, end } = dateFilter(req);
  const rows = db
    .prepare(
      `SELECT source_name as account, SUM(amount) as total, COUNT(*) as count
       FROM transactions
       WHERE type = 'withdrawal' AND date BETWEEN ? AND ?
       GROUP BY source_name ORDER BY total DESC`
    )
    .all(start, end);
  res.json(rows);
});

// The expense account money went TO (e.g. "Groceries Store", "Landlord") — the "target account".
router.get('/expenses-by-target-account', (req, res) => {
  const { start, end } = dateFilter(req);
  const rows = db
    .prepare(
      `SELECT destination_name as account, SUM(amount) as total, COUNT(*) as count
       FROM transactions
       WHERE type = 'withdrawal' AND date BETWEEN ? AND ?
       GROUP BY destination_name ORDER BY total DESC`
    )
    .all(start, end);
  res.json(rows);
});

router.get('/expenses-by-tag', (req, res) => {
  const { start, end } = dateFilter(req);
  const rows = db
    .prepare(
      `SELECT tags, amount FROM transactions
       WHERE type = 'withdrawal' AND date BETWEEN ? AND ?`
    )
    .all(start, end);

  const totals = new Map();
  rows.forEach((r) => {
    let tags = [];
    try {
      tags = JSON.parse(r.tags || '[]');
    } catch {
      tags = [];
    }
    if (tags.length === 0) tags = ['Untagged'];
    tags.forEach((t) => {
      totals.set(t, (totals.get(t) || 0) + r.amount);
    });
  });

  const result = Array.from(totals.entries())
    .map(([tag, total]) => ({ tag, total }))
    .sort((a, b) => b.total - a.total);
  res.json(result);
});

router.get('/stats', (req, res) => {
  const { start, end } = dateFilter(req);
  const netWorth = db
    .prepare(
      `SELECT SUM((SELECT bh.balance
                  FROM balance_history bh
                  WHERE bh.account_id = accounts.id AND bh.date <= ?
                  ORDER BY bh.date DESC LIMIT 1)) as total
       FROM accounts
       WHERE accounts.include_net_worth = 1`
    )
    .get(end);

  const expenses = db
    .prepare(
      `SELECT SUM(amount) as total FROM transactions WHERE type = 'withdrawal' AND date BETWEEN ? AND ?`
    )
    .get(start, end);
  const income = db
    .prepare(
      `SELECT SUM(amount) as total FROM transactions WHERE type = 'deposit' AND date BETWEEN ? AND ?`
    )
    .get(start, end);
  const lastSync = db.prepare("SELECT value FROM sync_meta WHERE key = 'last_sync'").get();

  res.json({
    netWorth: netWorth.total ?? db.prepare('SELECT SUM(current_balance) as total FROM accounts WHERE include_net_worth = 1').get().total ?? 0,
    monthExpenses: expenses.total || 0,
    monthIncome: income.total || 0,
    lastSync: lastSync ? lastSync.value : null,
  });
});

module.exports = router;
