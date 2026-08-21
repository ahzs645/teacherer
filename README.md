# Teacherer

A **local-first, installable (PWA) report-card comment generator** for teachers — a web-app
replacement for the `RPcomment_tool` spreadsheet.

The spreadsheet worked like this: a bank of pre-written comments per category
(Content Knowledge, Reasoning & Analyzing, Understanding & Solving, Communicating,
Engagement, Seeking Support, Using Class Time…), each with levels 1–4; a roster of
students with pronouns; `VLOOKUP`s that turned each student's level into comment text;
and a `CONCAT` + `SUBSTITUTE` formula that stitched the selected comments together and
swapped `[Student]`, `[He/She/They]`, `[His/Her/Their]` for the student's details.

Teacherer does the same thing, without the 247 `#N/A`s and the link to a file on someone's
`F:` drive.

## What's in it

- **Classes** — each class keeps its own roster *and* its own comment bank, the way each tab
  did in the workbook. Switch from the top bar; add, rename, duplicate or delete on
  *Classes & data*.
- **Comment Bank** — the template's comments ship built in. Every level holds a **pool of
  interchangeable phrasings**: the first is the default, the rest are alternates you can pick
  per student. Add, remove, promote and edit them; group categories by competency; mark a
  category **multi-pick** so a student can carry more than one of its comments. Export the
  bank as .xlsx or .json and hand it to a colleague, or import theirs.
- **Students** — roster with search and A–Z sort, pronoun presets (she/he/they, or custom),
  a level picker per category, an optional per-student note, and a live preview with a
  character count.
- **Order** — the Comment Bank's top-to-bottom order is the class default; any single student
  can have their sentences stitched in a different order, the way you could rewrite one row's
  `CONCAT` in the spreadsheet. It travels in the exported `Comment order` column.
- **Grid** — every student down the side, every category across the top. Type a digit, fill
  a column down, or paste a column straight out of your gradebook. On a touch screen a tap
  opens a picker instead, with arrows to carry on down the same column.
- **Reports** — every student's comment on one page, with a written/missing filter and a
  count of how far through the class you are; copy individually or all at once, print, or
  download as **.xlsx** (comments + ratings + bank, for every class) or .csv.
- **Classes & data** — the class list, imports, and backup. Import a roster from any
  .xlsx/.csv with a `Name` column, **the ratings sheet this app exports** (so marks
  round-trip), or a whole-app JSON backup.
- **Light, dark and system** — the switch in the top bar. *System* follows the device and
  changes with it, and is the default; light and dark pin the palette for this browser.
  <kbd>t</kbd> flips between them from anywhere.

## Keyboard

Press <kbd>?</kbd> anywhere for the full list, or the <kbd>?</kbd> button in the top bar for a
plain-language guide to what every option does. The essentials:

| Keys | What |
|---|---|
| <kbd>g</kbd> then <kbd>s</kbd> / <kbd>g</kbd> / <kbd>b</kbd> / <kbd>r</kbd> / <kbd>d</kbd> | Students · Grid · Comment bank · Reports · Classes & data |
| <kbd>Ctrl/⌘</kbd> + <kbd>1…5</kbd> | the same five sections |
| <kbd>t</kbd> | flip between light and dark |
| <kbd>/</kbd> | search the roster |
| <kbd>Alt</kbd> + <kbd>↑</kbd>/<kbd>↓</kbd> | previous / next student |
| <kbd>n</kbd> | add a student |
| <kbd>1</kbd>–<kbd>4</kbd> | set the level on the focused rating |
| <kbd>0</kbd> / <kbd>Backspace</kbd> | clear it |
| <kbd>a</kbd> | next phrasing for that level |
| <kbd>Ctrl/⌘</kbd> + <kbd>D</kbd> | (grid) copy the cell above |
| <kbd>Ctrl/⌘</kbd> + <kbd>⇧</kbd> + <kbd>D</kbd> | (grid) fill the value down the column |
| <kbd>Ctrl/⌘</kbd> + <kbd>↑</kbd>/<kbd>↓</kbd> | move a sentence in the Order list |
| <kbd>Ctrl/⌘</kbd> + <kbd>⇧</kbd> + <kbd>C</kbd> | copy the current student's comment |

Bare letters only fire when you are not typing in a field. Shortcut hints are hidden on
touch devices, where there is no keyboard to press them on; the Help dialog still lists them.

## On a phone

The same five sections, reachable from a bottom tab bar inside the thumb arc. What differs:

- The **grid** keeps its category headings pinned while it scrolls, narrows the name column so
  three or four categories fit, and fades its right edge while there is more to swipe to.
  Tapping a cell opens the level picker as a bottom sheet, with the wording it will produce.
- The **student editor** puts the generated comment *above* the ratings rather than beside
  them, so the thing you are writing is never a screen and a half away.
- The top bar drops to one line of essentials: the class, a save dot, one theme button that
  cycles light → system → dark, and Help.

## Local-first & offline

Everything is stored in your browser's `localStorage` — no server, no account, and student
data never leaves your device. The app is a PWA: after the first visit it works fully
offline and can be installed from the browser's "Install app" prompt.

> Because data lives in the browser, clearing site data erases it — use
> **Classes & data → Download backup (.json)** for a safety copy.

## Placeholders

Use these anywhere in comment bank text or personal notes:

| Placeholder | Becomes |
|---|---|
| `[Student]` | student's name |
| `[He/She/They]` / `[he/she/they]` | subject pronoun (capitalised / lowercase) |
| `[His/Her/Their]` / `[his/her/their]` | possessive pronoun (lowercase, as in the original sheet) |
| `[Him/Her/Them]` / `[him/her/them]` | object pronoun |

## Rating codes

A rating is stored — and written into the Ratings sheet — as a short code, so it survives a
round trip through Excel without being read as a number:

| Code | Means |
|---|---|
| `3` | level 3, default phrasing |
| `3b` | level 3, second phrasing in that level's pool (`3c` for the third…) |
| `1,4` | levels 1 and 4, on a multi-pick category |
| *(blank)* | category skipped for this student |

## Running locally

```sh
npm install
npm run dev       # dev server with HMR
npm run build     # type-check + production build into dist/
npm run preview   # serve the production build (needed to test the PWA/offline)
npm run lint
```

## Deployment (GitHub Actions → GitHub Pages)

`.github/workflows/deploy.yml` lints, builds, and publishes `dist/` to GitHub Pages on every
push to `main` (or manually via *Run workflow*). One-time setup: in the repo's
**Settings → Pages**, set **Source** to **GitHub Actions**. The app then lives at
`https://<user>.github.io/teacherer/`.

## Design system

The UI is built from a small set of primitives over a two-layer token system. No CSS
framework and no runtime CSS-in-JS — the whole stylesheet is ~9 kB gzipped.

```
src/styles/
  tokens.css    primitives (colour ramps, spacing, type, radii, motion)
                + semantic tokens (--bg, --surface, --fg, --brand …) per theme
  base.css      reset, document defaults, native form controls, one focus ring
  ui.css        the visual half of src/components/ui/*
  layout.css    the app shell: rail, top bar, content column, mobile tab bar
  panels.css    the five screens
  print.css     comments only, forced to the light palette
src/components/ui/
  Button  Card  Field/Checkbox  Badge/LevelChip  SegmentedControl
  Toolbar  Disclosure  EmptyState  Modal  Icon
```

Breakpoints, and what each one is for:

| Width | What changes |
|---|---|
| ≥ 1400px | roster + ratings + comment, all three at full width |
| ≥ 1200px | the same three columns, roster and comment narrower |
| ≤ 1080px | the sidebar drops to an icon rail |
| ≤ 900px | one pane at a time — roster *or* student; the comment goes above the ratings |
| ≤ 720px | sidebar out, bottom tab bar in; the grid re-tunes its column widths |
| ≤ 620px | single-column rating and bank grids; dialogs become bottom sheets |

`(hover: none) and (pointer: coarse)` is a separate axis from width: it hides keyboard-only
hints (`.section--keys`), enlarges hit targets, and switches the grid from type-a-digit to
tap-and-pick. Anything gated on it needs a visible on-screen equivalent — a phone user must
never be told to press a key. Width belongs in CSS; where the *markup* has to differ,
`src/hooks/useMediaQuery.ts` exposes the same queries to components.

Note the specificity floor: `base.css` styles native controls as `input[type='text']` (0-1-1),
so a bare class like `.bank-cat__name` (0-1-0) cannot override their border or background —
qualify it (`input.bank-cat__name`) or it silently loses.

**Primitives are raw values and never change between themes; semantic tokens name a role and
are the only thing a theme re-points.** Adding a theme therefore means re-declaring one block
in `tokens.css`, not touching a component rule.

Theming lives in `src/lib/theme.ts` and `src/hooks/useTheme.ts`. `system` clears
`data-theme` so the `prefers-color-scheme` block in `tokens.css` is the single definition of
what "system" means; `light`/`dark` set the attribute and win over it. An inline script in
`index.html` paints the stored choice before first paint, so a dark-mode user never gets a
white flash — it mirrors the storage key and the two `theme-color` values, so keep the three
in step.

Every foreground/background pair in both themes meets WCAG AA (4.5:1 for text, 3:1 for
secondary labels). `Icon` is a hand-rolled 24×24 stroked set rather than an icon dependency.

## Tech notes

- React 19 + TypeScript (strict) + Vite 8; state is a single typed `AppState` in
  `localStorage`. v1 payloads (one flat roster + bank) are migrated on load into a single
  class, so existing data carries over.
- [SheetJS](https://sheetjs.com) (installed from the SheetJS CDN tarball, npm's `xlsx` is
  outdated) handles .xlsx/.csv import/export; it's lazy-loaded so the app shell stays small,
  and the service worker precaches the chunk so exports work offline. Sheets are read with
  `raw: true` — without it SheetJS reads the rating `1,4` as the number 14.
- `vite-plugin-pwa` generates the manifest + Workbox service worker (`autoUpdate`); the whole
  app is precached for offline use.
- The default comment bank lives in `src/seedData.ts`, extracted from the original template;
  comment assembly is in `src/lib/generate.ts` and rating codes in `src/lib/ratings.ts`.

### Not carried over from the template

The workbook has empty scaffolding for `US3`, `US4`, `COMM4` and `CR1`–`CR4`, and rates
`RA1`–`RA3` against comment tables that live in a different file
(`Competency_comment_generator_2023.xlsx`). None of those have text in the template, so none
are seeded — add them from the Comment bank tab if you fill them in.
