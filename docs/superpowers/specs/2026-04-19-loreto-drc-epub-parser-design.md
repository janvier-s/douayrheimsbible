# Loreto DRC Epub Parser — Design Spec

## Goal

Parse the Loreto Publications DRC epub (1941 Douay Bible House edition, Imprimatur Spellman, reprinted 2018 by Loreto Publications) to fully replace the current DRC data on the website. Extract verse text with inline cross-ref markers, chapter summaries, book introductions, Challoner's notes, and numbered cross-references.

## Source

**File**: `SCRIPTURA/sources/ODR/DRC/The Holy Bible (Douay-Rheims)...Loreto Publications...Anna's Archive.epub`

**Already extracted to**: `/tmp/drc-epub/` — 109 xhtml files across `Bible-1.xhtml` through `Bible-9_split_NNN.xhtml` in the `OEBPS/` directory.

**Edition details**: Douay Bible House, New York, 1941. Nihil Obstat: Arthur J. Scanlan, S.T.D. Imprimatur: Francis J. Spellman, D.D., Archbishop of New York. ISBN 978-1-62292-142-3.

## Output

The parser produces three sets of JSON files in the `SCRIPTURA/sources/ODR/DRC/` source directory:

### 1. Verse text — `JSON_drbo/{NN}-{slug}.json`

Replaces the current DRC verse text source. Format:

```json
{
  "book": "Genesis",
  "version_abbr": "DRC",
  "date": "1941",
  "intro": "This book is so called from its treating of the Generation...",
  "chapters": [
    {
      "chapter": 1,
      "summary": "God createth Heaven and Earth, and all things therein, in six days.",
      "verses": [
        { "verse": 1, "text": "In the beginning God created \u00b9heaven, and earth." },
        { "verse": 2, "text": "And the earth was void and empty..." }
      ]
    }
  ]
}
```

- `intro`: Book-level introduction text (the italic paragraph before Chapter 1)
- `summary`: Chapter heading text (italic paragraph after "CHAPTER N")
- Verse text preserves superscript unicode markers (U+00B9, U+00B2, U+00B3, U+2074–U+2079, etc.) at the exact inline position from the epub, corresponding to cross-ref entries
- Verse numbers are stripped from the text (parsed from leading digits)

### 2. Challoner's notes — `JSON_Converted/{NN}-{slug}.json`

Replaces the current DRC notes source. Format matches existing:

```json
{
  "book": "Genesis",
  "version_abbr": "DRC",
  "date": "1941",
  "chapters": [
    {
      "chapter": 1,
      "notes": [
        { "verse": 6, "text": "\"A firmament\"... By this name is here understood the whole space between the earth and the highest stars." },
        { "verse": 16, "text": "\"Two great lights\"... God created on the first day, light..." }
      ]
    }
  ]
}
```

- Notes are identified by `<p class="footnote-rule-above">` elements
- Verse number parsed from `CHAP. N. Ver. N.` or continuation `Ver. N.` prefix
- Italic text (lemma) preserved with surrounding quotes
- Multiple notes per verse possible

### 3. Cross-references — `JSON_crossrefs/{NN}-{slug}.json` (new)

New output not in current pipeline. Format:

```json
{
  "book": "Genesis",
  "chapters": [
    {
      "chapter": 1,
      "crossrefs": [
        { "marker": 1, "verse": 1, "refs": "Acts 14:14, 17:24; Ps. 32:6, 135:5; Ecclus. 18:1" },
        { "marker": 2, "verse": 3, "refs": "Heb. 11:3" }
      ]
    }
  ]
}
```

- `marker`: The numbered marker (1, 2, 3...) that appears in the verse text as a superscript
- `verse`: Which verse the marker appears in
- `refs`: The raw reference string as it appears in the epub (not parsed into OSIS — that's the StudyPanel's job via `crossRefParser.ts`)

## Parsing Strategy

### HTML structure patterns

| Content | CSS class | Pattern |
|---------|-----------|---------|
| Book anchor | `<a id="GENESIS">` | Identifies book boundaries |
| Book intro | `<p class="chapter-heading">` before CHAPTER 1 | Italic text describing the book |
| Chapter title | `<p class="chapter-title">` | Contains `CHAPTER N` |
| Chapter summary | `<p class="chapter-heading">` after chapter title | Italic summary of chapter contents |
| Verse (first in chapter) | `<p class="bible-body-1st-line">` | Has drop-cap span |
| Verse (normal) | `<p class="bible-body">` | Verse number at start of text |
| Verse (end of chapter) | `<p class="bible-body-with-end-space1">` | Same as normal, extra spacing |
| Cross-ref marker (inline) | `<span class="reference-letters">` | Numbered marker within verse text |
| Cross-ref list | `<p class="footnote-rule-above-space-after">` | `foot-note-s--script` marker + refs |
| Challoner's note | `<p class="footnote-rule-above">` | `CHAP. N. Ver. N.` + lemma + commentary |
| Drop-cap letter | `<span class="char-style-override3">` | First letter of first verse in chapter |

### Processing pipeline

1. **Discover files**: Read all `Bible-*.xhtml` files from the OEBPS directory, sorted by filename
2. **Concatenate**: Treat all files as one continuous HTML document (books span across files)
3. **Book splitting**: Split by book anchor IDs (`<a id="GENESIS">`, `<a id="EXODUS">`, etc.)
4. **Per-book processing**:
   a. Extract book intro (italic text before first CHAPTER heading)
   b. Split into chapters by `<p class="chapter-title">CHAPTER N</p>`
   c. Per chapter: extract summary, verses, cross-refs, notes
5. **Verse extraction**:
   - Parse verse number from leading digits in text content
   - Collapse adjacent `plain-bible1` spans (word-per-span encoding in some verses)
   - Convert `<span class="reference-letters">N</span>` to superscript unicode (¹²³⁴⁵⁶⁷⁸⁹⁰)
   - Merge drop-cap `char-style-override3` span with following text
   - Strip `<br class="calibre5"/>` (convert to space)
   - Preserve `<span class="bible-italic">` as-is (italicized words in Douay-Rheims indicate words added by translators)
6. **Cross-ref extraction**:
   - Parse `footnote-rule-above-space-after` blocks
   - Split by `foot-note-s--script` marker spans
   - Track which chapter each marker group belongs to (some blocks contain `CHAP. N` inline)
   - Map each marker to its verse by scanning the verse text for the corresponding superscript
7. **Note extraction**:
   - Parse `footnote-rule-above` blocks (without `-space-after`)
   - Extract chapter/verse from `CHAP. N. Ver. N.` prefix
   - Handle continuation notes (`Ver. N.` without `CHAP.` — inherit current chapter)
   - Extract lemma (italic text) and commentary

### Quirks and edge cases

- **Word-per-span encoding**: Some verses (e.g., Gen 3:5, 4:7) have every word in a separate `<span class="plain-bible1">` with spaces between spans. Must collapse into single text.
- **Cross-ref blocks spanning chapters**: A single `footnote-rule-above-space-after` block can contain markers from multiple chapters (e.g., `...CHAP. 2  1. Exod. 20:11...`). Must detect inline `CHAP. N` and split accordingly.
- **Inconsistent book anchor IDs**: Some are simple (`GENESIS`), others are complex (`The-First-book-of--SAMUEL`, `First-Epistle-of-St.-Paul-to-the-CORINTHIANS`). Need a complete mapping from anchor ID to canonical book slug.
- **Drop-cap first verses**: First verse of each chapter starts with `<span class="char-style-override3">X</span>` for the drop-cap letter, followed by the rest of the word in a `plain-bible1` span. Must merge.
- **Italic words in verse text**: `<span class="bible-italic">saying</span>` appears in some verses (translator additions per Douay-Rheims convention). Store with italic markers as `<i>saying</i>` in the JSON text field. The site's verse renderer already handles inline HTML for italics via `{@html}` rendering.
- **Line breaks**: `<br class="calibre5"/>` appears mid-verse in some cases. Convert to space.
- **Marker-to-verse mapping**: Cross-ref markers appear inline in verse text. The marker number resets per chapter. Map each marker to its verse by the order of appearance.

## Book Anchor ID → Slug Mapping

Complete mapping from epub anchor IDs to output file slugs (using modern naming to match current `JSON_drbo` convention):

| Anchor ID | Output slug |
|-----------|-------------|
| `GENESIS` | `genesis` |
| `EXODUS` | `exodus` |
| `LEVITICUS` | `leviticus` |
| `NUMBERS` | `numbers` |
| `DEUTERONOMY` | `deuteronomy` |
| `JOSUE` | `joshua` |
| `JUDGES` | `judges` |
| `RUTH` | `ruth` |
| `The-First-book-of--SAMUEL` | `1-samuel` |
| `The-SECOND-book-of--SAMUEL` | `2-samuel` |
| `The-Third-Book-of--KINGS` | `1-kings` |
| `THE-FOURTH-Book-of--KINGS` | `2-kings` |
| `PARALIPOMENON` | `1-chronicles` |
| `THE-SECOND-BOOK-OF-PARALIPOMENON` | `2-chronicles` |
| `The-First-Book-of--ESDRAS` | `ezra` |
| `NEHEMIAS` | `nehemiah` |
| `TOBIAS` | `tobit` |
| `JUDITH` | `judith` |
| `ESTHER` | `esther` |
| `JOB` | `job` |
| `PSALMS` | `psalms` |
| `PROVERBS` | `proverbs` |
| `ECCLESIASTES` | `ecclesiastes` |
| `CANTICLE-OF-CANTICLES` | `song-of-solomon` |
| `WISDOM` | `wisdom` |
| `ECCLESIASTICUS` | `sirach` |
| `ISAIAS` | `isaiah` |
| `JEREMIAS` | `jeremiah` |
| `JEREMIAS-17` | `lamentations` |
| `BARUCH` | `baruch` |
| `EZECHIEL` | `ezekiel` |
| `DANIEL` | `daniel` |
| `OSEE` | `hosea` |
| `JOEL` | `joel` |
| `AMOS` | `amos` |
| `ABDIAS` | `obadiah` |
| `JONAS` | `jonah` |
| `MICHEAS` | `micah` |
| `NAHUM` | `nahum` |
| `HABACUC` | `habakkuk` |
| `SOPHONIAS` | `zephaniah` |
| `AGGEUS` | `haggai` |
| `ZACHARIAS` | `zechariah` |
| `MALACHIAS` | `malachi` |
| `The-First-Book-of-MACHABEES` | `1-maccabees` |
| `The-Second-Book-of--MACHABEES` | `2-maccabees` |
| `ST.-MATTHEW` | `matthew` |
| `ST.-MARK` | `mark` |
| `ST.-LUKE` | `luke` |
| `ST.-JOHN` | `john` |
| `The-Acts-of-THE-APOSTLES` | `acts` |
| `ROMANS` | `romans` |
| `First-Epistle-of-St.-Paul-to-the-CORINTHIANS` | `1-corinthians` |
| `Second-Epistle-of-St.-Paul-to-the-CORINTHIANS` | `2-corinthians` |
| `GALATIANS` | `galatians` |
| `EPHESIANS` | `ephesians` |
| `PHILIPPIANS` | `philippians` |
| `COLOSSIANS` | `colossians` |
| (First Thessalonians — anchor TBD) | `1-thessalonians` |
| `Second-Epistle-of-St.-Paul-to-the-THESSALONIANS` | `2-thessalonians` |
| (First Timothy — anchor TBD) | `1-timothy` |
| (Second Timothy — anchor TBD) | `2-timothy` |
| `TITUS` | `titus` |
| `PHILEMON` | `philemon` |
| `HEBREWS` | `hebrews` |
| `ST.-JAMES` | `james` |
| `FIRST-EPISTLE-OF-ST.-PETER-THE-APOSTLE` | `1-peter` |
| `SECOND-OF-EPISTLE-OF-ST.-PETER-THE-APOSTLE` | `2-peter` |
| (First John — anchor TBD) | `1-john` |
| `SECOND-EPISTLE-OF-ST.-JOHN` | `2-john` |
| `Third-Epsitle-of-ST.-JOHN` | `3-john` |
| `ST.-JUDE` | `jude` |
| (Apocalypse — anchor TBD) | `revelation` |

Note: Anchors marked "TBD" were not in the initial grep — they may use different patterns or be in files not yet scanned. The parser must discover all book anchors dynamically.

## Integration with Site

### `prepare-data.ts` changes

Add a new copy step for cross-references, mirroring the existing `drc-notes` pattern:

```
JSON_crossrefs/{slug}.json → static/data/drc-crossrefs/{odrSlug}/{chapter}.json
```

Each chapter's cross-refs are written as a separate file, matching the notes pattern.

### `StudyPanel.svelte` changes

The Cross-Refs tab for DRC translation loads from `drc-crossrefs/{book}/{chapter}.json` instead of relying on inline ODR cross-refs. The marker numbers in verse text become clickable, scrolling the panel to the corresponding cross-ref entry.

### Verse text rendering

The superscript markers in verse text (¹²³) are rendered as clickable elements that:
1. Switch to the Cross-Refs tab in the StudyPanel
2. Scroll to the corresponding cross-ref entry

### Bible reference linkification

All Bible references across the entire StudyPanel are linkified — not just cross-refs. This includes:
- **Cross-Refs tab**: Reference strings like "Acts 14:14, 17:24; Ps. 32:6"
- **Notes tab**: References within Challoner's notes like "(Jn. 5:17)"
- **Annotations tab**: Any Bible references in ODR annotation text

The existing `crossRefParser.ts` handles the linkification. References become clickable links that navigate to the referenced verse.

## Tech Stack

- **TypeScript** (run with `tsx`)
- **linkedom** or **cheerio** for HTML parsing (cheerio preferred — already handles malformed HTML well)
- Output: JSON files written to filesystem

## Out of Scope

- Parsing the Topical Reference Index (A-Z Catholic topics at end of epub)
- Parsing the Encyclical Letter (Providentissimus Deus)
- Parsing the Preface (Rev. William H. McClellan, S.J.)
- Parsing prayers for reading Holy Scripture
- Parsing the Epistles and Gospels table
- Italic word rendering changes in `ChapterView.svelte` (deferred — current rendering handles italics already)
