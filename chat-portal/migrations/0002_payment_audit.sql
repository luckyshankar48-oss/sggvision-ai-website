-- SGGVISION payment audit migration.
-- Safe to apply once to the existing D1 database; no customer/payment rows are deleted.
-- Webhook handlers must verify the provider signature before inserting events or
-- changing payment/subscription state.

CREATE TABLE IF NOT EXISTS payment_events (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  provider_event_id TEXT,
  provider_order_id TEXT,
  provider_payment_id TEXT,
  event_type TEXT NOT NULL,
  payload_sha256 TEXT NOT NULL,
  processed_at TEXT NOT NULL DEFAULT (datetime('now')),
  processing_status TEXT NOT NULL DEFAULT 'received'
    CHECK(processing_status IN ('received','processed','ignored','failed')),
  error_code TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_events_provider_event
  ON payment_events(provider, provider_event_id)
  WHERE provider_event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payment_events_order
  ON payment_events(provider, provider_order_id);

CREATE INDEX IF NOT EXISTS idx_payment_events_payment
  ON payment_events(provider, provider_payment_id);

-- A payment may be activated only once. Existing unique payment_id on
-- subscriptions is retained as the final idempotency guard.
