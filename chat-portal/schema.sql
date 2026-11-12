-- Create a Cloudflare D1 database and execute this schema before enabling analytics.
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
