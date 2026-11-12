-- Admin email OTP authentication. Safe to apply once; no existing data is changed.
CREATE TABLE IF NOT EXISTS admin_otp (
  email TEXT PRIMARY KEY COLLATE NOCASE,
  otp_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_sent_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
