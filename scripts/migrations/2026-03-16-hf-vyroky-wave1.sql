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

CREATE UNIQUE INDEX IF NOT EXISTS idx_vyroky_source_id ON vyroky(source_id);
CREATE INDEX IF NOT EXISTS idx_vyroky_numeric_id ON vyroky(numeric_id) WHERE numeric_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vyroky_url ON vyroky(url);
CREATE INDEX IF NOT EXISTS idx_vyroky_speaker_url ON vyroky(speaker_url) WHERE speaker_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_statement_sources_statement_id ON statement_sources(statement_id);

-- Wave 1 statement-only corpus reset. This intentionally leaves clanky untouched.
TRUNCATE TABLE statement_sources, vyroky RESTART IDENTITY CASCADE;

ALTER TABLE vyroky
  ALTER COLUMN source_id SET NOT NULL,
  ALTER COLUMN url SET NOT NULL,
  ALTER COLUMN analysis_paragraphs SET DEFAULT '[]'::jsonb,
  ALTER COLUMN analysis_paragraphs SET NOT NULL;

COMMIT;
