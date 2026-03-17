-- Wave 2 migration notes:
-- Before running embed-statements.ts with Qwen 2048d vectors, apply in the Supabase SQL Editor:
--   ALTER TABLE vyroky ALTER COLUMN embedding TYPE vector(2048) USING NULL::vector(2048);
--   ALTER TABLE vyroky_import_staging ALTER COLUMN embedding TYPE vector(2048) USING NULL::vector(2048);
--   DROP INDEX IF EXISTS idx_vyroky_embedding;
--   ALTER TABLE clanky ALTER COLUMN embedding TYPE vector(2048) USING NULL::vector(2048);
--   DROP INDEX IF EXISTS idx_clanky_embedding;
-- 2048d exceeds the 2000d pgvector HNSW limit; sequential scan is used for both tables.

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS vyroky (
  id SERIAL PRIMARY KEY,
  vyrok TEXT NOT NULL,
  vyhodnotenie TEXT NOT NULL CHECK (vyhodnotenie IN ('Pravda', 'Nepravda', 'Zavádzajúce', 'Neoveriteľné')),
  odovodnenie TEXT,
  oblast TEXT,
  datum DATE,
  meno TEXT NOT NULL,
  strana TEXT NOT NULL,
  embedding vector(2048),
  source_id TEXT NOT NULL,
  numeric_id BIGINT,
  url TEXT NOT NULL,
  speaker_url TEXT,
  analysis_paragraphs JSONB NOT NULL DEFAULT '[]'::jsonb,
  analysis_date TIMESTAMPTZ,
  scraped_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS clanky (
  id SERIAL PRIMARY KEY,
  datum TIMESTAMPTZ,
  autor TEXT,
  text_content TEXT,
  embedding vector(2048)
);

CREATE TABLE IF NOT EXISTS statement_sources (
  id BIGSERIAL PRIMARY KEY,
  statement_id INTEGER NOT NULL REFERENCES vyroky(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  label TEXT NOT NULL,
  url TEXT NOT NULL,
  title TEXT,
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
  embedding vector(2048),
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

CREATE INDEX IF NOT EXISTS idx_vyroky_strana ON vyroky(strana);
CREATE INDEX IF NOT EXISTS idx_vyroky_oblast ON vyroky(oblast) WHERE oblast IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vyroky_vyhodnotenie ON vyroky(vyhodnotenie);
CREATE INDEX IF NOT EXISTS idx_vyroky_meno ON vyroky(meno);
CREATE INDEX IF NOT EXISTS idx_vyroky_datum ON vyroky(datum) WHERE datum IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_vyroky_source_id ON vyroky(source_id);
CREATE INDEX IF NOT EXISTS idx_vyroky_numeric_id ON vyroky(numeric_id) WHERE numeric_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vyroky_url ON vyroky(url);
CREATE INDEX IF NOT EXISTS idx_vyroky_speaker_url ON vyroky(speaker_url) WHERE speaker_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_statement_sources_statement_id ON statement_sources(statement_id);
CREATE INDEX IF NOT EXISTS idx_vyroky_import_staging_run_id ON vyroky_import_staging(import_run_id);
CREATE INDEX IF NOT EXISTS idx_statement_sources_import_staging_run_id
  ON statement_sources_import_staging(import_run_id);

CREATE OR REPLACE FUNCTION search_statements(
  query_embedding vector(2048),
  match_count int DEFAULT 20,
  match_offset int DEFAULT 0,
  filter_strana text DEFAULT NULL,
  filter_vyhodnotenie text DEFAULT NULL,
  filter_meno text DEFAULT NULL,
  filter_datum_od date DEFAULT NULL,
  filter_datum_do date DEFAULT NULL
) RETURNS TABLE (
  id int,
  vyrok text,
  vyhodnotenie text,
  odovodnenie text,
  datum date,
  meno text,
  strana text,
  url text,
  speaker_url text,
  similarity float
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    v.id,
    v.vyrok,
    v.vyhodnotenie,
    v.odovodnenie,
    v.datum,
    v.meno,
    v.strana,
    v.url,
    v.speaker_url,
    (1 - (v.embedding <=> query_embedding))::float AS similarity
  FROM vyroky v
  WHERE (filter_strana IS NULL OR v.strana = filter_strana)
    AND (filter_vyhodnotenie IS NULL OR v.vyhodnotenie = filter_vyhodnotenie)
    AND (filter_meno IS NULL OR v.meno = filter_meno)
    AND (filter_datum_od IS NULL OR v.datum >= filter_datum_od)
    AND (filter_datum_do IS NULL OR v.datum <= filter_datum_do)
    AND v.embedding IS NOT NULL
  ORDER BY v.embedding <=> query_embedding
  LIMIT match_count
  OFFSET match_offset;
END;
$$;

CREATE OR REPLACE FUNCTION count_statements(
  filter_strana text DEFAULT NULL,
  filter_vyhodnotenie text DEFAULT NULL,
  filter_meno text DEFAULT NULL,
  filter_datum_od date DEFAULT NULL,
  filter_datum_do date DEFAULT NULL,
  require_embedding boolean DEFAULT false
) RETURNS int LANGUAGE plpgsql AS $$
DECLARE
  result int;
BEGIN
  SELECT COUNT(*)::int INTO result
  FROM vyroky v
  WHERE (filter_strana IS NULL OR v.strana = filter_strana)
    AND (filter_vyhodnotenie IS NULL OR v.vyhodnotenie = filter_vyhodnotenie)
    AND (filter_meno IS NULL OR v.meno = filter_meno)
    AND (filter_datum_od IS NULL OR v.datum >= filter_datum_od)
    AND (filter_datum_do IS NULL OR v.datum <= filter_datum_do)
    AND (NOT require_embedding OR v.embedding IS NOT NULL);

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION list_distinct_values(col text)
RETURNS TABLE (value text)
LANGUAGE plpgsql AS $$
BEGIN
  IF col = 'meno' THEN
    RETURN QUERY
    SELECT DISTINCT v.meno
    FROM vyroky v
    WHERE v.meno IS NOT NULL
    ORDER BY 1;
  ELSIF col = 'strana' THEN
    RETURN QUERY
    SELECT DISTINCT v.strana
    FROM vyroky v
    WHERE v.strana IS NOT NULL
    ORDER BY 1;
  ELSE
    RAISE EXCEPTION 'Unsupported distinct column: %', col;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION statement_date_bounds()
RETURNS TABLE (min_date date, max_date date)
LANGUAGE sql
AS $$
  SELECT
    MIN(v.datum) AS min_date,
    MAX(v.datum) AS max_date
  FROM vyroky v
  WHERE v.datum IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION match_statements(
  query_embedding vector(2048),
  match_count int DEFAULT 10
) RETURNS TABLE (
  id int,
  vyrok text,
  vyhodnotenie text,
  odovodnenie text,
  datum date,
  meno text,
  strana text,
  url text,
  speaker_url text,
  similarity float
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    v.id,
    v.vyrok,
    v.vyhodnotenie,
    v.odovodnenie,
    v.datum,
    v.meno,
    v.strana,
    v.url,
    v.speaker_url,
    (1 - (v.embedding <=> query_embedding))::float AS similarity
  FROM vyroky v
  WHERE v.embedding IS NOT NULL
  ORDER BY v.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

CREATE OR REPLACE FUNCTION match_articles(
  query_embedding vector(2048),
  match_count int DEFAULT 3
) RETURNS TABLE (
  id int,
  datum timestamptz,
  autor text,
  text_content text,
  similarity float
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.datum,
    c.autor,
    c.text_content,
    (1 - (c.embedding <=> query_embedding))::float AS similarity
  FROM clanky c
  WHERE c.embedding IS NOT NULL
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

CREATE OR REPLACE FUNCTION exec_sql(query text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE query;
END;
$$;

REVOKE EXECUTE ON FUNCTION exec_sql(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION exec_sql(text) TO service_role;

CREATE OR REPLACE FUNCTION index_exists(target_index_name text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = target_index_name
  );
$$;

-- HNSW indexing is not available for 2048d (pgvector limit is 2000d).
-- Sequential scan is acceptable for the current corpus sizes.
-- If dimensions are reduced to ≤2000 in the future, create HNSW indexes:
-- CREATE INDEX IF NOT EXISTS idx_vyroky_embedding ON vyroky USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);
-- CREATE INDEX IF NOT EXISTS idx_clanky_embedding ON clanky USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON TABLE vyroky TO anon, authenticated;
GRANT SELECT ON TABLE statement_sources TO anon, authenticated;
GRANT EXECUTE ON FUNCTION search_statements(vector, int, int, text, text, text, date, date) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION count_statements(text, text, text, date, date, boolean) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION list_distinct_values(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION match_statements(vector, int) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION match_articles(vector, int) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION statement_date_bounds() TO anon, authenticated;
