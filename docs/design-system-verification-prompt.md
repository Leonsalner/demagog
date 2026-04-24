# Design System Verification Prompt - Demagog Kinshasa

Use this prompt with a verification agent after updating `docs/demagog-claude-design-system.md`. The verifier should assess whether the design system is ready to add to Claude Design.

Attach or provide:
- `README.md`
- `docs/demagog-claude-design-system.md`
- The six reference screenshots listed below, if available
- Any brief notes about missing screenshots or states

---

## Prompt

You are verifying the updated Demagog Kinshasa design-system package before it is added to Claude Design.

Demagog Kinshasa is an internal editorial/research tool for Demagog.sk fact-check editors. The main app areas are:

- Search with filters and result cards
- Duplicate detection with fast/thorough mode
- `Preskúmať` / `Prieskum` research workspace
- Onboarding / `Návod`
- Feedback panel
- Supporting add-statement flow

Claude Design will create visual mocks/designs in its own environment. This design system should therefore be a reusable `DESIGN.md`-style source of truth, not a one-off prompt and not an implementation spec.

Your job is to verify the design-system document and its planned reference package. Be strict, concrete, and concise. Identify anything that could cause Claude Design to generate a generic, incomplete, inaccessible, or product-inaccurate redesign.

Do not redesign the app. Do not evaluate a generated redesign. Review only the design-system package.

---

## Reference Package Being Verified

The package is expected to include:

1. `README.md` for product/workflow context.
2. `docs/demagog-claude-design-system.md` as the main design-system source of truth.
3. Six reference screenshots:
   - `search+filters.png`: search results with filters visible and at least one active or recommended filter.
   - `detect.png`: detect screen with statement input and fast/thorough segmented mode, ideally during or after analysis.
   - `preskumat.png`: `Preskúmať` research overlay/workspace.
   - `add.png`: supporting add-statement form.
   - `onboarding.png`: onboarding middle card pattern.
   - `feedback.png`: feedback panel open.

Existing repo assets may also be referenced, but should not be required:

- `public/demagog-logo.png`
- `public/onboarding/step-02-search-light.png`
- `public/onboarding/step-02-search-dark.png`
- `public/onboarding/step-03-detect-light.png`
- `public/onboarding/step-03-detect-dark.png`
- `public/onboarding/step-04-research-light.png`
- `public/onboarding/step-04-research-dark.png`
- `public/onboarding/step-05-add-light.png`
- `public/onboarding/step-05-add-dark.png`

If screenshots are missing, evaluate whether the written design system still gives enough context and list exactly which missing images would materially improve Claude Design results.

---

## What To Verify

### 1. Claude Design Fit

Check whether the design system is appropriate for Claude Design:

- It reads like a reusable design-system source of truth, not a task prompt.
- It does not ask Claude Design to output React/Tailwind code.
- It gives enough product, visual, component, interaction, and accessibility guidance for visual mocks.
- It is compact enough to be usable, not a huge audit dump.
- It is supported by a small, relevant image set rather than too many screenshots.

Flag any place where the document is too prompt-like, too implementation-heavy, or too vague for Claude Design.

### 2. Product Fit

Verify that it clearly communicates:

- Internal editorial/research workspace.
- Slovak fact-check editors as primary users.
- Search, detect, research, onboarding, feedback, and supporting add-flow.
- Desired feel: serious, precise, calm, dense, credible, low-noise.
- Anti-direction: marketing page, generic SaaS, decorative AI app, glossy prototype.

Flag any guidance that could push Claude Design toward the wrong product category.

### 3. Visual Foundation

Check for clear guidance on:

- Single primary orange accent: `#E95B1D`.
- Restrained Demagog blue as identity/support, not CTA.
- Light and dark surfaces.
- Text, border, focus, status, and semantic colors.
- Typography and density.
- Spacing, radius, depth, breakpoints, and layering.
- Motion style.
- Do/don't rules.

Flag contradictions, missing token roles, or values that are likely to be misused.

### 4. Component Coverage

Verify that the design system covers the core components Claude Design needs to understand:

- Buttons
- Inputs and forms
- Statement textarea
- Source rows
- Tabs and segmented controls
- Search/filter chips
- Result cards
- Verdict/status badges
- Dropdowns/comboboxes
- Tooltips/toasts
- Pagination
- Research overlay
- Feedback panel
- Onboarding
- Loading, empty, error, success, disabled, hover, active, focus states

Flag only meaningful gaps. Do not demand exhaustive component-library documentation if the current guidance is sufficient for visual design.

### 5. Workflow Coverage

Check whether the design system gives enough guidance for:

- Search results with filters.
- Search history as a secondary affordance.
- Detect fast vs thorough mode via segmented control.
- Long-running detect/thorough state.
- Duplicate, related, new-claim, stale, and preparing states.
- `Preskúmať` research workspace.
- Onboarding / `Návod`.
- Feedback panel.
- Supporting add-statement form pattern.
- Mobile behavior.
- Light and dark mode.

Flag missing workflow states only if their absence would likely make Claude Design omit or mishandle them.

### 6. Screenshot Package Quality

Evaluate the planned screenshot package:

- Are the six screenshots enough to ground Claude Design?
- Are any screenshots redundant?
- Is any missing screenshot more important than one currently listed?
- Would dark-mode examples be necessary, or is the written dark-mode guidance enough?

Remember: the user wants a small reference set, not perfect state coverage.

### 7. Accessibility and Semantics

Check whether the design system requires:

- WCAG AA contrast.
- Visible focus states.
- Non-color status cues.
- Dialog/focus behavior.
- Form errors.
- Hit target sizes.
- `prefers-reduced-motion`.
- Wrapping for long Slovak text and chips.

Flag vague or missing accessibility requirements that would matter for Claude Design mocks.

### 8. Internal Consistency

Check for:

- Contradictory color values.
- Token table vs CSS-reference mismatch.
- Conflicting radius or type rules.
- Mixed instructions about density.
- Orange/blue/status color ambiguity.
- Prompt-like or implementation-specific language that does not belong.
- Duplicate or unnecessary sections.

---

## Output Requirements

Return your entire answer as **one fenced markdown block** so it can be pasted back to the implementing agent.

Use this exact report structure inside the fenced block:

```markdown
# Demagog Claude Design System Verification

## Verdict
Recommendation: Approve | Approve with minor revisions | Revise | Rewrite

One short paragraph explaining the decision.

## Scorecard
| Area | Score / 5 | Notes |
| --- | ---: | --- |
| Claude Design fit |  |  |
| Product fit |  |  |
| Visual foundation |  |  |
| Component coverage |  |  |
| Workflow coverage |  |  |
| Screenshot package |  |  |
| Accessibility and semantics |  |  |
| Internal consistency |  |  |

Average score:

## Blockers
List only issues that must be fixed before adding the system to Claude Design. If none, write `None`.

## Findings

### [HIGH/MEDIUM/LOW] Short title
**Section:** Relevant section or package item.
**Issue:** What is wrong or missing.
**Why it matters:** Downstream risk for Claude Design output.
**Required correction:** Exact change to make.

## Screenshot Package Assessment
State whether the six screenshots are sufficient. If not, name the exact replacement or missing image.

## Missing Guidance
List important missing guidance, if any.

## Contradictions or Ambiguities
List internal inconsistencies or wording that could be misread.

## Strong Sections
Briefly list what should be preserved.

## Required Edits Before Use
Numbered list sorted by priority. If none, write `None`.

## Final Gate
- Ready to add to Claude Design? Yes / No
- Required changes first:
```

Be direct. Do not include generic praise. Do not suggest broad redesign ideas unless they belong in the design system.
