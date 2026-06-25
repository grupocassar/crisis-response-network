-- Backfill opcional: migrar chat_id legado de persons/zones a telegram_subscriptions
-- Seguro para re-ejecución por ON CONFLICT DO NOTHING.

INSERT INTO telegram_subscriptions (table_name, record_id, chat_id)
SELECT 'persons', id, telegram_chat_id
FROM persons
WHERE telegram_chat_id IS NOT NULL
  AND btrim(telegram_chat_id) <> ''
ON CONFLICT (table_name, record_id, chat_id) DO NOTHING;

INSERT INTO telegram_subscriptions (table_name, record_id, chat_id)
SELECT 'zones', id, telegram_chat_id
FROM zones
WHERE telegram_chat_id IS NOT NULL
  AND btrim(telegram_chat_id) <> ''
ON CONFLICT (table_name, record_id, chat_id) DO NOTHING;
