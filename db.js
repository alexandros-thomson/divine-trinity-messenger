// db.js - Divine Trinity Messenger Database
// SQLite with conversation history, usage tracking, and user management.

const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

let db = null;

async function getDatabase() {
  if (db) return db;

  db = await open({
    filename: process.env.DB_PATH || './trinity.db',
    driver: sqlite3.Database
  });

  // Enable WAL mode for better concurrent read performance
  await db.exec('PRAGMA journal_mode=WAL;');

  await db.exec(`
    -- Users table: tracks Messenger users and premium status
    CREATE TABLE IF NOT EXISTS users (
      psid TEXT PRIMARY KEY,
      created_at INTEGER NOT NULL,
      is_premium INTEGER DEFAULT 0,
      premium_since INTEGER,
      preferred_deity TEXT DEFAULT 'zeus',
      stripe_customer_id TEXT,
      stripe_subscription_id TEXT
    );

    -- Usage tracking: freemium gating (3/day for free users)
    CREATE TABLE IF NOT EXISTS usage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      psid TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      deity TEXT NOT NULL,
      FOREIGN KEY (psid) REFERENCES users(psid)
    );

    -- Conversation history: context continuity across messages
    CREATE TABLE IF NOT EXISTS conversation_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      psid TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
      content TEXT NOT NULL,
      deity TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      FOREIGN KEY (psid) REFERENCES users(psid)
    );

    -- Indexes for fast lookups
    CREATE INDEX IF NOT EXISTS idx_usage_psid ON usage(psid);
    CREATE INDEX IF NOT EXISTS idx_usage_timestamp ON usage(timestamp);
    CREATE INDEX IF NOT EXISTS idx_history_psid ON conversation_history(psid);
    CREATE INDEX IF NOT EXISTS idx_history_timestamp ON conversation_history(timestamp);
  `);

  return db;
}

module.exports = { getDatabase };
