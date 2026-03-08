-- Manual migration required before re-running scripts/embed-statements.ts:
-- ALTER TABLE vyroky ALTER COLUMN embedding TYPE vector(1024) USING NULL::vector(1024);
-- DROP INDEX IF EXISTS idx_vyroky_embedding;
-- The embed script recreates the HNSW index after the new jina-embeddings-v5-text-small vectors are stored.

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
  embedding vector(1024)
);

CREATE TABLE IF NOT EXISTS clanky (
  id SERIAL PRIMARY KEY,
  datum TIMESTAMPTZ,
  autor TEXT,
  text_content TEXT,
  -- If already deployed, apply manually:
  -- ALTER TABLE clanky ALTER COLUMN embedding TYPE vector(1024) USING NULL::vector(1024);
  embedding vector(1024)
);

CREATE INDEX IF NOT EXISTS idx_vyroky_strana ON vyroky(strana);
CREATE INDEX IF NOT EXISTS idx_vyroky_oblast ON vyroky(oblast) WHERE oblast IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vyroky_vyhodnotenie ON vyroky(vyhodnotenie);
CREATE INDEX IF NOT EXISTS idx_vyroky_meno ON vyroky(meno);
CREATE INDEX IF NOT EXISTS idx_vyroky_datum ON vyroky(datum) WHERE datum IS NOT NULL;

CREATE OR REPLACE FUNCTION search_statements(
  query_embedding vector(1024),
  match_count int DEFAULT 20,
  match_offset int DEFAULT 0,
  filter_strana text DEFAULT NULL,
  filter_oblast text DEFAULT NULL,
  filter_vyhodnotenie text DEFAULT NULL,
  filter_meno text DEFAULT NULL,
  filter_datum_od date DEFAULT NULL,
  filter_datum_do date DEFAULT NULL
) RETURNS TABLE (
  id int,
  vyrok text,
  vyhodnotenie text,
  odovodnenie text,
  oblast text,
  datum date,
  meno text,
  strana text,
  similarity float
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    v.id,
    v.vyrok,
    v.vyhodnotenie,
    v.odovodnenie,
    v.oblast,
    v.datum,
    v.meno,
    v.strana,
    (1 - (v.embedding <=> query_embedding))::float AS similarity
  FROM vyroky v
  WHERE (filter_strana IS NULL OR v.strana = filter_strana)
    AND (filter_oblast IS NULL OR v.oblast = filter_oblast)
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
  filter_oblast text DEFAULT NULL,
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
    AND (filter_oblast IS NULL OR v.oblast = filter_oblast)
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
  ELSIF col = 'oblast' THEN
    RETURN QUERY
    SELECT DISTINCT v.oblast
    FROM vyroky v
    WHERE v.oblast IS NOT NULL
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
  query_embedding vector(1024),
  match_count int DEFAULT 10
) RETURNS TABLE (
  id int,
  vyrok text,
  vyhodnotenie text,
  odovodnenie text,
  oblast text,
  datum date,
  meno text,
  strana text,
  similarity float
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    v.id,
    v.vyrok,
    v.vyhodnotenie,
    v.odovodnenie,
    v.oblast,
    v.datum,
    v.meno,
    v.strana,
    (1 - (v.embedding <=> query_embedding))::float AS similarity
  FROM vyroky v
  WHERE v.embedding IS NOT NULL
  ORDER BY v.embedding <=> query_embedding
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

-- Create this 1024d HNSW index manually in the Supabase SQL Editor only after
-- embed-statements.ts finishes to avoid a slow rebuild during imports.
-- CREATE INDEX IF NOT EXISTS idx_vyroky_embedding
-- ON vyroky USING hnsw (embedding vector_cosine_ops)
-- WITH (m = 16, ef_construction = 64);

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON TABLE vyroky TO anon, authenticated;
GRANT EXECUTE ON FUNCTION search_statements(vector, int, int, text, text, text, text, date, date) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION count_statements(text, text, text, text, date, date, boolean) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION list_distinct_values(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION match_statements(vector, int) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION statement_date_bounds() TO anon, authenticated;
