const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

let db = null;

async function getDatabase() {
  if (db) return db;
  
  db = await open({
    filename: './trinity.db',
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      psid TEXT PRIMARY KEY,
      created_at INTEGER NOT NULL,
      is_premium INTEGER DEFAULT 0,
      premium_since INTEGER,
      stripe_customer_id TEXT,
      stripe_subscription_id TEXT
    );

    CREATE TABLE IF NOT EXISTS usage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      psid TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      deity TEXT NOT NULL,
      FOREIGN KEY (psid) REFERENCES users(psid)
    );

    CREATE INDEX IF NOT EXISTS idx_usage_psid ON usage(psid);
    CREATE INDEX IF NOT EXISTS idx_usage_timestamp ON usage(timestamp);
  `);

  return db;
}

module.exports = { getDatabase };
