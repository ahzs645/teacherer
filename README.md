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
  did in the workbook. Switch from the header; add, rename, duplicate or delete on
  *Reports & Export*.
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
  a column down, or paste a column straight out of your gradebook.
- **Reports & Export** — every student's comment on one page; copy individually or all at
  once, print, or download as **.xlsx** (comments + ratings + bank, for every class) or .csv.
- **Import** — a class roster from any .xlsx/.csv with a `Name` column, **the ratings sheet
  this app exports** (so marks round-trip), a comment bank, or a whole-app JSON backup.

## Keyboard

Press <kbd>?</kbd> anywhere for the full list, or the <kbd>?</kbd> button in the header for a
plain-language guide to what every option does. The essentials:

| Keys | What |
|---|---|
| <kbd>g</kbd> then <kbd>s</kbd> / <kbd>g</kbd> / <kbd>b</kbd> / <kbd>r</kbd> | Students · Grid · Comment Bank · Reports |
| <kbd>Ctrl/⌘</kbd> + <kbd>1…4</kbd> | the same four tabs |
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

Bare letters only fire when you are not typing in a field.

## Local-first & offline

Everything is stored in your browser's `localStorage` — no server, no account, and student
data never leaves your device. The app is a PWA: after the first visit it works fully
offline and can be installed from the browser's "Install app" prompt.

> Because data lives in the browser, clearing site data erases it — use
> **Reports & Export → Download backup (.json)** for a safety copy.

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
are seeded — add them from the Comment Bank tab if you fill them in.
