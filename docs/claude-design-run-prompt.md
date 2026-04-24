Use the attached Demagog design system and README as the source of truth. Use the attached screenshots as reference material for the current product shape, density, workflow, and component inventory; do not copy the current UI exactly. If a screenshot contradicts the design system, follow the design system.

Create a UX-first redesign for the Demagog.sk editorial research workspace (internal codename Kinshasa; do not surface the codename in the UI). The audience is Slovak fact-check editors. The result should look premium because it is coherent, clear, and well-crafted, not because it is decorative. The output must be dev-handoff quality: tokens named, components reusable, states enumerated, spacing on a consistent scale. It is not shipped code.

**Surfaces to design**

1. Search results: filters, active filters, recommended/model-applied filters, result cards, similarity, metadata, source affordances, pagination, history access, and empty/loading/error states.
2. Duplicate detection: `Rýchle` / `Dôkladné` segmented mode, statement input, character count, stale-result warning, and completed duplicate / related / new-claim outcomes.
3. Thorough detection progress: staged progress for embedding, archive search, match classification, and research preparation. It should feel responsive and honest about progress, with elapsed-time feedback after the process runs longer than expected.
4. `Preskúmať` / `Prieskum` research workspace: sidebar navigation, active selection, article/source/statement detail panes, provenance chips, empty states, close behavior, and mobile source/detail navigation.
5. Add-statement form: required fields, optional fields, verdict selection, source rows, validation, saving state, and success recovery.
6. Onboarding / `Návod`: use the middle-card onboarding screenshot as the reference for step structure, media slot, captions, navigation, and practical Slovak copy.
7. Feedback panel: category, message, context notice, disabled/success/error states, low visual competition with primary tasks.

**Deliverables**

- Token sheet: color with semantic roles, spacing scale, radius scale, type scale, and elevation.
- Component inventory for cards, badges, chips, forms, segmented controls, panels, overlays, toasts, tooltips, and loading states. Each component must show default, hover, active, focus, disabled, loading, empty, and error where applicable.
- One high-fidelity desktop frame per surface above.
- Mobile variants for Search, Duplicate detection, and Research.
- Light and dark variants for Search and Research; the other surfaces may ship one mode with notes on how the other will derive.
- Flag any deliverable you skip and why.

**Design-system constraints**

- Serious, precise, dense, evidence-first.
- `#E95B1D` is the single primary orange accent.
- Demagog blue is a restrained identity/support color only.
- Strong light and dark surface hierarchy.
- Semantic verdict and detect-state colors with non-color cues: icon, label, or shape.
- Long Slovak statements must stay readable and scannable.
- Direct Slovak UI copy. No hype.
- Avoid: marketing-page layouts, generic SaaS cards, neon or glow styling, decorative blobs, purple AI gradients, emoji status cues, oversized hero treatments.

**Accessibility**

- Meet WCAG 2.1 AA contrast for text and UI.
- Every interactive element has a visible focus state.
- Verdict and detect-state semantics must be distinguishable without color.
- Primary touch targets must be at least 44px on mobile.

**Adjustability**

Establish the visual system first, then apply it. Use a small number of semantic color roles. Keep spacing, radius, surface hierarchy, and typography scaling from dense desktop to narrow mobile. Include enough state variation that future screens can be composed without inventing new styles.

**Self-critique before finalizing**

Answer yes/no to each item and revise anything that fails:

1. Does every verdict chip remain distinguishable in grayscale?
2. Does the dark-mode surface hierarchy survive when viewed at low brightness?
3. Do all primary CTAs meet 44px touch targets on mobile?
4. Can an editor identify the current mode, scan results, understand status, open research, and enter add/feedback without hunting?
5. Is evidence such as sources, provenance, similarity, and dates visible without a hover?
6. Is there any drift toward generic AI/SaaS styling, decorative motion, or hero treatments?
