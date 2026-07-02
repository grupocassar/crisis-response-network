-- Vista sanitizada para exportación a prensa
-- Ejecutar UNA sola vez en Supabase SQL Editor
-- Nunca exponer la tabla persons directamente al portal de prensa

CREATE OR REPLACE VIEW press_census AS
WITH ranked AS (
  SELECT
    id,
    name_desc,
    status,
    location_text,
    reporter_contact,
    trust_level,
    created_at,
    updated_at,
    document_id,
    ROW_NUMBER() OVER (
      PARTITION BY COALESCE(document_id, id::text)
      ORDER BY updated_at DESC, trust_level DESC
    ) AS rn
  FROM persons
  WHERE status != 'fallecido'
),
deduped AS (
  SELECT * FROM ranked WHERE rn = 1
)
SELECT
  UPPER(TRIM(name_desc))                         AS full_name,
  COALESCE(document_id, '')                      AS identity_document,
  CASE status
    WHEN 'a_salvo' THEN 'Located'
    WHEN 'herido'  THEN 'Hospitalized'
    WHEN 'buscado' THEN 'Missing'
  END                                            AS last_reported_status,
  CASE status
    WHEN 'a_salvo' THEN 'LOCATED'
    WHEN 'herido'  THEN 'HOSPITALIZED'
    WHEN 'buscado' THEN 'MISSING'
  END                                            AS status_code,
  COALESCE(NULLIF(TRIM(location_text), ''), 'Unknown') AS last_known_location,
  CASE
    WHEN reporter_contact ILIKE ANY(ARRAY['%hospital%','%medico%','%clinica%','%Hospitales%','%Francotirador%','%Delta%','%Barrido%','%Cacería%','%Extractor%','%80k%','%P3%'])
      THEN 'Public Health Network'
    WHEN reporter_contact ILIKE ANY(ARRAY['%familiar%','%familia%','%+58%','%0412%','%0414%','%0416%','%0424%','%0426%'])
      THEN 'Verified Citizen Report'
    WHEN reporter_contact ILIKE ANY(ARRAY['%OSINT%','%ninos%','%niños%','%Alerta%','%Rescate%','%Ámbar%'])
      THEN 'OSINT / Open Source'
    ELSE 'Citizen Network'
  END                                            AS data_source,
  TO_CHAR(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS first_reported_utc,
  TO_CHAR(updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS last_updated_utc
FROM deduped
ORDER BY
  CASE status WHEN 'buscado' THEN 1 WHEN 'herido' THEN 2 ELSE 3 END,
  updated_at DESC;

-- ¡NUEVO! Otorgar permisos al rol público para que React pueda descargar el CSV
GRANT SELECT ON press_census TO anon, authenticated;

-- Verificación post-creación:
-- SELECT status_code, COUNT(*) FROM press_census GROUP BY status_code;
