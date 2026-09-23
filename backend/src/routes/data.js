const express = require('express');
const db = require('../db');
const { runFullSync } = require('../sync');
const firefly = require('../fireflyClient');

const router = express.Router();

router.get('/accounts', (req, res) => {
  const rows = db.prepare('SELECT * FROM accounts ORDER BY type, name').all();
  res.json(rows);
});

router.get('/categories', (req, res) => {
  res.json(db.prepare('SELECT * FROM categories ORDER BY name').all());
});

router.get('/tags', (req, res) => {
  res.json(db.prepare('SELECT * FROM tags ORDER BY name').all());
});

router.get('/budgets', async (req, res) => {
  const { start, end } = req.query;
  try {
    const budgets = await firefly.getBudgets({ start, end });
    const result = await Promise.all(budgets.map(async (budget) => {
      const attributes = budget.attributes || {};
      const limits = await firefly.getBudgetLimits(budget.id, { start, end });
      return {
        id: budget.id,
        ...attributes,
        limits: limits.map((limit) => ({ id: limit.id, ...limit.attributes })),
      };
    }));
    res.json(result);
  } catch (err) {
    console.error('[budgets] failed:', err.message);
    res.status(502).json({ error: 'Could not load budgets from Firefly III' });
  }
});

router.get('/transactions', (req, res) => {
  const { start = '0000-01-01', end = '9999-12-31', category, account, tag, type, limit = 100 } = req.query;

  let sql = `SELECT * FROM transactions WHERE substr(date, 1, 10) BETWEEN ? AND ?`;
  const params = [start, end];

  if (type) {
    sql += ' AND type = ?';
    params.push(type);
  }
  if (category) {
    sql += ' AND category_name = ?';
    params.push(category);
  }
  if (account) {
    sql += ' AND (source_name = ? OR destination_name = ?)';
    params.push(account, account);
  }

  sql += ' ORDER BY date DESC LIMIT ?';
  params.push(Number(limit));

  let rows = db.prepare(sql).all(...params);

  if (tag) {
    rows = rows.filter((r) => {
      try {
        return JSON.parse(r.tags || '[]').includes(tag);
      } catch {
        return false;
      }
    });
  }

  res.json(rows);
});

router.post('/sync', async (req, res) => {
  try {
    const result = await runFullSync();
    res.json({ ok: true, ...result });
  } catch (err) {
    console.error('[sync] failed:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/sync/status', (req, res) => {
  const row = db.prepare("SELECT value FROM sync_meta WHERE key = 'last_sync'").get();
  res.json({ lastSync: row ? row.value : null });
});

module.exports = router;
