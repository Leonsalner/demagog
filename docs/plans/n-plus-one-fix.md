# N+1 Fix: match_articles_batch RPC

## Problem

In the aggregate research flow, when preparing research for multiple matched statements, the system was making individual RPC calls to fetch related articles for each statement. This created an N+1 query pattern:

1. For each matched statement (N statements), call `match_articles` RPC
2. Total: N+1 RPC calls (N for statements + 1 for the main query)

With 10 matched statements, this meant 11 sequential or parallel RPC calls, causing:
- Increased latency
- Higher Supabase connection pool usage
- Poor user experience during research preparation

## Solution

Introduced a batch RPC function `match_articles_batch` that accepts multiple query embeddings in a single call and returns all matching articles.

### SQL Function (scripts/setup-supabase.sql:263-300)

```sql
CREATE OR REPLACE FUNCTION match_articles_batch(
  query_embeddings float8[][],
  match_count int DEFAULT 5
)
RETURNS TABLE (...)
```

The function:
- Accepts an array of embedding vectors
- Returns matching articles for each query with similarity scores
- Uses the same similarity threshold logic as the single-query version

### Client Changes

Updated `src/hooks/usePreparedAggregateResearch.ts` to:
1. Collect all embeddings from matched statements
2. Call `match_articles_batch` once with all embeddings
3. Distribute results back to individual statements

## Files Changed

- `scripts/setup-supabase.sql` - Added `match_articles_batch` function
- `src/hooks/usePreparedAggregateResearch.ts` - Use batch RPC instead of individual calls

## Performance Impact

| Scenario | Before | After |
|----------|--------|-------|
| 5 matches | 6 RPC calls | 1 RPC call |
| 10 matches | 11 RPC calls | 1 RPC call |
| 20 matches | 21 RPC calls | 1 RPC call |

## Verification Steps

1. Run `scripts/verify-supabase-rpcs.ts` to confirm `match_articles_batch` is deployed
2. Test aggregate research flow with multiple matches
3. Monitor Supabase dashboard for RPC call patterns
4. Check response times in browser network tab

## Notes

- The batch RPC maintains the same similarity threshold (0.3) as the single version
- Each query in the batch is limited to `match_count` results
- If the RPC is unavailable, the system falls back to individual calls (graceful degradation)
