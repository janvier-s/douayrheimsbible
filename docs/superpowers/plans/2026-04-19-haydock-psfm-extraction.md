# DRC Haydock PSFM Extraction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract verse text, commentary, cross-references, and book introductions from the Haydock 1883 PSFM files, register "DRC Haydock" as a new translation, and display commentary in the StudyPanel.

**Architecture:** A single build-time TypeScript script parses 73 PSFM book files line-by-line, outputting four JSON directories (verse text, commentary, cross-refs, intros). The new `haydock` translation ID slots into the existing dynamic routing, data loading, and StudyPanel tab system.

**Tech Stack:** TypeScript, SvelteKit, Svelte 4 syntax, Vitest

---

## File Structure

**Create:**
- `scripts/extract-haydock.ts` — PSFM parser and JSON output
- `scripts/extract-haydock.test.ts` — Unit tests for parser functions
- `static/data/haydock/` — Verse text per book (73 JSON files)
- `static/data/haydock-commentary/` — Per-chapter commentary (nested by slug)
- `static/data/haydock-crossrefs/` — Per-chapter cross-refs (nested by slug)
- `static/data/haydock-intros/` — Book introductions (73 JSON files)

**Modify:**
- `src/lib/data/translation-types.ts` — Add `summary` to `TranslationChapter`
- `src/lib/stores/compare.ts` — Add `'haydock'` to `TranslationId` and `TRANSLATIONS`
- `src/lib/data/loader.ts` — Add `loadHaydockCommentary()` and `loadHaydockIntro()`
- `src/lib/components/StudyPanel.svelte` — Add Haydock tab config, commentary tab, intro tab, cross-refs tab, data loading
- `src/lib/components/VerseList.svelte` — Add Haydock marker rendering and click handling

---

## Source File Location

```
/Users/Janvier/Library/Mobile Documents/com~apple~CloudDocs/for-the-kingdom/SCRIPTURA/sources/ODR/Haydock/ENG-B-Haydock1883-pd-PSFM-master/
```

73 book files matching `NN-BBB-ENG[B]DRC1750[pd].p.sfm`. Skip `00-FRT` (front matter), `48-INT` (NT intro), `77-BAK` (back matter).

---

### Task 1: PSFM Parser — Core Parsing Functions

**Files:**
- Create: `scripts/extract-haydock.ts`
- Create: `scripts/extract-haydock.test.ts`

This task implements the pure parsing functions (no file I/O). The extraction script will use these to process each book.

- [ ] **Step 1: Write tests for USFM book code → slug mapping**

```typescript
// scripts/extract-haydock.test.ts
import { describe, it, expect } from 'vitest';
import { usfmToSlug } from './extract-haydock';

describe('usfmToSlug', () => {
  it('maps OT book codes', () => {
    expect(usfmToSlug('GEN')).toBe('genesis');
    expect(usfmToSlug('EXO')).toBe('exodus');
    expect(usfmToSlug('PSA')).toBe('psalms');
    expect(usfmToSlug('1SA')).toBe('1-kings');
    expect(usfmToSlug('2SA')).toBe('2-kings');
    expect(usfmToSlug('1KI')).toBe('3-kings');
    expect(usfmToSlug('2KI')).toBe('4-kings');
    expect(usfmToSlug('1CH')).toBe('1-paralipomenon');
    expect(usfmToSlug('EZR')).toBe('1-esdras');
    expect(usfmToSlug('NEH')).toBe('2-esdras');
    expect(usfmToSlug('SNG')).toBe('canticle-of-canticles');
    expect(usfmToSlug('SIR')).toBe('ecclesiasticus');
  });

  it('maps NT book codes', () => {
    expect(usfmToSlug('MAT')).toBe('matthew');
    expect(usfmToSlug('MRK')).toBe('mark');
    expect(usfmToSlug('JHN')).toBe('john');
    expect(usfmToSlug('REV')).toBe('apocalypse');
    expect(usfmToSlug('PHM')).toBe('philemon');
  });

  it('returns undefined for unknown codes', () => {
    expect(usfmToSlug('XXX')).toBeUndefined();
    expect(usfmToSlug('FRT')).toBeUndefined();
    expect(usfmToSlug('INT')).toBeUndefined();
    expect(usfmToSlug('BAK')).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run scripts/extract-haydock.test.ts`
Expected: FAIL — `usfmToSlug` not found

- [ ] **Step 3: Implement the slug mapping**

```typescript
// scripts/extract-haydock.ts

/** Maps USFM 3-letter book codes to project slugs (Douay-Rheims naming). */
const USFM_TO_SLUG: Record<string, string> = {
  GEN: 'genesis', EXO: 'exodus', LEV: 'leviticus', NUM: 'numbers', DEU: 'deuteronomy',
  JOS: 'josue', JDG: 'judges', RUT: 'ruth', '1SA': '1-kings', '2SA': '2-kings',
  '1KI': '3-kings', '2KI': '4-kings', '1CH': '1-paralipomenon', '2CH': '2-paralipomenon',
  EZR: '1-esdras', NEH: '2-esdras', TOB: 'tobias', JDT: 'judith', EST: 'esther',
  JOB: 'job', PSA: 'psalms', PRO: 'proverbs', ECC: 'ecclesiastes', SNG: 'canticle-of-canticles',
  WIS: 'wisdom', SIR: 'ecclesiasticus', ISA: 'isaie', JER: 'jeremie', LAM: 'lamentations',
  BAR: 'baruch', EZK: 'ezechiel', DAN: 'daniel', HOS: 'osee', JOL: 'joel',
  AMO: 'amos', OBA: 'abdias', JON: 'jonas', MIC: 'micheas', NAM: 'nahum',
  HAB: 'habacuc', ZEP: 'sophonias', HAG: 'aggeus', ZEC: 'zacharias', MAL: 'malachie',
  '1MA': '1-machabees', '2MA': '2-machabees',
  MAT: 'matthew', MRK: 'mark', LUK: 'luke', JHN: 'john', ACT: 'acts',
  ROM: 'romans', '1CO': '1-corinthians', '2CO': '2-corinthians', GAL: 'galatians',
  EPH: 'ephesians', PHP: 'philippians', COL: 'colossians', '1TH': '1-thessalonians',
  '2TH': '2-thessalonians', '1TI': '1-timothy', '2TI': '2-timothy', TIT: 'titus',
  PHM: 'philemon', HEB: 'hebrews', JAS: 'james', '1PE': '1-peter', '2PE': '2-peter',
  '1JN': '1-john', '2JN': '2-john', '3JN': '3-john', JUD: 'jude', REV: 'apocalypse',
};

export function usfmToSlug(code: string): string | undefined {
  return USFM_TO_SLUG[code];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run scripts/extract-haydock.test.ts`
Expected: PASS

- [ ] **Step 5: Write tests for verse text parsing**

Add to `scripts/extract-haydock.test.ts`:

```typescript
import { parseVerseText } from './extract-haydock';

describe('parseVerseText', () => {
  it('extracts verse number and text', () => {
    const result = parseVerseText('\\v 1 In the beginning God created heaven and earth.');
    expect(result).toEqual({ verse: 1, text: 'In the beginning God created heaven and earth.' });
  });

  it('converts single asterisk to superscript ¹', () => {
    const result = parseVerseText('\\v 1 In the *beginning God created heaven and earth.');
    expect(result).toEqual({ verse: 1, text: 'In the ¹beginning God created heaven and earth.' });
  });

  it('converts multiple asterisks to sequential superscripts', () => {
    const result = parseVerseText('\\v 2 *Abraham begot **Isaac. And Isaac begot Jacob. ***And Jacob begot Judas.');
    expect(result).toEqual({
      verse: 2,
      text: '¹Abraham begot ²Isaac. And Isaac begot Jacob. ³And Jacob begot Judas.'
    });
  });

  it('converts quadruple asterisk', () => {
    const result = parseVerseText('\\v 5 And Salmon begot Booz of Rahab.* text** more***');
    expect(result).toEqual({
      verse: 5,
      text: 'And Salmon begot Booz of Rahab.¹ text² more³'
    });
  });

  it('returns null for non-verse lines', () => {
    expect(parseVerseText('\\p')).toBeNull();
    expect(parseVerseText('\\c 1')).toBeNull();
  });
});
```

- [ ] **Step 6: Implement parseVerseText**

Add to `scripts/extract-haydock.ts`:

```typescript
const SUPERSCRIPT_DIGITS = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'];

function toSuperscript(n: number): string {
  return String(n).split('').map(d => SUPERSCRIPT_DIGITS[parseInt(d)]).join('');
}

export interface ParsedVerse {
  verse: number;
  text: string;
}

/** Parse a \\v line, converting asterisk markers to sequential superscript numbers. */
export function parseVerseText(line: string): ParsedVerse | null {
  const match = line.match(/^\\v\s+(\d+)\s+(.*)/);
  if (!match) return null;
  const verse = parseInt(match[1]);
  let text = match[2];

  // Convert asterisk markers (*, **, ***, ****) to sequential superscript numbers.
  // Asterisks appear as groups: * = 1 star, ** = 2 stars, etc.
  // We replace them in order of decreasing length to avoid partial matches.
  let markerNum = 0;
  // Replace **** then *** then ** then * patterns
  text = text.replace(/\*{1,4}/g, () => {
    markerNum++;
    return toSuperscript(markerNum);
  });

  return { verse, text: text.trim() };
}
```

- [ ] **Step 7: Run tests**

Run: `npx vitest run scripts/extract-haydock.test.ts`
Expected: PASS

- [ ] **Step 8: Write tests for footnote/commentary parsing**

Add to `scripts/extract-haydock.test.ts`:

```typescript
import { parseFootnote } from './extract-haydock';

describe('parseFootnote', () => {
  it('parses simple footnote', () => {
    const result = parseFootnote('\\f + \\fr 1:1 \\ft Year of the World 1, Year before Christ 4004.\\f*');
    expect(result).toEqual({ chapter: 1, verse: 1, text: 'Year of the World 1, Year before Christ 4004.' });
  });

  it('parses long commentary with --- separators converted to <hr>', () => {
    const result = parseFootnote('\\f + \\fr 1:2 \\ft Spirit of God, giving life. (Haydock)---This Spirit is what the Pagan philosophers styled the Soul of the World. (Calmet)\\f*');
    expect(result).toEqual({
      chapter: 1, verse: 2,
      text: 'Spirit of God, giving life. (Haydock)<hr>This Spirit is what the Pagan philosophers styled the Soul of the World. (Calmet)'
    });
  });

  it('handles \\fr without space before \\ft', () => {
    const result = parseFootnote('\\f + \\fr 1:1\\ft Beginning. As St. Matthew begins...\\f*');
    expect(result).toEqual({ chapter: 1, verse: 1, text: 'Beginning. As St. Matthew begins...' });
  });

  it('parses chapter:verse 0 for chapter-level commentary', () => {
    const result = parseFootnote('\\f + \\fr 2:0 \\ft This psalm has no title.\\f*');
    expect(result).toEqual({ chapter: 2, verse: 0, text: 'This psalm has no title.' });
  });

  it('converts curly-brace side notes to parenthetical text', () => {
    const result = parseFootnote('\\f + \\fr 1:1\\ft The book of the{ Ver. 1. Liber Generationis.|} Generation.\\f*');
    expect(result).toEqual({ chapter: 1, verse: 1, text: 'The book of the (Ver. 1. Liber Generationis.) Generation.' });
  });

  it('returns null for non-footnote lines', () => {
    expect(parseFootnote('\\v 1 text')).toBeNull();
  });
});
```

- [ ] **Step 9: Implement parseFootnote**

Add to `scripts/extract-haydock.ts`:

```typescript
export interface ParsedFootnote {
  chapter: number;
  verse: number;
  text: string;
}

/** Parse a \\f footnote block. Returns null for non-footnote lines. */
export function parseFootnote(line: string): ParsedFootnote | null {
  const match = line.match(/^\\f\s+\+\s+\\fr\s+(\d+):(\d+)\s*\\ft\s*(.*?)\\f\*$/);
  if (!match) return null;
  const chapter = parseInt(match[1]);
  const verse = parseInt(match[2]);
  let text = match[3].trim();

  // Convert { text |} side notes to parenthetical
  text = text.replace(/\{([^|]*)\|\}/g, '($1)');

  // Convert --- separators to <hr> tags
  text = text.replace(/\s*-{3,}\s*/g, '<hr>');

  return { chapter, verse, text };
}
```

- [ ] **Step 10: Run tests**

Run: `npx vitest run scripts/extract-haydock.test.ts`
Expected: PASS

- [ ] **Step 11: Write tests for cross-reference parsing**

Add to `scripts/extract-haydock.test.ts`:

```typescript
import { parseCrossRef } from './extract-haydock';

describe('parseCrossRef', () => {
  it('parses cross-reference with multiple refs', () => {
    const result = parseCrossRef('\\x + \\xo 1:2 \\xt Acts 14:14.; Acts 17:24.; Psalm 32:6.\\x*');
    expect(result).toEqual({
      chapter: 1, verse: 2,
      refs: 'Acts 14:14.; Acts 17:24.; Psalm 32:6.'
    });
  });

  it('parses single ref', () => {
    const result = parseCrossRef('\\x + \\xo 1:3 \\xt Hebrews 11:3.\\x*');
    expect(result).toEqual({ chapter: 1, verse: 3, refs: 'Hebrews 11:3.' });
  });

  it('handles \\xo without space before \\xt', () => {
    const result = parseCrossRef('\\x + \\xo 1:2\\xt Acts 14:14.\\x*');
    expect(result).toEqual({ chapter: 1, verse: 2, refs: 'Acts 14:14.' });
  });

  it('returns null for non-crossref lines', () => {
    expect(parseCrossRef('\\f + \\fr 1:1 \\ft text\\f*')).toBeNull();
  });
});
```

- [ ] **Step 12: Implement parseCrossRef**

Add to `scripts/extract-haydock.ts`:

```typescript
export interface ParsedCrossRef {
  chapter: number;
  verse: number;
  refs: string;
}

/** Parse a \\x cross-reference block. Returns null for non-crossref lines. */
export function parseCrossRef(line: string): ParsedCrossRef | null {
  const match = line.match(/^\\x\s+\+\s+\\xo\s+(\d+):(\d+)\s*\\xt\s*(.*?)\\x\*$/);
  if (!match) return null;
  return {
    chapter: parseInt(match[1]),
    verse: parseInt(match[2]),
    refs: match[3].trim(),
  };
}
```

- [ ] **Step 13: Run tests**

Run: `npx vitest run scripts/extract-haydock.test.ts`
Expected: PASS

- [ ] **Step 14: Commit**

```bash
git add scripts/extract-haydock.ts scripts/extract-haydock.test.ts
git commit -m "Add Haydock PSFM parser: core parsing functions and tests"
```

---

### Task 2: PSFM Parser — Book-Level Processing

**Files:**
- Modify: `scripts/extract-haydock.ts`
- Modify: `scripts/extract-haydock.test.ts`

This task adds the function that processes an entire book file into structured data.

- [ ] **Step 1: Write test for parseBookFile**

Add to `scripts/extract-haydock.test.ts`:

```typescript
import { parseBookFile } from './extract-haydock';

describe('parseBookFile', () => {
  const samplePsfm = [
    '\\id GEN ENG (p.sfm) - Haydock',
    '\\ide UTF-8',
    '\\h Genesis',
    '\\toc1 Genesis',
    '\\toc2 Genesis',
    '\\toc3 Gen',
    '\\imt1 THE BOOK OF GENESIS.',
    '\\im This is the intro paragraph one.',
    '\\ip This is intro paragraph two.',
    '\\mt1 Genesis',
    '<>',
    '\\c 1',
    '\\cl Genesis 1',
    '\\cd God createth Heaven and Earth.',
    '\\p',
    '\\v 1 In the *beginning God created heaven and earth.',
    '\\p',
    '\\v 2 *And the earth was void.',
    '\\x + \\xo 1:1 \\xt Psalm 32:6.\\x*',
    '\\f + \\fr 1:1 \\ft Year of the World 1.\\f*',
    '\\f + \\fr 1:1 \\ft Beginning. Commentary text here.\\f*',
    '\\f + \\fr 1:2 \\ft Spirit of God. More commentary.\\f*',
    '<>',
    '\\c 2',
    '\\cl Genesis 2',
    '\\cd God resteth on the seventh day.',
    '\\p',
    '\\v 1 So the heavens and the earth were finished.',
  ].join('\n');

  it('extracts book slug from \\id line', () => {
    const result = parseBookFile(samplePsfm);
    expect(result.slug).toBe('genesis');
  });

  it('extracts intro paragraphs from \\im and \\ip lines', () => {
    const result = parseBookFile(samplePsfm);
    expect(result.intro).toEqual([
      'This is the intro paragraph one.',
      'This is intro paragraph two.',
    ]);
  });

  it('extracts chapters with summaries', () => {
    const result = parseBookFile(samplePsfm);
    expect(result.chapters).toHaveLength(2);
    expect(result.chapters[0].chapter).toBe(1);
    expect(result.chapters[0].summary).toBe('God createth Heaven and Earth.');
    expect(result.chapters[1].summary).toBe('God resteth on the seventh day.');
  });

  it('extracts verses with superscript markers', () => {
    const result = parseBookFile(samplePsfm);
    expect(result.chapters[0].verses).toHaveLength(2);
    expect(result.chapters[0].verses[0]).toEqual({ verse: 1, text: 'In the ¹beginning God created heaven and earth.' });
    expect(result.chapters[0].verses[1]).toEqual({ verse: 2, text: '¹And the earth was void.' });
  });

  it('extracts footnotes grouped by chapter and verse', () => {
    const result = parseBookFile(samplePsfm);
    const ch1Notes = result.commentary[1]; // chapter 1
    expect(ch1Notes).toHaveLength(3);
    expect(ch1Notes[0]).toEqual({ verse: 1, marker: '1', text: 'Year of the World 1.' });
    expect(ch1Notes[1]).toEqual({ verse: 1, marker: '2', text: 'Beginning. Commentary text here.' });
    expect(ch1Notes[2]).toEqual({ verse: 2, marker: '1', text: 'Spirit of God. More commentary.' });
  });

  it('extracts cross-references grouped by chapter', () => {
    const result = parseBookFile(samplePsfm);
    const ch1Refs = result.crossRefs[1];
    expect(ch1Refs).toHaveLength(1);
    expect(ch1Refs[0]).toEqual({ verse: 1, marker: 1, refs: 'Psalm 32:6.' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run scripts/extract-haydock.test.ts`
Expected: FAIL — `parseBookFile` not found

- [ ] **Step 3: Implement parseBookFile**

Add to `scripts/extract-haydock.ts`:

```typescript
export interface HaydockCommentaryEntry {
  verse: number;
  marker: string;
  text: string;
}

export interface HaydockCrossRefEntry {
  verse: number;
  marker: number;
  refs: string;
}

export interface HaydockChapter {
  chapter: number;
  summary: string;
  verses: { verse: number; text: string }[];
}

export interface ParsedBook {
  slug: string;
  intro: string[];
  chapters: HaydockChapter[];
  /** Commentary entries keyed by chapter number */
  commentary: Record<number, HaydockCommentaryEntry[]>;
  /** Cross-refs keyed by chapter number */
  crossRefs: Record<number, HaydockCrossRefEntry[]>;
}

/** Parse an entire PSFM book file into structured data. */
export function parseBookFile(content: string): ParsedBook {
  const lines = content.split('\n');

  let slug = '';
  const intro: string[] = [];
  const chapters: HaydockChapter[] = [];
  const commentary: Record<number, HaydockCommentaryEntry[]> = {};
  const crossRefs: Record<number, HaydockCrossRefEntry[]> = {};

  let currentChapter = 0;
  let currentSummary = '';
  let currentVerses: { verse: number; text: string }[] = [];
  let inIntro = false;

  // Track per-verse marker counters for commentary
  const verseMarkerCount: Record<string, number> = {}; // "chapter:verse" → count

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed === '<>') continue;

    // Book ID
    if (trimmed.startsWith('\\id ')) {
      const code = trimmed.split(/\s+/)[1];
      slug = usfmToSlug(code) ?? '';
      continue;
    }

    // Intro markers
    if (trimmed.startsWith('\\imt1 ') || trimmed.startsWith('\\imt3 ') || trimmed.startsWith('\\imt5 ')) {
      inIntro = true;
      continue; // Skip intro titles (they're just headings)
    }
    if (trimmed.startsWith('\\im ') || trimmed.startsWith('\\ip ')) {
      inIntro = true;
      const text = trimmed.replace(/^\\i[mp]\s+/, '').trim();
      if (text) intro.push(text);
      continue;
    }

    // Main title — marks end of intro
    if (trimmed.startsWith('\\mt1 ')) {
      inIntro = false;
      continue;
    }

    // Chapter start
    if (trimmed.startsWith('\\c ')) {
      // Save previous chapter
      if (currentChapter > 0) {
        chapters.push({ chapter: currentChapter, summary: currentSummary, verses: currentVerses });
      }
      currentChapter = parseInt(trimmed.replace('\\c ', ''));
      currentSummary = '';
      currentVerses = [];
      inIntro = false;
      continue;
    }

    // Chapter description (summary)
    if (trimmed.startsWith('\\cd ')) {
      currentSummary = trimmed.replace('\\cd ', '').trim();
      continue;
    }

    // Verse
    if (trimmed.startsWith('\\v ')) {
      const parsed = parseVerseText(trimmed);
      if (parsed) currentVerses.push({ verse: parsed.verse, text: parsed.text });
      continue;
    }

    // Footnote/commentary
    if (trimmed.startsWith('\\f ')) {
      const parsed = parseFootnote(trimmed);
      if (parsed) {
        const ch = parsed.chapter;
        if (!commentary[ch]) commentary[ch] = [];
        const key = `${ch}:${parsed.verse}`;
        verseMarkerCount[key] = (verseMarkerCount[key] ?? 0) + 1;
        commentary[ch].push({
          verse: parsed.verse,
          marker: String(verseMarkerCount[key]),
          text: parsed.text,
        });
      }
      continue;
    }

    // Cross-reference
    if (trimmed.startsWith('\\x ')) {
      const parsed = parseCrossRef(trimmed);
      if (parsed) {
        const ch = parsed.chapter;
        if (!crossRefs[ch]) crossRefs[ch] = [];
        crossRefs[ch].push({
          verse: parsed.verse,
          marker: crossRefs[ch].length + 1,
          refs: parsed.refs,
        });
      }
      continue;
    }

    // Skip: \p, \cl, \cl, \h, \toc*, \ide, \s1, \periph, \tr, \th*, \tc*, \ili, \iq, \ib*
  }

  // Save last chapter
  if (currentChapter > 0) {
    chapters.push({ chapter: currentChapter, summary: currentSummary, verses: currentVerses });
  }

  return { slug, intro, chapters, commentary, crossRefs };
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run scripts/extract-haydock.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add scripts/extract-haydock.ts scripts/extract-haydock.test.ts
git commit -m "Add parseBookFile: full PSFM book processing"
```

---

### Task 3: PSFM Parser — File I/O and JSON Output

**Files:**
- Modify: `scripts/extract-haydock.ts`

This task adds the main entry point that reads all 73 PSFM files and writes the four output directories.

- [ ] **Step 1: Implement the main extraction function and CLI entry point**

Add to `scripts/extract-haydock.ts`:

```typescript
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'fs';
import { join, basename } from 'path';

const PSFM_DIR = '/Users/Janvier/Library/Mobile Documents/com~apple~CloudDocs/for-the-kingdom/SCRIPTURA/sources/ODR/Haydock/ENG-B-Haydock1883-pd-PSFM-master';

/** Files to skip (front matter, NT intro, back matter) */
const SKIP_IDS = new Set(['FRT', 'INT', 'BAK']);

function extractAll() {
  const outBase = join(import.meta.dirname ?? '.', '..', 'static', 'data');
  const haydockDir = join(outBase, 'haydock');
  const commentaryDir = join(outBase, 'haydock-commentary');
  const crossRefsDir = join(outBase, 'haydock-crossrefs');
  const introsDir = join(outBase, 'haydock-intros');

  // Find all .p.sfm files
  const files = readdirSync(PSFM_DIR)
    .filter(f => f.endsWith('.p.sfm'))
    .sort();

  let bookCount = 0;
  let commentaryFiles = 0;
  let crossRefFiles = 0;

  for (const file of files) {
    // Extract book code from filename: "01-GEN-ENG[B]DRC1750[pd].p.sfm" → "GEN"
    const code = file.split('-')[1];
    if (SKIP_IDS.has(code)) {
      console.log(`  Skipping ${file} (${code})`);
      continue;
    }

    const content = readFileSync(join(PSFM_DIR, file), 'utf-8');
    const book = parseBookFile(content);

    if (!book.slug) {
      console.warn(`  WARNING: No slug for ${file}, skipping`);
      continue;
    }

    bookCount++;
    console.log(`  ${book.slug} — ${book.chapters.length} chapters`);

    // 1. Write verse text
    mkdirSync(haydockDir, { recursive: true });
    const bookJson = {
      book: book.slug,
      chapters: book.chapters.map(ch => ({
        chapter: ch.chapter,
        summary: ch.summary || undefined,
        verses: ch.verses,
      })),
    };
    writeFileSync(join(haydockDir, `${book.slug}.json`), JSON.stringify(bookJson));

    // 2. Write commentary (per chapter)
    for (const [chStr, entries] of Object.entries(book.commentary)) {
      const chDir = join(commentaryDir, book.slug);
      mkdirSync(chDir, { recursive: true });
      writeFileSync(join(chDir, `${chStr}.json`), JSON.stringify(entries));
      commentaryFiles++;
    }

    // 3. Write cross-refs (per chapter)
    for (const [chStr, entries] of Object.entries(book.crossRefs)) {
      const chDir = join(crossRefsDir, book.slug);
      mkdirSync(chDir, { recursive: true });
      writeFileSync(join(chDir, `${chStr}.json`), JSON.stringify(entries));
      crossRefFiles++;
    }

    // 4. Write intro
    if (book.intro.length > 0) {
      mkdirSync(introsDir, { recursive: true });
      writeFileSync(
        join(introsDir, `${book.slug}.json`),
        JSON.stringify({ book: book.slug, paragraphs: book.intro })
      );
    }
  }

  console.log(`\nDone: ${bookCount} books, ${commentaryFiles} commentary files, ${crossRefFiles} cross-ref files`);
}

// Run if executed directly
extractAll();
```

- [ ] **Step 2: Run the extraction**

Run: `npx tsx scripts/extract-haydock.ts`
Expected: Output listing 73 books with chapter counts. Creates `static/data/haydock/`, `static/data/haydock-commentary/`, `static/data/haydock-crossrefs/`, and `static/data/haydock-intros/`.

- [ ] **Step 3: Verify output**

Run: `ls static/data/haydock/ | wc -l` → 73
Run: `find static/data/haydock-commentary -name '*.json' | wc -l` → should be ~1200+
Run: `find static/data/haydock-crossrefs -name '*.json' | wc -l` → should be ~300+
Run: `ls static/data/haydock-intros/ | wc -l` → 73

Spot-check Genesis 1:
Run: `cat static/data/haydock/genesis.json | python3 -c "import json,sys; d=json.load(sys.stdin); ch=d['chapters'][0]; print(f'Ch {ch[\"chapter\"]}: {len(ch[\"verses\"])} verses, summary: {ch.get(\"summary\",\"\")[:60]}')"`
Expected: `Ch 1: 31 verses, summary: God createth Heaven and Earth, and all things therein,`

- [ ] **Step 4: Commit all extracted data**

```bash
git add scripts/extract-haydock.ts static/data/haydock/ static/data/haydock-commentary/ static/data/haydock-crossrefs/ static/data/haydock-intros/
git commit -m "Extract Haydock PSFM data: 73 books with commentary, cross-refs, and intros"
```

---

### Task 4: Translation Registration and Data Loaders

**Files:**
- Modify: `src/lib/data/translation-types.ts`
- Modify: `src/lib/stores/compare.ts`
- Modify: `src/lib/data/loader.ts`

- [ ] **Step 1: Add `summary` to `TranslationChapter` type**

In `src/lib/data/translation-types.ts`, change:

```typescript
export interface TranslationChapter {
	chapter: number;
	verses: TranslationVerse[];
}
```

to:

```typescript
export interface TranslationChapter {
	chapter: number;
	summary?: string;
	verses: TranslationVerse[];
}
```

- [ ] **Step 2: Add `'haydock'` to TranslationId and TRANSLATIONS**

In `src/lib/stores/compare.ts`, change the type:

```typescript
export type TranslationId = 'odr' | 'drc' | 'conf' | 'knox' | 'cpdv' | 'kjv' | 'vul' | 'rsv';
```

to:

```typescript
export type TranslationId = 'odr' | 'drc' | 'haydock' | 'conf' | 'knox' | 'cpdv' | 'kjv' | 'vul' | 'rsv';
```

Add the new entry to the `TRANSLATIONS` array, after the DRC entry (after line 61, before the `conf` entry):

```typescript
	{
		id: 'haydock',
		label: 'DRC Haydock',
		abbr: 'DRC-H',
		year: '1883',
		live: true,
		ntOnly: false,
		fullHeader: true,
		micro: 'DRC with Haydock Commentary'
	},
```

Bump `STORAGE_KEY` from `'compareStore_v4'` to `'compareStore_v5'` (line 132) so users get the new translation in their column order.

- [ ] **Step 3: Add Haydock loaders**

In `src/lib/data/loader.ts`, add after the `loadTranslationCrossRefs` section (~line 114):

```typescript
// ── Haydock commentary (per chapter) ────────────────────────────────

export interface HaydockCommentaryEntry {
	verse: number;
	marker: string;
	text: string;
}

const haydockCommentaryCache = new Map<string, Promise<HaydockCommentaryEntry[] | null>>();

export function loadHaydockCommentary(
	slug: string,
	chapter: number,
	fetch: typeof globalThis.fetch
): Promise<HaydockCommentaryEntry[] | null> {
	const key = `${slug}/${chapter}`;
	if (!haydockCommentaryCache.has(key)) {
		const promise = fetch(`/data/haydock-commentary/${slug}/${chapter}.json`).then((res) => {
			if (res.status === 404) return null;
			if (!res.ok) throw new Error(`Failed to load Haydock commentary: ${res.status}`);
			return res.json() as Promise<HaydockCommentaryEntry[]>;
		});
		promise.then(null, () => haydockCommentaryCache.delete(key));
		haydockCommentaryCache.set(key, promise);
	}
	return haydockCommentaryCache.get(key)!;
}

// ── Haydock book introductions ──────────────────────────────────────

export interface HaydockIntro {
	book: string;
	paragraphs: string[];
}

const haydockIntroCache = new Map<string, Promise<HaydockIntro | null>>();

export function loadHaydockIntro(
	slug: string,
	fetch: typeof globalThis.fetch
): Promise<HaydockIntro | null> {
	if (!haydockIntroCache.has(slug)) {
		const promise = fetch(`/data/haydock-intros/${slug}.json`).then((res) => {
			if (res.status === 404) return null;
			if (!res.ok) throw new Error(`Failed to load Haydock intro: ${res.status}`);
			return res.json() as Promise<HaydockIntro>;
		});
		promise.then(null, () => haydockIntroCache.delete(slug));
		haydockIntroCache.set(slug, promise);
	}
	return haydockIntroCache.get(slug)!;
}
```

- [ ] **Step 4: Run type check**

Run: `npm run check`
Expected: No type errors

- [ ] **Step 5: Commit**

```bash
git add src/lib/data/translation-types.ts src/lib/stores/compare.ts src/lib/data/loader.ts
git commit -m "Register DRC Haydock translation and add data loaders"
```

---

### Task 5: StudyPanel — Haydock Tabs and Data Loading

**Files:**
- Modify: `src/lib/components/StudyPanel.svelte`

- [ ] **Step 1: Add Haydock detection flags and data loading**

In `StudyPanel.svelte`, after the `isConf` declaration (~line 46), add:

```typescript
$: isHaydock = translationId === 'haydock';
```

After the `translationCrossRefs` loading block, add Haydock commentary and intro loading:

```typescript
// ── Haydock commentary ──────────────────────────────────────────
let haydockCommentary: HaydockCommentaryEntry[] | null = null;
let haydockCommentaryLoading = false;
let lastHaydockCommentaryKey = '';

$: {
    const key = `${translationId}/${currentBookSlug}/${currentChapterNum}`;
    if (isHaydock && currentBookSlug && key !== lastHaydockCommentaryKey) {
        lastHaydockCommentaryKey = key;
        const slug = currentBookSlug;
        const chNum = currentChapterNum;
        haydockCommentaryLoading = true;
        haydockCommentary = null;
        loadHaydockCommentary(slug, chNum, fetch)
            .then((data) => {
                if (`haydock/${slug}/${chNum}` === lastHaydockCommentaryKey) {
                    haydockCommentary = data;
                    haydockCommentaryLoading = false;
                }
            })
            .catch(() => {
                haydockCommentaryLoading = false;
            });
    } else if (!isHaydock) {
        haydockCommentary = null;
    }
}

// ── Haydock intro ───────────────────────────────────────────────
let haydockIntro: HaydockIntro | null = null;
let lastHaydockIntroSlug = '';

$: {
    if (isHaydock && currentBookSlug && currentBookSlug !== lastHaydockIntroSlug) {
        lastHaydockIntroSlug = currentBookSlug;
        const slug = currentBookSlug;
        loadHaydockIntro(slug, fetch)
            .then((data) => {
                if (slug === lastHaydockIntroSlug) haydockIntro = data;
            })
            .catch(() => {});
    } else if (!isHaydock) {
        haydockIntro = null;
    }
}
```

Add imports at the top of the script:

```typescript
import { loadHaydockCommentary, loadHaydockIntro } from '$lib/data/loader';
import type { HaydockCommentaryEntry, HaydockIntro } from '$lib/data/loader';
```

- [ ] **Step 2: Add Haydock tab configuration**

In the `buildVisibleTabs` function, after the `if (tid === 'drc')` block (~line 257), add:

```typescript
if (tid === 'haydock') {
    const tabs: TabDef[] = [];
    if (haydockIntro && haydockIntro.paragraphs.length > 0) {
        tabs.push({ id: 'intro', label: 'Intro' });
    }
    tabs.push({ id: 'commentary', label: 'Commentary' });
    tabs.push({ id: 'cross-refs', label: 'Cross-Refs' });
    return tabs;
}
```

Update the `buildVisibleTabs` call to include `haydockIntro` as a dependency so it recomputes when intro loads:

```typescript
$: visibleTabs = buildVisibleTabs(
    translationId,
    hasIntros,
    hasArticles,
    hasEndMatters,
    confIntro,
    haydockIntro
);
```

Update the function signature to accept the new parameter:

```typescript
function buildVisibleTabs(
    tid: string,
    hasIntros: boolean,
    hasArticles: boolean,
    hasEndMatters: boolean,
    confIntro: ConfIntro | null,
    haydockIntro: HaydockIntro | null
): TabDef[] {
```

- [ ] **Step 3: Update default tab logic for Haydock**

In the book-change reactive block, add Haydock handling. After the `} else if (translationId === 'conf') {` block, add:

```typescript
} else if (isHaydock) {
    defaultTab = 'commentary';
    if (preferred === 'commentary' || preferred === 'cross-refs') {
        defaultTab = preferred;
    }
    if (preferred === 'intro' && haydockIntro && haydockIntro.paragraphs.length > 0) {
        defaultTab = 'intro';
    }
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/components/StudyPanel.svelte
git commit -m "Add Haydock data loading and tab configuration to StudyPanel"
```

---

### Task 6: StudyPanel — Haydock Tab Rendering

**Files:**
- Modify: `src/lib/components/StudyPanel.svelte`

- [ ] **Step 1: Add Haydock Intro tab rendering**

In the template section, before the `<!-- ═══ DRC/Knox/CPDV: Translation Notes tab ═══ -->` block (~line 1044), add:

```svelte
<!-- ═══ Haydock: Intro tab ═══ -->
{:else if $studyPanel.activeTab === 'intro' && isHaydock && haydockIntro}
    <div class="content-block">
        <p class="content-eyebrow">Introduction · Haydock</p>
        {#each haydockIntro.paragraphs as para}
            <p class="prose-para">{@html linkifyDrcRefs(para)}</p>
        {/each}
    </div>

<!-- ═══ Haydock: Commentary tab ═══ -->
{:else if $studyPanel.activeTab === 'commentary' && isHaydock}
    {#if haydockCommentaryLoading}
        <div class="empty-state"><p>Loading commentary...</p></div>
    {:else if haydockCommentary && haydockCommentary.length > 0}
        <div class="content-block">
            <p class="content-eyebrow">Haydock Commentary</p>
            {@const grouped = groupByVerse(haydockCommentary)}
            {#each grouped as group (group.verse)}
                <div
                    class="verse-section"
                    class:verse-section-active={$studyPanel.annotatedVerse === group.verse}
                    bind:this={sectionEls[group.verse]}
                    data-section-verse={group.verse}
                >
                    <div class="verse-section-header verse-section-header-sticky">
                        {group.verse === 0 ? 'Chapter' : `Verse ${group.verse}`}
                    </div>
                    {#each group.entries as entry}
                        <div class="haydock-entry" data-panel-id="panel-{group.verse}-commentary-{entry.marker}">
                            <span class="cr-marker">{entry.marker}</span>
                            <span class="note-text">{@html linkifyDrcRefs(entry.text)}</span>
                        </div>
                    {/each}
                </div>
            {/each}
        </div>
    {:else}
        <div class="empty-state">
            <span class="empty-icon" aria-hidden="true">✦</span>
            <p>No commentary for this chapter.</p>
        </div>
    {/if}

<!-- ═══ Haydock: Cross-Refs tab ═══ -->
{:else if $studyPanel.activeTab === 'cross-refs' && isHaydock}
    {#if translationCrossRefsLoading}
        <div class="empty-state"><p>Loading cross-references...</p></div>
    {:else if translationCrossRefs && translationCrossRefs.length > 0}
        <div class="content-block">
            <p class="content-eyebrow">Cross-References · DRC-H</p>
            {#each translationCrossRefs as cr (cr.marker)}
                <div class="cr-row">
                    <span class="cr-marker">{cr.marker}</span>
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

- [ ] **Step 2: Add the groupByVerse helper**

In the `<script>` section, add:

```typescript
/** Group flat commentary entries by verse for section rendering */
function groupByVerse(entries: HaydockCommentaryEntry[]): { verse: number; entries: HaydockCommentaryEntry[] }[] {
    const map = new Map<number, HaydockCommentaryEntry[]>();
    for (const e of entries) {
        if (!map.has(e.verse)) map.set(e.verse, []);
        map.get(e.verse)!.push(e);
    }
    return Array.from(map.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([verse, entries]) => ({ verse, entries }));
}
```

- [ ] **Step 3: Update cross-refs loading to support Haydock**

The existing `translationCrossRefs` loading block only runs for `isDrc`. Update the condition to also load for Haydock. Find the reactive block that loads `translationCrossRefs` and change `isDrc` condition to `isDrc || isHaydock`:

Where it says:
```typescript
if (isDrc && currentBookSlug && key !== lastTranslationCrossRefsKey) {
```
Change to:
```typescript
if ((isDrc || isHaydock) && currentBookSlug && key !== lastTranslationCrossRefsKey) {
```

And where it resets:
```typescript
} else if (!isDrc) {
```
Change to:
```typescript
} else if (!isDrc && !isHaydock) {
```

- [ ] **Step 4: Add Haydock to VerseTooltip condition**

Find the `hasLinkifiedNotes` condition and update it to include Haydock:

```typescript
$: hasLinkifiedNotes = isDrc || isKnox || isHaydock;
```

- [ ] **Step 5: Run dev server and test**

Run: `npm run dev`
Navigate to `http://localhost:5173/haydock/genesis/1`
Expected: Chapter loads with verse text, StudyPanel shows Commentary and Cross-Refs tabs, intro tab appears.

- [ ] **Step 6: Commit**

```bash
git add src/lib/components/StudyPanel.svelte
git commit -m "Add Haydock commentary, intro, and cross-refs rendering to StudyPanel"
```

---

### Task 7: VerseList — Haydock Marker Interaction

**Files:**
- Modify: `src/lib/components/VerseList.svelte`

- [ ] **Step 1: Add Haydock commentary loading for popovers**

In `VerseList.svelte`, the existing DRC cross-refs loading block loads data for hover popovers. Add a similar block for Haydock commentary. After the DRC cross-refs block (~line 39), add:

```typescript
// ── Haydock commentary (loaded for hover popovers) ────
let haydockCommentary: HaydockCommentaryEntry[] | null = null;
let lastHaydockKey = '';

$: {
    const key = `${bookSlug}/${chapterNum}`;
    if (browser && translationId === 'haydock' && key !== lastHaydockKey) {
        lastHaydockKey = key;
        loadHaydockCommentary(bookSlug, chapterNum, fetch)
            .then((data) => {
                if (`${bookSlug}/${chapterNum}` === lastHaydockKey) haydockCommentary = data;
            })
            .catch(() => {});
    } else if (translationId !== 'haydock') {
        haydockCommentary = null;
    }
}
```

Add imports:

```typescript
import { loadHaydockCommentary } from '$lib/data/loader';
import type { HaydockCommentaryEntry } from '$lib/data/loader';
```

- [ ] **Step 2: Update handleMarkerClick for Haydock**

In `handleMarkerClick`, add a case for Haydock markers. After the `drc-crossref` case (~line 198), add:

```typescript
if (type === 'haydock-commentary') {
    studyPanel.update((s) => ({ ...s, activeTab: 'commentary' as StudyTab, annotatedVerse: verseNum }));
    scrollTrigger.set({ verse: verseNum, type: 'annotation', marker });
    return;
}
```

Update the type annotation on line 193:

```typescript
const type = btn.dataset.markerType as 'cross_ref' | 'note' | 'drc-crossref' | 'haydock-commentary';
```

- [ ] **Step 3: Update resolveMarkerContent for Haydock**

In `resolveMarkerContent`, add Haydock commentary lookup. After the `drc-crossref` case (~line 243), add:

```typescript
if (type === 'haydock-commentary') {
    const entry = haydockCommentary?.find((c) => c.verse === verseNum && c.marker === marker);
    if (!entry) return null;
    // Show first 200 chars of commentary in popover
    const preview = entry.text.replace(/<hr>/g, ' — ').slice(0, 200);
    return { label: marker, content: preview + (entry.text.length > 200 ? '…' : ''), type: 'note' };
}
```

- [ ] **Step 4: Update renderVerse to handle Haydock superscript markers**

The existing `renderVerse` function already handles DRC superscript markers via `SUPER_RE`. Since the Haydock extraction converts asterisks to the same Unicode superscripts (¹²³), the existing `renderDrcMarkers` and `stripDrcMarkers` functions will work. However, the `data-marker-type` needs to be `haydock-commentary` instead of `drc-crossref` for Haydock.

Add a new function after `renderDrcMarkers`:

```typescript
/** Convert Haydock superscript markers (¹²³) to clickable buttons in study mode */
function renderHaydockMarkers(text: string, verseNum: number): string {
    return text.replace(SUPER_RE, (match) => {
        const num = match
            .split('')
            .map((c) => SUPER_TO_DIGIT[c] ?? c)
            .join('');
        return `<button class="study-marker" data-marker-type="haydock-commentary" data-marker="${num}" data-verse="${verseNum}" aria-label="Commentary ${num}">${num}</button>`;
    });
}
```

Update `renderVerse` to use the correct marker function based on translation. Change lines 171-175:

```typescript
// Superscript markers (¹²³) — convert to buttons in study mode, strip in reading mode
if (SUPER_RE.test(t)) {
    SUPER_RE.lastIndex = 0;
    if (isStudy) {
        t = translationId === 'haydock' ? renderHaydockMarkers(t, verseNum) : renderDrcMarkers(t, verseNum);
    } else {
        t = stripDrcMarkers(t);
    }
}
```

The `renderVerse` function needs access to `translationId`. It's already available in the component scope, so no parameter change needed — just reference the component-level `translationId` prop.

- [ ] **Step 5: Run dev server and test markers**

Run: `npm run dev`
Navigate to `http://localhost:5173/haydock/genesis/1`
Expected: 
- Superscript markers in verse text are clickable buttons (accent-red)
- Hovering a marker shows a popover preview of the commentary
- Clicking a marker switches to the Commentary tab and scrolls to the verse

- [ ] **Step 6: Commit**

```bash
git add src/lib/components/VerseList.svelte
git commit -m "Add Haydock marker interaction: popovers, click-to-commentary"
```

---

### Task 8: End-to-End Verification

**Files:** None (testing only)

- [ ] **Step 1: Run type check**

Run: `npm run check`
Expected: No errors

- [ ] **Step 2: Run existing tests**

Run: `npm run test`
Expected: All existing tests pass

- [ ] **Step 3: Run lint and format**

Run: `npm run format && npm run lint`
Expected: No errors

- [ ] **Step 4: Manual smoke test**

Test the following pages in the browser:

1. `/haydock/genesis/1` — OT, first book
   - Verify: verse text renders, chapter summary above verses, commentary tab with extensive entries, cross-refs tab, intro tab
   - Verify: markers clickable, popovers work

2. `/haydock/psalms/1` — Psalms
   - Verify: Latin subtitle (`Beatus vir.`) renders if captured, commentary loads

3. `/haydock/matthew/1` — NT, first book
   - Verify: commentary with `{ }` side notes converted to parentheticals, `---` converted to `<hr>`

4. `/haydock/apocalypse/22` — Last chapter of last book
   - Verify: data loads correctly, no missing chapters

5. Compare page — `/compare/genesis/1`
   - Verify: DRC Haydock appears as a column option

- [ ] **Step 5: Commit any fixes, then final commit**

```bash
git add -A
git commit -m "DRC Haydock: end-to-end verification and fixes"
```
