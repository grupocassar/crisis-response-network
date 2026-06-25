
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TYPE person_status AS ENUM ('buscado', 'a_salvo', 'herido', 'fallecido');

CREATE TYPE zone_urgency AS ENUM ('alta', 'media', 'baja');

CREATE TABLE incidents (

id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

slug TEXT UNIQUE NOT NULL,

name TEXT NOT NULL,

country TEXT NOT NULL,

active BOOLEAN DEFAULT true,

created_at TIMESTAMPTZ DEFAULT now()

);

CREATE TABLE persons (

id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

incident_id UUID REFERENCES incidents(id) ON DELETE CASCADE,

name_desc TEXT NOT NULL,

status person_status DEFAULT 'buscado',

location_text TEXT,

reporter_contact TEXT NOT NULL,

trust_level SMALLINT DEFAULT 0,

telegram_chat_id TEXT,

created_at TIMESTAMPTZ DEFAULT now(),

updated_at TIMESTAMPTZ DEFAULT now()

);

CREATE TABLE person_revisions (

id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

person_id UUID REFERENCES persons(id) ON DELETE CASCADE,

status person_status,

location_text TEXT,

author_contact TEXT,

trust_level SMALLINT DEFAULT 0,

created_at TIMESTAMPTZ DEFAULT now()

);

CREATE TABLE zones (

id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

incident_id UUID REFERENCES incidents(id) ON DELETE CASCADE,

name TEXT NOT NULL,

situation TEXT NOT NULL,

urgency zone_urgency DEFAULT 'media',

reporter_contact TEXT NOT NULL,

trust_level SMALLINT DEFAULT 0,

telegram_chat_id TEXT,

created_at TIMESTAMPTZ DEFAULT now()

);

CREATE INDEX idx_persons_name_trgm ON persons USING GIN (name_desc gin_trgm_ops);

CREATE INDEX idx_zones_name_trgm ON zones USING GIN (name gin_trgm_ops);

CREATE INDEX idx_zones_situation_trgm ON zones USING GIN (situation gin_trgm_ops);
