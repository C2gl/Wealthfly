const db = require('./db');
const firefly = require('./fireflyClient');

const ASSET_TYPES = new Set(['asset', 'loan', 'debt', 'mortgage']);

function upsertAccount(row) {
  db.prepare(
    `INSERT INTO accounts (id, name, type, currency_code, opening_balance, opening_balance_date, current_balance, active)
     VALUES (@id, @name, @type, @currency_code, @opening_balance, @opening_balance_date, @current_balance, @active)
     ON CONFLICT(id) DO UPDATE SET
       name=excluded.name, type=excluded.type, currency_code=excluded.currency_code,
       opening_balance=excluded.opening_balance, opening_balance_date=excluded.opening_balance_date,
       current_balance=excluded.current_balance, active=excluded.active`
  ).run(row);
}

function upsertCategory(row) {
  db.prepare(
    `INSERT INTO categories (id, name) VALUES (@id, @name)
     ON CONFLICT(id) DO UPDATE SET name=excluded.name`
  ).run(row);
}

function upsertTag(row) {
  db.prepare(
    `INSERT INTO tags (id, name) VALUES (@id, @name)
     ON CONFLICT(id) DO UPDATE SET name=excluded.name`
  ).run(row);
}

const insertTx = db.prepare(
  `INSERT INTO transactions
    (id, split_index, type, date, amount, currency_code, description,
     source_id, source_name, destination_id, destination_name, category_name, tags)
   VALUES (@id, @split_index, @type, @date, @amount, @currency_code, @description,
     @source_id, @source_name, @destination_id, @destination_name, @category_name, @tags)
   ON CONFLICT(id, split_index) DO UPDATE SET
     type=excluded.type, date=excluded.date, amount=excluded.amount, currency_code=excluded.currency_code,
     description=excluded.description, source_id=excluded.source_id, source_name=excluded.source_name,
     destination_id=excluded.destination_id, destination_name=excluded.destination_name,
     category_name=excluded.category_name, tags=excluded.tags`
);

async function syncAccounts() {
  const accounts = await firefly.getAccounts();
  const clear = db.prepare('DELETE FROM accounts');
  const tx = db.transaction((rows) => {
    clear.run();
    rows.forEach((a) => {
      const attr = a.attributes;
      upsertAccount({
        id: a.id,
        name: attr.name,
        type: attr.type,
        currency_code: attr.currency_code,
        opening_balance: parseFloat(attr.opening_balance || '0'),
        opening_balance_date: attr.opening_balance_date,
        current_balance: parseFloat(attr.current_balance || '0'),
        active: attr.active ? 1 : 0,
      });
    });
  });
  tx(accounts);
  return accounts.length;
}

async function syncCategories() {
  const categories = await firefly.getCategories();
  const clear = db.prepare('DELETE FROM categories');
  const tx = db.transaction((rows) => {
    clear.run();
    rows.forEach((c) => upsertCategory({ id: c.id, name: c.attributes.name }));
  });
  tx(categories);
  return categories.length;
}

async function syncTags() {
  const tags = await firefly.getTags();
  const clear = db.prepare('DELETE FROM tags');
  const tx = db.transaction((rows) => {
    clear.run();
    rows.forEach((t) => upsertTag({ id: t.id, name: t.attributes.tag }));
  });
  tx(tags);
  return tags.length;
}

async function syncTransactions() {
  const groups = await firefly.getTransactions();
  const clear = db.prepare('DELETE FROM transactions');
  let count = 0;

  const tx = db.transaction((rows) => {
    clear.run();
    rows.forEach((group) => {
      const splits = group.attributes.transactions || [];
      splits.forEach((s, idx) => {
        insertTx.run({
          id: group.id,
          split_index: idx,
          type: s.type,
          date: s.date,
          amount: parseFloat(s.amount || '0'),
          currency_code: s.currency_code,
          description: s.description,
          source_id: s.source_id,
          source_name: s.source_name,
          destination_id: s.destination_id,
          destination_name: s.destination_name,
          category_name: s.category_name || null,
          tags: JSON.stringify(s.tags || []),
        });
        count += 1;
      });
    });
  });
  tx(groups);
  return count;
}

/**
 * Firefly III has no single endpoint for "net worth over time", so we rebuild it:
 * for every asset/liability account, start from its opening balance and replay every
 * transaction touching that account in chronological order to get a daily balance,
 * then sum across accounts for a total net-worth series.
 */
function rebuildBalanceHistory() {
  const accounts = db
    .prepare('SELECT id, opening_balance, opening_balance_date FROM accounts WHERE type IN (?, ?, ?, ?)')
    .all(...ASSET_TYPES);

  const clear = db.prepare('DELETE FROM balance_history');
  const insert = db.prepare(
    'INSERT INTO balance_history (account_id, date, balance) VALUES (?, ?, ?)'
  );

  const txQuery = db.prepare(
    `SELECT date, amount, source_id, destination_id FROM transactions
     WHERE (source_id = ? OR destination_id = ?) AND type != 'opening balance'
     ORDER BY date ASC`
  );

  const run = db.transaction(() => {
    clear.run();
    accounts.forEach((acc) => {
      let balance = acc.opening_balance || 0;
      const startDate = acc.opening_balance_date
        ? acc.opening_balance_date.slice(0, 10)
        : '1970-01-01';

      const points = new Map();
      points.set(startDate, balance);

      const rows = txQuery.all(acc.id, acc.id);
      rows.forEach((r) => {
        if (r.source_id === acc.id) balance -= r.amount; // money left this account
        if (r.destination_id === acc.id) balance += r.amount; // money came into this account
        const day = r.date.slice(0, 10);
        points.set(day, balance);
      });

      points.forEach((bal, day) => insert.run(acc.id, day, bal));
    });
  });

  run();
}

async function runFullSync() {
  const started = Date.now();
  const [accounts, categories, tags, transactions] = [
    await syncAccounts(),
    await syncCategories(),
    await syncTags(),
    await syncTransactions(),
  ];
  rebuildBalanceHistory();

  db.prepare(
    `INSERT INTO sync_meta (key, value) VALUES ('last_sync', ?)
     ON CONFLICT(key) DO UPDATE SET value=excluded.value`
  ).run(new Date().toISOString());

  return {
    accounts,
    categories,
    tags,
    transactions,
    durationMs: Date.now() - started,
  };
}

module.exports = { runFullSync, rebuildBalanceHistory };
