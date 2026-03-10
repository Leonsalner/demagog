Review this repository and produce a precise, surgical implementation plan for the remaining work. Do not write code. Do not propose a rewrite. Do not restate the full project vision unless it affects prioritization.

Primary source of truth:
- `demagog-plan.md`

Use the current codebase state, not just the original plan. The goal is to identify what is actually left, what is already implemented, and what should be done next in small, defensible steps.

Current known status to anchor against:
- The main remaining work is no longer core feature implementation. It is mostly demo-readiness, data rollout, and post-call scope decisions.
- Pre-call item still outstanding: manual duplicate-detector threshold validation on 10+ real statement pairs. The threshold was tightened in code, but the plan explicitly requires testing against real pairs.
- Pre-call item still outstanding: prepare 3 demo scenarios:
  - semantic-search wording mismatch
  - clear duplicate
  - near-miss / related-but-distinct
- Pre-call item partially outstanding: UI cleanup is broadly done, but final demo polish still needs a quick pass using real data and real flows.
- The database entry UI is implemented, so that former "if time permits" item is done.
- Post-call / Phase 2 work still open:
  - full CRUD for statement management is not done
  - full database integration is still pending operationally: dataset ingest, re-embedding, and SQL rollout
  - search filter expansion is partly done already; party/date/verdict/oblast support exists, so remaining work is deeper coverage and polish against the full dataset rather than first-time implementation
- Phase 3 items still unimplemented:
  - source suggestion tool
  - AI stance summaries
- A few items are ahead of the written plan:
  - article DB linking is partly implemented in code via related article context in detect
  - related statement surfacing in detect is effectively already there

Important file-level hints:
- Statement create-only backend currently exists in `src/app/api/statements/route.ts`
- Statement create UI currently exists in `src/app/add/page.tsx`
- SQL rollout source is `scripts/setup-supabase.sql`

What I want from you:
1. Audit the repo against `demagog-plan.md` and the current implementation state.
2. Separate:
   - already implemented
   - partially implemented
   - still missing
   - operational / rollout work vs product / code work
3. Produce an iterative plan with narrow waves, not a one-shot overhaul.
4. Prioritize the highest-leverage next steps before proposing any new features.
5. Be skeptical about items that may already exist in code under different names.

Plan requirements:
- Prefer small waves with explicit goals, dependencies, and exit criteria.
- For each wave, name the concrete files, routes, hooks, scripts, tests, and UI surfaces that likely need to change.
- Call out where work is validation-only or ops-only rather than implementation.
- Distinguish "must do before the call", "only do after the call if interest is confirmed", and "defer unless scope changes".
- Identify any places where the original plan is outdated because the repo is ahead of it.
- Identify open questions that should be answered before implementing anything substantial.
- Include verification steps for each wave:
  - manual checks
  - test coverage to add or update
  - demo-risk checks where relevant

Constraints:
- Do not suggest redesigning the architecture.
- Do not inflate partially complete work into net-new epics.
- Do not recommend Phase 3 features as immediate next steps unless you can justify why the current summary is wrong.
- Assume demo reliability matters more than feature breadth.
- Assume post-call scope should stay conservative until overlap with their existing developer is clarified.

Output format:
1. "Repo Reality Check" — brief bullets on what appears done, partial, and missing
2. "Priority Corrections To The Original Plan" — places where the repo is ahead of or different from `demagog-plan.md`
3. "Recommended Next Waves" — ordered, surgical waves with:
   - objective
   - why now
   - concrete files likely involved
   - risks/dependencies
   - verification/exit criteria
4. "Deferred Work" — items that should wait until after the call
5. "Open Questions" — only the questions that materially affect implementation order or scope

If you are unsure whether something is already implemented, say so explicitly and name the exact files to inspect rather than guessing.
