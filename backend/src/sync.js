const db = require('./db');
const defaultFirefly = require('./fireflyClient');
const { checkReconciliation, storeResult: storeReconciliation } = require('./reconcile');

function today() {
  return new Date().toISOString().slice(0, 10);
}

function shiftDate(dateString, days) {
  const date = new Date(`${dateString}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

const DEFAULT_LOOKBACK_DAYS = 30;

// How many trailing days an incremental sync re-fetches and re-applies, so
// backdated/edited transactions within that window still get picked up.
// Configurable via SYNC_LOOKBACK_DAYS in .env.
function getLookbackDays() {
  const raw = Number(process.env.SYNC_LOOKBACK_DAYS);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : DEFAULT_LOOKBACK_DAYS;
}

class SyncInProgressError extends Error {
  constructor(message = 'A sync is already in progress') {
    super(message);
    this.name = 'SyncInProgressError';
    this.code = 'SYNC_IN_PROGRESS';
  }
}

const MAX_SYNC_DURATION_MS = 10 * 60 * 1000; // 10 minutes watchdog
const syncState = {
  inProgress: false,
  startedAt: null,
  source: null,
};

function isSyncInProgress() {
  if (!syncState.inProgress) return false;
  if (syncState.startedAt && Date.now() - new Date(syncState.startedAt).getTime() > MAX_SYNC_DURATION_MS) {
    console.warn('[sync] sync lock exceeded timeout (10m), releasing stale lock');
    syncState.inProgress = false;
    syncState.startedAt = null;
    syncState.source = null;
    return false;
  }
  return true;
}

function getSyncState() {
  return {
    inProgress: isSyncInProgress(),
    startedAt: syncState.startedAt,
    source: syncState.source,
  };
}

function setSyncStatusMeta(status) {
  try {
    db.prepare(
      `INSERT INTO sync_meta (key, value) VALUES ('sync_status', ?)
       ON CONFLICT(key) DO UPDATE SET value=excluded.value`
    ).run(status);
  } catch (err) {
    // DB might be closed or during unit test setup
  }
}

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

function transactionRowFromSplit(group, s, idx) {
  return {
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
  };
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
        insertTx.run(transactionRowFromSplit(group, s, idx));
        count += 1;
      });
    });
  });
  tx(groups);
  return count;
}

/**
 * Incremental transaction sync: only re-fetches and re-applies a trailing
 * window of `lookbackDays` (default 30, via SYNC_LOOKBACK_DAYS) instead of
 * Wealthfly's entire history. Everything older than the window is left
 * untouched in the local DB — full sync stays available (see runFullSync /
 * the "full" option on runSync) for building history from scratch or forcing
 * a complete refresh.
 *
 * This re-fetches the whole window rather than only transactions "new since
 * last sync", because Firefly transactions can be edited or backdated after
 * the fact (a bank import landing late, a manual date correction) and the
 * plain transactions list endpoint has no reliable "updated since" filter.
 * A wide-enough lookback window catches those edits; a change further back
 * than the window won't be picked up until the next full sync.
 */
async function syncTransactionsIncremental(firefly = defaultFirefly, lookbackDays = getLookbackDays()) {
  const windowStart = shiftDate(today(), -lookbackDays);
  const groups = await firefly.getTransactions({ start: windowStart });
  const clearWindow = db.prepare('DELETE FROM transactions WHERE substr(date, 1, 10) >= ?');
  let count = 0;

  const tx = db.transaction((rows) => {
    clearWindow.run(windowStart);
    rows.forEach((group) => {
      const splits = group.attributes.transactions || [];
      splits.forEach((s, idx) => {
        insertTx.run(transactionRowFromSplit(group, s, idx));
        count += 1;
      });
    });
  });
  tx(groups);
  return { count, windowStart };
}

function hasSyncedBefore() {
  return Boolean(db.prepare("SELECT value FROM sync_meta WHERE key = 'last_sync'").get());
}

// Wipes every synced table so the next sync starts completely from scratch —
// used by the settings page's "purge" action. Callers are responsible for
// checking isSyncInProgress() first; this doesn't take the sync lock itself
// since it's not a sync, just a reset.
function purgeAllData() {
  db.exec(`
    DELETE FROM accounts;
    DELETE FROM categories;
    DELETE FROM tags;
    DELETE FROM transactions;
    DELETE FROM balance_history;
    DELETE FROM sync_meta;
  `);
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

function acquireSyncLock(source) {
  if (isSyncInProgress()) {
    throw new SyncInProgressError('A sync is already in progress');
  }
  syncState.inProgress = true;
  syncState.startedAt = new Date().toISOString();
  syncState.source = source;
  setSyncStatusMeta('running');
}

function releaseSyncLock() {
  syncState.inProgress = false;
  syncState.startedAt = null;
  syncState.source = null;
  setSyncStatusMeta('idle');
}

// Shared tail end of every sync: record last_sync, run the (best-effort,
// non-fatal) reconciliation check, and shape the result object.
async function finalizeSync(firefly, started, extra = {}) {
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

  return { durationMs: Date.now() - started, ...extra };
}

async function runFullSync(firefly = defaultFirefly, { source = 'api' } = {}) {
  acquireSyncLock(source);
  const started = Date.now();
  try {
    const accounts = await syncAccounts(firefly);
    const categories = await syncCategories(firefly);
    const tags = await syncTags(firefly);
    const transactions = await syncTransactions(firefly);
    rebuildBalanceHistory();

    return await finalizeSync(firefly, started, {
      accounts,
      categories,
      tags,
      transactions,
      incremental: false,
    });
  } finally {
    releaseSyncLock();
  }
}

async function runIncrementalSync(firefly = defaultFirefly, { source = 'api', lookbackDays } = {}) {
  acquireSyncLock(source);
  const started = Date.now();
  try {
    const accounts = await syncAccounts(firefly);
    const categories = await syncCategories(firefly);
    const tags = await syncTags(firefly);
    const { count: transactions, windowStart } = await syncTransactionsIncremental(firefly, lookbackDays);
    rebuildBalanceHistory();

    return await finalizeSync(firefly, started, {
      accounts,
      categories,
      tags,
      transactions,
      incremental: true,
      lookbackStart: windowStart,
    });
  } finally {
    releaseSyncLock();
  }
}

// Main entry point for scheduled/manual syncs: does a full historical sync
// the very first time (no data yet) or when explicitly forced, and a cheap
// windowed incremental sync otherwise.
async function runSync(firefly = defaultFirefly, { source = 'api', full = false, lookbackDays } = {}) {
  if (full || !hasSyncedBefore()) {
    return runFullSync(firefly, { source });
  }
  return runIncrementalSync(firefly, { source, lookbackDays });
}

module.exports = {
  runFullSync,
  runIncrementalSync,
  runSync,
  rebuildBalanceHistory,
  computeBalancePoints,
  syncAccounts,
  syncCategories,
  syncTags,
  syncTransactions,
  syncTransactionsIncremental,
  hasSyncedBefore,
  purgeAllData,
  getLookbackDays,
  isSyncInProgress,
  getSyncState,
  SyncInProgressError,
  MAX_SYNC_DURATION_MS,
  _syncState: syncState,
};
