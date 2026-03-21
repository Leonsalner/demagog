# Demagog.sk AI Tooling — Project Plan

## Scope

One tool targeting one audience:

**Internal Duplicate Detector + Semantic Search** — an internal tool for Demagog analysts to search the fact-checked statement archive with natural language queries, detect duplicates when reviewing new statements, and add new entries after review. Strictly internal; no public-facing components.

## Architecture

- **Frontend:** Next.js — currently deployed on Vercel, migrating to Demagog's own hosting in a later phase
- **Database:** Demagog's own Postgres — direct connection to their live DB (or a read mirror with additional columns for embeddings and RPC functions)
- **Embeddings:** Gemini Embeddings — chosen because Demagog is already on Google Cloud billing; embedding pipeline runs as a scheduled job (e.g. hourly) rather than on-demand
- **Inference:** Gemini API — handles query understanding, duplicate classification, optional reranking, and article title backfill
- **Auth:** Demagog's own auth system — TBD integration details; will figure out when DB access is in hand
- **Feedback:** Linear — analyst feedback routes directly into Linear customer requests, which become issues for tracking

## Phase 1 — Prototype to Live (in progress)

The prototype is feature-complete for the core flows. Remaining work before analyst testing can begin:

1. **Connect live DB** — replace the current Supabase-scraped-copy with a connection to Demagog's live Postgres. This may require adding columns (e.g. `embedding` vector fields) and deploying RPC functions (`search_statements`, `match_statements`, `match_articles`, `count_statements`, `list_distinct_values`, `statement_date_bounds`) to the live DB or a read mirror. Schema changes must be applied carefully — coordinate with their DBA or IT contact.
2. **Embedding pipeline for live data** — run the initial embedding job against all existing statements in the live DB. Set up a scheduled job (e.g. via cron or a lightweight worker) to re-embed new statements added via `/add` on a regular cadence — not real-time, since live DB is not Supabase and has no built-in trigger mechanism for async embedding jobs.
3. **Auth wiring** — integrate Demagog's existing auth system. Details TBD; will clarify once DB access is established and their IT contact is consulted.
4. **Polish** — small UI polish, onboarding refinements, edge case handling. No major features remain to build.

## Phase 2 — Analyst Private Beta

Once Phase 1 is stable:

- Open the tool to Demagog analysts for internal testing.
- Collect feedback via the in-app feedback widget (already wired to Linear customer requests).
- Triage issues in Linear. Iterate on polish and UX before any broader rollout.
- No public launch. This remains an internal-only tool.

## Phase 3 — Hosting Migration (future)

Move from Vercel to Demagog's own webhost. This is a later step — Vercel is sufficient for the private beta.

Steps:
- Coordinate with Demagog IT on deployment target and domain.
- Ensure embedding endpoint is accessible from the new host (either a self-hosted Ollama on their server, or an API-accessible embedding service).
- Migrate environment variables and any secrets to the new hosting environment.

## Explicitly Out of Scope

- Public-facing anything — the tool is strictly internal, agreed with Demagog on the call.
- Website redesign — separate conversation, after trust is established.
- External source scraping (sme.sk, dennikn.sk) — legal/partnership concerns, premature.
- AI-drafted articles or explainers — too threatening to editorial identity.
- Automating editorial decisions — the tool surfaces context; analysts make judgments.
- Replacing analysts — tool, not replacement; everything augments workflow.

## Framing

- **Tool, not replacement** — everything augments analyst workflow, nothing automates editorial decisions.
- **Ownership** — code is handed over to Demagog; open to collaboration with their existing developer.
- **Internal only** — no public launch, no external user access.

## Risks

- **Live DB schema surprises** — the live schema may differ from what the prototype assumes. Verify table shapes, column names, and data types when access is granted. Be prepared to add migration steps or adjust the app's DB queries.
- **Demo reliability** — a broken demo during testing kills confidence. Prioritize stability over new features during the beta period.
- **Existing developer scope overlap** — confirm with Demagog's developer what they own vs. what this tool covers, so neither side builds redundant functionality.
- **Embedding freshness** — since new statements are embedded on a schedule (not real-time), there is a window where recently-added statements won't appear in search results until the next embedding job runs. This is an acceptable trade-off given the architecture; document it for analysts.
