# Color / Design Browser Audit Prompt - Demagog Kinshasa

Paste this prompt into the in-browser agent while the local app is running. Also attach or provide `README.md` for product/page context.

---

## Prompt

You are auditing the current live webpage for Demagog Kinshasa, a Next.js editorial tool for Demagog.sk fact-check editors. Use the attached `README.md` for product context, but judge the interface by what is actually visible and interactive in the browser.

Your goal is to produce a detailed color and design report that can be used as input for a full redesign and design-system pass in Claude Design. Test the real UI, capture evidence, and describe the current visual system precisely enough that a designer can preserve intentional product behavior while replacing weak or inconsistent visual decisions.

Do not redesign the app in this report. Do not propose code changes unless they clarify a design-system requirement. Focus on current-state documentation, visual diagnosis, screenshots, and concrete design-system recommendations.

---

## App Context

Primary surface:
- `/` - shared shell with two tabs:
  - `Vyhľadávanie` / search
  - `Detekcia duplikátov` / duplicate detection, available with `?mode=detect`

Secondary surfaces:
- Research overlay opened from `Preskúmať` / `Prieskum`
- Add-statement flow at `/add`
- Feedback widget opened from the header or lower helper control
- Light and dark theme via the theme toggle

Core user:
- Slovak fact-check editor
- Needs dense, trustworthy, editorial tooling
- Values quick scanning, clear provenance, reliable status colors, and low visual noise

Avoid judging it like a marketing site. This should feel like a serious internal editorial/research workspace.

---

## Required Browser Setup

1. Open the app at `http://localhost:3000`.
2. Test desktop first at roughly `1440 x 1000`.
3. Also inspect one mobile/narrow viewport around `390 x 844`.
4. Run the audit in light mode first.
5. Switch to dark mode and capture at least one dark-mode screenshot. Prefer a screen with real results or an open overlay, not only the blank home screen.
6. If the app uses mock mode or returns fallback data, note that in the report. Continue the visual audit anyway.

---

## Test Data To Use

Use realistic Slovak inputs. If one query fails, try the next and document which one produced usable results.

Search tab queries:
- `Fico zdravotnictvo`
- `Čo povedal Robert Fico o cenách energií?`
- `Ukrajina NATO`

Detect tab statements:
- `Robert Fico povedal, ze Slovensko nebude posielat zbrane na Ukrajinu.`
- `Vláda tvrdila, že ceny energií pre domácnosti zostanú stabilné.`
- `Slovensko má jednu z najnižších mier nezamestnanosti v histórii.`

For add flow, do not submit real data unless the environment is clearly a disposable local/mock environment. Fill fields enough to inspect form states, validation, source rows, layout, and color use.

For feedback, open the panel and inspect category selection, textarea, disabled submit state, focus state, and error/success styling if safely testable.

---

## Required Screenshots

Capture screenshots for every materially different state. Include filenames or embedded images in the final report.

Minimum screenshot set:

1. Search tab before search, light mode.
2. Search tab after an actual search, light mode.
3. Search results with filters visible or active, light mode.
4. Detect tab before detection, light mode.
5. Detect tab after an actual duplicate/related detection, light mode.
6. Expanded research view opened from `Preskúmať` or `Prieskum`, light mode.
7. Add-statement view at `/add`, light mode.
8. Feedback window open, light mode.
9. At least one dark-mode screenshot with meaningful content. Prefer search results, detect results, research overlay, or feedback panel.
10. At least one mobile/narrow screenshot of the most layout-sensitive screen you find.

For each screenshot, record:
- URL and query string
- Theme: light or dark
- Viewport size
- User action that produced it
- Any data/query used
- What design details the screenshot demonstrates

---

## Feature Walkthrough

Actually interact with the app. Do not infer from labels alone.

### Search

Test:
- Empty state
- Search input
- Loading state if visible
- Results list
- Result cards
- Verdict badges
- Related article/source links if visible
- Filters/sidebar
- Active filter chips
- Pagination or result count if present
- History control if present
- `Preskúmať` action

Report:
- How the layout is organized
- How hierarchy is communicated
- How active/inactive/filter states are styled
- Whether editorial metadata is scannable
- Any visual inconsistency between empty, loading, and populated states

### Detect

Test:
- Statement input
- Fast/thorough mode controls if visible
- Detect action
- Loading/progress state
- Duplicate/related/new result states
- Match cards
- Status banners
- `Prieskum` action
- Transition into aggregate research

Report:
- How similarity/confidence/status is visually communicated
- Whether severity/status colors are distinct and accessible
- Whether the detect workflow looks visually related to search or like a separate design

### Research Overlay

Test:
- Open from a search result via `Preskúmať`
- Open from detect via `Prieskum`, if available
- Sidebar/navigation
- Main detail pane
- Related articles
- External sources/provenance chips
- Close/dismiss behavior
- Mobile behavior if feasible

Report:
- Overlay structure
- Surface layering and shadows
- Panel backgrounds and borders
- Active selection styling
- Source/provenance color patterns
- Whether it feels like a focused research workspace or a modal bolted onto the app

### Add View

Test:
- `/add`
- Required fields
- Verdict controls
- Date/speaker/topic fields
- Source rows
- Add/remove source controls
- Validation states if safe to trigger
- Submit disabled/enabled state

Report:
- Form density
- Label/input hierarchy
- Required vs optional treatment
- Error and helper text styles
- Whether form controls belong to the same visual system as search/detect

### Feedback

Test:
- Header feedback button
- Floating/helper feedback control if present
- Panel open/close animation
- Category field
- Textarea
- Submit disabled state
- Focus/hover states
- Success/error states if safe

Report:
- Panel placement
- Layering over page content
- Whether it visually competes with primary workflows
- Color and motion consistency with the rest of the app

---

## Color Audit Requirements

Document colors with hex values wherever possible. Use browser devtools/color picker/sampling if needed.

Capture at least:

### Global Tokens / Base Palette

- Light page background
- Dark page background
- Primary text in light mode
- Primary text in dark mode
- Secondary/muted text in both modes
- Main content surface colors
- Header/nav surface colors
- Borders/dividers
- Shadows/elevation treatment
- Selection/highlight color if visible

### Brand / Accent

- Primary brand accent
- Accent hover/pressed states
- Accent soft surface
- Accent border
- Accent dark-mode variant
- Any orange/red brand treatment from logo or active tabs

### Status / Semantic Colors

Document each verdict/status color in light and dark modes:
- `Pravda`
- `Nepravda`
- `Zavádzajúce`
- `Neoveriteľné`
- Duplicate found
- Related only
- New claim
- Loading/progress
- Error
- Success
- Warning

For each, include:
- Text color
- Background color
- Border color
- Dot/icon color if present
- Contrast concerns
- Whether the meaning is clear without relying on color alone

### Filter / Metadata Colors

Document:
- Filter sidebar background
- Filter group labels
- Select/input borders
- Active filter chips
- Model-applied filters if visually different
- Date/range controls
- Politician/party/topic chips
- Source/provenance chips
- Article cards

### Dark Mode

Audit:
- Whether dark mode is a first-class palette or just inverted light mode
- Surfaces that become too flat or too similar
- Text contrast problems
- Accent saturation in dark mode
- Any light-only backgrounds, borders, icons, SVGs, or shadows
- Logo treatment in dark mode

---

## Design-System Audit Requirements

Describe the current system in reusable design-system terms.

Include:

### Typography

- Font families visible in the UI
- Heading scale and weights
- Body text size and line-height
- Label/caption styles
- Numeric/data text treatment
- Slovak diacritic rendering quality
- Whether hierarchy is strong enough for scanning

### Layout

- Page shell structure
- Max-width/container behavior
- Header behavior
- Search/detect tab switcher
- Grid/column patterns
- Card/list density
- Overlay dimensions
- Mobile breakpoints and layout changes
- Any overflow, wrapping, or spacing issues

### Components

Inventory visible component styles:
- Buttons: primary, secondary, ghost/icon, disabled, loading
- Inputs: text, textarea, select, date, URL/source rows
- Tabs/segmented controls
- Cards/result rows
- Badges/chips
- Status banners
- Progress/loading indicators
- Tooltips/popovers/history
- Modal/overlay/panel
- Feedback panel
- Theme toggle

For each component type, report:
- Default state
- Hover state
- Active/selected state
- Focus state
- Disabled state
- Error state, if applicable
- Dark-mode treatment
- Design-system gaps

### Motion / Interaction Feel

Report:
- Transitions and durations that are visible
- Tab switcher motion
- Overlay open/close motion
- Feedback panel animation
- Loading/progress behavior
- Any jarring movement, layout shift, or missing feedback

### Imagery / Brand

Report:
- Logo usage and sizing
- Favicon/app icon if visible
- Any onboarding images visible from the app
- Whether imagery supports the editorial product or feels decorative

---

## Output Format

Produce a single markdown report with this exact structure:

```markdown
# Demagog Kinshasa Current Design Audit

## Audit Metadata
- Date:
- App URL:
- Browser:
- Viewports tested:
- Themes tested:
- Data/query inputs used:
- Environment notes:

## Executive Summary
Short factual summary of the current design direction, main strengths, main inconsistencies, and the biggest redesign opportunities.

## Screenshot Inventory
| ID | Screen | Theme | Viewport | URL | Action / Input | File |
| --- | --- | --- | --- | --- | --- | --- |

## Current Visual Language
Describe the overall look and feel in plain design terms.

## Color Palette
### Global Colors
| Use | Light | Dark | Notes |
| --- | --- | --- | --- |

### Brand / Accent Colors
| Use | Hex | State | Notes |
| --- | --- | --- | --- |

### Status and Verdict Colors
| Meaning | Text | Background | Border | Dot/Icon | Light/Dark | Contrast / Notes |
| --- | --- | --- | --- | --- | --- | --- |

### Filter and Metadata Colors
| Element | Text | Background | Border | Notes |
| --- | --- | --- | --- | --- |

## Typography
Document current fonts, sizes, weights, hierarchy, readability, and redesign implications.

## Layout and Spacing
Document page shell, cards/lists, overlay, density, responsive behavior, and spacing rhythm.

## Component Inventory
### Buttons
### Inputs and Forms
### Tabs and Navigation
### Cards and Results
### Badges and Chips
### Research Overlay
### Feedback Widget
### Loading, Empty, Error, and Success States

## Screen-by-Screen Findings
### Search
### Detect
### Research Overlay
### Add View
### Feedback
### Dark Mode
### Mobile

## Accessibility and Contrast Notes
List visible contrast issues, focus-state issues, color-only communication, and keyboard/focus concerns observed during browser testing.

## Design-System Recommendations
Actionable guidance for a future design system. Include recommended token categories, semantic color roles, component states, and any areas where the current UI needs stronger consistency.

## Redesign Priorities
1. Highest-impact design-system issue
2. Next priority
3. Next priority

## Raw Color Samples
| Sample | Hex | Source screen/component | Notes |
| --- | --- | --- | --- |
```

---

## Quality Bar

The report should be usable by another agent without access to the live browser. That means:
- Every major screen has screenshot evidence.
- Every important color is recorded as a semantic role, not only a hex list.
- Dark mode is treated separately from light mode.
- Recommendations are specific enough to become design-system tokens and component specs.
- You distinguish observed facts from design opinions.
- You call out missing evidence instead of pretending it was tested.
