-- =====================================================================
-- SCRIPT SQL: CREACIÓN DE BÓVEDA DE AISLAMIENTO (MESA DE RESOLUCIÓN)
-- Tabla para almacenar clones difusos y contradicciones de estado.
-- =====================================================================

CREATE TABLE IF NOT EXISTS conflict_staging (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    person_1_id UUID NOT NULL,
    person_1_name TEXT NOT NULL,
    person_1_status TEXT NOT NULL,
    person_2_id UUID NOT NULL,
    person_2_name TEXT NOT NULL,
    person_2_status TEXT NOT NULL,
    similarity_score NUMERIC(5,2),
    risk_category TEXT NOT NULL, -- 'A' (Seguro), 'B' (Dudoso), 'C' (Fallecido involucrado)
    resolution_status TEXT DEFAULT 'pendiente',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Opcional: Índice para buscar rápido los pendientes
CREATE INDEX IF NOT EXISTS idx_conflict_staging_status ON conflict_staging(resolution_status);

COMMENT ON TABLE conflict_staging IS 'Mesa de resolución para clones difusos y contradicciones de estado detectadas por el sistema de triaje.';
