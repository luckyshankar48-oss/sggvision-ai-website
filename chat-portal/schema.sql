-- SGGVISION AI D1 schema.
-- Safe to re-run: all statements use IF NOT EXISTS.
-- Existing analytics tables are retained; no data is dropped.

CREATE TABLE IF NOT EXISTS page_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  visitor_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK(event_type IN ('page_view','chat_message','image_generation')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_page_events_created ON page_events(created_at);
CREATE INDEX IF NOT EXISTS idx_page_events_visitor ON page_events(visitor_id);

CREATE TABLE IF NOT EXISTS live_sessions (
  visitor_id TEXT PRIMARY KEY,
  last_seen TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_live_sessions_last_seen ON live_sessions(last_seen);

-- Customer identity and session tables. Passwords must be stored as salted
-- PBKDF2 hashes by the server; never store plaintext passwords.
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','suspended')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_login_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_customers_created ON customers(created_at);

CREATE TABLE IF NOT EXISTS customer_sessions (
  token_hash TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_customer_sessions_customer ON customer_sessions(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_sessions_expiry ON customer_sessions(expires_at);

-- Guest and authenticated usage is counted on the server, not in localStorage.
CREATE TABLE IF NOT EXISTS usage_counters (
  id TEXT PRIMARY KEY,
  customer_id TEXT REFERENCES customers(id) ON DELETE CASCADE,
  guest_id TEXT,
  free_messages_used INTEGER NOT NULL DEFAULT 0,
  period_started_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK ((customer_id IS NOT NULL AND guest_id IS NULL) OR
         (customer_id IS NULL AND guest_id IS NOT NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_usage_customer ON usage_counters(customer_id) WHERE customer_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_usage_guest ON usage_counters(guest_id) WHERE guest_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  amount_paise INTEGER NOT NULL CHECK(amount_paise >= 0),
  duration_days INTEGER,
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1))
);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customers(id),
  plan_id TEXT NOT NULL REFERENCES plans(id),
  provider TEXT NOT NULL,
  provider_order_id TEXT UNIQUE,
  provider_payment_id TEXT UNIQUE,
  amount_paise INTEGER NOT NULL CHECK(amount_paise > 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL CHECK(status IN ('created','pending','paid','failed','refunded')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  paid_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_payments_customer ON payments(customer_id,created_at);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status,created_at);

CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customers(id),
  plan_id TEXT NOT NULL REFERENCES plans(id),
  payment_id TEXT NOT NULL UNIQUE REFERENCES payments(id),
  status TEXT NOT NULL CHECK(status IN ('active','expired','cancelled')),
  starts_at TEXT NOT NULL,
  ends_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_subscriptions_customer ON subscriptions(customer_id,status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_expiry ON subscriptions(status,ends_at);

-- Seed the four proposed plans as inactive until pricing and service limits
-- have been approved. This prevents accidental live sales.
INSERT OR IGNORE INTO plans(id,name,amount_paise,duration_days,active) VALUES
 ('monthly','Monthly',9900,30,0),
 ('half-year','Six months',49900,180,0),
 ('annual','Annual',89900,365,0),
 ('lifetime','Lifetime / Full Work',249900,NULL,0);
