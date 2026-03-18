Describe the current implementation of the `clanky` database in this repository end to end. Focus on what it is used for, how the data is modeled and populated, how it is queried, and how it appears in the UI.

Scope your analysis to the current codebase only. Do not propose redesigns unless you need to call out a concrete limitation in the current implementation.

Cover these points:

1. Purpose
- Explain what `clanky` represents in the product.
- Explain which user flows depend on it, especially search and duplicate detection.
- Clarify whether it is a primary result source or supporting context.

2. Data model and schema
- Describe the `clanky` table structure and any related RPCs or indexes.
- Explain how its TypeScript types are represented in runtime and shared app types.
- Note any important constraints or implementation caveats, such as embedding dimensionality and indexing limitations.

3. Data ingestion and maintenance
- Explain how article data gets into `clanky`.
- Identify the scripts and input files involved in importing article rows.
- Explain how article embeddings are generated, stored, and refreshed.

4. API integration
- Describe where the backend reads from `clanky`.
- Explain how related articles are fetched in `src/app/api/search/route.ts` and `src/app/api/detect/route.ts`.
- Note thresholds, fallbacks, response shaping, and how article rows are mapped into API response objects.

5. UI integration
- Describe where related articles are shown in the UI.
- Explain how the search results view and detect results view render article data.
- Mention the user-facing presentation details that matter, such as expansion behavior, truncation, and date/author formatting.

6. Data flow
- Trace one concrete path from stored `clanky` row -> API response -> rendered UI component.
- Call out the main hooks, types, and components involved.

7. Limitations and notable implementation details
- Summarize current limitations, rough edges, or implicit assumptions in the implementation.
- Separate confirmed facts from inference.

Use these files as your starting points:
- `scripts/setup-supabase.sql`
- `src/lib/supabase.ts`
- `scripts/import-data.ts`
- `scripts/embed-articles.ts`
- `src/app/api/search/route.ts`
- `src/app/api/detect/route.ts`
- `src/types/index.ts`
- `src/hooks/useSearch.ts`
- `src/hooks/useDetect.ts`
- `src/components/search/SearchResults.tsx`
- `src/components/detect/DetectionResults.tsx`

Output format:
- Start with a short summary paragraph.
- Then use sections: `Purpose`, `Schema`, `Ingestion`, `Backend Usage`, `UI Usage`, `End-to-End Flow`, `Limitations`.
- Include file references inline where relevant.
- Be precise and descriptive, not generic.
