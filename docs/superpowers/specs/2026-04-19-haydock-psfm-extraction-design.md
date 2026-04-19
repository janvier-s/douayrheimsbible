# DRC Haydock PSFM Extraction & StudyPanel Integration

## Goal

Extract verse text, commentary, cross-references, and book introductions from the Haydock 1883 PSFM files into structured JSON, register "DRC Haydock" as a new translation, and display the Haydock commentary in the StudyPanel with Intro, Commentary, and Cross-Refs tabs.

## Source Material

73 book files in PSFM (Paratext SFM) format at:
```
/Users/Janvier/Library/Mobile Documents/com~apple~CloudDocs/for-the-kingdom/SCRIPTURA/sources/ODR/Haydock/ENG-B-Haydock1883-pd-PSFM-master/
```

Files follow the naming pattern `NN-BBB-ENG[B]DRC1750[pd].p.sfm` where `BBB` is a standard USFM book code (GEN, EXO, MAT, etc.). Three non-book files are excluded: `00-FRT` (front matter), `48-INT` (NT introduction), `77-BAK` (back matter).

### Content Statistics (from prior analysis)

- **21,598** footnote/commentary blocks (`\f` markers) — ~10 MB (65% of content)
- **4,060** cross-reference blocks (`\x` markers) — ~309 KB (2%)
- **1,309** chapter descriptions (`\cd` markers) — short summaries, median 90 chars
- **~6 MB** verse text (DRC 1750 Challoner)
- Commentary is 1.7x the size of the verse text itself

### PSFM Structure Per Book

**Book header:**
- `\id BBB` — Book identification
- `\h Name` / `\toc1` / `\toc2` / `\toc3` — Book titles
- `\imt1` / `\im` / `\ip` — Book introduction paragraphs (Haydock's + Challoner's)
- `\mt1` — Main title

**Per chapter:**
- `\c N` — Chapter number
- `\cl Book N` — Chapter label
- `\cd ...` — Chapter description/summary (1-2 sentences)
- `\s1 ...` — Section heading (e.g. Latin psalm titles like "Beatus vir")
- `\v N text` — Verse text with inline `*`/`**`/`***` footnote markers
- `\p` — Paragraph breaks between verses

**After all verses in a chapter (before next `\c` or EOF):**
- `\x + \xo chapter:verse \xt refs\x*` — Cross-reference blocks
- `\f + \fr chapter:verse \ft commentary text\f*` — Footnote/commentary blocks

Key observations:
- Multiple `\f` blocks can share the same verse reference (e.g. Gen 1:1 has a short date note AND a long commentary)
- `---` separators within commentary text denote section breaks within a single entry — these become `<hr>` tags
- `\f + \fr N:0` blocks exist for chapter-level commentary (not tied to a specific verse)
- Verse text asterisks (`*`, `**`, `***`, `****`) are positional markers linking to footnotes in order of appearance within a verse

## Architecture

### Extraction Script

A single build-time TypeScript script `scripts/extract-haydock.ts` that:

1. Reads all 73 book PSFM files line by line
2. Parses USFM markers with a line-based state machine (current book, current chapter, intro vs. content mode)
3. Maps USFM book codes to project slugs via a lookup table (same 73 books as DRC)
4. Outputs four data directories

No external dependencies needed — PSFM is simple line-based markup, no HTML parsing required.

### Output Data

**1. `static/data/haydock/{slug}.json`** — Verse text per book

Same `TranslationBook` shape used by DRC/Knox/CPDV:
```typescript
{
  book: string,           // slug
  chapters: [{
    chapter: number,
    summary: string,      // from \cd marker
    verses: [{
      verse: number,
      text: string         // DRC 1750 text with * markers converted to superscript numbers
    }]
  }]
}
```

Asterisk markers (`*`, `**`, `***`, `****`) in verse text are converted to sequential superscript numbers (e.g. `¹`, `²`, `³`) matching the order of `\f` commentary entries for that verse.

**2. `static/data/haydock-commentary/{slug}/{chapter}.json`** — Haydock commentary

Per-chapter JSON array:
```typescript
[{
  verse: number,        // 0 for chapter-level commentary
  marker: string,       // "1", "2", etc. — matches superscript in verse text
  text: string          // Commentary text with --- converted to <hr> tags
}]
```

Multiple `\f` blocks for the same verse are stored as separate entries with sequential markers. Within each entry, `---` separators become `<hr>` tags.

**3. `static/data/haydock-crossrefs/{slug}/{chapter}.json`** — Cross-references

Same shape as DRC cross-refs (`TranslationCrossRef[]`):
```typescript
[{
  verse: number,
  marker: string,
  refs: string           // Raw reference text, linkified at display time
}]
```

**4. `static/data/haydock-intros/{slug}.json`** — Book introductions

```typescript
{
  book: string,
  paragraphs: string[]   // Ordered \im and \ip paragraph texts
}
```

### USFM Book Code → Slug Mapping

Standard mapping for 73 books:
```
GEN→genesis, EXO→exodus, LEV→leviticus, NUM→numbers, DEU→deuteronomy,
JOS→josue, JDG→judges, RUT→ruth, 1SA→1-kings, 2SA→2-kings,
1KI→3-kings, 2KI→4-kings, 1CH→1-paralipomenon, 2CH→2-paralipomenon,
EZR→1-esdras, NEH→2-esdras, TOB→tobias, JDT→judith, EST→esther,
JOB→job, PSA→psalms, PRO→proverbs, ECC→ecclesiastes, SNG→canticle-of-canticles,
WIS→wisdom, SIR→ecclesiasticus, ISA→isaie, JER→jeremie, LAM→lamentations,
BAR→baruch, EZK→ezechiel, DAN→daniel, HOS→osee, JOL→joel,
AMO→amos, OBA→abdias, JON→jonas, MIC→micheas, NAM→nahum,
HAB→habacuc, ZEP→sophonias, HAG→aggeus, ZEC→zacharias, MAL→malachie,
1MA→1-machabees, 2MA→2-machabees,
MAT→matthew, MRK→mark, LUK→luke, JHN→john, ACT→acts,
ROM→romans, 1CO→1-corinthians, 2CO→2-corinthians, GAL→galatians,
EPH→ephesians, PHP→philippians, COL→colossians, 1TH→1-thessalonians,
2TH→2-thessalonians, 1TI→1-timothy, 2TI→2-timothy, TIT→titus,
PHM→philemon, HEB→hebrews, JAS→james, 1PE→1-peter, 2PE→2-peter,
1JN→1-john, 2JN→2-john, 3JN→3-john, JUD→jude, REV→apocalypse
```

## Translation Registration

**In `src/lib/stores/compare.ts`:**

Add `'haydock'` to the `TranslationId` union type.

Add to `TRANSLATIONS` array:
```typescript
{ id: 'haydock', label: 'DRC Haydock', abbr: 'DRC-H', year: '1883', live: true, ntOnly: false, fullHeader: true, micro: 'DRC with Haydock Commentary' }
```

Position: after DRC (year 1752), before Confraternity (year 1941).

## Routing

No new routes needed. The existing `[translation]/[book]/[chapter]` dynamic route automatically handles `/haydock/genesis/1` etc., since it accepts any live translation ID.

## Data Loading

**Existing loaders that work automatically:**
- `loadTranslationBook('haydock', slug, fetch)` — verse text
- `loadTranslationCrossRefs('haydock', slug, chapter, fetch)` — cross-refs (follows `{id}-crossrefs` convention)

**New loaders in `src/lib/data/loader.ts`:**
- `loadHaydockCommentary(slug: string, chapter: number, fetch: Fetch)` → fetches `/data/haydock-commentary/{slug}/{chapter}.json`
- `loadHaydockIntro(slug: string, fetch: Fetch)` → fetches `/data/haydock-intros/{slug}.json`

Both follow the existing caching pattern used by `loadTranslationNotes` and `loadConfIntro`.

## StudyPanel Integration

### Tab Configuration

Add to `buildVisibleTabs()` in `StudyPanel.svelte`:
```typescript
if (tid === 'haydock') {
    return [
        ...(hasIntros ? [{ id: 'intro', label: 'Intro' }] : []),
        { id: 'commentary', label: 'Commentary' },
        { id: 'cross-refs', label: 'Cross-Refs' }
    ];
}
```

### Commentary Tab

Displays Haydock annotations organized by verse number. Each verse section shows:
- Verse number header (for scroll-sync targeting)
- One or more commentary entries with their marker numbers
- `<hr>` tags preserved from `---` separators within entries

Verse-0 (chapter-level) commentary entries (13 total across the corpus) render at the top of the Commentary tab before verse-specific entries, same pattern as ODR summary notes.

Scroll-sync: clicking a verse marker in the text scrolls to the corresponding commentary entry, same as ODR annotations.

### Cross-Refs Tab

Same rendering as DRC cross-refs. Reference text is linkified via the existing `crossRefParser.ts` (which already handles both ODR comma/period and DRC colon formats).

### Intro Tab

Book introduction rendered as prose paragraphs. Only visible when intro data exists for the book. Same rendering approach as ODR/Conf intro tabs.

### Detection Flags

Add to StudyPanel's reactive declarations:
```typescript
$: isHaydock = translationId === 'haydock';
$: hasHaydockCommentary = isHaydock; // always true for Haydock
```

## Verse Marker Interaction

### Marker Format

Verse text asterisks (`*`, `**`, `***`, `****`) are converted during extraction to sequential Unicode superscript numbers (`¹`, `²`, `³`, `⁴`), matching commentary entry markers.

### VerseList Changes

In `VerseList.svelte`, add Haydock marker support alongside existing DRC marker handling:

- Detect superscript number patterns in Haydock verse text
- Convert to clickable `<button class="study-marker" data-marker-type="haydock-commentary">` elements
- Style: accent-red, same as ODR/DRC markers

### Click Behavior

Clicking a Haydock marker:
1. Opens the StudyPanel (if closed)
2. Switches to the Commentary tab
3. Scrolls to the corresponding verse's commentary section
4. Highlights the specific marker entry

Same interaction pattern as DRC cross-ref markers and ODR annotation markers.

## Build Pipeline

The extraction script runs as part of `scripts/prepare-data.ts` (or as a standalone npm script). It copies the 4 output directories into `static/data/` during build.

Since the PSFM source files are external (in SCRIPTURA), the extraction is a one-time operation with results committed to the repo, same as the Loreto DRC data.

## Scope Exclusions

- **Front matter** (`00-FRT`): The preface and commentator list are not extracted. Can be added later if desired.
- **NT introduction** (`48-INT`): The general NT preface is not extracted. Can be added later.
- **Back matter** (`77-BAK`): Excluded.
- **Section headings** (`\s1`): Latin psalm titles etc. are not displayed separately. Can be revisited.
- **Paragraph markers** (`\p`): Not preserved in verse text (verses are single strings, same as other translations).
