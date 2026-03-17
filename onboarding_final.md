# Onboarding Final

Reference document for the homepage onboarding redesign.

This captures:

- the product decision direction
- the preferred larger onboarding shape
- the lower-effort image-first fallback
- asset naming
- implementation plan
- handoff prompts for another agent

## 1. Product Direction

### Light Mode Default

Recommendation: default the product to **light mode** and keep dark mode as a manual opt-in.

Why:

- this is primarily a professional work tool
- onboarding assets will be much easier to keep consistent if they are made once in light mode
- auto-detecting dark mode creates mismatch when the onboarding media is light-only
- screenshots and videos stay visually stable across docs, onboarding, and review

Practical rule:

- default to light
- keep dark mode toggle
- persist user choice after manual change

## 2. Current Implementation Assessment

The current onboarding is a good **v1**, but it is not the final presentation layer for a richer guided experience.

Current files:

- `src/components/home/HomeOnboarding.tsx`
- `src/components/home/homeOnboardingSteps.tsx`
- `src/components/home/HomePageClient.tsx`

What is already good:

- the onboarding exists and works
- it is skippable
- dismissed / completed state persists locally
- it can be reopened through the persistent `Návod` button
- the step structure already supports optional future steps

What is not final yet:

- it is still sized like a text-first modal
- the previews are synthetic, not actual media
- the step schema is not yet asset-driven
- it is good for a lightweight v1, but not yet for a polished showcase

## 3. Recommended Final Structure

### Default Flow

Recommended default flow: **4 steps total**

1. text only
2. search video
3. duplicate detector video
4. expanded detail / `Preskúmať` video

### Optional Step

5. add-to-db video

Reason:

- 4 total steps feels short enough to tolerate
- search and duplicate detection are essential
- the expanded detail view is important enough to show
- add-to-db is useful, but can remain optional if the first-run flow should stay shorter

## 4. Step Plan

### Step 1

Type: text only

Eyebrow:

`1. Základ`

Title:

`Dva režimy. Jeden jednoduchý začiatok.`

Body:

- `Vyhľadávanie je na tému, meno, citát alebo normálnu otázku.`
- `Detekcia duplicít je na nový konkrétny výrok.`
- `Nemusíte písať presné kľúčové slová. Search sa správa skoro ako chat a filtre sa často doplnia samy.`

Purpose:

- orient the user
- remove fear of using the search box
- explain the two modes simply

### Step 2

Type: video

Eyebrow:

`2. Vyhľadávanie`

Title:

`Napíšte otázku tak, ako by ste ju povedali kolegovi.`

Body:

- `Do vyhľadávania môžete napísať tému, meno, citát alebo celú otázku.`
- `Systém si z textu často sám doplní filtre.`
- `Keď nájdete dobrý výsledok, pokračujte cez Preskúmať.`

Video should show:

- cursor enters search box
- natural-language query is typed
- search runs
- auto-filters appear
- first results appear
- a short hover or pause on `Preskúmať`

Suggested query:

`Čo povedali členovia SMER-u o vojne na Ukrajine od roku 2022?`

### Step 3

Type: video

Eyebrow:

`3. Detekcia duplicít`

Title:

`Sem vložte celý nový výrok.`

Body:

- `Použite to vtedy, keď už máte konkrétny nový výrok.`
- `Rýchly je na prvé posúdenie. Prieskum je na širší kontext.`
- `Výsledok môže byť duplicitný, súvisiaci alebo nový.`

Video should show:

- switch to duplicate detection
- paste a full statement
- keep `Rýchly` selected
- click `Analyzovať`
- duplicate result appears

Suggested statement:

`Táto vojna začala už v roku 2014 vyčíňaním ukrajinských neonacistov.`

### Step 4

Type: video

Eyebrow:

`4. Preskúmať`

Title:

`Keď chcete ísť ďalej, otvorte detail.`

Body:

- `Preskúmať otvorí pracovný pohľad s analýzou, článkami a zdrojmi.`
- `Tu už nepokračujete len v hľadaní. Tu reálne pracujete s nájdeným výsledkom.`

Video should show:

- click `Preskúmať` from a search result
- research panel opens
- smooth scroll through analysis / articles / sources
- short pause on the strongest part of the panel

### Optional Step 5

Type: video

Eyebrow:

`5. Pridať nový výrok`

Title:

`Keď nič nesedí, pokračujte rovno do databázy.`

Body:

- `Ak systém nič vhodné nenašiel, môžete hneď pokračovať na Pridať nový výrok.`
- `Formulár otvorí predvyplnený text, takže nezačínate od nuly.`

Video should show:

- duplicate detector returns `Nový výrok`
- click `Pridať výrok`
- prefilled form opens

Suggested statement:

Use any clearly new / no-match statement available in the current dataset run.

## 5. Asset Naming For Video Version

Place all assets under:

`public/onboarding/`

Use these exact filenames:

- `public/onboarding/step-02-search-light.webm`
- `public/onboarding/step-02-search-light.mp4`
- `public/onboarding/step-02-search-light-poster.png`

- `public/onboarding/step-03-detect-light.webm`
- `public/onboarding/step-03-detect-light.mp4`
- `public/onboarding/step-03-detect-light-poster.png`

- `public/onboarding/step-04-research-light.webm`
- `public/onboarding/step-04-research-light.mp4`
- `public/onboarding/step-04-research-light-poster.png`

- `public/onboarding/step-05-add-light.webm`
- `public/onboarding/step-05-add-light.mp4`
- `public/onboarding/step-05-add-light-poster.png`

No video is needed for step 1.

## 6. Final Video-Led Spec

### UX

- skippable
- non-blocking
- reopenable through `Návod`
- persists completed / dismissed state
- calm transitions
- not flashy

### Layout

- much larger than the current onboarding
- media-first layout
- desktop target:
  - width around 1360px to 1480px
  - large left media stage
  - smaller right copy rail
- mobile:
  - stacked layout
  - media first
  - copy second
  - controls still easy to reach

### Media Behavior

- video should be:
  - muted
  - autoplay
  - loop
  - playsInline
- poster images should be present
- videos should be lightweight
- use `.webm` with `.mp4` fallback
- keep them short and clean

### Visual Direction

- light-first presentation
- professional
- editorial
- restrained
- no loud gradients
- no generic SaaS look
- use the existing Demagog palette and UI rhythm

### Interaction

Keep:

- `Preskočiť`
- `Späť`
- `Ďalej`
- `Hotovo`

## 7. Lower-Effort Image-First Version

If the video version feels like too much work right now, do the same structure with images.

This is the recommended lower-effort path.

### Why this is a good fallback

- much faster to produce
- no playback / lazy-load / codec complexity
- no extra media polish work
- easier to keep stable
- still much better than the current synthetic preview cards

### Recommended structure for the image version

Keep the same exact step order:

1. text only
2. search image
3. duplicate detector image
4. research / `Preskúmať` image
5. optional add-to-db image

### Asset Naming For Image Version

Place all assets under:

`public/onboarding/`

Use these exact filenames:

- `public/onboarding/step-02-search-light.png`
- `public/onboarding/step-03-detect-light.png`
- `public/onboarding/step-04-research-light.png`
- `public/onboarding/step-05-add-light.png`

Optional poster-style fallback names are not needed for the image version.

## 8. Image-First Implementation Plan

### Phase 1: Product Decisions

1. Keep light mode as default.
2. Keep the current 4-step recommended flow:
   - basics
   - search
   - detector
   - `Preskúmať`
3. Keep add-to-db optional.

### Phase 2: Asset Production

1. Capture one clean still for each step:
   - search results with auto-filters visible
   - duplicate detector with a duplicate result
   - research panel open
   - add form prefilled
2. Crop consistently.
3. Keep all captures in light mode.
4. Use the same framing style and window scale across all screenshots.

### Phase 3: Step Schema Refactor

Change the onboarding step config so steps can point to real image assets instead of synthetic preview data.

Suggested structure:

```ts
type OnboardingMedia =
  | {
      kind: "text";
    }
  | {
      kind: "image";
      src: string;
      alt: string;
      aspectRatio?: "16 / 10" | "16 / 9";
      caption?: string;
    };
```

Then update each step in `homeOnboardingSteps.tsx` to reference actual assets.

### Phase 4: Onboarding Layout Refactor

In `HomeOnboarding.tsx`:

1. enlarge the dialog
2. replace the current synthetic `PreviewCard` branches with a real media stage
3. render image steps in a polished frame
4. keep the right copy rail clean and readable

Suggested target:

- wider modal than current v1
- large visual panel
- readable text rail
- stable footer with progress and controls

### Phase 5: QA

Check:

- first visit auto-opens
- skip works
- done works
- `Návod` reopens it
- images load correctly
- mobile layout still works
- no dark/light mismatches on default load

## 9. Prompt For Agent: Image-First Version

```text
Refactor the existing homepage onboarding into a larger, image-first onboarding using real captured product screenshots instead of the current synthetic mini-previews.

Repository context:
- Current onboarding lives in:
  - src/components/home/HomeOnboarding.tsx
  - src/components/home/homeOnboardingSteps.tsx
- It is mounted from:
  - src/components/home/HomePageClient.tsx
- Current implementation is a lightweight v1 with text-first synthetic previews.

Goal:
Keep the same onboarding logic and persistence behavior, but upgrade the presentation so it feels like a polished guided product tour without requiring video work yet.

Product direction:
- Assume light mode is the default presentation mode for onboarding.
- Dark mode can stay in the app, but onboarding assets should be light-first.
- This is an analyst tool, so the design should feel calm, spacious, and professional.

Default onboarding flow:
1. Basics (text only)
2. Search (image)
3. Duplicate detector (image)
4. Preskúmať / detail view (image)

Optional step:
5. Add to DB (image)

Use these exact asset filenames under public/onboarding/:
- public/onboarding/step-02-search-light.png
- public/onboarding/step-03-detect-light.png
- public/onboarding/step-04-research-light.png
- public/onboarding/step-05-add-light.png

Implementation requirements:

1. Enlarge the onboarding significantly
- the current modal is too small for a polished media-first layout
- make it wider and give much more space to the visual area
- target a media-first desktop layout with a large left stage and smaller right copy rail

2. Refactor the step schema
- replace or extend the current synthetic preview model
- support:
  - kind: "text" | "image"
  - src
  - alt
  - optional caption
  - optional aspect ratio

3. Keep these step texts

Step 1
Eyebrow: 1. Základ
Title: Dva režimy. Jeden jednoduchý začiatok.
Body:
- Vyhľadávanie je na tému, meno, citát alebo normálnu otázku.
- Detekcia duplicít je na nový konkrétny výrok.
- Nemusíte písať presné kľúčové slová. Search sa správa skoro ako chat a filtre sa často doplnia samy.

Step 2
Eyebrow: 2. Vyhľadávanie
Title: Napíšte otázku tak, ako by ste ju povedali kolegovi.
Body:
- Do vyhľadávania môžete napísať tému, meno, citát alebo celú otázku.
- Systém si z textu často sám doplní filtre.
- Keď nájdete dobrý výsledok, pokračujte cez Preskúmať.

Step 3
Eyebrow: 3. Detekcia duplicít
Title: Sem vložte celý nový výrok.
Body:
- Použite to vtedy, keď už máte konkrétny nový výrok.
- Rýchly je na prvé posúdenie. Prieskum je na širší kontext.
- Výsledok môže byť duplicitný, súvisiaci alebo nový.

Step 4
Eyebrow: 4. Preskúmať
Title: Keď chcete ísť ďalej, otvorte detail.
Body:
- Preskúmať otvorí pracovný pohľad s analýzou, článkami a zdrojmi.
- Tu už nepokračujete len v hľadaní. Tu reálne pracujete s nájdeným výsledkom.

Optional Step 5
Eyebrow: 5. Pridať nový výrok
Title: Keď nič nesedí, pokračujte rovno do databázy.
Body:
- Ak systém nič vhodné nenašiel, môžete hneď pokračovať na Pridať nový výrok.
- Formulár otvorí predvyplnený text, takže nezačínate od nuly.

4. Preserve good existing behavior
- keep skip / next / back / done
- keep localStorage persistence
- keep the reopen button
- keep optional-step support

5. Visual direction
- light, spacious, editorial, professional
- no loud gradients
- no gimmicks
- use a polished screenshot frame
- keep the media area large enough that the screenshots are genuinely readable

6. Mobile
- stack the layout
- image first
- text second
- keep controls usable

Deliverables:
1. Short implementation plan
2. Refactored onboarding step schema
3. Larger image-first onboarding dialog
4. Optional step handling preserved
5. Verification summary

Important:
- do not touch unrelated workspace changes
- optimize for simplicity and clarity
- this is a refinement of the current onboarding, not a complete conceptual rewrite
```

## 10. Summary Recommendation

If time and energy are limited:

1. do the **image-first version now**
2. keep the larger layout
3. keep light mode default
4. add video later without changing the step structure again

That is the best effort-to-value path.
