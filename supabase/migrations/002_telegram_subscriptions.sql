-- Soporte multi-suscriptor para alertas Telegram por registro (persons/zones)
CREATE TABLE IF NOT EXISTS telegram_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL CHECK (table_name IN ('persons', 'zones')),
  record_id UUID NOT NULL,
  chat_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (table_name, record_id, chat_id)
);

CREATE INDEX IF NOT EXISTS idx_telegram_subscriptions_record
  ON telegram_subscriptions (table_name, record_id);

CREATE INDEX IF NOT EXISTS idx_telegram_subscriptions_chat
  ON telegram_subscriptions (chat_id);
