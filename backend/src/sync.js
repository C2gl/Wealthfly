const db = require('./db');
const defaultFirefly = require('./fireflyClient');
const { checkReconciliation, storeResult: storeReconciliation } = require('./reconcile');

const NET_WORTH_TYPES = new Set(['asset', 'cash', 'liability', 'liabilities', 'loan', 'debt', 'mortgage']);

function upsertAccount(row) {
  db.prepare(
    `INSERT INTO accounts (id, name, type, currency_code, opening_balance, opening_balance_date, current_balance, include_net_worth, active)
     VALUES (@id, @name, @type, @currency_code, @opening_balance, @opening_balance_date, @current_balance, @include_net_worth, @active)
     ON CONFLICT(id) DO UPDATE SET
       name=excluded.name, type=excluded.type, currency_code=excluded.currency_code,
       opening_balance=excluded.opening_balance, opening_balance_date=excluded.opening_balance_date,
       current_balance=excluded.current_balance, include_net_worth=excluded.include_net_worth, active=excluded.active`
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

async function syncAccounts(firefly = defaultFirefly) {
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
        include_net_worth: attr.include_net_worth === false ? 0 : 1,
        active: attr.active ? 1 : 0,
      });
    });
  });
  tx(accounts);
  return accounts.length;
}

async function syncCategories(firefly = defaultFirefly) {
  const categories = await firefly.getCategories();
  const clear = db.prepare('DELETE FROM categories');
  const tx = db.transaction((rows) => {
    clear.run();
    rows.forEach((c) => upsertCategory({ id: c.id, name: c.attributes.name }));
  });
  tx(categories);
  return categories.length;
}

async function syncTags(firefly = defaultFirefly) {
  const tags = await firefly.getTags();
  const clear = db.prepare('DELETE FROM tags');
  const tx = db.transaction((rows) => {
    clear.run();
    rows.forEach((t) => upsertTag({ id: t.id, name: t.attributes.tag }));
  });
  tx(tags);
  return tags.length;
}

async function syncTransactions(firefly = defaultFirefly) {
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
 * Pure balance-replay function, deliberately kept free of any DB access so it can be
 * unit tested directly: given an account's opening balance and every transaction that
 * touches it (chronologically sorted), returns one {date, balance} point per day that
 * had activity, plus a starting point on `startDate`. When more than one transaction
 * lands on the same day, the last one in `transactions` wins for that day's point —
 * callers are responsible for passing transactions in ascending date order.
 */
function computeBalancePoints(accountId, openingBalance, startDate, transactions) {
  const points = new Map();
  points.set(startDate, openingBalance);

  let balance = openingBalance;
  transactions.forEach((tx) => {
    if (tx.source_id === accountId) balance -= tx.amount; // money left this account
    if (tx.destination_id === accountId) balance += tx.amount; // money came into this account
    const day = tx.date.slice(0, 10);
    points.set(day, balance);
  });

  return Array.from(points.entries()).map(([date, bal]) => ({ date, balance: bal }));
}

/**
 * Firefly III has no single endpoint for "net worth over time", so we rebuild it:
 * for every asset/liability account, start from its opening balance and replay every
 * transaction touching that account in chronological order to get a daily balance,
 * then sum across accounts for a total net-worth series.
 *
 * Previously this per-account lookup ran with no index on source_id/destination_id,
 * so it was a full table scan of `transactions` once per account. idx_tx_source_id
 * and idx_tx_destination_id (see db.js) let SQLite satisfy this OR query with its
 * "multi-index OR" strategy instead — confirmed via EXPLAIN QUERY PLAN, which shows
 * a SEARCH on each index and a rowid merge, rather than a table SCAN.
 */
function rebuildBalanceHistory() {
  const accounts = db
    .prepare(`SELECT id, opening_balance, opening_balance_date
          FROM accounts
          WHERE include_net_worth = 1 AND type IN (${[...NET_WORTH_TYPES].map(() => '?').join(', ')})`)
    .all(...NET_WORTH_TYPES);

  const clear = db.prepare('DELETE FROM balance_history');
  const insert = db.prepare(
    'INSERT INTO balance_history (account_id, date, balance) VALUES (?, ?, ?)'
  );

  const txQuery = db.prepare(
    `SELECT date, amount, source_id, destination_id FROM transactions
     WHERE (source_id = ? OR destination_id = ?) AND type != 'opening balance'
       AND date >= ?
     ORDER BY date ASC, id ASC, split_index ASC`
  );

  const run = db.transaction(() => {
    clear.run();
    accounts.forEach((acc) => {
      const startDate = acc.opening_balance_date
        ? acc.opening_balance_date.slice(0, 10)
        : '1970-01-01';

      const rows = txQuery.all(acc.id, acc.id, startDate);
      const points = computeBalancePoints(acc.id, acc.opening_balance || 0, startDate, rows);
      points.forEach(({ date, balance }) => insert.run(acc.id, date, balance));
    });
  });

  run();
}

async function runFullSync(firefly = defaultFirefly) {
  const started = Date.now();
  const accounts = await syncAccounts(firefly);
  const categories = await syncCategories(firefly);
  const tags = await syncTags(firefly);
  const transactions = await syncTransactions(firefly);
  rebuildBalanceHistory();

  db.prepare(
    `INSERT INTO sync_meta (key, value) VALUES ('last_sync', ?)
     ON CONFLICT(key) DO UPDATE SET value=excluded.value`
  ).run(new Date().toISOString());

  try {
    const reconciliation = await checkReconciliation({}, firefly);
    storeReconciliation(reconciliation);
  } catch (err) {
    // Reconciliation is a diagnostic extra, not core to syncing — a Firefly
    // hiccup here should never fail the sync itself.
    console.error('[reconcile] failed:', err.message);
  }

  return {
    accounts,
    categories,
    tags,
    transactions,
    durationMs: Date.now() - started,
  };
}

module.exports = {
  runFullSync,
  rebuildBalanceHistory,
  computeBalancePoints,
  syncAccounts,
  syncCategories,
  syncTags,
  syncTransactions,
};
