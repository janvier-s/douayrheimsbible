# Handoff: "Facsimile" tab in the study panel

## Goal

Add a new tab to the ODR study panel (`/odr/[book]/[chapter]?mode=study`) that gives a link to the 1582/1609 facsimile pages for the current chapter.

## Context (read first)

- `plans/handoff-2026-11-11-sancta-integration.md` = the larger project (another session is working through it; do not redo its items, especially the Challoner page, toggle, clarifications). This task is independent; avoid editing the same lines it touches.
- Tabs live in `src/lib/components/StudyPanel.svelte`, `StudyTabBar.svelte`, `studyPanelUtils.ts` (`buildVisibleTabs`, `tabLabel`, `studyTabId`) and the `StudyTab` type in `src/lib/stores/studyPanel.ts`; the active tab is also persisted in `prefs.studyDefaultTab` and the `?tab=` URL param, so a new tab id must be added everywhere those enumerate tabs (types, prefs migration/validation, URL parsing, tests under `tests/`).
- Facsimile source: Sancta Clara Press shows scans of the 1582/1609 printings per chapter, up to 24 pages. A copy is on this machine at `~/facsimiles/sancta/<book>/<chapter>/<n>.jpg` (4,832 images, 7GB, outside iCloud and outside the repo; 2 missing on Sancta's side: `isaias/37/2.jpg`, `psalms/38/2.jpg`). `~/facsimiles/sancta/manifest.json` has `chapters["<sancta-book>/<ch>"] = ["<book>/<ch>/<n>.jpg", ...]` for all 1,359 chapters (1 to 24 pages each).
- Sancta book slugs differ from this repo for 3 books: `isaias`/`jeremias`/`malachias` (Sancta) = `isaie`/`jeremie`/`malachie` (here). Prayer of Manasses has no Sancta data.
- Sancta's chapter pages: `https://sanctaclarapress.com/read/<book>/<chapter>`, with a "View facsimile (N pages)" button; their docs link single facsimile pages as `?fac=<n>` (verify what that param does before relying on it).

## Next steps

1. Read the tab plumbing above and add a "Facsimile" tab, shown only when the chapter has facsimile data (use the manifest to generate a small committed lookup, e.g. `static/data/facsimile/pages.json` = chapter -> page count; do NOT commit the images).
2. Tab content for now = link(s) to Sancta's facsimile for that chapter (`https://sanctaclarapress.com/read/<sancta-book>/<chapter>`, opens in a new tab with `rel="noopener noreferrer"`), page count, and credit "Facsimile scans courtesy of Sancta Clara Press (sanctaclarapress.com)". Do not hotlink their image storage.
3. Svelte 5 runes per CLAUDE.md; follow existing tab style; check with the Svelte MCP autofixer; run `npm run check` (51 baseline `tsc` errors about browser globals are pre-existing, only new ones matter), `npx prettier --write` on touched files, add/adjust a unit test for the tab list if tests exist.
4. Verify in the browser (dev server) on a chapter with facsimiles and one without (Prayer of Manasses).

## Open decisions (ask the user before doing; do not decide silently)

- Self-host the images (7GB; they use Cloudflare, e.g. R2 + an in-panel viewer) vs. link to Sancta only. Default for this task = link only.
- Credit text goes on `https://thedouayrheims.com/about` (user places it): "The Original Douay-Rheims, a modern edition by Sancta Clara Press (sanctaclarapress.com), used under CC BY 4.0."

## Gotchas

- Repo path has spaces and is iCloud; check for stale conflict copies (`"x 2.ts"`). Many files are already modified/uncommitted on `main` by the other work; do not commit, revert, or reformat unrelated files; only commit if the user asks.
- vitest fails locally (known); rely on `npm run check`, lint, and the browser.
