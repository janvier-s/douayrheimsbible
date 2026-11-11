# Handoff: inline clarifications (2026-11-11)

Continues `handoff-2026-11-11-sancta-integration.md` (step 4). Read that file first for context, gotchas and preferences. Follow CLAUDE.md (Svelte 5 runes in components, Svelte 4 stores for shared state).

## Goal

Show Sancta Clara Press "clarifications" inline in the reader: a term in the verse text gets a faint underline, and tapping it opens a popover with the Latin and an English gloss. The user calls this "gold". Users can turn it on or off (Sancta puts it under settings "Clarifications").

## Source data

`../sancta-scrape/data/*/*.json` -> `verses[].clarifications = [{term, latin, gloss}]`, 9,163 entries in total. Licence CC BY 4.0, so it needs credit (see step 7 of the main handoff). Do not train models on it.

## Work

1. **Anchor**: `term` is taken from Sancta's text, but our verse text is modernized and may differ. For each clarification, find `term` in the verse of `static/data/odr/<book>.json` (case-insensitive, whole words, tolerant of our `<cr>`, `<sc>`, `<na>` tags and bracket markers). If no match, try the original-spelling text, then fuzzy-match on the first or last word. Record anything that cannot be anchored in `analysis/clarifications-unanchored.csv` for the user.
2. **Ship as data**: write one file per book, e.g. `static/data/odr-clarifications/<book>.json`, as `{chapter: {verse: [{term, latin, gloss, occurrence}]}}` where `occurrence` is the index of the match when the term appears more than once. Add a script in `scripts/` (or a tool under `../sancta-scrape/tools/`). Match the minified or 2-space format convention of neighbouring data. `static/data/` is prettier-ignored.
3. **Original spelling**: the same clarifications must also anchor into `static/data/odr-original/` once the spelling toggle exists (step 3 of the main handoff). Keep `term` per spelling or anchor at runtime.
4. **UI**: a faint dotted underline on the anchored term and a popover with term, Latin (italic) and gloss. Add a user toggle in the prefs store (`src/lib/stores/prefs`, a Svelte 4 writable) and expose it in the settings UI. Default is off. The underline must work on touch, be keyboard reachable, and not break the existing `<cr>` and `<na>` note markers or lemma links.
5. **Verify**: anchored-count report (target: nearly all 9,163), `npm run check`, and a Playwright screenshot of a verse with a clarification.

## Decisions (settled by the user)

- The toggle is OFF by default.
- Clarifications that cannot be anchored are NOT shown as verse notes. Drop them from the shipped data and list them only in `analysis/clarifications-unanchored.csv`.

## Prose rules

No em dashes in user-facing copy. Do not rename translation pills.
