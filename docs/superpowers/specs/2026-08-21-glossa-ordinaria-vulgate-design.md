# Glossa Ordinaria in the Vulgate study panel

**Date:** 2026-08-21
**Status:** approved, ready for planning

## Goal

Give the Vulgate reader a study panel. Today `buildVisibleTabs` returns an empty
array for `vul` (`StudyPanel.svelte:167`), so study mode opens on nothing. This
adds a single **Glossa** tab carrying the Latin text of the Glossa Ordinaria,
anchored verse by verse.

The commentary stays in Latin. No translation, no English apparatus.

## Source

`~/Development/for-the-kingdom/commentary/sources/glossa_ordinaria`

73 book directories with French names (`01_genese`, `23_psaumes`), each holding
`chapitre_N.json`, plus a `parse_stats.json` at the root. Every chapter file has
five keys: `book`, `book_code`, `chapter`, `verses`, `commentaries`.

Only `commentaries` is consumed. Each entry:

```json
{ "author": "BEDA", "text": "In principio creavit, etc. Non dicit…", "verse_ref": "1:1" }
```

Measurements taken against the current source:

| Fact | Value |
|---|---|
| Commentary entries | 14,486 |
| Latin text | ~4.96 M characters |
| `verse_ref` well-formed as `chapter:verse` | 14,486 / 14,486 |
| `verse_ref` resolving to a real verse in `static/data/vul/` | 14,486 / 14,486 |
| Entries with no author | 10,896 (75.2%) |
| Distinct author sigla | 20 |
| Books carrying at least one gloss | 55 |
| Books with zero glosses | 18 |

The source is plain text throughout. No HTML, no newlines, no tabs, no markup
characters. It needs no sanitising.

### Verse numbering

The source and `static/data/vul/` share Clementine numbering. This was verified
by normalising both sides and comparing verse text: Genesis 1525/1530, John
879/879, Matthew 1069/1070, Apocalypse 404/405, Psalms 2501/2527. The residual
misses are spelling variants (`josophat` against `josaphat`, `exultat` against
`exsultat`), not misalignment.

Two books look divergent at first and are not:

- **Canticle of Canticles.** The source stores speaker rubrics (`Sponsa`,
  `Chorus Adolescentularum`) as the text of certain verse slots. Verse count and
  numbering match; only the stored text differs.
- **Psalm 118.** The source stores `Alleluja. Aleph` where the Vulgate has
  `Alleluja. Beati immaculati…`. Both have 176 verses, and verses 2 onward align
  exactly.

Because every `verse_ref` resolves, no offset table is needed anywhere.

### Coverage gap

These 18 books have zero commentary in the source: Lamentations, Baruch,
Ezechiel, Daniel, Osee, Joel, Amos, Abdias, Jonas, Micheas, Nahum, Habacuc,
Sophonias, Aggeus, Zacharias, Malachie, 1 Machabees, 2 Machabees.

Their directories exist and are mapped. They simply produce no output.

## Decisions

1. **Verse-anchored sections.** The panel groups glosses under `Verse N`
   headings, matching the Haydock commentary tab. This reuses the existing
   scroll-sync, IntersectionObserver and verse-underline machinery unchanged.
2. **Latin attributions, anonymous labelled.** Sigla expand to Latin names
   (`AUG` to `Augustinus`). The 75% with no author print the byline `Glossa`, so
   every entry carries a source line.
3. **Tab always visible.** The Glossa tab shows on every Vulgate chapter. Where
   there is nothing, the tab renders an empty state. Ezechiel and the other 17
   empty books show the tab with that state rather than losing it.
4. **Lemma promoted to a heading.** Each gloss opens with a catchword lifted
   from the verse (`Abortivo.`, `Quod si Christus non, etc.`). Where that
   catchword can be verified against the verse text, it becomes a small-caps
   heading above the gloss body.

## Build stage

Added to `scripts/prepare-data.ts`, run by the existing `prebuild` hook.

### Source resolution

`GLOSSA_SOURCE` resolves in order:

1. the `GLOSSA_SOURCE` environment variable
2. `join(PROJECT_ROOT, '..', 'SCRIPTURA', 'sources', 'GLOSSA', 'glossa_ordinaria')`
3. `~/Development/for-the-kingdom/commentary/sources/glossa_ordinaria`

If none exists, the stage logs and skips, exactly as the ODR book copy does at
`prepare-data.ts:152`. Generated JSON is committed, so Cloudflare builds succeed
without any source tree present.

Moving the source under `SCRIPTURA/sources/GLOSSA/` would match every other
translation source in the project. The third fallback means that move is
optional, not blocking.

### Book mapping

A hardcoded table maps all 73 directories to project slugs. The ones that are
not mechanical:

| Directory | Slug |
|---|---|
| `09_1_samuel` | `1-kings` |
| `10_2_samuel` | `2-kings` |
| `11_1_rois` | `3-kings` |
| `12_2_rois` | `4-kings` |
| `13_1_chroniques` | `1-paralipomenon` |
| `14_2_chroniques` | `2-paralipomenon` |
| `15_esdras` | `1-esdras` |
| `16_nehemie` | `2-esdras` |
| `17_tobie` | `tobias` |
| `20_1_maccabees` | `1-machabees` |
| `21_2_maccabees` | `2-machabees` |
| `26_cantique_des_cantiques` | `canticle-of-canticles` |
| `28_siracide` | `ecclesiasticus` |
| `40_michee` | `micheas` |
| `43_sophonie` | `sophonias` |
| `44_aggee` | `aggeus` |
| `45_zacharie` | `zacharias` |

`36_joël` carries a diacritic in its directory name and must be written as such
in the table.

The build asserts three things and fails on any of them:

- every directory on disk appears in the table (`parse_stats.json` excepted)
- every table entry exists on disk
- every mapped slug exists in `books.ts`

This means a source update that adds Ezechiel breaks the build instead of
silently dropping the book.

### Author sigla

The source uses both short and long forms for the same Father. The table
collapses them:

| Sigla | Latin name | Entries |
|---|---|---|
| `AUG`, `AUGUSTINUS` | Augustinus | 1,971 |
| `BEDA` | Beda | 557 |
| `GREG`, `GREGORIUS` | Gregorius | 340 |
| `ISID`, `ISIDORUS` | Isidorus | 256 |
| `HIERON`, `HIERONYMUS` | Hieronymus | 221 |
| `STRAB` | Strabus | 78 |
| `AMBR`, `AMBROSIUS` | Ambrosius | 80 |
| `LEO` | Leo | 61 |
| `ALCUIN` | Alcuinus | 8 |
| `ORIGENES` | Origenes | 8 |
| `ANSELM` | Anselmus | 4 |
| `CHRYSOSTOMUS` | Chrysostomus | 2 |
| `CYPR` | Cyprianus | 2 |
| `RABANUS` | Rabanus | 1 |
| `CASSIODORUS` | Cassiodorus | 1 |

An unrecognised siglum fails the build rather than leaking a raw abbreviation
into the page.

### Lemma extraction

For each entry:

1. Match the leading segment up to the first `.` or `, etc.`, between 2 and 80
   characters.
2. Normalise both the candidate and the verse text from
   `static/data/vul/<slug>.json`: lowercase, strip diacritics, fold `æ`/`œ` to
   `ae`/`oe`, reduce punctuation to spaces, then fold `j` to `i` and `v` to
   `u` (Latin treats each pair as one letter, and the Clementine text mixes
   both forms).
3. Keep the lemma only if the normalised candidate is a substring of the
   normalised verse and longer than two characters.

Verified, the lemma moves to its own field and is stripped from the body.
Unverified, the entry text stays whole and no lemma is emitted. Nothing is ever
split on a guess.

This yields 11,859 lemmas, 81.9%. The stage prints the rate so a regression is
visible in build output. The 18.1% that fail are entries opening with a work
citation (`lib. IX Moral., cap. 7`), entries with no terminator at all, and
glosses attached to the Canticle and Psalm 118 rubric slots.

### Output

`static/data/glossa/<slug>/<chapter>.json`, an array in verse order with source
order preserved inside each verse:

```json
[
  {
    "verse": 8,
    "lemma": "Abortivo.",
    "text": "Abortivus dicitur quia extra tempus legitimum natus…",
    "author": "Augustinus"
  },
  { "verse": 8, "text": "Vel similis abortivo, quia sum minimus…" }
]
```

`lemma` is omitted when unverified. `author` is omitted when anonymous, and the
UI supplies `Glossa` at render time rather than baking it into the data.

Simulated output: **1,124 files, 5.26 MB**, against the 11 MB
`static/data/haydock-commentary` already committed.

### Manifest

`'glossa'` joins the `sections` array in `buildSidecarManifest`
(`prepare-data.ts:515-524`), so `hasSidecar('glossa', slug, chapter)` gates
fetches and empty chapters never 404.

## Loader

`src/lib/data/loader.ts` gains a type and a function mirroring
`loadHaydockCommentary` (lines 190-211):

```ts
export interface GlossaEntry {
	verse: number;
	lemma?: string;
	text: string;
	author?: string;
}

export function loadGlossa(
	slug: string,
	chapter: number,
	fetch: typeof globalThis.fetch
): Promise<GlossaEntry[] | null>;
```

Same shape as its sibling: a module-level `Map` cache keyed `slug/chapter`, a
`hasSidecar` short circuit resolving to `null`, and eviction on failure so a
transient error retries.

## Store

`'glossa'` joins the `StudyTab` union in `src/lib/stores/studyPanel.ts:4`. No
other store change. `activeVerse`, `annotatedVerse`, `panelScrollVerse` and
`scrollTrigger` all work as they stand.

## Study panel

`src/lib/components/StudyPanel.svelte`:

- `buildVisibleTabs` returns `[{ id: 'glossa', label: 'Glossa' }]` for `vul`,
  unconditionally, replacing the `return []` fallthrough.
- A load block matching the `haydockCommentary` trio: `glossa`, `glossaLoading`,
  `lastGlossaKey`, keyed on slug and chapter, discarding responses whose key no
  longer matches the current chapter.
- Entries group by verse into the existing `Verse N` section markup, so the
  IntersectionObserver and scroll-sync need no new code.
- The lemma renders as a heading in small caps, not literal uppercase. It reuses
  the existing `.sc` class (`app.css:539`, `font-variant: small-caps`) applied
  directly to the heading element. The `allcapsToSmallcaps` helper is deliberately
  not used: it converts ALL-CAPS runs already present in source HTML, and a
  mixed-case lemma such as `Abortivo.` would pass through it unchanged.
- The byline reads the expanded Latin name, or `Glossa` when `author` is absent.
- Empty state, shown whenever the chapter has no entries: `Nulla glossa.`

Panel body text uses the same Latin serif stack the Vulgate reader body uses, so
the gloss and the text it explains are set in one face.

## Reader

`src/lib/components/VerseList.svelte` is the only reader change. The unified
`annotatedVerseSet` (lines 167-191) gains a `vul` branch fed by the same glossa
entries, loaded the way `haydockCommentary` is loaded at lines 102-115. Glossed
verses then get the dotted underline and click-to-open behaviour every other
translation already has, through the existing handler.

No new marker syntax. The Vulgate text carries no superscripts, and none are
synthesised.

## Testing

**Unit (vitest)**

- Lemma extraction against fixtures covering each real failure shape: a
  work-citation prefix (`lib. IX Moral., cap. 7 Peccatum vero…`), the double
  stop (`Percusseruntque. .`), a Canticle rubric slot, and a clean case.
  Verified lemmas split, unverified ones leave `text` untouched.
- Sigla expansion, including that `AUG` and `AUGUSTINUS` both yield
  `Augustinus`, and that an unknown siglum throws.
- Mapping completeness: every slug in the table exists in `books.ts`.

**Build assertions**

- Every `verse_ref` resolves against `static/data/vul/`. Currently 14,486 of
  14,486. Any dangling reference fails the build.
- The three mapping assertions above.

**E2E (playwright)**

- `/vul/genesis/1` in study mode shows the Glossa tab with populated verse
  sections and a small-caps lemma heading.
- `/vul/ezechiel/1` shows the Glossa tab with the empty state.
- Clicking a glossed verse in the reader scrolls the panel to that verse.

## Out of scope

- Translating the Glossa into English or French.
- Author filtering in the panel, of the kind Fathers mode has.
- Reusing `fathers-authors.ts`. The Glossa tab stays Latin, and that registry is
  English.
- Sourcing the 18 missing books from elsewhere.
