# Demagog.sk AI Tooling — Project Plan

## Scope

Two tools built on the existing hackathon prototype, targeting two audiences:

1. **Semantic Search** (public-facing) — replaces keyword search on demagog.sk with vector-based retrieval for better natural language query understanding
2. **Duplicate Detector** (internal, analyst-facing) — finds related existing statements when an analyst inputs a new one, surfaces context from their own DB, and offers a UI to add new entries

## Architecture

- **Frontend:** Next.js on Vercel (hobby tier)
- **Database:** Supabase (free tier) — stores statements + embeddings
- **Embeddings:** Jina AI
- **Inference:** Google Cloud (trial credits, ~$250 remaining, expires ~May 2026)
- **Small model:** handles NLU layer for query understanding
- **Stronger model:** used in duplicate detector for relevance summaries

## Pre-Call Priorities (this week)

In order of importance:

1. **Fix duplicate detector threshold** — currently returns matches too aggressively. Tune similarity cutoff so results are genuinely relevant, not just vaguely related. Test with 10+ real statement pairs.
2. **Prepare demo inputs** — 3 scenarios ready to go:
   - Query using different wording than stored statement → demonstrates semantic advantage over keyword search
   - Clear duplicate match → shows core value of detector
   - Near-miss / related but distinct → shows the system doesn't hallucinate false matches (once threshold is fixed)
3. **UI cleanup** — remove rough edges, broken states, placeholder text. Doesn't need to be beautiful, needs to not break during a screenshare.
4. **Database entry UI** — simple form: statement text, politician, party, date, verdict. Writes to Supabase. Only build if time permits before the call.

## Call Structure (15–20 min)

1. Quick context — what the prototype does now (2 min, screenshare, not slides)
2. Live demo — walk through the 3 prepared scenarios (5 min)
3. Vision — where it could go, what you'd build next (3 min)
4. Listen — what would be most useful for their analysts in practice? (5 min)
5. Ask about: existing developer situation, scope overlap, collaboration model
6. Offer to open it up for broader team testing after incorporating feedback
7. Agree on next steps

## Post-Call / Phase 2 (only after confirmed interest)

- **Database entry UI + backend** — full CRUD for new statements
- **Related statement surfacing** — when duplicate detector finds related (not duplicate) entries, surface the existing fact-checks as research starting points. "These 4 statements cover similar ground, here's what was already verified." This is an extension of the duplicate detector, not a separate feature.
- **Filter expansion** — semantic search with structured filters (party, date range, verdict type)
- **Full database integration** — request and ingest the complete statement dataset

## Phase 3 (future, mention verbally only)

- **Article DB linking** — connect to their second database of short explainer articles, surface relevant articles alongside related statements
- **Source suggestion tool** — for a new statement being fact-checked, suggest starting points for research drawn from their own existing work. Frame as "saves 15 minutes of manual searching," not "does the research for you"
- **AI stance summaries** — aggregate a politician's positions on a topic from multiple statements. More useful for internal analysis than public site.

## Explicitly Out of Scope (for now)

- Website redesign — separate conversation, after trust is established
- External source scraping (sme.sk, dennikn.sk) — legal/partnership concerns, premature
- AI-drafted articles or explainers — too threatening to editorial identity
- Public-facing chatbot — editorial trust liability for a fact-checking org

## Framing

- **CAS project** — voluntary student contribution, no cost or commitment on their side
- **Tool, not replacement** — everything augments analyst workflow, nothing automates editorial decisions
- **Attribution** — "built by" credit in footer, discuss on call casually
- **Ownership** — code handed over, open to collaboration with their existing developer
- **IP** — clarify on call: are they okay with you referencing this in your portfolio/CV?

## Risks

- **Existing developer conflict** — find out scope overlap on the call before building further
- **Scope creep** — IB coursework + other projects limit bandwidth. Commit to specific deliverables per phase, not open-ended availability.
- **Google Cloud credits expiring** — if project continues past expiry, need a plan for inference costs. Their infra? Cheaper model? Free tier alternatives?
- **Demo reliability** — a broken demo during the call kills the project. Prioritize stability over features.
