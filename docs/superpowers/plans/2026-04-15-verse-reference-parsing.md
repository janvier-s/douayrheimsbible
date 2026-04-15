# Verse Reference Parsing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make all verse references in the Study Panel interactive — hover shows verse text in a popover, click opens the verse in search mode in a new tab.

**Architecture:** A custom tokenizer (`crossRefParser.ts`) walks cross-ref strings left-to-right, matching known old Douay-Rheims abbreviations and distinguishing Bible refs from patristic citations by requiring a number to follow the abbreviation. For prose notes, `<i>` tags wrapping verse refs are detected via a simpler string preprocessor. Both surfaces use an adapted `VerseTooltip` that fetches verse text from already-cached book data.

**Tech Stack:** SvelteKit, TypeScript, Svelte 5, Vitest (tests in `tests/unit/`), existing `loadBook()` + `OSIS_TO_SLUG` from `src/lib/search/resolve.ts`.

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `src/lib/search/crossRefParser.ts` | **Create** | Abbreviation table, tokenizer, `parseItalicRef()` |
| `tests/unit/crossRefParser.test.ts` | **Create** | Unit tests for the parser |
| `src/lib/components/VerseTooltip.svelte` | **Rewrite** | Accept `OsisRange[]`, fetch verse text, show popover |
| `src/lib/components/CrossRefText.svelte` | **Create** | Renders tokenized cross-ref with inline links + popover |
| `src/lib/components/StudyPanel.svelte` | **Modify** | Replace `cr-text` span with `<CrossRefText>` |
| `src/lib/components/AnnotationProse.svelte` | **Modify** | Add `linkifyItalicRefs()` + verse-ref event delegation |

---

## Task 1: Write failing tests for the cross-ref tokenizer

**Files:**
- Create: `tests/unit/crossRefParser.test.ts`

- [ ] **Step 1: Create the test file**

```typescript
// tests/unit/crossRefParser.test.ts
import { describe, it, expect } from 'vitest';
import { tokenizeCrossRef, parseItalicRef } from '$lib/search/crossRefParser';

describe('tokenizeCrossRef', () => {
  it('parses a single verse reference', () => {
    const tokens = tokenizeCrossRef('Luc. 10, 16.');
    expect(tokens).toHaveLength(1);
    expect(tokens[0]).toEqual({ type: 'ref', osis: 'Luke.10.16', isVerse: true });
  });

  it('parses a chapter-only reference', () => {
    const tokens = tokenizeCrossRef('2. Thess. 2.');
    expect(tokens).toHaveLength(1);
    expect(tokens[0]).toEqual({ type: 'ref', osis: '2Thess.2', isVerse: false });
  });

  it('parses multiple refs in one string', () => {
    const tokens = tokenizeCrossRef('Luc. 10, 16. Act. 15, 28.');
    const refs = tokens.filter(t => t.type === 'ref');
    expect(refs).toHaveLength(2);
    expect(refs[0]).toMatchObject({ osis: 'Luke.10.16' });
    expect(refs[1]).toMatchObject({ osis: 'Acts.15.28' });
  });

  it('leaves patristic citations as text tokens', () => {
    const tokens = tokenizeCrossRef('S. Aug. l. 11. de Gen. ad lit c. 4.');
    expect(tokens.every(t => t.type === 'text')).toBe(true);
  });

  it('does not false-positive on Gen in patristic citation', () => {
    const tokens = tokenizeCrossRef('Ori. super. Gen. c. 1.');
    expect(tokens.filter(t => t.type === 'ref')).toHaveLength(0);
  });

  it('handles mixed Bible refs and patristic text', () => {
    const tokens = tokenizeCrossRef('Gen. 1. v. 3. S. Aug. de Gen. cont. Manich.');
    const refs = tokens.filter(t => t.type === 'ref');
    expect(refs).toHaveLength(1);
    expect(refs[0]).toMatchObject({ osis: 'Gen.1.3' });
  });

  it('parses period-separated chapter:verse (Gen. 1. v. 3.)', () => {
    const tokens = tokenizeCrossRef('Gen. 1. v. 3.');
    expect(tokens.filter(t => t.type === 'ref')).toHaveLength(1);
    expect(tokens[0]).toMatchObject({ osis: 'Gen.1.3', isVerse: true });
  });

  it('parses numbered book with digit prefix (1. Cor. 15, 28.)', () => {
    const tokens = tokenizeCrossRef('1. Cor. 15, 28.');
    expect(tokens[0]).toMatchObject({ osis: '1Cor.15.28', isVerse: true });
  });

  it('parses Joan. as John', () => {
    const tokens = tokenizeCrossRef('Joan. 8, 25.');
    expect(tokens[0]).toMatchObject({ osis: 'John.8.25' });
  });

  it('returns a single text token for purely patristic strings', () => {
    const tokens = tokenizeCrossRef('Hier. Epist. 83. ad Ocea. Tert. de Baptis.');
    expect(tokens.every(t => t.type === 'text')).toBe(true);
  });
});

describe('parseItalicRef', () => {
  it('parses a simple italic ref', () => {
    const result = parseItalicRef('Act. 13, 14.');
    expect(result).not.toBeNull();
    expect(result![0]).toMatchObject({ book: 'Acts', startChapter: 13, startVerse: 14 });
  });

  it('parses multiple refs in one italic span', () => {
    const result = parseItalicRef('Act. 13, 14. Levit. 23.');
    expect(result).not.toBeNull();
    expect(result!.length).toBeGreaterThanOrEqual(1);
  });

  it('returns null for non-reference italic text', () => {
    const result = parseItalicRef('rested the seventh day');
    expect(result).toBeNull();
  });

  it('returns null for patristic citation', () => {
    const result = parseItalicRef('Homi. in 40 Martyres.');
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests — expect all to fail**

```bash
cd "/Users/Janvier/Library/Mobile Documents/com~apple~CloudDocs/for-the-kingdom/douayrheimsbible"
npm test -- --reporter=verbose tests/unit/crossRefParser.test.ts
```

Expected: all tests FAIL with "Cannot find module '$lib/search/crossRefParser'"

---

## Task 2: Implement crossRefParser.ts

**Files:**
- Create: `src/lib/search/crossRefParser.ts`

- [ ] **Step 1: Create the file with the abbreviation table and types**

```typescript
// src/lib/search/crossRefParser.ts
import type { OsisRange } from './reference';
import { parseAllReferences } from './reference';

export type CrossRefToken =
  | { type: 'ref'; osis: string; isVerse: boolean }
  | { type: 'text'; content: string };

/**
 * Map of old Douay-Rheims / Latin abbreviations → OSIS book codes.
 * Numbered books (2Thess, 1Cor) include the digit prefix in the key.
 */
const ABBREV_TO_OSIS: Record<string, string> = {
  // Pentateuch
  Gen: 'Gen',
  Exo: 'Exod', Exod: 'Exod',
  Lev: 'Lev', Levit: 'Lev',
  Num: 'Num', Numer: 'Num',
  Deut: 'Deut', Deuteron: 'Deut',
  // Historical
  Jos: 'Josh', Josue: 'Josh',
  Judic: 'Judg',
  Ruth: 'Ruth',
  '1Reg': '1Sam', '2Reg': '2Sam', '3Reg': '1Kgs', '4Reg': '2Kgs',
  '1Par': '1Chr', '2Par': '2Chr',
  '1Paral': '1Chr', '2Paral': '2Chr',
  '1Paralip': '1Chr', '2Paralip': '2Chr',
  '1Esd': 'Ezra', '2Esd': 'Neh', Esdr: 'Ezra',
  Tob: 'Tob', Tobias: 'Tob',
  Judith: 'Jdt', Jdt: 'Jdt',
  Esth: 'Esth', Esther: 'Esth',
  '1Mach': '1Macc', '2Mach': '2Macc',
  '1Mac': '1Macc', '2Mac': '2Macc',
  '1Macch': '1Macc', '2Macch': '2Macc',
  // Wisdom
  Job: 'Job',
  Ps: 'Ps', Psal: 'Ps', Psalm: 'Ps',
  Prov: 'Prov', Prover: 'Prov',
  Eccl: 'Eccl',
  Ecclus: 'Sir', Eccli: 'Sir',
  Cant: 'Cant', Song: 'Cant',
  Sap: 'Wis', Wisd: 'Wis',
  // Major prophets
  Isa: 'Isa', Isai: 'Isa',
  Jer: 'Jer', Jerem: 'Jer',
  Lam: 'Lam', Thren: 'Lam',
  Bar: 'Bar',
  Ezech: 'Ezek',
  Dan: 'Dan',
  // Minor prophets
  Osee: 'Hos',
  Joel: 'Joel',
  Amos: 'Amos',
  Abd: 'Obad', Abdias: 'Obad',
  Jon: 'Jonah', Jonas: 'Jonah',
  Mich: 'Mic', Micheas: 'Mic',
  Nah: 'Nah', Nahum: 'Nah',
  Habac: 'Hab',
  Soph: 'Zeph', Sophon: 'Zeph', Sophonias: 'Zeph',
  Agg: 'Hag', Aggeus: 'Hag',
  Zach: 'Zech', Zacharias: 'Zech',
  Mal: 'Mal', Malach: 'Mal',
  // NT Gospels & Acts
  Matt: 'Matt', Mat: 'Matt',
  Mar: 'Mark', Marc: 'Mark', Mark: 'Mark',
  Luc: 'Luke', Luk: 'Luke',
  Joan: 'John', Joa: 'John',
  Act: 'Acts',
  // NT Epistles
  Rom: 'Rom',
  '1Cor': '1Cor', '2Cor': '2Cor',
  Gal: 'Gal',
  Eph: 'Eph', Ephes: 'Eph',
  Phil: 'Phil', Philipp: 'Phil',
  Col: 'Col', Coloss: 'Col',
  '1Thess': '1Thess', '2Thess': '2Thess',
  '1Thes': '1Thess', '2Thes': '2Thess',
  '1Tim': '1Tim', '2Tim': '2Tim',
  Tit: 'Titus', Titus: 'Titus',
  Philem: 'Phlm',
  Heb: 'Heb', Hebr: 'Heb',
  Jac: 'Jas', Jacob: 'Jas', Jas: 'Jas',
  '1Pet': '1Pet', '2Pet': '2Pet',
  '1Petr': '1Pet', '2Petr': '2Pet',
  '1Joan': '1John', '2Joan': '2John', '3Joan': '3John',
  Jude: 'Jude', Judas: 'Jude',
  Apoc: 'Rev', Apocalypse: 'Rev',
};

// Sort longest-first so greedy matching picks e.g. "Sophonias" over "Soph"
const SORTED_ABBREVS = Object.keys(ABBREV_TO_OSIS).sort((a, b) => b.length - a.length);
```

- [ ] **Step 2: Add the tokenizer function**

Append to `src/lib/search/crossRefParser.ts`:

```typescript
/**
 * Try to match a Bible book abbreviation at `pos` in `text`.
 * Optionally preceded by a book-number prefix like "2. ".
 * Requires a digit or "v." to follow (disambiguation: patristic text
 * like "de Gen. c. 1" has "c." after the abbreviation, not a digit).
 * Returns null if no match found.
 */
function matchBookAt(
  text: string,
  pos: number
): { osisBook: string; end: number; displayStart: number } | null {
  let displayStart = pos;
  let lookupPos = pos;
  let bookNum: number | null = null;

  // Optional numeric book prefix: "1. ", "2. ", etc.
  const numMatch = /^(\d)\.\s*/.exec(text.slice(pos));
  if (numMatch) {
    bookNum = parseInt(numMatch[1]);
    lookupPos = pos + numMatch[0].length;
  }

  for (const abbrev of SORTED_ABBREVS) {
    if (!text.startsWith(abbrev, lookupPos)) continue;

    const key = bookNum !== null ? `${bookNum}${abbrev}` : abbrev;
    const osisBook = ABBREV_TO_OSIS[key] ?? (bookNum === null ? null : null);
    if (!osisBook) continue;

    // Skip optional trailing period + whitespace after abbreviation
    const afterAbbrev = lookupPos + abbrev.length;
    const trailMatch = /^\.?\s*/.exec(text.slice(afterAbbrev));
    const contentStart = afterAbbrev + (trailMatch?.[0].length ?? 0);

    // Disambiguation: must be followed by digit or explicit verse marker
    const rest = text.slice(contentStart);
    if (!/^\d/.test(rest) && !rest.startsWith('v.')) continue;

    return { osisBook, end: contentStart, displayStart };
  }
  return null;
}

/**
 * Parse chapter + verse starting at `pos`.
 * Handles: "N, N" (comma-sep), "N. v. N" (v. marker), "N. N." (period-sep),
 * and "& N" continuations in the same chapter.
 * Returns the parsed tokens and how many characters were consumed.
 */
function parseChapterVerse(
  text: string,
  pos: number,
  osisBook: string
): { tokens: CrossRefToken[]; consumed: number } {
  const tokens: CrossRefToken[] = [];
  let p = pos;

  // Parse chapter number
  const chMatch = /^(\d+)/.exec(text.slice(p));
  if (!chMatch) return { tokens: [], consumed: 0 };
  const chapter = parseInt(chMatch[1]);
  p += chMatch[0].length;

  // Skip optional period + whitespace
  p += /^\.?\s*/.exec(text.slice(p))![0].length;

  let verse: number | null = null;

  // Comma-separated verse: ", N"
  const commaMatch = /^,\s*(\d+)/.exec(text.slice(p));
  if (commaMatch) {
    verse = parseInt(commaMatch[1]);
    p += commaMatch[0].length;
    p += /^\.?\s*/.exec(text.slice(p))![0].length;
  } else {
    // Explicit verse marker: "v. N"
    const vMatch = /^v\.\s*(\d+)/.exec(text.slice(p));
    if (vMatch) {
      verse = parseInt(vMatch[1]);
      p += vMatch[0].length;
      p += /^\.?\s*/.exec(text.slice(p))![0].length;
    } else {
      // Period-separated: next token is verse if followed by period/whitespace/end
      // e.g. "20. 5." — we already consumed "20", now at "5."
      const dotVerseMatch = /^(\d+)(?:\.|$|\s)/.exec(text.slice(p));
      if (dotVerseMatch) {
        verse = parseInt(dotVerseMatch[1]);
        p += dotVerseMatch[0].length;
        p += /^\s*/.exec(text.slice(p))![0].length;
      }
    }
  }

  const osis = verse !== null ? `${osisBook}.${chapter}.${verse}` : `${osisBook}.${chapter}`;
  tokens.push({ type: 'ref', osis, isVerse: verse !== null });

  // "& N" continuations: same chapter, additional verses
  while (verse !== null) {
    const ampMatch = /^&\s*(\d+)(?:\.\s*)?(?!\s*[A-Z])/.exec(text.slice(p));
    if (!ampMatch) break;
    const addVerse = parseInt(ampMatch[1]);
    p += ampMatch[0].length;
    p += /^\s*/.exec(text.slice(p))![0].length;
    tokens.push({ type: 'ref', osis: `${osisBook}.${chapter}.${addVerse}`, isVerse: true });
  }

  return { tokens, consumed: p - pos };
}

/**
 * Tokenize a Douay-Rheims cross-reference string into Bible ref tokens
 * and plain text tokens. Patristic citations (which lack a digit after
 * the abbreviation) fall through as text tokens untouched.
 */
export function tokenizeCrossRef(text: string): CrossRefToken[] {
  const result: CrossRefToken[] = [];
  let pos = 0;
  let textStart = 0;

  while (pos < text.length) {
    const match = matchBookAt(text, pos);

    if (match) {
      // Flush any text before this match
      if (match.displayStart > textStart) {
        result.push({ type: 'text', content: text.slice(textStart, match.displayStart) });
      }

      const { tokens, consumed } = parseChapterVerse(text, match.end, match.osisBook);
      if (tokens.length > 0) {
        result.push(...tokens);
        pos = match.end + consumed;
        textStart = pos;
        continue;
      }
    }

    pos++;
  }

  // Flush remaining text
  if (textStart < text.length) {
    result.push({ type: 'text', content: text.slice(textStart) });
  }

  return result;
}

/**
 * Try to parse the content of an <i> tag as one or more verse references.
 * Uses the existing `parseAllReferences` after normalizing old abbreviations.
 * Returns null if no valid Bible references are found.
 */
export function parseItalicRef(text: string): OsisRange[] | null {
  // Normalize old-style abbreviations to modern names that parseAllReferences understands
  let normalized = text;
  // Convert comma-as-separator to colon: "Luc. 10, 16" → "Luc. 10:16"
  // Pattern: number + comma + space + number (chapter,verse)
  normalized = normalized.replace(/(\d+),\s*(\d+)/g, '$1:$2');
  // Expand common abbreviations that the existing normaliser misses
  const ITALIC_ABBREVS: [RegExp, string][] = [
    [/\bLuc\b/g, 'Luke'],
    [/\bJoan\b/gi, 'John'],
    [/\bAct\b/g, 'Acts'],
    [/\bExo\b/g, 'Exodus'],
    [/\bLevit\b/g, 'Leviticus'],
    [/\bDeut\b/g, 'Deuteronomy'],
    [/\bJosue\b/gi, 'Joshua'],
    [/\bJudic\b/g, 'Judges'],
    [/\bPsal\b/g, 'Psalms'],
    [/\bEcclus\b/gi, 'Sirach'],
    [/\bEccli\b/g, 'Sirach'],
    [/\bSap\b/g, 'Wisdom'],
    [/\bIsai\b/g, 'Isaiah'],
    [/\bJerem\b/g, 'Jeremiah'],
    [/\bEzech\b/g, 'Ezekiel'],
    [/\bOsee\b/g, 'Hosea'],
    [/\bAbdias\b/g, 'Obadiah'],
    [/\bJonas\b/g, 'Jonah'],
    [/\bMicheas\b/g, 'Micah'],
    [/\bHabac\b/g, 'Habakkuk'],
    [/\bSophon\b/g, 'Zephaniah'],
    [/\bAggeus\b/g, 'Haggai'],
    [/\bZacharias\b/g, 'Zechariah'],
    [/\bApoc\b/g, 'Revelation'],
    [/\bMach\b/g, 'Maccabees'],
    [/\bParalip\b/g, 'Chronicles'],
    [/\b(\d)\.\s*Reg\b/g, (_, n) => ['', '1 Samuel', '2 Samuel', '1 Kings', '2 Kings'][parseInt(n)] ?? n + ' Kings'],
    [/\b(\d)\.\s*Par\b/g, (_, n) => n === '1' ? '1 Chronicles' : '2 Chronicles'],
    [/\b(\d)\.\s*Esd\b/g, (_, n) => n === '1' ? 'Ezra' : 'Nehemiah'],
    [/\b(\d)\.\s*Mach\b/g, (_, n) => n + ' Maccabees'],
    [/\b(\d)\.\s*Cor\b/g, (_, n) => n + ' Corinthians'],
    [/\b(\d)\.\s*Thess\b/g, (_, n) => n + ' Thessalonians'],
    [/\b(\d)\.\s*Tim\b/g, (_, n) => n + ' Timothy'],
    [/\b(\d)\.\s*Pet\b/g, (_, n) => n + ' Peter'],
    [/\b(\d)\.\s*Joan\b/g, (_, n) => n + ' John'],
  ];
  for (const [pat, rep] of ITALIC_ABBREVS) {
    normalized = normalized.replace(pat, rep as string);
  }

  const refs = parseAllReferences(normalized);
  return refs.length > 0 ? refs : null;
}
```

- [ ] **Step 3: Run the tests**

```bash
npm test -- --reporter=verbose tests/unit/crossRefParser.test.ts
```

Expected: all tests PASS. If any fail, fix the implementation before continuing.

- [ ] **Step 4: Commit**

```bash
git add src/lib/search/crossRefParser.ts tests/unit/crossRefParser.test.ts
git commit -m "feat: cross-ref tokenizer and parseItalicRef for old Douay-Rheims abbreviations"
```

---

## Task 3: Adapt VerseTooltip to fetch and display verse text

**Files:**
- Rewrite: `src/lib/components/VerseTooltip.svelte`

VerseTooltip is currently unused. We replace its interface entirely to accept `OsisRange[]` and fetch verse text internally.

- [ ] **Step 1: Rewrite VerseTooltip.svelte**

```svelte
<!-- src/lib/components/VerseTooltip.svelte -->
<script lang="ts">
  import { fade } from 'svelte/transition';
  import { loadBook } from '$lib/data/loader';
  import { OSIS_TO_SLUG } from '$lib/search/resolve';
  import { stripTags } from '$lib/utils/text';
  import type { OsisRange } from '$lib/search/reference';

  export let osisRanges: OsisRange[] = [];
  export let anchorEl: HTMLElement | null = null;
  export let visible: boolean = false;

  interface VerseEntry {
    ref: string;
    text: string;
  }

  let x = 0;
  let y = 0;
  let windowWidth = 1024;
  let loading = false;
  let entries: VerseEntry[] = [];

  const TOOLTIP_WIDTH = 320;
  const CLAMP_EDGE = TOOLTIP_WIDTH / 2 + 20;
  $: left = Math.min(Math.max(x, CLAMP_EDGE), windowWidth - CLAMP_EDGE);

  // Reposition and fetch whenever visibility or anchor changes
  $: if (visible && anchorEl) {
    const rect = anchorEl.getBoundingClientRect();
    x = rect.left + rect.width / 2;
    y = rect.top - 8;
    loadEntries(osisRanges);
  } else if (!visible) {
    entries = [];
    loading = false;
  }

  async function loadEntries(ranges: OsisRange[]) {
    const verseRanges = ranges.filter(r => r.startVerse !== undefined);
    if (verseRanges.length === 0) return;

    loading = true;
    const result: VerseEntry[] = [];

    for (const range of verseRanges) {
      const slug = OSIS_TO_SLUG[range.book];
      if (!slug) continue;
      try {
        const bookData = await loadBook(slug, fetch);
        const chapter = bookData.chapters.find(c => c.chapter === range.startChapter);
        const verse = chapter?.verses.find(v => v.verse === range.startVerse);
        if (verse) {
          result.push({
            ref: `${range.book} ${range.startChapter}:${range.startVerse}`,
            text: stripTags(verse.text),
          });
        }
      } catch {
        // silently skip on fetch error
      }
    }

    entries = result;
    loading = false;
  }
</script>

<svelte:window bind:innerWidth={windowWidth} />

{#if visible && (loading || entries.length > 0)}
  <!-- svelte-ignore a11y_mouse_events_have_key_events -->
  <div
    class="tooltip"
    style="left: {left}px; top: {y}px;"
    transition:fade={{ duration: 120 }}
    role="tooltip"
    on:mouseover
    on:mouseout
    on:focusin
    on:focusout
  >
    <div class="rule"></div>

    {#if loading}
      <div class="loading">
        <div class="shimmer"></div>
        <div class="shimmer shimmer-short"></div>
      </div>
    {:else}
      {#each entries as entry, i}
        {#if i > 0}<div class="entry-sep"></div>{/if}
        <div class="entry">
          <div class="header">
            <span class="sigil">verse</span>
            <span class="verse-ref">{entry.ref}</span>
          </div>
          <div class="sep"></div>
          <p class="verse-text">{entry.text}</p>
        </div>
      {/each}
    {/if}

    <div class="nib" aria-hidden="true"></div>
  </div>
{/if}

<style>
  .tooltip {
    position: fixed;
    z-index: 9999;
    transform: translateX(-50%) translateY(calc(-100% - 14px));
    width: 320px;
    background: var(--color-panel);
    border: 1px solid var(--color-border);
    padding: 0 0 14px;
    pointer-events: auto;
    box-shadow:
      0 2px 0 color-mix(in srgb, var(--color-accent) 20%, transparent),
      0 8px 24px color-mix(in srgb, var(--color-text) 18%, transparent),
      0 2px 6px color-mix(in srgb, var(--color-text) 10%, transparent);
  }

  .rule {
    height: 2px;
    background: var(--color-accent);
    margin-bottom: 10px;
  }

  .entry {
    padding: 0;
  }

  .entry-sep {
    height: 1px;
    background: var(--color-border);
    margin: 10px 14px;
  }

  .header {
    display: flex;
    align-items: baseline;
    gap: 5px;
    padding: 0 14px;
    margin-bottom: 8px;
  }

  .sigil {
    font-family: var(--font-ui);
    font-size: 9px;
    letter-spacing: 0.22em;
    color: var(--color-accent);
    font-weight: 600;
  }

  .verse-ref {
    font-family: var(--font-reader);
    font-size: 12px;
    color: var(--color-accent);
    font-weight: 700;
  }

  .sep {
    height: 1px;
    background: var(--color-border);
    margin: 0 14px 12px;
    opacity: 0.6;
  }

  .verse-text {
    font-family: var(--font-reader);
    font-size: 13.5px;
    font-style: italic;
    line-height: 1.65;
    color: var(--color-text);
    padding: 0 14px;
    margin: 0;
  }

  .loading {
    padding: 4px 14px 2px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .shimmer {
    height: 12px;
    border-radius: 2px;
    background: linear-gradient(
      90deg,
      color-mix(in srgb, var(--color-text) 8%, transparent) 0%,
      color-mix(in srgb, var(--color-text) 14%, transparent) 50%,
      color-mix(in srgb, var(--color-text) 8%, transparent) 100%
    );
    background-size: 200% 100%;
    animation: shimmer 1.2s infinite;
  }

  .shimmer-short { width: 60%; }

  @keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }

  .nib {
    position: absolute;
    bottom: -6px;
    left: 50%;
    transform: translateX(-50%);
    width: 10px;
    height: 6px;
    background: var(--color-panel);
    clip-path: polygon(0 0, 100% 0, 50% 100%);
  }

  .tooltip::after {
    content: '';
    position: absolute;
    bottom: -7px;
    left: 50%;
    transform: translateX(-50%);
    width: 12px;
    height: 7px;
    background: var(--color-border);
    clip-path: polygon(0 0, 100% 0, 50% 100%);
    z-index: -1;
  }
</style>
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run check
```

Expected: no errors on VerseTooltip.svelte

- [ ] **Step 3: Commit**

```bash
git add src/lib/components/VerseTooltip.svelte
git commit -m "feat: adapt VerseTooltip to fetch verse text from OsisRange array"
```

---

## Task 4: Create CrossRefText.svelte

**Files:**
- Create: `src/lib/components/CrossRefText.svelte`

- [ ] **Step 1: Create the component**

```svelte
<!-- src/lib/components/CrossRefText.svelte -->
<script lang="ts">
  import { tokenizeCrossRef } from '$lib/search/crossRefParser';
  import VerseTooltip from '$lib/components/VerseTooltip.svelte';
  import type { OsisRange } from '$lib/search/reference';
  import { parseAllReferences } from '$lib/search/reference';

  export let text: string;

  $: tokens = tokenizeCrossRef(text);

  let hoveredOsis: OsisRange[] = [];
  let anchorEl: HTMLElement | null = null;
  let tooltipVisible = false;
  let hoverTimer: ReturnType<typeof setTimeout> | null = null;

  function osisToRanges(osis: string): OsisRange[] {
    // Parse the OSIS string (e.g. "Luke.10.16") back into OsisRange
    return parseAllReferences(osis);
  }

  function handleMouseenter(e: MouseEvent, osis: string) {
    if (hoverTimer) clearTimeout(hoverTimer);
    const ranges = osisToRanges(osis);
    if (ranges.length === 0 || ranges[0].startVerse === undefined) return; // chapter-only: no popover
    hoveredOsis = ranges;
    anchorEl = e.currentTarget as HTMLElement;
    tooltipVisible = true;
  }

  function handleMouseleave() {
    hoverTimer = setTimeout(() => {
      tooltipVisible = false;
      anchorEl = null;
    }, 120);
  }

  function handleTooltipMouseenter() {
    if (hoverTimer) clearTimeout(hoverTimer);
  }

  function handleTooltipMouseleave() {
    tooltipVisible = false;
    anchorEl = null;
  }

  function handleClick(e: MouseEvent, osis: string) {
    e.preventDefault();
    window.open(`/search?q=${encodeURIComponent(osis)}&mode=verse`, '_blank', 'noopener');
  }
</script>

<span class="cr-text">
  {#each tokens as token}
    {#if token.type === 'text'}
      {token.content}
    {:else}
      <a
        href="/search?q={encodeURIComponent(token.osis)}&mode=verse"
        class="verse-ref-link"
        target="_blank"
        rel="noopener"
        on:mouseenter={(e) => handleMouseenter(e, token.osis)}
        on:mouseleave={handleMouseleave}
        on:click|preventDefault={(e) => handleClick(e, token.osis)}
      >{token.osis}</a>
    {/if}
  {/each}
</span>

<VerseTooltip
  osisRanges={hoveredOsis}
  {anchorEl}
  visible={tooltipVisible}
  on:mouseover={handleTooltipMouseenter}
  on:mouseout={handleTooltipMouseleave}
/>

<style>
  .cr-text {
    font-family: var(--font-ui);
    font-size: 13px;
    color: var(--color-text);
  }

  .verse-ref-link {
    color: var(--color-accent-text);
    text-decoration: none;
    border-bottom: 1px solid color-mix(in srgb, var(--color-accent-text) 40%, transparent);
    cursor: pointer;
  }

  .verse-ref-link:hover {
    color: var(--color-accent);
    border-bottom-color: var(--color-accent);
  }
</style>
```

**Note:** The link text currently shows the raw OSIS string (e.g. "Luke.10.16"). In the next step we'll fix this to show the original source text.

- [ ] **Step 2: Fix the display text — show original text, not OSIS**

The tokenizer currently doesn't capture the original display text. Make these three edits:

**2a. Update the type** in `crossRefParser.ts`:

```typescript
export type CrossRefToken =
  | { type: 'ref'; osis: string; display: string; isVerse: boolean }
  | { type: 'text'; content: string };
```

**2b. Capture display in `tokenizeCrossRef`** — after the `parseChapterVerse` call, attach the source text slice to the first ref token. Replace the existing block:

```typescript
      const { tokens, consumed } = parseChapterVerse(text, match.end, match.osisBook);
      if (tokens.length > 0) {
        result.push(...tokens);
        pos = match.end + consumed;
        textStart = pos;
        continue;
      }
```

with:

```typescript
      const { tokens, consumed } = parseChapterVerse(text, match.end, match.osisBook);
      if (tokens.length > 0) {
        // Attach the original source text as display for the first token
        const sourceSlice = text.slice(match.displayStart, match.end + consumed).trim();
        const first = tokens[0];
        if (first.type === 'ref') tokens[0] = { ...first, display: sourceSlice };
        result.push(...tokens);
        pos = match.end + consumed;
        textStart = pos;
        continue;
      }
```

Also update `parseChapterVerse` to initialise `display` as empty string so the type is satisfied before `tokenizeCrossRef` overwrites it:

```typescript
tokens.push({ type: 'ref', osis, isVerse: verse !== null, display: '' });
// (and for continuation & tokens:)
tokens.push({ type: 'ref', osis: `${osisBook}.${chapter}.${addVerse}`, isVerse: true, display: '' });
```

**2c. Update CrossRefText.svelte** link text to use `token.display`:

```svelte
      <a ...>{token.display}</a>
```

**2d. Update the test** to match the display field:

```typescript
it('parses a single verse reference', () => {
  const tokens = tokenizeCrossRef('Luc. 10, 16.');
  expect(tokens).toHaveLength(1);
  expect(tokens[0]).toMatchObject({ type: 'ref', osis: 'Luke.10.16', isVerse: true });
  if (tokens[0].type === 'ref') {
    expect(tokens[0].display).toContain('Luc');
  }
});
```

- [ ] **Step 3: Run all tests**

```bash
npm test -- --reporter=verbose tests/unit/crossRefParser.test.ts
```

Expected: all PASS

- [ ] **Step 4: Verify TypeScript**

```bash
npm run check
```

Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add src/lib/components/CrossRefText.svelte src/lib/search/crossRefParser.ts tests/unit/crossRefParser.test.ts
git commit -m "feat: CrossRefText component renders tokenized cross-refs as inline links with verse popover"
```

---

## Task 5: Wire CrossRefText into StudyPanel

**Files:**
- Modify: `src/lib/components/StudyPanel.svelte:429-439`

- [ ] **Step 1: Add the import**

At the top of StudyPanel.svelte's `<script>`, add:

```typescript
import CrossRefText from './CrossRefText.svelte';
```

- [ ] **Step 2: Replace the cr-text span**

Find (around line 436):
```svelte
<span class="cr-text">{@html allcapsToSmallcaps(cr.text)}</span>
```

Replace with:
```svelte
<CrossRefText text={cr.text} />
```

- [ ] **Step 3: Verify TypeScript + build**

```bash
npm run check
```

Expected: no errors

- [ ] **Step 4: Manual smoke test**

```bash
npm run dev
```

Open the browser to any chapter with cross-references (e.g. Genesis 1). In study mode:
- Cross-ref entries should render with clickable links for recognized Bible refs
- Patristic text (e.g. "S. Aug. de Gen.") should render as plain text
- Hovering a verse ref should show the VerseTooltip with verse text
- Clicking should open a new tab at `/search?q=...&mode=verse`

- [ ] **Step 5: Commit**

```bash
git add src/lib/components/StudyPanel.svelte
git commit -m "feat: wire CrossRefText into StudyPanel cross-references section"
```

---

## Task 6: Add verse-ref linking to AnnotationProse

**Files:**
- Modify: `src/lib/components/AnnotationProse.svelte`

This task adds `linkifyItalicRefs()` preprocessing and event delegation for `.verse-ref` links.

- [ ] **Step 1: Write a test for `linkifyItalicRefs`**

Add to `tests/unit/crossRefParser.test.ts`:

```typescript
import { linkifyItalicRefs } from '$lib/search/crossRefParser';

describe('linkifyItalicRefs', () => {
  it('wraps a parseable italic span in a verse-ref link', () => {
    const result = linkifyItalicRefs('<i>Act. 13, 14.</i>');
    expect(result).toContain('class="verse-ref"');
    expect(result).toContain('data-osis=');
    expect(result).toContain('<i>Act. 13, 14.</i>');
  });

  it('leaves non-ref italic spans untouched', () => {
    const input = '<i>rested the seventh day</i>';
    expect(linkifyItalicRefs(input)).toBe(input);
  });

  it('leaves patristic citation italic spans untouched', () => {
    const input = '<i>Homi. in 40 Martyres.</i>';
    expect(linkifyItalicRefs(input)).toBe(input);
  });

  it('encodes multiple OSIS refs into data-osis for grouped refs', () => {
    const result = linkifyItalicRefs('<i>Act. 13, 14. Levit. 23.</i>');
    // Should still be wrapped (at least one ref found)
    expect(result).toContain('class="verse-ref"');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
npm test -- --reporter=verbose tests/unit/crossRefParser.test.ts
```

Expected: `linkifyItalicRefs` tests FAIL (not exported yet)

- [ ] **Step 3: Add `linkifyItalicRefs` to crossRefParser.ts**

```typescript
/**
 * Preprocess an HTML string: wrap <i> tags whose content parses as a Bible
 * reference in an <a class="verse-ref"> link. Non-ref italic spans are left untouched.
 */
export function linkifyItalicRefs(html: string): string {
  return html.replace(/<i>([\s\S]*?)<\/i>/g, (match, content) => {
    const refs = parseItalicRef(content);
    if (!refs || refs.length === 0) return match;
    const osisStr = refs.map(r => r.osis).join(',');
    const searchUrl = `/search?q=${encodeURIComponent(osisStr)}&mode=verse`;
    return `<a class="verse-ref" data-osis="${osisStr}" href="${searchUrl}" target="_blank" rel="noopener"><i>${content}</i></a>`;
  });
}
```

- [ ] **Step 4: Run tests — expect all to pass**

```bash
npm test -- --reporter=verbose tests/unit/crossRefParser.test.ts
```

Expected: all PASS

- [ ] **Step 5: Integrate into AnnotationProse**

In `src/lib/components/AnnotationProse.svelte`:

**Add import** at the top of `<script>`:
```typescript
import { linkifyItalicRefs } from '$lib/search/crossRefParser';
import VerseTooltip from '$lib/components/VerseTooltip.svelte';
import { parseAllReferences } from '$lib/search/reference';
import type { OsisRange } from '$lib/search/reference';
```

**Add state** near the existing `openMn` declarations:
```typescript
let openVerseRef: OsisRange[] = [];
let verseRefAnchorEl: HTMLElement | null = null;
let verseRefVisible = false;
let verseRefTimer: ReturnType<typeof setTimeout> | null = null;
```

**Update `renderParagraphs`** to call `linkifyItalicRefs` after the existing `<mn>` replacement:

```typescript
function renderParagraphs(raw: string): string[] {
  return raw.split('\n\n').map((p) => {
    let html = p.trim().replace(/<mn>([^<]+)<\/mn>/g, (_, raw) => {
      const display = raw.replace(/^\[(\d+)\]$/, '$1');
      return `<button class="mn-marker" data-mn="${display}" aria-label="Marginal note ${display}">${display}</button>`;
    });
    html = linkifyItalicRefs(html);         // ← add this line
    html = allcapsToSmallcaps(html);
    return html;
  });
}
```

Also apply to annotation note text — add a helper for note rendering. In the template where notes are displayed, the `ann-note-text` span currently uses `{@html allcapsToSmallcaps(note.text)}`. Update it:

In the template, find:
```svelte
<span class="ann-note-text">{@html allcapsToSmallcaps(note.text)}</span>
```

Replace with:
```svelte
<span class="ann-note-text">{@html allcapsToSmallcaps(linkifyItalicRefs(note.text))}</span>
```

**Add event handlers** for `.verse-ref` clicks and hovers to the `.annotation-prose` div. The existing div has separate `on:mouseover` and `on:mouseout` attributes that call `handleMouseover` / `handleMouseout`. Replace those two attributes with the merged versions below (which handle both `[data-mn]` markers AND `.verse-ref` links):

```svelte
on:mouseover={(e) => {
  const btn = (e.target as HTMLElement).closest('[data-mn]') as HTMLElement | null;
  if (btn) { cancelDismiss(); const mn = btn.dataset.mn ?? null; openMn = mn; popoverAnchorEl = btn; return; }
  const vref = (e.target as HTMLElement).closest('.verse-ref') as HTMLElement | null;
  if (vref) {
    if (verseRefTimer) clearTimeout(verseRefTimer);
    const osis = vref.dataset.osis ?? '';
    const refs = parseAllReferences(osis);
    if (refs.length > 0 && refs[0].startVerse !== undefined) {
      openVerseRef = refs;
      verseRefAnchorEl = vref;
      verseRefVisible = true;
    }
  }
}}
on:mouseout={(e) => {
  const btn = (e.target as HTMLElement).closest('[data-mn]') as HTMLElement | null;
  if (btn) { scheduleDismiss(); return; }
  const vref = (e.target as HTMLElement).closest('.verse-ref') as HTMLElement | null;
  if (vref) {
    verseRefTimer = setTimeout(() => { verseRefVisible = false; verseRefAnchorEl = null; }, 120);
  }
}}
```

Replace the existing split `on:mouseover` and `on:mouseout` with the above merged versions.

**Add VerseTooltip** at the bottom of the template (after the existing `<MarkerPopover>`):

```svelte
<VerseTooltip
  osisRanges={openVerseRef}
  anchorEl={verseRefAnchorEl}
  visible={verseRefVisible}
  on:mouseover={() => { if (verseRefTimer) clearTimeout(verseRefTimer); }}
  on:mouseout={() => { verseRefVisible = false; verseRefAnchorEl = null; }}
/>
```

**Add CSS** for `.verse-ref` inside `<style>`:

```css
.annotation-prose :global(.verse-ref) {
  color: var(--color-accent-text);
  text-decoration: none;
  border-bottom: 1px solid color-mix(in srgb, var(--color-accent-text) 40%, transparent);
  cursor: pointer;
}

.annotation-prose :global(.verse-ref:hover) {
  color: var(--color-accent);
  border-bottom-color: var(--color-accent);
}
```

- [ ] **Step 6: Verify TypeScript**

```bash
npm run check
```

Expected: no errors

- [ ] **Step 7: Manual smoke test — annotation notes**

```bash
npm run dev
```

Open Genesis 2 in study mode. The annotation for verse 2 has notes with italic refs like `<i>Act. 13, 14. Levit. 23.</i>`. Verify:
- The italic text is now a clickable link
- Hovering shows a popover with verse text for Acts 13:14
- Clicking opens `/search?q=Acts.13.14%2CLev.23&mode=verse` in a new tab
- Non-ref italics (e.g. quoted phrases) remain as plain italic text

- [ ] **Step 8: Run prettier and commit**

```bash
prettier --write src/lib/components/AnnotationProse.svelte src/lib/search/crossRefParser.ts
git add src/lib/components/AnnotationProse.svelte src/lib/search/crossRefParser.ts tests/unit/crossRefParser.test.ts
git commit -m "feat: linkify italic verse refs in annotation prose and notes"
```

---

## Task 7: Final check and integration

- [ ] **Step 1: Run full test suite**

```bash
npm test
```

Expected: all existing tests still pass, new crossRefParser tests pass

- [ ] **Step 2: TypeScript check**

```bash
npm run check
```

Expected: no errors

- [ ] **Step 3: Lint**

```bash
npm run lint
```

Fix any issues, then:

```bash
git add -A
git commit -m "fix: lint and type cleanup for verse reference parsing feature"
```

---

## Known limitations / follow-up

- `& N` continuation parsing only handles "same chapter, next verse" — `& ch. v` (new chapter) edge cases will surface during testing and can be fixed iteratively.
- Summary text and summary notes are out of scope for this plan (same approach can be applied later).
- The OSIS strings passed to search page via click assume the search page can handle standard OSIS codes — confirmed from existing `parseAllReferences` usage.
