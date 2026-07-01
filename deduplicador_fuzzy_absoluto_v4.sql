-- =====================================================================
-- SCRIPT SQL: DEDUPLICADOR FUZZY ABSOLUTO (NIVEL 3 - CORREGIDO)
-- =====================================================================

-- 1. Crear tabla de mapeo identificando al "Maestro" de cada grupo
CREATE TEMP TABLE mapeo_fuzzy AS
WITH BaseLimpia AS (
    SELECT 
        id,
        TRIM(REGEXP_REPLACE(REGEXP_REPLACE(lower(unaccent(name_desc)), '\(?menor.*', '', 'gi'), '[^a-z0-9]', '', 'g')) AS firma_unica
    FROM persons
    WHERE incident_id = '9e730f8c-d800-4cf0-b9f1-54eac120a6bf'
      AND name_desc IS NOT NULL
)
SELECT 
    firma_unica,
    MIN(id::text)::uuid AS master_id
FROM BaseLimpia
WHERE firma_unica <> ''
GROUP BY firma_unica
HAVING COUNT(*) > 1;

-- 2. Mover Suscripciones de Telegram al Maestro (Protección Anti-Duplicados)
DELETE FROM telegram_subscriptions t
USING persons p, mapeo_fuzzy m
WHERE t.record_id = p.id 
  AND p.id <> m.master_id
  AND TRIM(REGEXP_REPLACE(REGEXP_REPLACE(lower(unaccent(p.name_desc)), '\(?menor.*', '', 'gi'), '[^a-z0-9]', '', 'g')) = m.firma_unica
  AND EXISTS (
      SELECT 1 FROM telegram_subscriptions master_sub 
      WHERE master_sub.record_id = m.master_id 
        AND master_sub.chat_id = t.chat_id 
        AND master_sub.table_name = t.table_name
  );

DELETE FROM telegram_subscriptions t
USING persons p, mapeo_fuzzy m
WHERE t.record_id = p.id 
  AND p.id <> m.master_id
  AND TRIM(REGEXP_REPLACE(REGEXP_REPLACE(lower(unaccent(p.name_desc)), '\(?menor.*', '', 'gi'), '[^a-z0-9]', '', 'g')) = m.firma_unica
  AND t.id NOT IN (
      SELECT MIN(t2.id::text)::uuid
      FROM telegram_subscriptions t2
      JOIN persons p2 ON t2.record_id = p2.id
      JOIN mapeo_fuzzy m2 ON TRIM(REGEXP_REPLACE(REGEXP_REPLACE(lower(unaccent(p2.name_desc)), '\(?menor.*', '', 'gi'), '[^a-z0-9]', '', 'g')) = m2.firma_unica
      WHERE p2.id <> m2.master_id
      GROUP BY m2.master_id, t2.chat_id, t2.table_name
  );

UPDATE telegram_subscriptions t
SET record_id = m.master_id
FROM persons p
JOIN mapeo_fuzzy m ON TRIM(REGEXP_REPLACE(REGEXP_REPLACE(lower(unaccent(p.name_desc)), '\(?menor.*', '', 'gi'), '[^a-z0-9]', '', 'g')) = m.firma_unica
WHERE t.record_id = p.id 
  AND p.id <> m.master_id;

-- 3. Mover Historial de Revisiones
UPDATE person_revisions r
SET person_id = m.master_id
FROM persons p
JOIN mapeo_fuzzy m ON TRIM(REGEXP_REPLACE(REGEXP_REPLACE(lower(unaccent(p.name_desc)), '\(?menor.*', '', 'gi'), '[^a-z0-9]', '', 'g')) = m.firma_unica
WHERE r.person_id = p.id AND p.id <> m.master_id;

UPDATE history_logs h
SET record_id = m.master_id
FROM persons p
JOIN mapeo_fuzzy m ON TRIM(REGEXP_REPLACE(REGEXP_REPLACE(lower(unaccent(p.name_desc)), '\(?menor.*', '', 'gi'), '[^a-z0-9]', '', 'g')) = m.firma_unica
WHERE h.record_id = p.id AND p.id <> m.master_id;

-- 4. Heredar Cédulas y Resolver Estado (¡CONVERSIÓN ::person_status CORREGIDA!)
UPDATE persons master
SET 
    document_id = COALESCE(master.document_id, clone.document_id),
    status = (CASE 
        WHEN clone.status = 'fallecido' OR master.status = 'fallecido' THEN 'fallecido'
        WHEN clone.status = 'a_salvo' OR master.status = 'a_salvo' THEN 'a_salvo'
        WHEN clone.status = 'herido' OR master.status = 'herido' THEN 'herido'
        ELSE 'buscado'
    END)::person_status,
    updated_at = NOW()
FROM persons clone
JOIN mapeo_fuzzy m ON TRIM(REGEXP_REPLACE(REGEXP_REPLACE(lower(unaccent(clone.name_desc)), '\(?menor.*', '', 'gi'), '[^a-z0-9]', '', 'g')) = m.firma_unica
WHERE master.id = m.master_id
  AND clone.id <> m.master_id;

-- 5. Eliminar los clones
DELETE FROM persons a
USING mapeo_fuzzy b
WHERE TRIM(REGEXP_REPLACE(REGEXP_REPLACE(lower(unaccent(a.name_desc)), '\(?menor.*', '', 'gi'), '[^a-z0-9]', '', 'g')) = b.firma_unica
  AND a.id <> b.master_id
  AND a.incident_id = '9e730f8c-d800-4cf0-b9f1-54eac120a6bf';

-- 6. Limpiar memoria temporal
DROP TABLE mapeo_fuzzy;
