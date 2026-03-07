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
  embedding vector(768)
);

CREATE TABLE IF NOT EXISTS clanky (
  id SERIAL PRIMARY KEY,
  datum TIMESTAMPTZ,
  autor TEXT,
  text_content TEXT,
  embedding vector(768)
);

CREATE INDEX IF NOT EXISTS idx_vyroky_strana ON vyroky(strana);
CREATE INDEX IF NOT EXISTS idx_vyroky_oblast ON vyroky(oblast) WHERE oblast IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vyroky_vyhodnotenie ON vyroky(vyhodnotenie);
CREATE INDEX IF NOT EXISTS idx_vyroky_meno ON vyroky(meno);
CREATE INDEX IF NOT EXISTS idx_vyroky_datum ON vyroky(datum) WHERE datum IS NOT NULL;

CREATE OR REPLACE FUNCTION search_statements(
  query_embedding vector(768),
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
  filter_datum_do date DEFAULT NULL
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
    AND (filter_datum_do IS NULL OR v.datum <= filter_datum_do);

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION match_statements(
  query_embedding vector(768),
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

-- Create this only after embed-statements.ts finishes to avoid a slow rebuild during imports.
-- CREATE INDEX idx_vyroky_embedding ON vyroky USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);
