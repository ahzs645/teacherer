# Teacherer

A **local-first, installable (PWA) report-card comment generator** for teachers — a web-app
replacement for the `RPcomment_tool` spreadsheet.

The spreadsheet worked like this: a bank of pre-written comments per category
(Content Knowledge, Reasoning & Analyzing, Understanding & Solving, Communicating,
Engagement, Seeking Support, Using Class Time…), each with levels 1–4; a roster of
students with pronouns; `VLOOKUP`s that turned each student's level into comment text;
and a `CONCAT` + `SUBSTITUTE` formula that stitched the selected comments together and
swapped `[Student]`, `[He/She/They]`, `[His/Her/Their]` for the student's details.

Teacherer does the same thing, without the broken `#REF!` links:

- **Comment Bank** — the template's comments ship built in; edit any text, add/remove/reorder
  categories, and tick which categories make up the final comment.
- **Students** — roster with pronoun presets (she/he/they, or custom), a level picker per
  category, an optional per-student note, and a live preview of the generated comment.
- **Reports & Export** — every student's comment on one page; copy individually or all at
  once, print, or download as **.xlsx** (comments + ratings matrix + comment bank) or .csv.
- **Import** — bring in a class roster from any .xlsx/.csv with a `Name` column
  (optional `Pronouns` column), and back up / restore the whole app as JSON.

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

## Running locally

```sh
npm install
npm run dev       # dev server with HMR
npm run build     # type-check + production build into dist/
npm run preview   # serve the production build (needed to test the PWA/offline)
```

## Deployment (GitHub Actions → GitHub Pages)

`.github/workflows/deploy.yml` lints, builds, and publishes `dist/` to GitHub Pages on every
push to `main` (or manually via *Run workflow*). One-time setup: in the repo's
**Settings → Pages**, set **Source** to **GitHub Actions**. The app then lives at
`https://<user>.github.io/teacherer/`.

## Tech notes

- React 19 + TypeScript (strict) + Vite 8; state is a single typed `AppState` in
  `localStorage` (same key/shape as the original vanilla version, so existing data carries over).
- [SheetJS](https://sheetjs.com) (installed from the SheetJS CDN tarball, npm's `xlsx` is
  outdated) handles .xlsx/.csv import/export; it's lazy-loaded so the app shell stays small,
  and the service worker precaches the chunk so exports work offline.
- `vite-plugin-pwa` generates the manifest + Workbox service worker (`autoUpdate`); the whole
  app is precached for offline use.
- The default comment bank lives in `src/seedData.ts`, extracted from the original template;
  comment assembly is in `src/lib/generate.ts`.
