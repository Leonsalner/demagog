# Opus Prompt: Refine Research Workspace Plan In Place

You are working in the Demagog repository at:

`/Users/leon/conductor/workspaces/demagog/kinshasa`

Your task is to refine the existing implementation plan for the research workspace feature. Do not implement the feature yet. This is a planning pass only.

## Source Document To Edit

Edit this file in place:

`docs/plans/2026-03-17-research-workspace-plan.md`

Do not create a separate replacement plan unless there is a very strong reason. Prefer updating and improving the existing file directly.

## Goal

Take the current plan and turn it into a stronger implementation handoff for coding work. The direction has already been agreed at a product level. Your job is to sharpen the plan, find gaps, resolve ambiguities where possible from the current codebase, and improve the execution order.

## What To Do

Read the current codebase and refine the plan with repository-specific detail.

Focus on:

- validating the plan against the actual current implementation
- identifying missing technical steps or API/type changes
- identifying places where the plan currently hand-waves over code that will need concrete handling
- tightening the rollout order so it is realistic and incremental
- calling out risks, edge cases, and compatibility concerns
- improving file-level guidance so an implementer knows where to work

## Scope

Work only on the current codebase and the plan document.

Do not:

- start building the feature
- write production code for the feature
- create migrations beyond planning text
- create a separate design doc unless absolutely necessary

## Key Feature Intent

The intended behavior is already decided:

- Search opens a statement-scoped research workspace.
- Detect quick mode behaves like search for a selected matched statement.
- Detect research mode opens an aggregate, deduped workspace across matched statements.
- The workspace is a near-full-screen overlay with a left sidebar and a main reading pane.
- `clanky.title` exists and should be used for persistent AI-generated article titles.
- Do not add AI summaries.
- External sources should appear in the workspace, but v1 should not depend on external-site embeds.

## Refinement Expectations

Please improve the plan in the following ways:

1. Validate current assumptions
- Check whether the proposed routes, components, and types align with the current repository structure.
- Correct anything that is inconsistent with the codebase.

2. Make the implementation path more concrete
- Name the likely files to change.
- Note data-flow dependencies.
- Spell out transitional compatibility concerns where current UI/API behavior may need to coexist during rollout.

3. Strengthen the phased rollout
- Keep the plan iterative.
- Prefer phases that land coherent slices rather than giant all-at-once rewrites.
- Make it clear what can be built and verified first.

4. Surface risks and open questions
- Add explicit risks, especially around dedupe, provenance, title generation, and UX complexity.
- If something truly remains ambiguous after reading the code, mark it clearly as an open question rather than guessing.

5. Keep the document implementer-friendly
- The end result should be something an engineer can code from directly.
- Make the doc more precise, not more abstract.

## Output Requirements

- Edit `docs/plans/2026-03-17-research-workspace-plan.md` directly.
- Preserve the overall direction and decisions unless the current codebase proves they are infeasible.
- If you change a decision, explain why inside the plan.
- Keep the document readable and structured for handoff.

## Repository Notes

Useful starting points likely include:

- `src/components/shared/StatementCard.tsx`
- `src/components/search/SearchResults.tsx`
- `src/components/detect/DetectionResults.tsx`
- `src/components/detect/StatementInput.tsx`
- `src/hooks/useSearch.ts`
- `src/hooks/useDetect.ts`
- `src/app/api/search/route.ts`
- `src/app/api/detect/route.ts`
- `src/app/api/sources/enrich/route.ts`
- `src/lib/supabase.ts`
- `src/types/index.ts`

Also review the current plan file carefully before rewriting sections. Improve it in place rather than replacing it wholesale.
