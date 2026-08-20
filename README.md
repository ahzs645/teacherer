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
| `[Student]` | student's first name |
| `[He/She/They]` / `[he/she/they]` | subject pronoun (capitalised / lowercase) |
| `[His/Her/Their]` / `[his/her/their]` | possessive pronoun (lowercase, as in the original sheet) |
| `[Him/Her/Them]` / `[him/her/them]` | object pronoun |

## Running locally

It's a plain static site — no build step. Either open `index.html` directly, or serve the
folder (service worker/offline support needs http):

```sh
python3 -m http.server 8080
# → http://localhost:8080
```

## Deployment (GitHub Actions → GitHub Pages)

`.github/workflows/deploy.yml` publishes the site to GitHub Pages on every push to `main`
(or manually via *Run workflow*). One-time setup: in the repo's **Settings → Pages**, set
**Source** to **GitHub Actions**. The app then lives at
`https://<user>.github.io/teacherer/`.

## Tech notes

- Vanilla HTML/CSS/JS, no framework, no build step.
- [SheetJS](https://sheetjs.com) (`vendor/xlsx.full.min.js`) vendored for .xlsx import/export,
  so the app works offline.
- `sw.js` precaches all assets; bump `CACHE_VERSION` when shipping changes to precached files.
- The default comment bank lives in `seed-data.js`, extracted from the original template.
