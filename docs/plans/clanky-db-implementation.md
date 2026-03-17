# Clanky Database Implementation

`clanky` is the repository's article-context store: it holds long-form Demagog article text plus article embeddings, and the app uses it as supporting context for semantic search and duplicate detection rather than as a primary result source. Search and detect still retrieve their main matches from `vyroky`; `clanky` is queried afterward to attach a small list of related articles that can help an analyst understand nearby coverage and fact-check context.

## Purpose

In product terms, `clanky` represents archived Demagog articles, not individual fact-checked statements. The main statement corpus lives in `vyroky`, while `clanky` stores article-level context with article timestamps, authors, full text, and embeddings in [`scripts/setup-supabase.sql`](scripts/setup-supabase.sql).

The flows that depend on `clanky` are supporting-context flows:

- Search uses `clanky` to attach `related_articles` to semantic search responses in [`src/app/api/search/route.ts`](src/app/api/search/route.ts). The primary search results still come from `search_statements()` over `vyroky`.
- Duplicate detection uses `clanky` to attach `related_articles` to detect responses in [`src/app/api/detect/route.ts`](src/app/api/detect/route.ts). The actual duplicate candidates still come from `match_statements()` or the lexical fallback over `vyroky`.

That makes `clanky` a secondary data source. Confirmed fact: there is no route that returns `clanky` rows as the main result set, and no UI that lets the user search articles directly. The article matches only appear as an auxiliary panel under statement results.

## Schema

The `clanky` table is created in [`scripts/setup-supabase.sql`](scripts/setup-supabase.sql) with four stored fields plus the primary key:

- `id SERIAL PRIMARY KEY`
- `datum TIMESTAMPTZ`
- `autor TEXT`
- `text_content TEXT`
- `embedding vector(2048)`

Unlike `vyroky`, `clanky` has no uniqueness constraint, no foreign keys, and no ordinary B-tree indexes in the checked-in schema. Its only retrieval primitive is the `match_articles(query_embedding vector(2048), match_count int DEFAULT 3)` RPC in [`scripts/setup-supabase.sql`](scripts/setup-supabase.sql), which:

- requires `embedding IS NOT NULL`
- orders by `embedding <=> query_embedding`
- returns `id`, `datum`, `autor`, `text_content`, and computed `similarity`

TypeScript represents this in two layers:

- Supabase runtime types in [`src/lib/supabase.ts`](src/lib/supabase.ts):
  - `ArticleRow` mirrors the table row, including `embedding: number[] | null`
  - `MatchArticleRow` mirrors the RPC output, including `similarity`
- Shared app types in [`src/types/index.ts`](src/types/index.ts):
  - `Article` is the UI/API shape with only `id`, `datum`, `autor`, and `text`

That means the API strips article embeddings and article similarity before data reaches the frontend. `toArticle()` in both API routes maps `text_content` to `text`, defaults missing authors to `"Demagog.sk"`, and normalizes missing dates to `""` in [`src/app/api/search/route.ts`](src/app/api/search/route.ts) and [`src/app/api/detect/route.ts`](src/app/api/detect/route.ts).

Important implementation caveats:

- The repository has standardized article embeddings on `vector(2048)` in [`scripts/setup-supabase.sql`](scripts/setup-supabase.sql), [`src/lib/supabase.ts`](src/lib/supabase.ts), and [`scripts/embed-articles.ts`](scripts/embed-articles.ts).
- The checked-in SQL explicitly documents that pgvector HNSW indexing is unavailable above 2000 dimensions, so `idx_clanky_embedding` is intentionally not created and article matching falls back to sequential scan in [`scripts/setup-supabase.sql`](scripts/setup-supabase.sql).
- Confirmed fact: `match_articles()` is granted to `anon` and `authenticated`, so the public search/detect routes can call it directly.
- Inference: because `clanky` has no uniqueness guard in the schema, the import script's `upsert(... onConflict: "datum,autor,text_content")` only works if the target database has a compatible unique index added outside this file. The checked-in schema does not create one.

## Ingestion

Article ingestion starts in [`scripts/import-data.ts`](scripts/import-data.ts). The script reads `data/demagog_clanky.csv`, parses it as semicolon-delimited CSV, skips the header row, converts each record with `toArticleInsert()`, and writes batches of 500 rows into `clanky`.

`toArticleInsert()` expects at least three columns and maps them as follows in [`scripts/import-data.ts`](scripts/import-data.ts):

- column 0 -> `datum` via `normalizeTimestamp()`
- column 1 -> `autor` via `normalizeNullable()`
- column 2 -> `text_content` via `normalizeWhitespace()`

The script supports three maintenance modes:

- default import: truncates `clanky` (or both tables) through the `exec_sql` RPC, then inserts
- `--upsert`: skips truncate and writes via `upsert`
- `--dry-run`: parses and validates rows without writing

Article embeddings are generated separately by [`scripts/embed-articles.ts`](scripts/embed-articles.ts). That script:

- loads pending `clanky` rows whose `embedding` is `NULL` unless `--force` is passed
- fetches rows in batches of 32
- prepends each text with the fixed instruction prefix `Slovak fact-check article analyzing political claims: `
- sends the batch to a local embeddings endpoint, defaulting to `http://localhost:11434/v1/embeddings`
- uses model `qwen3-embedding:8b`
- requests `dimensions: 2048`
- updates each `clanky.embedding` row-by-row

Refresh behavior is incremental by default. In force mode, the script walks the table by `id` and re-embeds all matching rows; otherwise it keeps querying for `embedding IS NULL` rows from offset `0`, which effectively processes the next unembedded page each loop. The script does not re-import article text; it only fills or rewrites embeddings.

## Backend Usage

The backend only reads from `clanky` through `match_articles()`. There are no direct `from("clanky")` reads in the API routes.

In search, the relevant path is in [`src/app/api/search/route.ts`](src/app/api/search/route.ts):

- a free-text search query is embedded first
- semantic statement retrieval happens through `search_statements()`
- related statements are fetched through a separate helper over `vyroky`
- then the route calls `match_articles` with `match_count: 5`
- it filters rows with `similarity >= 0.3`
- it maps each surviving row through `toArticle()`
- it drops articles whose trimmed text is empty
- it omits the `related_articles` field entirely if nothing survives

Search article lookup is best-effort. Any exception during `match_articles()` is swallowed, and the route still returns statement results. Search also records the article phase in the `related_articles_ms` timing bucket.

In detect, the relevant path is in [`src/app/api/detect/route.ts`](src/app/api/detect/route.ts):

- the input statement is embedded once
- duplicate candidates are fetched from `vyroky`
- Gemini or the heuristic fallback classifies them
- if the overall status is not `NEW_CLAIM` and the embedding exists, the route calls `match_articles` with `match_count: 3`
- it applies the same `similarity >= 0.3` threshold
- it maps rows through `toArticle()` and filters empty text
- it only includes `related_articles` when the resulting list is non-empty

Two behavior details matter:

- Detect only fetches articles when semantic embeddings were available. If detect falls back to lexical matching because the statement-match RPC is unavailable, `embedding` stays `null`, so article lookup is skipped even if related statements were found.
- Search only fetches articles in the semantic-query branch. Filter-only browsing and lexical fallback search do not attach article context.

## UI Usage

Search renders related article data in [`src/components/search/SearchResults.tsx`](src/components/search/SearchResults.tsx). The data arrives through the `SearchResponse.related_articles` field defined in [`src/types/index.ts`](src/types/index.ts) and is stored unchanged by [`src/hooks/useSearch.ts`](src/hooks/useSearch.ts).

User-facing search presentation details:

- article rendering lives in `ArticleCard`
- the card synthesizes a pseudo-title from the first sentence with `extractPseudoTitle()`
- the body preview comes from the remaining text with `extractBodyPreview()`
- dates are localized with `toLocaleDateString("sk-SK", { day, month, year })`
- author and date appear on a metadata line joined by `·`
- the whole article section is collapsed by default in `SearchArticlesSection`
- expanding the section reveals all returned articles; there is no secondary pagination or "show more" cap in search

Detect renders article data in [`src/components/detect/DetectionResults.tsx`](src/components/detect/DetectionResults.tsx). The `useDetect()` hook in [`src/hooks/useDetect.ts`](src/hooks/useDetect.ts) simply stores the `DetectResponse` payload and passes `result.related_articles` through to the component.

User-facing detect presentation details:

- related articles live in the separate `ArticlesSection`
- the whole section is collapsed by default
- when opened, it shows at most three articles first (`MAX_VISIBLE_ARTICLES = 3`)
- if more than three articles are present, the UI offers `Zobraziť ďalšie (...)` to reveal the rest
- article cards use the same pseudo-title, preview, author, and localized date treatment as search

## End-to-End Flow

One concrete search path looks like this:

1. A CSV row in `data/demagog_clanky.csv` is parsed by `toArticleInsert()` in [`scripts/import-data.ts`](scripts/import-data.ts) and inserted into `clanky` as `datum`, `autor`, and `text_content`.
2. [`scripts/embed-articles.ts`](scripts/embed-articles.ts) later selects that row, sends `INDEX_PREFIX + text_content` to the embedding service, and stores the returned 2048-dimensional vector in `clanky.embedding`.
3. A user submits a text query through the search UI. [`src/hooks/useSearch.ts`](src/hooks/useSearch.ts) posts that request to `/api/search`.
4. [`src/app/api/search/route.ts`](src/app/api/search/route.ts) embeds the query, retrieves primary statement matches from `vyroky`, then calls `match_articles()` with the same embedding.
5. `match_articles()` in [`scripts/setup-supabase.sql`](scripts/setup-supabase.sql) returns the nearest `clanky` rows plus `similarity`.
6. `toArticle()` in [`src/app/api/search/route.ts`](src/app/api/search/route.ts) converts each row into the shared `Article` shape by dropping similarity and renaming `text_content` to `text`.
7. The API response includes `related_articles`.
8. [`src/hooks/useSearch.ts`](src/hooks/useSearch.ts) stores that `SearchResponse`.
9. [`src/components/search/SearchResults.tsx`](src/components/search/SearchResults.tsx) renders the collapsed "Súvisiace články" section, and each article is displayed through `ArticleCard` using the first sentence as the pseudo-title and the remainder as preview text.

The detect flow is structurally similar, but the API entry point is [`src/app/api/detect/route.ts`](src/app/api/detect/route.ts), the payload type is `DetectResponse`, and the renderer is [`src/components/detect/DetectionResults.tsx`](src/components/detect/DetectionResults.tsx).

## Limitations

Confirmed facts:

- `clanky` is not independently browsable in the current UI; it only appears as supporting context in search and detect.
- The only article retrieval path is vector similarity through `match_articles()`. There is no lexical article fallback and no structured filtering by date or author.
- Article similarity is computed in the database but not returned to the frontend; users see article snippets, not scores.
- Search uses a threshold of `0.3` and asks for up to 5 article matches; detect uses the same threshold and asks for up to 3.
- Article lookup failures are silent best-effort failures in both routes.
- Because embeddings are 2048-dimensional, the checked-in implementation deliberately does not create an HNSW index for `clanky`, so article retrieval is a sequential scan.
- The `Article` app type is lossy relative to the database row: it drops `embedding`, drops `similarity`, and renames `text_content` to `text`.

Inference and likely rough edges:

- The comment in [`scripts/embed-articles.ts`](scripts/embed-articles.ts) that sequential scan is fine for "`~285 rows`" appears stale relative to the current repository data file, so the performance assumption may no longer match the actual corpus size.
- The import script's article upsert conflict target likely depends on a unique index that is not defined in [`scripts/setup-supabase.sql`](scripts/setup-supabase.sql). If that index is absent in the live database, `--upsert` for articles will fail.
- Because article cards derive a pseudo-title from the first sentence of `text_content`, malformed or unusually long first sentences can produce awkward titles even when retrieval itself is correct.
- Because detect requires a semantic embedding before fetching articles, lexical fallback detection can produce statement matches without any article context.
