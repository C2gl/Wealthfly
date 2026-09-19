const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'wealthfly.db');

require('fs').mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  currency_code TEXT,
  opening_balance REAL DEFAULT 0,
  opening_balance_date TEXT,
  current_balance REAL DEFAULT 0,
  active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT NOT NULL,
  split_index INTEGER NOT NULL,
  type TEXT NOT NULL,
  date TEXT NOT NULL,
  amount REAL NOT NULL,
  currency_code TEXT,
  description TEXT,
  source_id TEXT,
  source_name TEXT,
  destination_id TEXT,
  destination_name TEXT,
  category_name TEXT,
  tags TEXT DEFAULT '[]',
  PRIMARY KEY (id, split_index)
);

CREATE TABLE IF NOT EXISTS balance_history (
  account_id TEXT NOT NULL,
  date TEXT NOT NULL,
  balance REAL NOT NULL,
  PRIMARY KEY (account_id, date)
);

CREATE TABLE IF NOT EXISTS sync_meta (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE INDEX IF NOT EXISTS idx_tx_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_tx_category ON transactions(category_name);
CREATE INDEX IF NOT EXISTS idx_tx_destination ON transactions(destination_name);
CREATE INDEX IF NOT EXISTS idx_balhist_date ON balance_history(date);
`);

module.exports = db;
