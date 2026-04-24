# Demagog Kinshasa DESIGN.md for Claude Design

This file is the Claude Design-ready source of truth for the Demagog Kinshasa redesign. It describes the app's product identity, visual direction, reusable components, interaction patterns, and visual rules. It is not a one-off prompt and it should not ask Claude Design to generate code.

---

## 1. Product Identity

- **Product name:** Demagog Kinshasa
- **Product purpose:** Internal editorial tool for Demagog.sk fact-check editors.
- **Primary users:** Slovak editors and evaluators checking political statements.
- **Core workflows:** semantic search, duplicate detection, research review, add-statement flow, onboarding/help, and feedback capture.
- **Desired feel:** editorial, precise, calm, credible, dense, trustworthy, low-noise.
- **Design keywords:** evidence-first, focused workspace, warm editorial control room, structured research, clear provenance.
- **Anti-keywords:** marketing page, generic SaaS dashboard, glossy AI app, decorative, playful, oversized hero, neon, purple AI gradient.

The UI should feel like a serious editorial/research workspace. It should help editors scan long Slovak statements, compare evidence, open research, and continue into statement creation without visual distraction.

---

## 2. Visual Direction

Use a warm neutral product interface with a single strong Demagog orange accent. The interface should be compact enough for daily editorial work but not cramped. Prioritize clear grouping, readable evidence, and strong status semantics over decoration.

Do:

- Put statement text, verdict, speaker, date, similarity, sources, and research actions in predictable positions.
- Use clear surface levels so filters, result cards, overlays, and feedback panels are easy to distinguish.
- Use icons and labels together for semantic states.
- Preserve enough density for repeated editorial scanning.

Do not:

- Create a landing-page hero.
- Add decorative orbs, bokeh, glossy gradients, neon glows, or purple/blue AI styling.
- Hide metadata or sources behind hover-only interactions.
- Rely on color alone for verdicts, duplicate states, filters, or warnings.
- Make every element pill-shaped.

---

## 3. Color System

Orange is the only primary action accent. Deep blue is an identity/support color only; it must not compete with orange as a CTA color.

### Brand Colors

| Token | Value | Use |
| --- | --- | --- |
| `brand.orange` | `#E95B1D` | Primary actions, active top-level tabs, selected brand accents |
| `brand.orange.hover` | `#C94A18` | Light-mode hover/pressed |
| `brand.orange.dark` | `#F07850` | Dark-mode action fills and focus accents |
| `brand.orange.soft` | `#FFE7DB` | Light selected/brand-tinted surfaces |
| `brand.orange.deep` | `#2A1510` | Dark selected/brand-tinted surfaces |
| `brand.blue` | `#0C3567` | Logo-linked identity, rare structural accents |
| `brand.blue.soft` | `#E8F1FA` | Soft informational surfaces |

### Action and Focus Roles

| Role | Light | Dark | Use |
| --- | --- | --- | --- |
| `action.primary.bg` | `#E95B1D` | `#F07850` | Main actions and active top-level mode |
| `action.primary.hover` | `#C94A18` | `#E95B1D` | Hover/pressed primary action |
| `action.primary.text` | `#FFFFFF` | `#FFFFFF` | Primary action text |
| `action.secondary.bg` | `#F1F5F9` | `#1E293B` | Supporting buttons |
| `action.secondary.text` | `#475569` | `#CBD5E1` | Supporting button text |
| `focus.ring` | `rgba(233,91,29,0.22)` | `rgba(240,120,80,0.28)` | Global focus ring |

### Light Mode

| Role | Value | Use |
| --- | --- | --- |
| `surface.page` | `#F8FAFC` | App background |
| `surface.page.warm` | `#FFF7F2` | Optional warm wash behind main shell |
| `surface.header` | `rgba(255,255,255,0.96)` | Sticky header |
| `surface.raised` | `#FFFFFF` | Cards, forms, panels |
| `surface.subtle` | `#F1F5F9` | Filter panels, nested sections, empty states |
| `surface.sunken` | `#E2E8F0` | Disabled controls, progress tracks |
| `text.primary` | `#0F172A` | Main text |
| `text.secondary` | `#475569` | Metadata and descriptions |
| `text.muted` | `#64748B` | Captions and helper text |
| `text.disabled` | `#94A3B8` | Disabled text |
| `border.subtle` | `#E2E8F0` | Default borders |
| `border.strong` | `#CBD5E1` | Strong separators and active boundaries |
| `focus.ring` | `rgba(233,91,29,0.22)` | Focus ring |

### Dark Mode

Dark mode is not an inversion. It needs explicit surface levels.

| Role | Value | Use |
| --- | --- | --- |
| `surface.page` | `#020617` | App background |
| `surface.header` | `rgba(2,6,23,0.92)` | Sticky header |
| `surface.raised` | `#0F172A` | Cards, forms, panels |
| `surface.raised.2` | `#111C2F` | Panels needing extra separation |
| `surface.subtle` | `#1E293B` | Sidebar/filter/nested surfaces |
| `surface.sunken` | `#334155` | Disabled controls, progress tracks |
| `text.primary` | `#F8FAFC` | Main text |
| `text.secondary` | `#CBD5E1` | Descriptions and metadata |
| `text.muted` | `#94A3B8` | Captions |
| `text.disabled` | `#64748B` | Disabled text |
| `border.subtle` | `rgba(148,163,184,0.22)` | Default borders |
| `border.strong` | `rgba(203,213,225,0.34)` | Strong separators and active boundaries |
| `focus.ring` | `rgba(240,120,80,0.28)` | Focus ring |

`surface.raised.2` exists only in dark mode because dark interfaces need an extra raised surface to prevent overlays, sidebars, and nested panels from flattening into one slab. In light mode, `surface.raised` plus border/shadow is enough.

### Status Colors

Use these as semantic roles. Each badge/chip must include an icon or dot plus the full Slovak label. Dark values below are solid low-saturation fills measured against `surface.raised` (`#0F172A`) to avoid contrast loss from transparent blending.

| Meaning | Token | Light | Dark | Non-color cue |
| --- | --- | --- | --- | --- |
| `Pravda` | `status.truth` | text `#15803D`, bg `#DCFCE7`, border `#BBF7D0` | text `#DCFCE7`, bg `#123633`, border `rgba(34,197,94,0.38)` | check or solid dot |
| `Nepravda` | `status.false` | text `#B91C1C`, bg `#FEE2E2`, border `#FECACA` | text `#FEE2E2`, bg `#371F2F`, border `rgba(239,68,68,0.38)` | cross/stop mark |
| `Zavádzajúce` | `status.misleading` | text `#92400E`, bg `#FEF3C7`, border `#FDE68A` | text `#FEF3C7`, bg `#3D3224`, border `rgba(251,191,36,0.40)` | warning mark |
| `Neoveriteľné` | `status.unverified` | text `#334155`, bg `#F1F5F9`, border `#CBD5E1` | text `#F1F5F9`, bg `#232D41`, border `rgba(148,163,184,0.38)` | question/dash |
| Duplicate | `detect.duplicate` | red status set | red status set | overlap/history icon |
| Related | `detect.related` | amber status set | amber status set | link/clock icon |
| New claim | `detect.new` | orange status set | orange status set | plus/document icon |
| Preparing | `detect.preparing` | blue/slate info set | blue/slate info set | staged progress |
| Stale | `detect.stale` | amber warning set | amber warning set | warning icon |

`NEW_CLAIM` is work-needed, not success. Do not use green as its primary color.

---

## 4. Typography

Use a technical sans-serif with strong Slovak diacritic support. Serif fonts are not appropriate for this operational UI.

| Role | Font |
| --- | --- |
| UI sans | Geist Sans or Satoshi; fallback Inter, system-ui, sans-serif |
| Data/numbers | JetBrains Mono or tabular numerals |

| Token | Size / Line | Weight | Use |
| --- | --- | --- | --- |
| `type.display` | 32 / 38 | 600 | Add page title, major workflow title |
| `type.title` | 24 / 32 | 600 | Research pane title |
| `type.section` | 18 / 28 | 600 | Result count, form section title |
| `type.statement` | 17 / 28 | 500 | Statement text in result cards |
| `type.body` | 15 / 24 | 400 | Supporting text |
| `type.control` | 14 / 20 | 600 | Buttons and controls |
| `type.meta` | 13 / 18 | 500 | Metadata rows |
| `type.caption` | 12 / 16 | 500 | Helper text, small labels |
| `type.overline` | 11 / 14 | 600, tracking `0.14em` | Rare section markers |

Rules:

- Default letter spacing is `0`; use tracking only for overlines.
- Use tabular numerals for query times, dates, counts, and similarity percentages.
- Long Slovak statements must wrap naturally with line-height at least `1.55`.
- On mobile, preserve statement readability before preserving card density.

---

## 5. Spacing, Layout, Shape, and Depth

### Spacing

| Token | Value | Use |
| --- | --- | --- |
| `space.1` | 4px | Icon/text gap |
| `space.2` | 8px | Chip gaps |
| `space.3` | 12px | Tight component gaps |
| `space.4` | 16px | Default component padding |
| `space.5` | 20px | Result card padding |
| `space.6` | 24px | Panel padding |
| `space.8` | 32px | Section gaps |
| `space.10` | 40px | Major page rhythm |

### Radius

| Token | Value | Use |
| --- | --- | --- |
| `radius.xs` | 6px | Small icons/tags |
| `radius.sm` | 8px | Compact controls |
| `radius.md` | 12px | Badges, chips, tabs, pagination |
| `radius.lg` | 16px | Inputs, nested rows |
| `radius.xl` | 20px | Result cards |
| `radius.panel` | 24px | Sidebars and panels |
| `radius.overlay` | 28px | Research overlay |
| `radius.pill` | 999px | Primary CTAs and top-level segmented controls only |

Verdict badges use `radius.md`, not full pill by default.

### Layout

- Main shell max width: `86rem` / 1376px.
- Research overlay max width: 1500px; it is intentionally wider than the shell because research needs side-by-side reading space.
- Desktop search: filter panel left, results right.
- Desktop detect: centered statement input and result stack.
- Mobile: single-column, no horizontal scrolling, filters collapse into drawer/sheet, research uses source/detail navigation.

### Breakpoints and Layers

| Token | Value |
| --- | --- |
| `breakpoint.sm` | 640px |
| `breakpoint.md` | 768px |
| `breakpoint.lg` | 1024px |
| `breakpoint.xl` | 1280px |
| `z.header` | 40 |
| `z.popover` | 45 |
| `z.overlay` | 50 |
| `z.toast` | 60 |

Elevation should come from subtle borders plus tinted shadows, not heavy black shadows.

### Opacity

| Token | Value | Use |
| --- | --- | --- |
| `opacity.disabled` | 0.5 | Disabled controls and unavailable options |
| `opacity.backdrop.light` | 0.55 | Research/feedback backdrop in light mode |
| `opacity.backdrop.dark` | 0.70 | Research/feedback backdrop in dark mode |
| `opacity.skeleton` | 0.55 | Skeleton fills and shimmer |

---

## 6. Core Components

### Buttons

- **Primary:** orange fill, white text, 44-48px height; 40px only for compact toolbars. Use for main actions like `Hľadať`, `Analyzovať`, `Preskúmať`, `Otvoriť prieskum`, `Uložiť výrok`.
- **Secondary:** neutral/subtle surface, secondary text, optional border. Use for back, retry, and supporting actions.
- **Icon buttons:** 36-40px target, consistent stroke/fill style, visible label via tooltip or aria text.
- **States:** default, hover, active (`scale 0.98` or 1px press), focus, disabled, loading.

### Inputs and Forms

- Labels sit above fields.
- Helper text sits below fields.
- Error text appears directly below the affected field.
- Inputs use `radius.lg`, subtle border, neutral surface, orange focus ring.
- Long add forms should include a top error summary plus field-level errors.
- Source row pattern: label input + URL input + remove control + row-level URL validation.
- Optional fields use a small neutral badge, never orange.
- Date inputs use the same field surface and focus style as selects; calendar affordance is subtle and aligned right.
- Checkboxes, radios, and toggles use orange only for selected states, keep labels visible, and preserve a 40px hit target.

### Tabs and Segmented Controls

- Top-level Search/Detect uses an orange active segment.
- Detect mode uses a compact segmented toggle: `Rýchle` and `Dôkladné`.
- Research internal tabs use raised neutral active surfaces, not orange fills.
- Options must remain visible; prefer segmented controls over hidden dropdowns for important mode choices.

### Cards and Results

Result card anatomy:

1. Optional classification badge.
2. Statement text.
3. Metadata row: verdict, speaker, party, date, source.
4. Similarity block if relevant.
5. `Preskúmať` action.
6. Expandable reasoning/sources if present.

Cards use `surface.raised`, `radius.xl`, subtle border, 20px desktop padding, 16px mobile padding. Active keyboard selection uses orange border/ring.

### Badges and Chips

- Verdict badges use semantic status colors, `radius.md`, icon/dot, and full label.
- Active filter chips are removable and wrap cleanly.
- Model-applied filters should say `Odporúčané` or `Navrhnuté systémom`, not only `AI`.
- Source/provenance chips are neutral by default; internal Demagog references may use soft blue; selected/interacting chips may use orange.

### Dropdowns, Tooltips, Toasts, Pagination

- Dropdowns/comboboxes use `surface.raised`, `radius.lg`, visible focus, and selected-row contrast.
- Tooltips are compact, neutral, and never required to understand the UI.
- Toasts are reserved for short background events; errors that block work should be inline.
- Pagination uses compact `radius.md` controls, clear current page, disabled prev/next, and mobile wrapping.
- Skeletons should match the final result/card shapes: statement line blocks, metadata pills, button blocks, and panel rows. Avoid generic centered spinners as the only loading treatment.

### Overlays and Panels

- Research overlay is a focused workspace, not a decorative modal.
- Backdrop is translucent with light blur.
- Panel uses `surface.raised`, `radius.overlay`, strong enough border/shadow in dark mode.
- Sidebar uses `surface.subtle`; active item uses raised surface plus orange low-opacity border or left marker.
- Close is always visible.

### Feedback

Feedback is compact and secondary to the main work.

- Category select first, message textarea second.
- Context notice must be explicit.
- Include disabled, success, and error states.
- It should not cover key workflow actions on desktop or mobile.

### Onboarding

Onboarding is in scope.

- First-run guidance explains Search vs Detect, research, add flow, history, and feedback.
- It is re-openable from `Návod`.
- Use a step indicator, short Slovak copy, media slot, caption, primary next action, and skip/dismiss action.
- Middle steps should use screenshot cards of the relevant screen; intro/outro can use lighter text/card compositions.
- Mobile onboarding should become a single-column panel with image below copy and persistent next/back controls.
- Use light/dark image pairs where available, but do not make the entire design dependent on screenshots.
- Keep tone practical; avoid marketing copy.

### Header and Theme Toggle

- Desktop header: Demagog logo at left, centered Search/Detect segmented control on the home route, feedback and theme controls at right.
- Mobile header: logo and utility controls remain visible; Search/Detect segmented control can wrap below the logo row.
- Theme toggle is an icon button with clear selected state, accessible label, visible focus ring, and no decorative animation beyond a short state transition.
- Header remains sticky and uses `surface.header` with a subtle bottom border.

---

## 7. Interaction Rules

### Search

- Search input is prominent.
- Filters are accessible on desktop and mobile.
- Active filters are visible, removable, and clearly labeled.
- Search history is visually secondary: expose it through a history button near the search input and show entries in a dropdown/popover with query text, filter chips, result count, timestamp grouping, remove, and clear-all actions.
- Loading uses skeleton result cards where possible.
- No-results state shows query, filters, and a clear recovery action.

### Detect

- Statement textarea supports long claims and shows character count.
- Mode is controlled by a segmented toggle: `Rýchle` and `Dôkladné`.
- Fast mode: quick archive match and immediate classification summary.
- Thorough mode: staged progress for embedding, searching archive, classifying matches, and preparing aggregate research.
- Thorough mode shows elapsed-time feedback after 8-10 seconds and can offer a non-blocking continue/background affordance if preparation takes long.
- Duplicate, related, new-claim, stale, and preparing states must be visually distinct.
- `Prieskum` and `Pridať výrok` actions need clear priority.

### Research

- Search research opens statement-scoped `Preskúmať`.
- Detect research opens aggregate `Prieskum`.
- Sidebar selection must be obvious.
- Empty states distinguish no articles, no external sources, and no related statements.
- Mobile research must provide a clear way to switch between source list and detail content.

### Add Flow

- Add flow is a continuation of editorial review.
- Required fields: statement, speaker, party, verdict.
- Source rows are optional but should be visually structured.
- Save success gives clear next steps.

### Feedback

- Feedback can attach current page context.
- The context notice should be visible before submit.
- Success and failure are inline and recoverable.

---

## 8. Motion

Motion confirms state changes. It should not entertain.

| Element | Duration | Easing |
| --- | --- | --- |
| Hover | 150-200ms | ease-out |
| Active press | 80-120ms | ease-out |
| Tab indicator | 350-500ms | cubic `0.22,1,0.36,1` |
| Filter chip enter/exit | 200-240ms | cubic `0.22,1,0.36,1` |
| Research overlay enter | 420-500ms | cubic `0.16,1,0.3,1` |
| Research overlay exit | 280-340ms | ease |
| Feedback panel | 220-260ms | ease-out |
| Skeleton shimmer | 1200-1600ms | linear, low contrast |

Respect `prefers-reduced-motion`. Avoid decorative perpetual animation, particle effects, magnetic cursor effects, and heavy parallax.

---

## 9. Content Style

- UI copy is Slovak.
- Tone is professional, direct, and practical.
- Buttons use clear verbs: `Vyhľadať`, `Analyzovať`, `Otvoriť prieskum`, `Pridať výrok`.
- Avoid hype, exclamation marks, and vague AI language.
- Error messages should explain what happened and what to do next.

Preferred copy:

| Avoid | Use |
| --- | --- |
| `AI` chip | `Odporúčané` |
| Frozen long-running detect copy | `Overenie trvá dlhšie. Zatiaľ pripravujeme najbližšie zhody.` |
| Generic send failure | `Správu sa nepodarilo odoslať. Skúste to znova.` |
| Vague stale result | `Text výroku sa zmenil. Spustite analýzu znova, aby zhody sedeli s aktuálnym znením.` |

---

## 10. Accessibility

Minimum target: WCAG 2.1 AA.

- Body text contrast: at least 4.5:1.
- Large text and non-text boundaries: at least 3:1.
- Every interactive element has a visible `2px` focus ring with `2px` offset.
- Do not communicate status by color alone.
- Dialogs trap focus, close with Escape, and return focus to the trigger.
- Tabs include selected state and matching panels.
- Form fields have labels; errors use `aria-invalid` and local error text.
- Primary controls have at least 40px hit targets.
- Respect `prefers-reduced-motion`.
- Long labels, chips, and Slovak statements must wrap without horizontal overflow.

---

## 11. Do / Don't

### Do

- Use strong evidence hierarchy.
- Keep controls familiar and direct.
- Use orange for primary actions and active top-level mode.
- Use neutral surfaces for structure.
- Include loading, empty, error, success, disabled, hover, active, and focus states.
- Design both light and dark mode intentionally.

### Don't

- Use generic SaaS gradients.
- Use neon glow, bokeh, or decorative blobs.
- Use emoji as status cues.
- Use pure black backgrounds.
- Use serif fonts.
- Hide provenance or filters.
- Create a marketing homepage.
- Make the interface feel like a concept shot instead of a daily tool.

---

## 12. Quality Gate

Before accepting Claude Design output, check:

- It reads as an editorial research tool, not a landing page.
- Search, filters, detect, research, onboarding, and feedback are recognizable.
- Orange is the only primary action accent.
- Dark mode has distinct page, raised, and sidebar surfaces.
- Verdicts and detect states include non-color cues.
- Long Slovak statements remain readable.
- Mobile layouts avoid horizontal scrolling.
- The design avoids generic AI/SaaS visual cliches.

---

## 13. Guidance Sources

This document follows current guidance from:

- [Anthropic Claude Design launch](https://www.anthropic.com/news/claude-design-anthropic-labs?pubDate=20250519): Claude Design can use codebases, design files, images, documents, and web captures to build/apply a team design system.
- [Claude MCP app design guidelines](https://claude.com/docs/connectors/building/mcp-apps/design-guidelines): useful official guidance on light/dark themes, skeletons, visual hierarchy, spacing, icons, controls, and interaction patterns.
- [Anthropic clear prompting guidance](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/be-clear-and-direct): be direct, detailed, structured, and understandable without hidden context.
- [DESIGN.md library](https://designmd.ai/): supports the single markdown design-system pattern for consistent AI UI generation.
- [What is DESIGN.md](https://designmd.ai/what-is-design-md): frames DESIGN.md as a portable description of colors, typography, spacing, components, and constraints.
- [Practical DESIGN.md user guidance](https://www.reddit.com/r/claude/comments/1sd5ksj/a_designmd_file_in_your_project_root_claude_stops/): emphasizes semantic colors, typography hierarchy, component states, spacing, layout, and do/don't rules.
- [ClaudeCode DESIGN.md discussion](https://www.reddit.com/r/ClaudeCode/comments/1s9h0ry/use_designmd_files_to_stop_claude_from_generating/): highlights interaction states, loading, focus, motion, and edge states as common weak spots.
- [TechCrunch on Claude Design](https://techcrunch.com/2026/04/17/anthropic-launches-claude-design-a-new-product-for-creating-quick-visuals/): confirms Claude Design is for visual work and can apply a team's design system.
