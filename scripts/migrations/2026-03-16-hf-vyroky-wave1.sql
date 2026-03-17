BEGIN;

ALTER TABLE vyroky
  ADD COLUMN IF NOT EXISTS source_id TEXT,
  ADD COLUMN IF NOT EXISTS numeric_id BIGINT,
  ADD COLUMN IF NOT EXISTS url TEXT,
  ADD COLUMN IF NOT EXISTS speaker_url TEXT,
  ADD COLUMN IF NOT EXISTS analysis_paragraphs JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS analysis_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS scraped_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS statement_sources (
  id BIGSERIAL PRIMARY KEY,
  statement_id INTEGER NOT NULL REFERENCES vyroky(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  label TEXT NOT NULL,
  url TEXT NOT NULL,
  UNIQUE(statement_id, position)
);

CREATE TABLE IF NOT EXISTS vyroky_import_staging (
  import_run_id TEXT NOT NULL,
  source_id TEXT NOT NULL,
  staging_order INTEGER NOT NULL,
  vyrok TEXT NOT NULL,
  vyhodnotenie TEXT NOT NULL CHECK (vyhodnotenie IN ('Pravda', 'Nepravda', 'Zavádzajúce', 'Neoveriteľné')),
  odovodnenie TEXT,
  oblast TEXT,
  datum DATE,
  meno TEXT NOT NULL,
  strana TEXT NOT NULL,
  embedding vector(1024),
  numeric_id BIGINT,
  url TEXT NOT NULL,
  speaker_url TEXT,
  analysis_paragraphs JSONB NOT NULL DEFAULT '[]'::jsonb,
  analysis_date TIMESTAMPTZ,
  scraped_at TIMESTAMPTZ,
  PRIMARY KEY (import_run_id, source_id),
  UNIQUE(import_run_id, staging_order)
);

CREATE TABLE IF NOT EXISTS statement_sources_import_staging (
  import_run_id TEXT NOT NULL,
  source_id TEXT NOT NULL,
  position INTEGER NOT NULL,
  label TEXT NOT NULL,
  url TEXT NOT NULL,
  PRIMARY KEY (import_run_id, source_id, position)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_vyroky_source_id ON vyroky(source_id);
CREATE INDEX IF NOT EXISTS idx_vyroky_numeric_id ON vyroky(numeric_id) WHERE numeric_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vyroky_url ON vyroky(url);
CREATE INDEX IF NOT EXISTS idx_vyroky_speaker_url ON vyroky(speaker_url) WHERE speaker_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_statement_sources_statement_id ON statement_sources(statement_id);
CREATE INDEX IF NOT EXISTS idx_vyroky_import_staging_run_id ON vyroky_import_staging(import_run_id);
CREATE INDEX IF NOT EXISTS idx_statement_sources_import_staging_run_id
  ON statement_sources_import_staging(import_run_id);

-- This migration is intentionally non-destructive.
-- Run the importer with --dry-run first, then use --truncate for the explicit
-- atomic stage-and-swap corpus replacement after the dataset has been validated.

COMMIT;
