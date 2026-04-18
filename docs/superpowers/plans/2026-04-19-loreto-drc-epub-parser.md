# Loreto DRC Epub Parser — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Parse the Loreto Publications DRC epub to replace the current DRC data (verse text, chapter summaries, Challoner's notes) and add new data (book intros, numbered cross-references) for the website.

**Architecture:** A standalone TypeScript build script (`scripts/parse-loreto-drc.ts`) parses the epub's XHTML files using `node-html-parser` (already a dependency), outputs JSON matching the existing pipeline format, and writes to the SCRIPTURA source directory. The `prepare-data.ts` pipeline is extended to copy cross-refs to `static/data/drc-crossrefs/`. The StudyPanel gains a Cross-Refs tab for DRC and linkifies all Bible references.

**Tech Stack:** TypeScript (tsx), node-html-parser, existing prepare-data.ts pipeline

---

## File Structure

| File | Responsibility |
|------|----------------|
| `scripts/parse-loreto-drc.ts` (create) | Main parser script — reads epub XHTML, extracts all data, writes JSON |
| `scripts/parse-loreto-drc.test.ts` (create) | Unit tests for parsing functions |
| `scripts/prepare-data.ts` (modify) | Add cross-refs copy step (`JSON_crossrefs` → `static/data/drc-crossrefs/`) |
| `src/lib/data/loader.ts` (modify) | Add `loadTranslationCrossRefs()` function |
| `src/lib/data/translation-types.ts` (modify) | Add `TranslationCrossRef` type |
| `src/lib/components/StudyPanel.svelte` (modify) | Add DRC Cross-Refs tab, load cross-ref data |

---

### Task 1: Epub HTML Parser — Book Splitting and Verse Extraction

Build the core parsing engine that reads epub XHTML files, identifies book boundaries, and extracts verse text with inline cross-ref markers.

**Files:**
- Create: `scripts/parse-loreto-drc.ts`
- Create: `scripts/parse-loreto-drc.test.ts`

- [ ] **Step 1: Write failing tests for core parsing functions**

```typescript
// scripts/parse-loreto-drc.test.ts
import { describe, it, expect } from 'vitest';
import {
  parseVerseNumber,
  collapseSpans,
  convertMarkerToSuperscript,
  extractVersesFromParagraphs
} from './parse-loreto-drc';

describe('parseVerseNumber', () => {
  it('extracts verse number from leading digits', () => {
    expect(parseVerseNumber('2 And the earth was void')).toEqual({ verse: 2, text: 'And the earth was void' });
  });

  it('returns verse 1 for drop-cap first verse with no number', () => {
    expect(parseVerseNumber('In the beginning God created')).toEqual({ verse: 1, text: 'In the beginning God created' });
  });

  it('handles multi-digit verse numbers', () => {
    expect(parseVerseNumber('31 And God saw all the things')).toEqual({ verse: 31, text: 'And God saw all the things' });
  });
});

describe('collapseSpans', () => {
  it('collapses word-per-span encoding to single text', () => {
    const html = '<span class="plain-bible1">For</span><span class="plain-bible1"> </span><span class="plain-bible1">God</span><span class="plain-bible1"> </span><span class="plain-bible1">doth</span>';
    expect(collapseSpans(html)).toBe('For God doth');
  });

  it('preserves reference-letters as superscript', () => {
    const html = '<span class="plain-bible1">heaven, and earth.</span><span class="reference-letters">1</span>';
    expect(collapseSpans(html)).toContain('\u00B9');
  });

  it('merges drop-cap span with following text', () => {
    const html = '<span class="char-style-override3">I</span><span class="plain-bible1">n the beginning</span>';
    expect(collapseSpans(html)).toBe('In the beginning');
  });

  it('strips br tags and converts to space', () => {
    const html = '<span class="plain-bible1">upon thy breast shalt thou go,</span><br class="calibre5"/><span class="plain-bible1"> and earth</span>';
    expect(collapseSpans(html)).toBe('upon thy breast shalt thou go, and earth');
  });

  it('preserves italic text with <i> tags', () => {
    const html = '<span class="plain-bible1">she answered him, </span><span class="bible-italic">saying</span><span class="plain-bible1">: Of the fruit</span>';
    expect(collapseSpans(html)).toBe('she answered him, <i>saying</i>: Of the fruit');
  });
});

describe('convertMarkerToSuperscript', () => {
  it('converts single digits to unicode superscript', () => {
    expect(convertMarkerToSuperscript(1)).toBe('\u00B9');
    expect(convertMarkerToSuperscript(2)).toBe('\u00B2');
    expect(convertMarkerToSuperscript(3)).toBe('\u00B3');
    expect(convertMarkerToSuperscript(4)).toBe('\u2074');
    expect(convertMarkerToSuperscript(9)).toBe('\u2079');
    expect(convertMarkerToSuperscript(0)).toBe('\u2070');
  });

  it('converts multi-digit numbers', () => {
    expect(convertMarkerToSuperscript(12)).toBe('\u00B9\u00B2');
    expect(convertMarkerToSuperscript(10)).toBe('\u00B9\u2070');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run scripts/parse-loreto-drc.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement core parsing functions**

```typescript
// scripts/parse-loreto-drc.ts
// @ts-nocheck — build script run with tsx, not part of the Svelte app
import { readdir, readFile, writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parse as parseHTML } from 'node-html-parser';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');
const ODR_PARENT = join(PROJECT_ROOT, '..', 'SCRIPTURA', 'sources', 'ODR');
const EPUB_DIR = '/tmp/drc-epub/4_The Holy Bible (Douay-Rheims).epub-1673281740-914/The Holy Bible (Douay-Rheims).epub/OEBPS';
const DRC_OUT = join(ODR_PARENT, 'DRC');

// ── Superscript conversion ──────────────────────────────────────
const SUPERSCRIPT_MAP: Record<string, string> = {
  '0': '\u2070', '1': '\u00B9', '2': '\u00B2', '3': '\u00B3',
  '4': '\u2074', '5': '\u2075', '6': '\u2076', '7': '\u2077',
  '8': '\u2078', '9': '\u2079',
};

export function convertMarkerToSuperscript(n: number): string {
  return String(n).split('').map(d => SUPERSCRIPT_MAP[d]).join('');
}

// ── Verse number extraction ─────────────────────────────────────
export function parseVerseNumber(text: string): { verse: number; text: string } {
  const match = text.match(/^(\d+)\s+/);
  if (match) {
    return { verse: parseInt(match[1]), text: text.slice(match[0].length) };
  }
  return { verse: 1, text };
}

// ── Span collapsing ─────────────────────────────────────────────
export function collapseSpans(innerHTML: string): string {
  const node = parseHTML(`<div>${innerHTML}</div>`);
  let result = '';

  for (const child of node.firstChild!.childNodes) {
    if (child.nodeType === 3) {
      // Text node
      result += child.rawText;
      continue;
    }
    const el = child as unknown as ReturnType<typeof parseHTML>;
    const tag = (el.tagName ?? '').toUpperCase();
    const cls = el.getAttribute?.('class') ?? '';

    if (tag === 'BR') {
      // Strip <br> — preceding/following text usually has space already
      if (!result.endsWith(' ')) result += ' ';
      continue;
    }

    if (tag === 'SPAN') {
      if (cls === 'reference-letters') {
        const marker = parseInt(el.textContent.trim());
        if (!isNaN(marker)) {
          result += convertMarkerToSuperscript(marker);
        }
      } else if (cls === 'bible-italic') {
        result += `<i>${el.textContent}</i>`;
      } else if (cls === 'char-style-override3') {
        // Drop-cap letter — just append the letter
        result += el.textContent;
      } else {
        // plain-bible1, plain-bible, plain-bible3, etc.
        result += el.textContent;
      }
    }
  }

  // Collapse multiple spaces
  return result.replace(/  +/g, ' ').trim();
}

// ── Verse extraction from chapter paragraphs ────────────────────
interface ParsedVerse {
  verse: number;
  text: string;
  markers: number[]; // cross-ref marker numbers found in this verse
}

export function extractVersesFromParagraphs(paragraphs: string[]): ParsedVerse[] {
  const verses: ParsedVerse[] = [];

  for (const pHtml of paragraphs) {
    // Find all reference-letters markers in this paragraph
    const markerMatches = [...pHtml.matchAll(/<span class="reference-letters">(\d+)<\/span>/g)];
    const markers = markerMatches.map(m => parseInt(m[1]));

    const collapsed = collapseSpans(pHtml);
    const { verse, text } = parseVerseNumber(collapsed);
    verses.push({ verse, text, markers });
  }

  return verses;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run scripts/parse-loreto-drc.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add scripts/parse-loreto-drc.ts scripts/parse-loreto-drc.test.ts
git commit -m "feat: core Loreto DRC epub parsing functions (verse text, superscript markers)"
```

---

### Task 2: Book Splitting, Cross-Ref, and Note Extraction

Parse the epub file structure to split content by book and chapter, extract cross-reference lists and Challoner's notes.

**Files:**
- Modify: `scripts/parse-loreto-drc.ts`
- Modify: `scripts/parse-loreto-drc.test.ts`

- [ ] **Step 1: Write failing tests for cross-ref and note parsing**

```typescript
// Add to scripts/parse-loreto-drc.test.ts
import {
  parseCrossRefBlock,
  parseNoteBlock,
  BOOK_ANCHOR_TO_SLUG,
} from './parse-loreto-drc';

describe('parseCrossRefBlock', () => {
  it('parses numbered cross-ref entries', () => {
    const html = '<span class="foot-note-s--script">1. </span><span class="plain-bible1">Acts 14:14, 17:24; Ps. 32:6, 135:5 Ecclus. 18:1  </span><span class="foot-note-s--script">2.</span><span class="plain-bible1"> Heb. 11:3  </span>';
    const result = parseCrossRefBlock(html);
    expect(result).toEqual([
      { marker: 1, refs: 'Acts 14:14, 17:24; Ps. 32:6, 135:5 Ecclus. 18:1' },
      { marker: 2, refs: 'Heb. 11:3' },
    ]);
  });

  it('detects inline CHAP. markers for chapter boundaries', () => {
    const html = '<span class="foot-note-s--script">10. </span><span class="plain-bible1">Gen. 9:3 </span><span class="foot-note-s--script">11. </span><span class="plain-bible1">Ecclus. 39:21; Mk. 7:37 CHAP. 2  </span><span class="foot-note-s--script">1.</span><span class="plain-bible1"> Exod. 20:11</span>';
    const result = parseCrossRefBlock(html);
    expect(result[0]).toEqual({ marker: 10, refs: 'Gen. 9:3' });
    expect(result[1]).toEqual({ marker: 11, refs: 'Ecclus. 39:21; Mk. 7:37', chapterBreak: 2 });
    expect(result[2]).toEqual({ marker: 1, refs: 'Exod. 20:11', chapter: 2 });
  });
});

describe('parseNoteBlock', () => {
  it('parses CHAP + Ver note', () => {
    const html = '<span class="plain-bible1">CHAP. 1. Ver. 6. </span><span class="bible-italic">A firmament</span><span class="plain-bible1">. By this name is here understood the whole space.</span>';
    const result = parseNoteBlock(html);
    expect(result).toEqual({
      chapter: 1,
      verse: 6,
      text: '"A firmament"... By this name is here understood the whole space.',
    });
  });

  it('parses continuation Ver note (no CHAP.)', () => {
    const html = '<span class="plain-bible1">Ver. 16. </span><span class="bible-italic">Two great lights</span><span class="plain-bible1">. God created on the first day, light.</span>';
    const result = parseNoteBlock(html);
    expect(result).toEqual({
      chapter: null,
      verse: 16,
      text: '"Two great lights"... God created on the first day, light.',
    });
  });

  it('preserves inline italic in note body', () => {
    const html = '<span class="plain-bible1">Ver. 28. </span><span class="bible-italic">Increase and multiply</span><span class="plain-bible1">. This is not a precept, as some Protestant controvertists would have it, but a blessing; for God had said the same words to the </span><span class="bible-italic">fishes</span><span class="plain-bible1">.</span>';
    const result = parseNoteBlock(html);
    expect(result.text).toContain('"Increase and multiply"');
    expect(result.text).toContain('fishes');
  });
});

describe('BOOK_ANCHOR_TO_SLUG', () => {
  it('maps all 73 DRC books', () => {
    expect(Object.keys(BOOK_ANCHOR_TO_SLUG).length).toBeGreaterThanOrEqual(73);
    expect(BOOK_ANCHOR_TO_SLUG['GENESIS']).toBe('genesis');
    expect(BOOK_ANCHOR_TO_SLUG['The-First-book-of--SAMUEL']).toBe('1-samuel');
    expect(BOOK_ANCHOR_TO_SLUG['ECCLESIASTICUS']).toBe('sirach');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run scripts/parse-loreto-drc.test.ts`
Expected: FAIL — functions not exported

- [ ] **Step 3: Implement cross-ref parsing, note parsing, and book anchor mapping**

Add to `scripts/parse-loreto-drc.ts`:

```typescript
// ── Book anchor ID → slug mapping ───────────────────────────────
export const BOOK_ANCHOR_TO_SLUG: Record<string, string> = {
  'GENESIS': 'genesis',
  'EXODUS': 'exodus',
  'LEVITICUS': 'leviticus',
  'NUMBERS': 'numbers',
  'DEUTERONOMY': 'deuteronomy',
  'JOSUE': 'joshua',
  'JUDGES': 'judges',
  'RUTH': 'ruth',
  'The-First-book-of--SAMUEL': '1-samuel',
  'The-SECOND-book-of--SAMUEL': '2-samuel',
  'The-Third-Book-of--KINGS': '1-kings',
  'THE-FOURTH-Book-of--KINGS': '2-kings',
  'PARALIPOMENON': '1-chronicles',
  'THE-SECOND-BOOK-OF-PARALIPOMENON': '2-chronicles',
  // NOTE: Some anchors may use THE-SECOND-BOOK-OF-PARALIPOMENON-20
  'THE-SECOND-BOOK-OF-PARALIPOMENON-20': '2-chronicles',
  'The-First-Book-of--ESDRAS': 'ezra',
  'NEHEMIAS': 'nehemiah',
  'TOBIAS': 'tobit',
  'JUDITH': 'judith',
  'ESTHER': 'esther',
  'JOB': 'job',
  'PSALMS': 'psalms',
  'PROVERBS': 'proverbs',
  'ECCLESIASTES': 'ecclesiastes',
  'CANTICLE-OF-CANTICLES': 'song-of-solomon',
  'WISDOM': 'wisdom',
  'ECCLESIASTICUS': 'sirach',
  'ISAIAS': 'isaiah',
  'JEREMIAS': 'jeremiah',
  'JEREMIAS-17': 'lamentations',
  'BARUCH': 'baruch',
  'EZECHIEL': 'ezekiel',
  'DANIEL': 'daniel',
  'OSEE': 'hosea',
  'JOEL': 'joel',
  'AMOS': 'amos',
  'ABDIAS': 'obadiah',
  'JONAS': 'jonah',
  'MICHEAS': 'micah',
  'NAHUM': 'nahum',
  'HABACUC': 'habakkuk',
  'SOPHONIAS': 'zephaniah',
  'AGGEUS': 'haggai',
  'ZACHARIAS': 'zechariah',
  'MALACHIAS': 'malachi',
  'The-First-Book-of-MACHABEES': '1-maccabees',
  'The-Second-Book-of--MACHABEES': '2-maccabees',
  'ST.-MATTHEW': 'matthew',
  'ST.-MARK': 'mark',
  'ST.-LUKE': 'luke',
  'ST.-JOHN': 'john',
  'The-Acts-of-THE-APOSTLES': 'acts',
  'ROMANS': 'romans',
  'First-Epistle-of-St.-Paul-to-the-CORINTHIANS': '1-corinthians',
  'Second-Epistle-of-St.-Paul-to-the-CORINTHIANS': '2-corinthians',
  'GALATIANS': 'galatians',
  'EPHESIANS': 'ephesians',
  'PHILIPPIANS': 'philippians',
  'COLOSSIANS': 'colossians',
  'TITUS': 'titus',
  'PHILEMON': 'philemon',
  'HEBREWS': 'hebrews',
  'ST.-JAMES': 'james',
  'FIRST-EPISTLE-OF-ST.-PETER-THE-APOSTLE': '1-peter',
  'SECOND-OF-EPISTLE-OF-ST.-PETER-THE-APOSTLE': '2-peter',
  'SECOND-EPISTLE-OF-ST.-JOHN': '2-john',
  'Third-Epsitle-of-ST.-JOHN': '3-john',
  'ST.-JUDE': 'jude',
};
// NOTE: 1-thessalonians, 2-thessalonians, 1-timothy, 2-timothy, 1-john, revelation
// have unknown anchors — the parser will discover them dynamically from any
// <a id="..."> elements not yet in this map and log warnings.

// ── Display name for each slug (used in output JSON "book" field) ─
const SLUG_TO_DISPLAY: Record<string, string> = {
  'genesis': 'Genesis', 'exodus': 'Exodus', 'leviticus': 'Leviticus',
  'numbers': 'Numbers', 'deuteronomy': 'Deuteronomy', 'joshua': 'Josue',
  'judges': 'Judges', 'ruth': 'Ruth', '1-samuel': '1 Kings',
  '2-samuel': '2 Kings', '1-kings': '3 Kings', '2-kings': '4 Kings',
  '1-chronicles': '1 Paralipomenon', '2-chronicles': '2 Paralipomenon',
  'ezra': '1 Esdras', 'nehemiah': '2 Esdras', 'tobit': 'Tobias',
  'judith': 'Judith', 'esther': 'Esther', 'job': 'Job', 'psalms': 'Psalms',
  'proverbs': 'Proverbs', 'ecclesiastes': 'Ecclesiastes',
  'song-of-solomon': 'Canticle of Canticles', 'wisdom': 'Wisdom',
  'sirach': 'Ecclesiasticus', 'isaiah': 'Isaias', 'jeremiah': 'Jeremias',
  'lamentations': 'Lamentations', 'baruch': 'Baruch', 'ezekiel': 'Ezechiel',
  'daniel': 'Daniel', 'hosea': 'Osee', 'joel': 'Joel', 'amos': 'Amos',
  'obadiah': 'Abdias', 'jonah': 'Jonas', 'micah': 'Micheas', 'nahum': 'Nahum',
  'habakkuk': 'Habacuc', 'zephaniah': 'Sophonias', 'haggai': 'Aggeus',
  'zechariah': 'Zacharias', 'malachi': 'Malachias',
  '1-maccabees': '1 Machabees', '2-maccabees': '2 Machabees',
  'matthew': 'St. Matthew', 'mark': 'St. Mark', 'luke': 'St. Luke',
  'john': 'St. John', 'acts': 'Acts of the Apostles', 'romans': 'Romans',
  '1-corinthians': '1 Corinthians', '2-corinthians': '2 Corinthians',
  'galatians': 'Galatians', 'ephesians': 'Ephesians',
  'philippians': 'Philippians', 'colossians': 'Colossians',
  '1-thessalonians': '1 Thessalonians', '2-thessalonians': '2 Thessalonians',
  '1-timothy': '1 Timothy', '2-timothy': '2 Timothy', 'titus': 'Titus',
  'philemon': 'Philemon', 'hebrews': 'Hebrews', 'james': 'St. James',
  '1-peter': '1 Peter', '2-peter': '2 Peter', '1-john': '1 John',
  '2-john': '2 John', '3-john': '3 John', 'jude': 'St. Jude',
  'revelation': 'Apocalypse',
};

// ── Cross-ref block parsing ─────────────────────────────────────
interface ParsedCrossRef {
  marker: number;
  refs: string;
  chapterBreak?: number; // if this entry contains a CHAP. N transition
  chapter?: number;      // if this entry belongs to a new chapter (after a break)
}

export function parseCrossRefBlock(innerHTML: string): ParsedCrossRef[] {
  const node = parseHTML(`<div>${innerHTML}</div>`);
  const results: ParsedCrossRef[] = [];
  let currentMarker: number | null = null;
  let currentText = '';
  let pendingChapter: number | null = null;

  function flush() {
    if (currentMarker !== null) {
      const cleaned = currentText.replace(/\s+/g, ' ').trim();
      // Check for inline "CHAP. N" at end of ref text
      const chapMatch = cleaned.match(/\s*CHAP\.\s*(\d+)\s*$/);
      if (chapMatch) {
        const chapterNum = parseInt(chapMatch[1]);
        const refs = cleaned.slice(0, chapMatch.index).trim();
        results.push({ marker: currentMarker, refs, chapterBreak: chapterNum });
        pendingChapter = chapterNum;
      } else {
        const entry: ParsedCrossRef = { marker: currentMarker, refs: cleaned };
        if (pendingChapter !== null) {
          entry.chapter = pendingChapter;
          pendingChapter = null;
        }
        results.push(entry);
      }
    }
    currentMarker = null;
    currentText = '';
  }

  for (const child of node.firstChild!.childNodes) {
    if (child.nodeType === 3) {
      currentText += child.rawText;
      continue;
    }
    const el = child as unknown as ReturnType<typeof parseHTML>;
    const cls = el.getAttribute?.('class') ?? '';

    if (cls.includes('foot-note-s--script')) {
      flush();
      const markerText = el.textContent.replace(/[.\s]/g, '').trim();
      currentMarker = parseInt(markerText);
    } else {
      currentText += el.textContent;
    }
  }
  flush();

  return results;
}

// ── Note block parsing ──────────────────────────────────────────
interface ParsedNote {
  chapter: number | null;
  verse: number;
  text: string;
}

export function parseNoteBlock(innerHTML: string): ParsedNote {
  const node = parseHTML(`<div>${innerHTML}</div>`);
  let raw = '';
  let firstItalic: string | null = null;
  let pastPrefix = false;

  for (const child of node.firstChild!.childNodes) {
    if (child.nodeType === 3) {
      raw += child.rawText;
      continue;
    }
    const el = child as unknown as ReturnType<typeof parseHTML>;
    const cls = el.getAttribute?.('class') ?? '';

    if (cls === 'bible-italic') {
      if (!pastPrefix) {
        firstItalic = el.textContent;
        raw += el.textContent;
      } else {
        raw += el.textContent;
      }
    } else {
      raw += el.textContent;
    }
  }

  // Parse prefix: "CHAP. N. Ver. N." or "Ver. N."
  let chapter: number | null = null;
  let verse = 0;
  const chapVerMatch = raw.match(/^CHAP\.\s*(\d+)\.\s*Ver\.\s*(\d+)\.\s*/);
  const verMatch = raw.match(/^Ver\.\s*(\d+)\.\s*/);

  let body: string;
  if (chapVerMatch) {
    chapter = parseInt(chapVerMatch[1]);
    verse = parseInt(chapVerMatch[2]);
    body = raw.slice(chapVerMatch[0].length);
  } else if (verMatch) {
    verse = parseInt(verMatch[1]);
    body = raw.slice(verMatch[0].length);
  } else {
    body = raw;
  }

  // Format: italic lemma becomes quoted heading
  if (firstItalic) {
    pastPrefix = true;
    // Replace the first occurrence of the italic text with quoted version
    const lemmaPattern = firstItalic.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    body = body.replace(new RegExp(lemmaPattern), `"${firstItalic}"`);
    // After the lemma, there's usually ". " or "... " — convert to "..."
    body = body.replace(/^(".*?")\s*\.\s*/, '$1... ');
  }

  return { chapter, verse, text: body.replace(/\s+/g, ' ').trim() };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run scripts/parse-loreto-drc.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add scripts/parse-loreto-drc.ts scripts/parse-loreto-drc.test.ts
git commit -m "feat: cross-ref and note parsing for Loreto DRC epub"
```

---

### Task 3: Full Epub Processing and JSON Output

Wire everything together: read all epub files, split by book, process chapters, and write output JSON files.

**Files:**
- Modify: `scripts/parse-loreto-drc.ts`

- [ ] **Step 1: Implement the main processing function**

Add to `scripts/parse-loreto-drc.ts`:

```typescript
// ── Book order for numbered output filenames ────────────────────
const BOOK_ORDER: string[] = [
  'genesis', 'exodus', 'leviticus', 'numbers', 'deuteronomy',
  'joshua', 'judges', 'ruth', '1-samuel', '2-samuel',
  '1-kings', '2-kings', '1-chronicles', '2-chronicles',
  'ezra', 'nehemiah', 'tobit', 'judith', 'esther', 'job',
  'psalms', 'proverbs', 'ecclesiastes', 'song-of-solomon',
  'wisdom', 'sirach', 'isaiah', 'jeremiah', 'lamentations',
  'baruch', 'ezekiel', 'daniel', 'hosea', 'joel', 'amos',
  'obadiah', 'jonah', 'micah', 'nahum', 'habakkuk',
  'zephaniah', 'haggai', 'zechariah', 'malachi',
  '1-maccabees', '2-maccabees',
  'matthew', 'mark', 'luke', 'john', 'acts',
  'romans', '1-corinthians', '2-corinthians', 'galatians',
  'ephesians', 'philippians', 'colossians', '1-thessalonians',
  '2-thessalonians', '1-timothy', '2-timothy', 'titus',
  'philemon', 'hebrews', 'james', '1-peter', '2-peter',
  '1-john', '2-john', '3-john', 'jude', 'revelation',
];

interface ChapterData {
  chapter: number;
  summary: string;
  verses: { verse: number; text: string }[];
  crossrefs: { marker: number; verse: number; refs: string }[];
  notes: { verse: number; text: string }[];
}

interface BookResult {
  slug: string;
  displayName: string;
  intro: string;
  chapters: ChapterData[];
}

function parseBookContent(bookHtml: string, slug: string): BookResult {
  const root = parseHTML(bookHtml);
  const displayName = SLUG_TO_DISPLAY[slug] ?? slug;
  let intro = '';
  const chapters: ChapterData[] = [];

  // Find all chapter title paragraphs
  const allParagraphs = root.querySelectorAll('p');

  let currentChapter = 0;
  let currentSummary = '';
  let verseParagraphs: string[] = [];
  let crossRefBlocks: string[] = [];
  let noteBlocks: string[] = [];
  let seenFirstChapter = false;

  for (const p of allParagraphs) {
    const cls = p.getAttribute('class') ?? '';

    // Chapter title: "CHAPTER N"
    if (cls === 'chapter-title' || cls === 'chapter-title-extra-spac') {
      // Flush previous chapter
      if (seenFirstChapter) {
        chapters.push(buildChapter(currentChapter, currentSummary, verseParagraphs, crossRefBlocks, noteBlocks));
      }
      const chText = p.textContent.trim();
      const chMatch = chText.match(/CHAPTER\s+(\d+)/);
      currentChapter = chMatch ? parseInt(chMatch[1]) : currentChapter + 1;
      currentSummary = '';
      verseParagraphs = [];
      crossRefBlocks = [];
      noteBlocks = [];
      seenFirstChapter = true;
      continue;
    }

    // Chapter heading / book intro (italic summary)
    if (cls === 'chapter-heading') {
      if (!seenFirstChapter) {
        // Before any chapter = book intro
        intro += (intro ? ' ' : '') + p.textContent.trim();
      } else {
        currentSummary = p.textContent.trim();
      }
      continue;
    }

    // Verse paragraphs
    if (cls === 'bible-body' || cls === 'bible-body-1st-line' ||
        cls.startsWith('bible-body-with-end-space')) {
      verseParagraphs.push(p.innerHTML);
      continue;
    }

    // Cross-ref block
    if (cls === 'footnote-rule-above-space-after') {
      crossRefBlocks.push(p.innerHTML);
      continue;
    }

    // Challoner's note
    if (cls === 'footnote-rule-above') {
      noteBlocks.push(p.innerHTML);
      continue;
    }
  }

  // Flush final chapter
  if (seenFirstChapter) {
    chapters.push(buildChapter(currentChapter, currentSummary, verseParagraphs, crossRefBlocks, noteBlocks));
  }

  return { slug, displayName, intro, chapters };
}

function buildChapter(
  chapterNum: number,
  summary: string,
  verseParagraphs: string[],
  crossRefBlocks: string[],
  noteBlocks: string[]
): ChapterData {
  // Parse verses
  const parsedVerses = extractVersesFromParagraphs(verseParagraphs);

  // Parse cross-refs — combine all blocks for this chapter
  const allCrossRefs: { marker: number; refs: string }[] = [];
  for (const block of crossRefBlocks) {
    const entries = parseCrossRefBlock(block);
    for (const entry of entries) {
      if (entry.chapterBreak || entry.chapter) continue; // belongs to next chapter — handled by caller
      allCrossRefs.push({ marker: entry.marker, refs: entry.refs });
    }
  }

  // Map markers to verses
  const crossrefs: { marker: number; verse: number; refs: string }[] = [];
  for (const cr of allCrossRefs) {
    // Find which verse contains this marker
    const verse = parsedVerses.find(v => v.markers.includes(cr.marker));
    crossrefs.push({
      marker: cr.marker,
      verse: verse?.verse ?? 0,
      refs: cr.refs,
    });
  }

  // Parse notes
  let currentNoteChapter = chapterNum;
  const notes: { verse: number; text: string }[] = [];
  for (const block of noteBlocks) {
    const note = parseNoteBlock(block);
    if (note.chapter !== null) currentNoteChapter = note.chapter;
    if (currentNoteChapter === chapterNum && note.verse > 0) {
      notes.push({ verse: note.verse, text: note.text });
    }
  }

  return {
    chapter: chapterNum,
    summary,
    verses: parsedVerses.map(v => ({ verse: v.verse, text: v.text })),
    crossrefs,
    notes,
  };
}

// ── Main ────────────────────────────────────────────────────────
async function main() {
  console.log('Parsing Loreto DRC epub...');

  // Read and concatenate all Bible-*.xhtml files
  const files = (await readdir(EPUB_DIR))
    .filter(f => f.startsWith('Bible-') && f.endsWith('.xhtml'))
    .sort();

  let fullHtml = '';
  for (const file of files) {
    const content = await readFile(join(EPUB_DIR, file), 'utf-8');
    // Extract body content only
    const bodyMatch = content.match(/<body[^>]*>([\s\S]*)<\/body>/);
    if (bodyMatch) fullHtml += bodyMatch[1];
  }

  // Split by book anchors
  const anchorPattern = /<a\s+id="([^"]+)"[^>]*class="footnote-link"[^>]*><\/a>/g;
  const anchors: { id: string; index: number }[] = [];
  let match: RegExpExecArray | null;
  while ((match = anchorPattern.exec(fullHtml)) !== null) {
    anchors.push({ id: match[1], index: match.index });
  }

  console.log(`Found ${anchors.length} book anchors`);

  // Process each book
  const books: BookResult[] = [];
  for (let i = 0; i < anchors.length; i++) {
    const anchor = anchors[i];
    const slug = BOOK_ANCHOR_TO_SLUG[anchor.id];
    if (!slug) {
      console.warn(`Unknown book anchor: ${anchor.id} — skipping`);
      continue;
    }

    const start = anchor.index;
    const end = i + 1 < anchors.length ? anchors[i + 1].index : fullHtml.length;
    const bookHtml = fullHtml.slice(start, end);

    const result = parseBookContent(bookHtml, slug);
    books.push(result);
    console.log(`✓ ${result.displayName}: ${result.chapters.length} chapters, ${result.chapters.reduce((s, c) => s + c.verses.length, 0)} verses`);
  }

  // Write output files
  const drboDir = join(DRC_OUT, 'JSON_drbo');
  const convertedDir = join(DRC_OUT, 'JSON_Converted');
  const crossrefsDir = join(DRC_OUT, 'JSON_crossrefs');
  await mkdir(drboDir, { recursive: true });
  await mkdir(convertedDir, { recursive: true });
  await mkdir(crossrefsDir, { recursive: true });

  for (const book of books) {
    const idx = BOOK_ORDER.indexOf(book.slug);
    const prefix = idx >= 0 ? String(idx + 1).padStart(2, '0') : '99';
    const filename = `${prefix}-${book.slug}.json`;

    // Verse text (JSON_drbo)
    const verseJson = {
      book: book.displayName,
      version_abbr: 'DRC',
      date: '1941',
      intro: book.intro || undefined,
      chapters: book.chapters.map(ch => ({
        chapter: ch.chapter,
        summary: ch.summary || undefined,
        verses: ch.verses,
      })),
    };
    await writeFile(join(drboDir, filename), JSON.stringify(verseJson, null, 2));

    // Notes (JSON_Converted)
    const notesJson = {
      book: book.displayName,
      version_abbr: 'DRC',
      date: '1941',
      chapters: book.chapters
        .filter(ch => ch.notes.length > 0)
        .map(ch => ({
          chapter: ch.chapter,
          notes: ch.notes,
        })),
    };
    await writeFile(join(convertedDir, filename), JSON.stringify(notesJson, null, 2));

    // Cross-refs (JSON_crossrefs)
    const crossrefsJson = {
      book: book.displayName,
      chapters: book.chapters
        .filter(ch => ch.crossrefs.length > 0)
        .map(ch => ({
          chapter: ch.chapter,
          crossrefs: ch.crossrefs,
        })),
    };
    await writeFile(join(crossrefsDir, filename), JSON.stringify(crossrefsJson, null, 2));
  }

  console.log(`\nWrote ${books.length} books to:`);
  console.log(`  ${drboDir}`);
  console.log(`  ${convertedDir}`);
  console.log(`  ${crossrefsDir}`);
}

main().catch(console.error);
```

- [ ] **Step 2: Run the parser on the epub**

Run: `npx tsx scripts/parse-loreto-drc.ts`
Expected: Console output listing all 73 books with chapter/verse counts. JSON files written to `SCRIPTURA/sources/ODR/DRC/JSON_drbo/`, `JSON_Converted/`, `JSON_crossrefs/`.

- [ ] **Step 3: Validate output against current DRC data**

Spot-check a few books. Compare verse counts between new and old data:

```bash
# Check Genesis verse count
node -e "const d=require('./static/data/drc/genesis.json'); console.log('Current:', d.chapters.reduce((s,c)=>s+c.verses.length,0))"
# Compare with new output
node -e "const d=require('SCRIPTURA_PATH/JSON_drbo/01-genesis.json'); console.log('Loreto:', d.chapters.reduce((s,c)=>s+c.verses.length,0))"
```

Verify cross-refs exist and notes have content.

- [ ] **Step 4: Fix any parsing issues found during validation**

Address edge cases: missing verses, malformed markers, chapter number mismatches.

- [ ] **Step 5: Commit**

```bash
git add scripts/parse-loreto-drc.ts
git commit -m "feat: full epub processing with JSON output for all 73 books"
```

---

### Task 4: Integrate Cross-Refs into prepare-data.ts Pipeline

Add the cross-refs copy step to the build pipeline so `drc-crossrefs/` data is available at runtime.

**Files:**
- Modify: `scripts/prepare-data.ts`

- [ ] **Step 1: Add cross-refs copy step**

Add after the existing DRC notes section (around line 219) in `scripts/prepare-data.ts`:

```typescript
	// --- DRC chapter cross-refs → static/data/drc-crossrefs/{odrSlug}/{chapter}.json ---
	const drcCrossrefsSrc = join(ODR_PARENT, 'DRC', 'JSON_crossrefs');
	try {
		await access(drcCrossrefsSrc);
		const drcCrossrefsOutBase = join(PROJECT_ROOT, 'static', 'data', 'drc-crossrefs');
		await mkdir(drcCrossrefsOutBase, { recursive: true });

		const drcCrFiles = await readdir(drcCrossrefsSrc);
		let drcCrossrefsCount = 0;

		for (const file of drcCrFiles) {
			if (!file.endsWith('.json')) continue;

			const raw = await readFile(join(drcCrossrefsSrc, file), 'utf-8');
			const data = JSON.parse(raw) as {
				chapters?: Array<{
					chapter: number;
					crossrefs?: Array<{ marker: number; verse: number; refs: string }>;
				}>;
			};
			if (!Array.isArray(data.chapters)) continue;

			const modernSlug = file.replace(/^\d+-/, '').replace('.json', '');
			const odrSlug = reverseRemapSlug(modernSlug, SLUG_REMAP_DRC_KNOX);
			const bookOutDir = join(drcCrossrefsOutBase, odrSlug);

			for (const ch of data.chapters) {
				if (!Array.isArray(ch.crossrefs) || ch.crossrefs.length === 0) continue;
				await mkdir(bookOutDir, { recursive: true });
				await writeFile(join(bookOutDir, `${ch.chapter}.json`), JSON.stringify(ch.crossrefs));
				drcCrossrefsCount++;
			}
		}

		console.log(
			`✓ drc-crossrefs: wrote ${drcCrossrefsCount} chapter cross-ref files → ${drcCrossrefsOutBase}`
		);
	} catch {
		console.log(`DRC cross-refs source not found at ${drcCrossrefsSrc} — skipping.`);
	}
```

- [ ] **Step 2: Also copy `intro` field through the DRC verse pipeline**

Currently `prepare-data.ts` strips down to `{ book, chapters }`. The `intro` field from the new JSON_drbo files needs to pass through. Modify the minimal JSON construction in the translation copy loop (around line 162-174):

```typescript
				const minimal: Record<string, unknown> = {
					book: data.book,
					chapters: (
						data.chapters as Array<{
							chapter: unknown;
							summary?: string;
							verses: Array<{ verse: number; text: string }>;
						}>
					).map((ch) => ({
						chapter: ch.chapter,
						...(ch.summary ? { summary: ch.summary } : {}),
						verses: ch.verses.map((v) => ({ verse: v.verse, text: cleanVerseText(v.text) }))
					}))
				};
				// Preserve book intro if present
				if (data.intro) {
					minimal.intro = data.intro;
				}
```

- [ ] **Step 3: Run the build to verify cross-refs are copied**

Run: `npm run build`
Expected: Console output includes `✓ drc-crossrefs: wrote N chapter cross-ref files`. Files exist at `static/data/drc-crossrefs/genesis/1.json` etc.

- [ ] **Step 4: Commit**

```bash
git add scripts/prepare-data.ts
git commit -m "feat: copy DRC cross-refs and book intros through build pipeline"
```

---

### Task 5: Add Cross-Ref Loader and Types

Add the TypeScript types and data loader for cross-references.

**Files:**
- Modify: `src/lib/data/translation-types.ts`
- Modify: `src/lib/data/loader.ts`

- [ ] **Step 1: Add TranslationCrossRef type**

Add to `src/lib/data/translation-types.ts`:

```typescript
/** A single numbered cross-reference entry for DRC */
export interface TranslationCrossRef {
	marker: number;
	verse: number;
	refs: string;
}
```

- [ ] **Step 2: Add loadTranslationCrossRefs function**

Add to `src/lib/data/loader.ts`:

```typescript
import type { TranslationBook, TranslationNote, TranslationCrossRef } from './translation-types';

// ... existing code ...

// ── Translation cross-references (DRC chapter-level) ────────────
const translationCrossRefsCache = new Map<string, Promise<TranslationCrossRef[] | null>>();

/**
 * Fetches chapter-level cross-references for DRC.
 * Returns null on 404 (chapter has no cross-refs). Caches per `{id}/{slug}/{chapter}`.
 */
export function loadTranslationCrossRefs(
	id: string,
	slug: string,
	chapter: number,
	fetch: typeof globalThis.fetch
): Promise<TranslationCrossRef[] | null> {
	const key = `${id}/${slug}/${chapter}`;
	if (!translationCrossRefsCache.has(key)) {
		const promise = fetch(`/data/${id}-crossrefs/${slug}/${chapter}.json`).then((res) => {
			if (res.status === 404) return null;
			if (!res.ok) throw new Error(`Failed to load cross-refs: ${res.status}`);
			return res.json() as Promise<TranslationCrossRef[]>;
		});
		promise.then(null, () => translationCrossRefsCache.delete(key));
		translationCrossRefsCache.set(key, promise);
	}
	return translationCrossRefsCache.get(key)!;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/data/translation-types.ts src/lib/data/loader.ts
git commit -m "feat: add TranslationCrossRef type and loader"
```

---

### Task 6: Add DRC Cross-Refs Tab to StudyPanel

Add the Cross-Refs tab for DRC in the StudyPanel, loading data from the new `drc-crossrefs` endpoint.

**Files:**
- Modify: `src/lib/components/StudyPanel.svelte`

- [ ] **Step 1: Import the cross-refs loader and type**

At the top of `StudyPanel.svelte`, add to the loader import:

```typescript
import {
	loadAnnotations,
	loadTranslationNotes,
	loadTranslationCrossRefs,
	loadConfIntro,
	loadConfFootnotes,
	loadConfCommentary
} from '$lib/data/loader';
```

And to the type import:

```typescript
import type { TranslationNote, TranslationCrossRef } from '$lib/data/translation-types';
```

- [ ] **Step 2: Add cross-refs data loading reactive block**

After the translation notes loader (around line 76), add:

```typescript
	// ── Translation cross-refs (DRC) ────────────────────────────────
	let translationCrossRefs: TranslationCrossRef[] | null = null;
	let translationCrossRefsLoading = false;
	let lastTranslationCrossRefsKey = '';

	$: {
		const key = `${translationId}/${currentBookSlug}/${currentChapterNum}`;
		if (isDrc && currentBookSlug && key !== lastTranslationCrossRefsKey) {
			lastTranslationCrossRefsKey = key;
			const slug = currentBookSlug;
			const chNum = currentChapterNum;
			translationCrossRefsLoading = true;
			translationCrossRefs = null;
			loadTranslationCrossRefs('drc', slug, chNum, fetch)
				.then((data) => {
					if (`drc/${slug}/${chNum}` === lastTranslationCrossRefsKey) {
						translationCrossRefs = data;
						translationCrossRefsLoading = false;
					}
				})
				.catch(() => {
					if (`drc/${slug}/${chNum}` === lastTranslationCrossRefsKey) {
						translationCrossRefsLoading = false;
					}
				});
		}
	}
```

- [ ] **Step 3: Update buildVisibleTabs to show Cross-Refs for DRC**

Change the DRC/CPDV/Knox tab configuration in `buildVisibleTabs`:

```typescript
		if (tid === 'drc') {
			return [
				{ id: 'notes', label: 'Notes' },
				{ id: 'cross-refs', label: 'Cross-Refs' },
			];
		}
		if (tid === 'cpdv' || tid === 'knox') {
			return [{ id: 'notes', label: 'Notes' }];
		}
```

- [ ] **Step 4: Add DRC Cross-Refs tab template**

After the existing DRC/Knox/CPDV notes tab section (around line 1043), add:

```svelte
			<!-- ═══ DRC: Cross-Refs tab ═══ -->
		{:else if $studyPanel.activeTab === 'cross-refs' && isDrc}
			{#if translationCrossRefsLoading}
				<div class="empty-state"><p>Loading cross-references...</p></div>
			{:else if translationCrossRefs && translationCrossRefs.length > 0}
				<div class="content-block">
					<p class="content-eyebrow">
						Cross-References · DRC
					</p>
					{#each translationCrossRefs as cr (cr.marker)}
						<div class="cr-row sub-section-inline">
							<span class="cr-marker">{convertMarkerToSuperscript(cr.marker)}</span>
							<span class="cr-verse-tag">v.{cr.verse}</span>
							<CrossRefText text={cr.refs} />
						</div>
					{/each}
				</div>
			{:else}
				<div class="empty-state">
					<span class="empty-icon" aria-hidden="true">✦</span>
					<p>No cross-references for this chapter.</p>
				</div>
			{/if}
```

- [ ] **Step 5: Add the convertMarkerToSuperscript helper to the script section**

Add a small helper in the `<script>` section (since the build script version isn't importable at runtime):

```typescript
	// ── Superscript rendering for DRC cross-ref markers ─────────────
	const SUPER_DIGITS: Record<string, string> = {
		'0': '\u2070', '1': '\u00B9', '2': '\u00B2', '3': '\u00B3',
		'4': '\u2074', '5': '\u2075', '6': '\u2076', '7': '\u2077',
		'8': '\u2078', '9': '\u2079',
	};
	function convertMarkerToSuperscript(n: number): string {
		return String(n).split('').map(d => SUPER_DIGITS[d] ?? d).join('');
	}
```

- [ ] **Step 6: Add `.cr-verse-tag` style**

Add to the `<style>` section:

```css
	.cr-verse-tag {
		font-family: var(--font-ui);
		font-size: 11px;
		color: var(--color-muted);
		margin-right: 6px;
		white-space: nowrap;
	}
```

- [ ] **Step 7: Test the cross-refs tab manually**

1. Run `npm run dev`
2. Navigate to `/drc/genesis/1`
3. Verify the Cross-Refs tab appears alongside Notes
4. Verify cross-ref entries show with superscript markers, verse tags, and linkified references
5. Hover over a cross-ref to see the verse tooltip

- [ ] **Step 8: Commit**

```bash
git add src/lib/components/StudyPanel.svelte
git commit -m "feat: add DRC Cross-Refs tab to StudyPanel"
```

---

### Task 7: Linkify Bible References in All StudyPanel Tabs

Ensure all Bible references in the StudyPanel are linkified — annotations, notes, and cross-refs. The notes tab already linkifies DRC/Knox refs. Verify annotations also use linkification, and that the cross-refs tab uses `CrossRefText` (already done in Task 6).

**Files:**
- Modify: `src/lib/components/StudyPanel.svelte` (if needed)
- Modify: `src/lib/components/AnnotationProse.svelte` (if needed)

- [ ] **Step 1: Verify annotations tab linkification**

Read `src/lib/components/AnnotationProse.svelte` and check if Bible references in annotation text are already linkified. If the component uses `CrossRefText` or `linkifyDrcRefs` for cross-ref text within annotations, no change is needed.

Check for: `crossRefParser`, `linkify`, `CrossRefText` in AnnotationProse.

- [ ] **Step 2: If annotations are not linkified, add linkification**

If `AnnotationProse.svelte` renders plain text without linkifying Bible refs, update it to use the `linkifyDrcRefs` function (for DRC context) or `tokenizeCrossRef`/`CrossRefText` for ref rendering.

The ODR annotations already show cross-refs through `CrossRefText` in the Cross-Refs tab, so this step may be a no-op.

- [ ] **Step 3: Test all tabs for linkification**

1. Navigate to `/drc/genesis/1` — Notes tab should linkify refs like "Acts 14:14" as clickable links
2. Navigate to `/drc/genesis/1` — Cross-Refs tab should show refs as hoverable links with tooltips
3. Navigate to `/odr/genesis/1` — Annotations tab should show cross-refs as before
4. Navigate to `/odr/genesis/1` — Notes tab should linkify any Bible refs in note text
5. Navigate to `/knox/genesis/1` — Notes tab should linkify Knox-style refs

- [ ] **Step 4: Commit (if changes were needed)**

```bash
git add src/lib/components/StudyPanel.svelte src/lib/components/AnnotationProse.svelte
git commit -m "feat: ensure Bible ref linkification across all StudyPanel tabs"
```

---

### Task 8: Run Parser, Rebuild Data, Smoke Test End-to-End

Run the full pipeline end-to-end: parse epub → copy through build → verify in dev server.

**Files:**
- No new files — validation and testing task

- [ ] **Step 1: Extract epub if not already extracted**

```bash
# If /tmp/drc-epub/ doesn't exist:
mkdir -p /tmp/drc-epub
cd /tmp/drc-epub
unzip "SCRIPTURA/sources/ODR/DRC/The Holy Bible (Douay-Rheims)*.epub"
```

- [ ] **Step 2: Run the parser**

```bash
npx tsx scripts/parse-loreto-drc.ts
```

Expected: All 73 books parsed, JSON files written.

- [ ] **Step 3: Run the build**

```bash
npm run build
```

Expected: Build succeeds, cross-refs copied to `static/data/drc-crossrefs/`.

- [ ] **Step 4: Verify data integrity**

```bash
# Count books in each output
ls static/data/drc/ | wc -l          # Should be 73
ls static/data/drc-notes/ | wc -l    # Should be ~73 dirs
ls static/data/drc-crossrefs/ | wc -l # Should be ~73 dirs

# Spot-check Genesis
node -e "const d=JSON.parse(require('fs').readFileSync('static/data/drc/genesis.json','utf8')); console.log('chapters:', d.chapters.length, 'v1:', d.chapters[0].verses[0].text.slice(0,50))"
```

- [ ] **Step 5: Smoke test in dev server**

```bash
npm run dev
```

1. `/drc/genesis/1` — Verify verse text renders correctly, including superscript markers
2. Notes tab — Challoner's notes display with lemma headings and linkified refs
3. Cross-Refs tab — Entries show with markers, verse tags, and hoverable ref links
4. `/drc/psalms/1` — Verify Psalms work (complex chapter numbering)
5. `/drc/revelation/1` — Verify last NT book works
6. Compare a verse against the current DRC on the live site to check for text differences

- [ ] **Step 6: Run existing tests**

```bash
npm run test
npm run check
```

Expected: All tests pass, svelte-check has no new errors.

- [ ] **Step 7: Commit and tag**

```bash
git add -A
git commit -m "feat: Loreto DRC epub parsed — verse text, notes, and cross-refs replaced"
```
