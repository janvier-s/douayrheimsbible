# Verse Reference Parsing — Design Spec

**Date:** 2026-04-15  
**Status:** Approved

---

## Overview

Parse all verse references in the Study Panel (cross-refs, verse notes, annotation text, annotation notes) and make them interactive:

- **Hover** on a verse-level ref → popover showing the verse text
- **Click** any ref (verse or chapter) → opens `/search?q=<osis>&mode=verse` in a new tab

---

## Scope

The Study Panel has two distinct contexts where refs appear:

| Context | Source | Format |
|---|---|---|
| Cross-references section | `cross_refs[].text` | Old-style ref string, always a reference |
| Verse notes | `verse.notes[].text` | Prose with `<i>` tags wrapping refs |
| Annotation text | `annotation.text` | Prose with `<i>` tags wrapping refs |
| Annotation notes | `annotation.notes[].text` | Prose with `<i>` tags wrapping refs |

The book intro tab (AnnotationProse with AnnotatedText) is included since it shares the same components.

---

## Parsing Strategy

### Cross-ref strings — custom tokenizer (Approach B)

Cross-ref text uses old Douay-Rheims / Latin abbreviations and period-based separators, e.g.:

```
Luc. 10, 16. Act. 15, 28. 2. Thess. 2. S. Aug. l. 11. de Gen. ad lit c. 4.
```

The same string mixes Bible refs and patristic citations. The existing `bible-passage-reference-parser` cannot handle this format.

**Algorithm (left-to-right tokenizer):**

1. Walk the string character by character
2. At each position, try to match a known Bible book abbreviation (optionally preceded by a digit + period for numbered books: `2. Thess.`, `1. Cor.`)
3. **Disambiguation:** after the abbreviation, skip whitespace — if the next character is a digit or `v.`, it is a Bible ref; otherwise advance past the abbreviation as plain text (patristic citation context)
4. If confirmed Bible ref, consume the chapter/verse using old-style rules:
   - `10, 16` → chapter 10, verse 16 (comma = chapter:verse separator)
   - `1. v. 3.` → chapter 1, verse 3 (`v.` = explicit verse marker)
   - `& 14` → same chapter, additional verse 14
   - `18. v. 20` → chapter 18, verse 20 (new chapter within same book)
   - A new book abbreviation terminates the current ref
5. Output: `CrossRefToken[]` — either `{ type: 'ref', osis, display }` or `{ type: 'text', content }`
6. Everything not consumed by step 4 falls through as a `TextToken`

**Book abbreviation table:** a comprehensive static map of all old-style abbreviations → OSIS codes directly (no intermediate modern English name), e.g. `Luc.` → `Luke`, `Joan.` → `John`, `Joa.` → `John`, `Act.` → `Acts`, `Apoc.` → `Rev`, `Paral.` → `Chr`, `Cant.` → `Song`. Covers all 73 books including deuterocanonical books. Defined alongside `OSIS_TO_SLUG` in `crossRefParser.ts`.

### `<i>` tags in prose — grouped parse

For notes and annotation text, verse refs are wrapped in `<i>` tags in the source JSON, e.g.:

```html
See <i>Act. 13, 14. Levit. 23.</i> for examples.
```

A utility `parseItalicRef(text: string): OsisRange[] | null` lightly preprocesses the italic content (normalize book abbreviation, convert `, ` → `:`) and passes to the existing `parseAllReferences()`. Returns `null` if no valid refs are found.

**Multiple refs in one `<i>` span are kept grouped** — the whole span becomes one interactive element. The popover shows all matched verses stacked. The click URL encodes all OSIS refs: `/search?q=Acts.13.14,Lev.23&mode=verse`.

---

## Rendering

### Cross-ref section → `CrossRefText.svelte`

Replaces the current `<span class="cr-text">{@html allcapsToSmallcaps(cr.text)}</span>` in StudyPanel.

- Takes `text: string`
- Tokenizes on mount
- Renders inline: `TextToken` → `<span>`, `RefToken` → `<a class="verse-ref" data-osis="…">`
- Manages its own hover popover (VerseTooltip) and click handler
- Patristic text tokens render as plain unstyled spans — visually identical to current output

### Prose `<i>` tags → preprocessing in `linkifyItalicRefs()`

Applied inside `AnnotationProse.renderParagraphs()` after `<mn>` marker replacement:

```
<i>Act. 13, 14. Levit. 23.</i>
→ <a class="verse-ref" data-osis="Acts.13.14,Lev.23"><i>Act. 13, 14. Levit. 23.</i></a>
```

- Original italic text is preserved visually (keeps `<i>` tags inside the `<a>`)
- `<i>` spans that don't parse as valid refs are left entirely untouched
- Event delegation on `.annotation-prose` handles hover/click for `.verse-ref` elements — shares the existing dismiss timer

---

## Popover — adapted `VerseTooltip.svelte`

Currently exists but is unused. Adapted to:

- Accept `osisRanges: OsisRange[]`
- On show: call `loadBook(slug, fetch)` for each unique book in the ranges (client-side; already cached after first access)
- Map OSIS book code → URL slug via `OSIS_TO_SLUG` in `crossRefParser.ts`
- Extract verse text, strip study markers via `stripTags()`
- Display: verse reference label + text for each verse, stacked
- Show a subtle loading shimmer if fetch takes >150ms (rare for cached books)
- Chapter-only refs (no verse number): no popover — just clickable

---

## Click Behavior

```
/search?q={encodeURIComponent(osis)}&mode=verse
```

Opens in a new tab (`target="_blank" rel="noopener"`). The search page already handles OSIS input via `parseAllReferences()` — single or multi-ref.

---

## New Files

| File | Purpose |
|---|---|
| `src/lib/search/crossRefParser.ts` | Tokenizer, `OSIS_TO_SLUG` map, `parseItalicRef()` |
| `src/lib/components/CrossRefText.svelte` | Cross-ref token renderer with popover |

## Modified Files

| File | Change |
|---|---|
| `src/lib/components/VerseTooltip.svelte` | Adapt to accept `OsisRange[]`, fetch verse text, show loading state |
| `src/lib/components/StudyPanel.svelte` | Replace `cr-text` span with `<CrossRefText>` |
| `src/lib/components/AnnotationProse.svelte` | Add `linkifyItalicRefs()` call in `renderParagraphs()`; add verse-ref event delegation |
| `src/lib/data/types.ts` | Already done: `title?` and `part?` made optional on `AnnotationEntry` |

---

## Out of Scope

- Summary text and summary notes (lower priority, can be added later with same approach)
- Patristic citations — intentionally left as plain text
- Modifying the data pipeline to fix missing `title` fields at the source (data quality issue tracked separately)
