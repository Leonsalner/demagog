Use the attached Demagog design-system package and `README.md` as the source of truth. Within the package, treat `uploads/demagog-claude-design-system.md` as primary; use `README.md`, `colors_and_type.css`, fonts, previews, and UI kit files only to resolve ambiguity or understand component style. Use screenshots as reference for current product shape, density, workflow, and component inventory; do not copy the current UI exactly. If screenshots or UI kit examples contradict the design-system source of truth, follow the design system.

Create a UX-first redesign for the Demagog.sk editorial research workspace. The audience is Slovak fact-check editors. The result should feel refined because it is coherent, clear, accessible, and well-crafted, not because it is decorative. The output must be dev-handoff quality: semantic tokens named, components reusable, states enumerated, spacing on a consistent scale, and responsive behavior described. It is not shipped code.

Do not surface any internal codename in the UI, navigation, page titles, documentation panels, or generated copy. Use Demagog.sk / Demagog as the product identity.

**Reference Screenshots**

Use all attached screenshots as workflow references:

- Search + filters
- Duplicate detection
- `Preskúmať` / `Prieskum` research workspace
- Add-statement form
- Onboarding / `Návod`
- Feedback panel

Screenshots show workflow coverage and existing density, not visual targets to copy.

**Design Direction**

Aim for a neutral-warm editorial workspace: compact and evidence-first like a serious work tool, but polished, clean, elegant, and easy to use. Keep the existing design-system colors mostly intact. Avoid drifting into beige magazine styling or cold enterprise dashboards. Polish should come from typography, hierarchy, spacing, subtle shadows, soft functional gradients, and clear component states.

Search can stay compact enough to show roughly 5-7 result cards on a 1440px desktop when cards contain short summaries. Cards may become taller only when they expose useful evidence. Research views may breathe more than search because reading, source compilation, and comparison matter there, but they should not become sparse or decorative.

**Surfaces to Design**

1. Search results: visible left filter panel on desktop, active filters, active model-applied filters, compact result cards, similarity, metadata, source affordances, pagination, history access, and empty/loading/error states. Keep reasoning/source snippets short by default; use expand/open-research for deeper context.
2. Duplicate detection: `Rýchle` / `Dôkladné` segmented mode, statement input, character count, stale-result warning, and completed duplicate / related / new-claim outcomes.
3. Thorough detection progress: staged progress for embedding, archive search, match classification, and research preparation. It should feel responsive and honest about progress, with elapsed-time feedback after the process runs longer than expected.
4. `Preskúmať` / `Prieskum` research workspace: design the current overlay pattern and also propose a full-page research workspace option. Include sidebar navigation, active selection, article/source/statement detail panes, provenance chips, empty states, close behavior, and mobile source/detail navigation.
5. Add-statement form: treat Add as a natural continuation from Detect/Research with prefilled statement/evidence context where useful. Include required fields, optional fields, verdict selection, source rows, validation, saving state, and success recovery.
6. Onboarding / `Návod`: use the onboarding screenshot and bundled onboarding assets as references for step structure, media slot, captions, navigation, and practical Slovak copy. It should feel like a polished product guide, not a throwaway tooltip.
7. Feedback panel: category, message, context notice, disabled/success/error states, low visual competition with primary tasks. It may become larger and more polished if that improves clarity, category selection, or context preview.

**Deliverables**

- Token sheet: semantic color roles, spacing scale, radius scale, type scale, elevation, z-index/layering, opacity, and motion timing.
- Typography sheet: Inter as the primary UI/content font; JetBrains Mono only for numeric/data metadata such as similarity, dates, timestamps, IDs, query timings, and technical labels.
- Component inventory for buttons, cards, badges, chips, forms, selects, segmented controls, panels, overlays, toasts, tooltips, pagination, skeletons, feedback, and onboarding. Show default, hover, active, focus, disabled, loading, empty, error, success, selected, and expanded/collapsed states where applicable.
- One high-fidelity desktop frame for each surface listed above.
- Mobile variants for Search, Duplicate detection, and Research.
- Light and dark variants for Search and Research; the other surfaces may ship one mode with explicit notes on how the other derives from the token system.
- Alternative exploration frames: one left-navigation + top-filters concept for a future expanded product, and one full-page research workspace concept. Keep these separate from the main recommended design.
- A short rationale describing how the redesign improves scan speed, evidence visibility, progress clarity, and mobile usability.
- Flag any deliverable you skip and why.

**Design-System Constraints**

- Serious, precise, dense, evidence-first.
- Inter is the primary font. Do not substitute Geist, Satoshi, serif fonts, or generic display fonts.
- JetBrains Mono is for numeric/data metadata only, not normal prose or buttons.
- `#E95B1D` is the primary brand orange for accents, selected states, active indicators, borders, focus treatments, and non-white-text uses.
- I prefer white text on filled orange primary buttons. Use an AA-compliant darker orange fill such as `#C94A18` with `#FFFFFF` for the white-text primary button variant. Do not use `#E95B1D` or `#F07850` as a filled button background with white normal-size text if it fails WCAG AA.
- Demagog blue is a restrained identity/support color only, not a competing CTA color.
- Strong light and dark surface hierarchy.
- Semantic verdict and detect-state colors with non-color cues: icon, label, or shape.
- Long Slovak statements must stay readable and scannable.
- Evidence must be visible without hover: sources, provenance, similarity, dates, speakers, and verdicts.
- Primary actions may use pill buttons as a restrained signature style. Do not make every component pill-shaped.
- Main Search/Detect navigation should remain the primary shell in the recommended design. A left taskbar/navigation model may be explored only as a separate future-product option.
- Direct Slovak UI copy. No hype.
- Avoid: marketing-page layouts, generic SaaS cards, neon or glow styling, decorative blobs, purple AI gradients, emoji status cues, oversized hero treatments, and decorative motion.

**Accessibility**

- Meet WCAG 2.1 AA contrast for text and meaningful UI states.
- Every interactive element has a visible focus state.
- Verdict and detect-state semantics must be distinguishable without color.
- Primary touch targets must be at least 44px on mobile.
- Dialogs, overlays, drawers, and feedback panels must have clear close behavior and keyboard/focus behavior.
- Respect `prefers-reduced-motion`; motion should clarify state changes, not entertain.

**Adjustability**

Establish the visual system first, then apply it. Use a small number of semantic color roles and avoid one-off styling. Keep spacing, radius, surface hierarchy, and typography consistent from dense desktop views to narrow mobile. Include enough state variation that future screens can be composed without inventing new styles.

**Self-Critique Before Finalizing**

Answer yes/no to each item and revise anything that fails:

1. Is there any user-facing use of an internal codename?
2. Are Inter and JetBrains Mono used according to their intended roles?
3. Do white-text orange buttons use an AA-compliant darker orange fill?
4. Does every verdict chip remain distinguishable in grayscale?
5. Does the dark-mode surface hierarchy survive when viewed at low brightness?
6. Do all primary CTAs meet 44px touch targets on mobile?
7. Can an editor identify the current mode, scan results, understand status, open research, and enter add/feedback without hunting?
8. Is evidence such as sources, provenance, similarity, speakers, verdicts, and dates visible without hover?
9. Is there any drift toward generic AI/SaaS styling, decorative motion, or hero treatments?
10. Does the recommended design preserve Search/Detect as the main shell while keeping left-navigation exploration separate?
