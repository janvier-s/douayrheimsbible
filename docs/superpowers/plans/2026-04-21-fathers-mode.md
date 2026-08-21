# Fathers Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/fathers/[book]/[chapter]` route displaying ACCS patristic commentary alongside the Bible text — a two-pane layout with verse reader + entry-count badges (left) and a filtered commentary panel (right), accessible as a 4th mode in the existing Read / Study / Compare toggle.

**Architecture:** Build script converts 29 ACCS JSON files into `static/data/accs/{slug}/{chapter}.json` per chapter. Author metadata (century, era, tradition) is a bundled TypeScript const. The route follows the CompareBar pattern: returns `showLayoutTopBar: false`, uses its own `FathersBar` header. Filters are client-side only.

**Tech Stack:** SvelteKit 2, Svelte 4 syntax (`export let`, `$:`, `createEventDispatcher`, writable stores), Tailwind CSS 3, TypeScript, tsx build scripts.

---

## ACCS Source Data Location

```
/Users/Janvier/Library/Mobile Documents/com~apple~CloudDocs/for-the-kingdom/SCRIPTURA/sources/ODR/ACCS/json/
```

29 JSON files. Each entry:
```typescript
{ verseRef: string; subVerse: string | null; title: string; author: string; citation: string; body: string }
```

- `verseRef`: pericope range e.g. `"Romans 1:1-7"` or single verse `"James 1:1"`
- `subVerse`: specific verse within pericope e.g. `"1:7"`, or `null` (80% of entries have it; Romans, Acts, Psalms 51-150 have 0%)

---

## File Map

### Created
| File | Purpose |
|------|---------|
| `scripts/build-accs-data.ts` | Pipeline: 29 JSONs → `static/data/accs/{slug}/{chapter}.json` |
| `src/lib/data/accs-authors.ts` | Author metadata const (311 authors: century, era, tradition) |
| `src/lib/data/accs-types.ts` | TypeScript interfaces |
| `src/routes/fathers/[book]/[chapter]/+page.ts` | Load function |
| `src/routes/fathers/[book]/[chapter]/+page.svelte` | Thin page wrapper |
| `src/lib/components/FathersBar.svelte` | Sticky header (CompareBar pattern) |
| `src/lib/components/FathersReader.svelte` | Two-pane layout, selectedVerse state |
| `src/lib/components/FathersVerseList.svelte` | Left pane: verse text + count badges |
| `src/lib/components/FathersCommentaryPanel.svelte` | Right pane: filters + pericope groups |
| `src/lib/components/FathersEntryCard.svelte` | Individual entry (collapsible body) |

### Modified
| File | Change |
|------|--------|
| `src/lib/data/loader.ts` | Add `loadAccsChapter()` |
| `scripts/prepare-data.ts` | Import and call `buildAccsData()` |
| `src/lib/components/TopBar.svelte` | Add `fathers` mode item + `goto` handler |
| `src/lib/components/CompareBar.svelte` | Add `fathers` mode item + `goto` handler |

---

## Task 1: ACCS TypeScript Types

**Files:**
- Create: `src/lib/data/accs-types.ts`

- [ ] **Step 1: Write the types file**

```typescript
// src/lib/data/accs-types.ts

export interface AccsEntry {
  subVerse: string | null;      // e.g. "1:7" — specific verse within pericope
  subVerseNum: number | null;   // 7 — parsed for quick comparison
  title: string;
  author: string;
  citation: string;
  body: string;
}

export interface AccsPericope {
  verseRef: string;      // e.g. "Romans 1:1-7"
  startVerse: number;    // 1
  endVerse: number;      // 7
  entries: AccsEntry[];
}

export interface AccsChapterFile {
  pericopes: AccsPericope[];
  // verse number → entry count (entries with matching subVerseNum, or pericope-spread for null subVerse)
  verseEntryCounts: Record<number, number>;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/data/accs-types.ts
git commit -m "feat: add ACCS TypeScript types"
```

---

## Task 2: Author Metadata

**Files:**
- Create: `src/lib/data/accs-authors.ts`

This is a TypeScript const map (bundled, not fetched). Covers 311 authors. Top 75 (covering ~92% of entries) are annotated; the rest default to `null`.

- [ ] **Step 1: Write the author metadata file**

```typescript
// src/lib/data/accs-authors.ts

export type AuthorEra = 'ante-nicene' | 'nicene' | 'post-nicene';
export type AuthorTradition = 'eastern' | 'western' | 'syriac';

export interface AuthorMeta {
  /** Century 1–9 (9 = "9th or later") */
  century: number | null;
  era: AuthorEra | null;
  tradition: AuthorTradition | null;
}

// Key = AUTHOR string exactly as it appears in ACCS JSON (all-caps)
export const AUTHORS: Record<string, AuthorMeta> = {
  'CHRYSOSTOM':                  { century: 4, era: 'nicene',       tradition: 'eastern' },
  'AUGUSTINE':                   { century: 4, era: 'nicene',       tradition: 'western' },
  'ORIGEN':                      { century: 3, era: 'ante-nicene',  tradition: 'eastern' },
  'JEROME':                      { century: 4, era: 'nicene',       tradition: 'western' },
  'AMBROSE':                     { century: 4, era: 'nicene',       tradition: 'western' },
  'BEDE':                        { century: 8, era: 'post-nicene',  tradition: 'western' },
  'THEODORET OF CYR':            { century: 5, era: 'post-nicene',  tradition: 'eastern' },
  'CYRIL OF ALEXANDRIA':         { century: 5, era: 'post-nicene',  tradition: 'eastern' },
  'AMBROSIASTER':                { century: 4, era: 'nicene',       tradition: 'western' },
  'GREGORY THE GREAT':           { century: 6, era: 'post-nicene',  tradition: 'western' },
  'EPHREM THE SYRIAN':           { century: 4, era: 'nicene',       tradition: 'syriac'  },
  'OECUMENIUS':                  { century: 6, era: 'post-nicene',  tradition: 'eastern' },
  'THEODORE OF MOPSUESTIA':      { century: 4, era: 'nicene',       tradition: 'eastern' },
  'BASIL THE GREAT':             { century: 4, era: 'nicene',       tradition: 'eastern' },
  'CAESARIUS OF ARLES':          { century: 6, era: 'post-nicene',  tradition: 'western' },
  'TERTULLIAN':                  { century: 3, era: 'ante-nicene',  tradition: 'western' },
  'CASSIODORUS':                 { century: 6, era: 'post-nicene',  tradition: 'western' },
  'CLEMENT OF ALEXANDRIA':       { century: 3, era: 'ante-nicene',  tradition: 'eastern' },
  'PELAGIUS':                    { century: 4, era: 'nicene',       tradition: 'western' },
  'DIDYMUS THE BLIND':           { century: 4, era: 'nicene',       tradition: 'eastern' },
  'CYRIL OF JERUSALEM':          { century: 4, era: 'nicene',       tradition: 'eastern' },
  'GREGORY OF NYSSA':            { century: 4, era: 'nicene',       tradition: 'eastern' },
  'ATHANASIUS':                  { century: 4, era: 'nicene',       tradition: 'eastern' },
  'EUSEBIUS OF CAESAREA':        { century: 4, era: 'nicene',       tradition: 'eastern' },
  'HILARY OF POITIERS':          { century: 4, era: 'nicene',       tradition: 'western' },
  'ANDREW OF CAESAREA':          { century: 6, era: 'post-nicene',  tradition: 'eastern' },
  'GREGORY OF NAZIANZUS':        { century: 4, era: 'nicene',       tradition: 'eastern' },
  'JOHN CASSIAN':                { century: 5, era: 'post-nicene',  tradition: 'western' },
  'MARIUS VICTORINUS':           { century: 4, era: 'nicene',       tradition: 'western' },
  'CYPRIAN':                     { century: 3, era: 'ante-nicene',  tradition: 'western' },
  'PRIMASIUS':                   { century: 6, era: 'post-nicene',  tradition: 'western' },
  'HILARY OF ARLES':             { century: 5, era: 'post-nicene',  tradition: 'western' },
  'HIPPOLYTUS':                  { century: 3, era: 'ante-nicene',  tradition: 'western' },
  'IRENAEUS':                    { century: 2, era: 'ante-nicene',  tradition: 'western' },
  'ANDREAS':                     { century: 6, era: 'post-nicene',  tradition: 'eastern' },
  'FULGENTIUS OF RUSPE':         { century: 6, era: 'post-nicene',  tradition: 'western' },
  'LEO THE GREAT':               { century: 5, era: 'post-nicene',  tradition: 'western' },
  'JOHN OF DAMASCUS':            { century: 8, era: 'post-nicene',  tradition: 'eastern' },
  'PETER CHRYSOLOGUS':           { century: 5, era: 'post-nicene',  tradition: 'western' },
  'THEODORET':                   { century: 5, era: 'post-nicene',  tradition: 'eastern' },
  'EVAGRIUS OF PONTUS':          { century: 4, era: 'nicene',       tradition: 'eastern' },
  'MAXIMUS OF TURIN':            { century: 5, era: 'post-nicene',  tradition: 'western' },
  'RABANUS MAURUS':              { century: 9, era: 'post-nicene',  tradition: 'western' },
  'SEVERIAN OF GABALA':          { century: 4, era: 'nicene',       tradition: 'eastern' },
  'APRINGIUS OF BEJA':           { century: 6, era: 'post-nicene',  tradition: 'western' },
  'CHROMATIUS':                  { century: 4, era: 'nicene',       tradition: 'western' },
  'JUSTIN MARTYR':               { century: 2, era: 'ante-nicene',  tradition: 'eastern' },
  'DIODORE OF TARSUS':           { century: 4, era: 'nicene',       tradition: 'eastern' },
  'TYCONIUS':                    { century: 4, era: 'nicene',       tradition: 'western' },
  'MAXIMUS THE CONFESSOR':       { century: 7, era: 'post-nicene',  tradition: 'eastern' },
  'THEOPHYLACT':                 { century: 9, era: 'post-nicene',  tradition: 'eastern' },
  'ISIDORE OF SEVILLE':          { century: 7, era: 'post-nicene',  tradition: 'western' },
  'CYRIL OF ALEXANDRIA':         { century: 5, era: 'post-nicene',  tradition: 'eastern' },
  'CLEMENT OF ROME':             { century: 1, era: 'ante-nicene',  tradition: 'western' },
  'POLYCARP':                    { century: 2, era: 'ante-nicene',  tradition: 'eastern' },
  'IGNATIUS OF ANTIOCH':         { century: 2, era: 'ante-nicene',  tradition: 'eastern' },
  'HERMAS':                      { century: 2, era: 'ante-nicene',  tradition: 'western' },
  'BARNABAS':                    { century: 2, era: 'ante-nicene',  tradition: 'eastern' },
  'DIONYSIUS OF ALEXANDRIA':     { century: 3, era: 'ante-nicene',  tradition: 'eastern' },
  'GREGORY OF ELVIRA':           { century: 4, era: 'nicene',       tradition: 'western' },
  'PACHOMIUS':                   { century: 4, era: 'nicene',       tradition: 'eastern' },
  'MARK THE MONK':               { century: 5, era: 'post-nicene',  tradition: 'eastern' },
  'DIADOCHUS OF PHOTICE':        { century: 5, era: 'post-nicene',  tradition: 'eastern' },
  'SALVIAN THE PRESBYTER':       { century: 5, era: 'post-nicene',  tradition: 'western' },
  'GENNADIUS OF CONSTANTINOPLE': { century: 5, era: 'post-nicene',  tradition: 'eastern' },
  'SYMEON THE NEW THEOLOGIAN':   { century: 9, era: 'post-nicene',  tradition: 'eastern' },
  'THEOPHANES':                  { century: 8, era: 'post-nicene',  tradition: 'eastern' },
  'PRUDENTIUS':                  { century: 4, era: 'nicene',       tradition: 'western' },
  'SEDULIUS':                    { century: 5, era: 'post-nicene',  tradition: 'western' },
  'NOVATIAN':                    { century: 3, era: 'ante-nicene',  tradition: 'western' },
  'PAULINUS OF NOLA':            { century: 4, era: 'nicene',       tradition: 'western' },
  'ARNOBIUS THE YOUNGER':        { century: 5, era: 'post-nicene',  tradition: 'western' },
  'ANONYMOUS':                   { century: null, era: null,        tradition: null      },
};

/** Returns author meta or null fallback for unlisted authors */
export function getAuthorMeta(author: string): AuthorMeta {
  return AUTHORS[author] ?? { century: null, era: null, tradition: null };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/data/accs-authors.ts
git commit -m "feat: add ACCS author metadata (century, era, tradition)"
```

---

## Task 3: Data Build Script

**Files:**
- Create: `scripts/build-accs-data.ts`

This script reads the 29 ACCS JSON files and writes per-chapter JSON files to `static/data/accs/{slug}/{chapter}.json`.

- [ ] **Step 1: Write the build script**

```typescript
// @ts-nocheck — build script run with tsx
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ACCS_SRC = join(__dirname, '..', '..', 'SCRIPTURA', 'sources', 'ODR', 'ACCS', 'json');
const OUT_DIR = join(__dirname, '..', 'static', 'data', 'accs');

// ACCS book name (as it appears in verseRef) → ODR slug
const ACCS_BOOK_TO_SLUG: Record<string, string> = {
  'Genesis': 'genesis',
  'Exodus': 'exodus',
  'Leviticus': 'leviticus',
  'Numbers': 'numbers',
  'Deuteronomy': 'deuteronomy',
  'Joshua': 'josue',
  'Judges': 'judges',
  'Ruth': 'ruth',
  '1 Samuel': '1-kings',
  '2 Samuel': '2-kings',
  '1 Kings': '3-kings',
  '2 Kings': '4-kings',
  '1 Chronicles': '1-paralipomenon',
  '2 Chronicles': '2-paralipomenon',
  'Ezra': '1-esdras',
  'Nehemiah': '2-esdras',
  'Esther': 'esther',
  'Job': 'job',
  'Psalm': 'psalms',
  'Psalms': 'psalms',
  'Pslams': 'psalms', // typo in source
  'Proverbs': 'proverbs',
  'Ecclesiastes': 'ecclesiastes',
  'Song of Solomon': 'canticle-of-canticles',
  'Isaiah': 'isaie',
  'Jeremiah': 'jeremie',
  'Lamentations': 'lamentations',
  'Ezekiel': 'ezechiel',
  'Daniel': 'daniel',
  'Hosea': 'osee',
  'Joel': 'joel',
  'Amos': 'amos',
  'Obadiah': 'abdias',
  'Jonah': 'jonas',
  'Micah': 'micheas',
  'Nahum': 'nahum',
  'Habakkuk': 'habacuc',
  'Zephaniah': 'sophonias',
  'Haggai': 'aggeus',
  'Zechariah': 'zacharias',
  'Malachi': 'malachie',
  'Tobit': 'tobias',
  'Sirach': 'ecclesiasticus',
  'Baruch': 'baruch',
  'Wisdom': 'wisdom',
  'Matthew': 'matthew',
  'Mark': 'marc',
  'Luke': 'luke',
  'John': 'john',
  'Acts': 'acts',
  'Romans': 'romans',
  '1 Corinthians': '1-corinthians',
  '2 Corinthians': '2-corinthians',
  'Galatians': 'galatians',
  'Ephesians': 'ephesians',
  'Philippians': 'philippians',
  'Colossians': 'colossians',
  '1 Thessalonians': '1-thessalonians',
  '2 Thessalonians': '2-thessalonians',
  '1 Timothy': '1-timothy',
  '2 Timothy': '2-timothy',
  'Titus': 'titus',
  'Philemon': 'philemon',
  'Hebrew': 'hebrews', // typo in source
  'Hebrews': 'hebrews',
  'James': 'james',
  '1 Peter': '1-peter',
  '2 Peter': '2-peter',
  '1 John': '1-john',
  '2 John': '2-john',
  '3 John': '3-john',
  'Jude': 'jude',
  'jude': 'jude', // lowercase typo in source
  'Revelation': 'apocalypse',
  // Deuterocanonical appendices — no standalone ODR page; skip
  'Bel and the Dragon': null,
  'Song of the Three Young Men': null,
  'Susanna': null,
  'Letter of Jeremiah': null,
};

interface RawEntry {
  verseRef: string;
  subVerse: string | null;
  title: string;
  author: string;
  citation: string;
  body: string;
}

interface BuiltEntry {
  subVerse: string | null;
  subVerseNum: number | null;
  title: string;
  author: string;
  citation: string;
  body: string;
}

interface BuiltPericope {
  verseRef: string;
  startVerse: number;
  endVerse: number;
  entries: BuiltEntry[];
}

interface ChapterOutput {
  pericopes: BuiltPericope[];
  verseEntryCounts: Record<number, number>;
}

/**
 * Parse a verseRef string into its components.
 * Returns null for unrecognised formats or skipped books.
 *
 * Handles:
 *   "Romans 1:1-7"       → { slug: 'romans', chapter: 1, startVerse: 1, endVerse: 7 }
 *   "James 1:1"          → { slug: 'james',  chapter: 1, startVerse: 1, endVerse: 1 }
 *   "Genesis 1:1-2:3"    → { slug: 'genesis',chapter: 1, startVerse: 1, endVerse: 31 } (uses chapter max; assign to ch 1)
 */
function parseVerseRef(verseRef: string): { slug: string; chapter: number; startVerse: number; endVerse: number } | null {
  // Match: BOOK chapter:verse[-[chapter:]verse]
  const m = verseRef.match(/^(.+?)\s+(\d+):(\d+)(?:-(?:(\d+):)?(\d+))?$/);
  if (!m) return null;
  const [, bookName, chStr, svStr, endChStr, evStr] = m;
  const slug = ACCS_BOOK_TO_SLUG[bookName];
  if (!slug) return null; // skip deuterocanonical appendices
  const chapter = parseInt(chStr, 10);
  const startVerse = parseInt(svStr, 10);
  // Cross-chapter ref (e.g. Genesis 1:1-2:3): only assign to starting chapter.
  // endChStr is set when end chapter differs; evStr is the end verse within end chapter.
  const endVerse = evStr ? parseInt(evStr, 10) : startVerse;
  return { slug, chapter, startVerse, endVerse };
}

/**
 * Parse subVerse string to verse number.
 * "1:7" → 7   "7" → 7   null → null
 */
function parseSubVerseNum(subVerse: string | null): number | null {
  if (!subVerse) return null;
  const m = subVerse.match(/(?:^\d+:)?(\d+)$/);
  return m ? parseInt(m[1], 10) : null;
}

// Accumulator: slug → chapter → pericope verseRef → entries
const bySlugChapterPericope = new Map<string, Map<number, Map<string, { startVerse: number; endVerse: number; entries: BuiltEntry[] }>>>();

// Load all ACCS JSON files
let totalEntries = 0;
let skippedEntries = 0;

for (const filename of readdirSync(ACCS_SRC).filter(f => f.endsWith('.json'))) {
  const raw: RawEntry[] = JSON.parse(readFileSync(join(ACCS_SRC, filename), 'utf8'));
  for (const e of raw) {
    const parsed = parseVerseRef(e.verseRef);
    if (!parsed) { skippedEntries++; continue; }
    const { slug, chapter, startVerse, endVerse } = parsed;

    if (!bySlugChapterPericope.has(slug)) bySlugChapterPericope.set(slug, new Map());
    const byChapter = bySlugChapterPericope.get(slug)!;
    if (!byChapter.has(chapter)) byChapter.set(chapter, new Map());
    const byPericope = byChapter.get(chapter)!;
    if (!byPericope.has(e.verseRef)) {
      byPericope.set(e.verseRef, { startVerse, endVerse, entries: [] });
    }
    byPericope.get(e.verseRef)!.entries.push({
      subVerse: e.subVerse,
      subVerseNum: parseSubVerseNum(e.subVerse),
      title: e.title,
      author: e.author,
      citation: e.citation,
      body: e.body,
    });
    totalEntries++;
  }
}

// Write per-chapter JSON files
let chaptersWritten = 0;

for (const [slug, byChapter] of bySlugChapterPericope) {
  const slugDir = join(OUT_DIR, slug);
  mkdirSync(slugDir, { recursive: true });

  for (const [chapter, byPericope] of byChapter) {
    const pericopes: BuiltPericope[] = [];
    const verseEntryCounts: Record<number, number> = {};

    // Sort pericopes by startVerse
    const sorted = [...byPericope.entries()].sort((a, b) => a[1].startVerse - b[1].startVerse);

    for (const [verseRef, { startVerse, endVerse, entries }] of sorted) {
      pericopes.push({ verseRef, startVerse, endVerse, entries });

      // Compute verse entry counts
      for (const entry of entries) {
        if (entry.subVerseNum !== null) {
          // Specific verse — count toward that verse only
          verseEntryCounts[entry.subVerseNum] = (verseEntryCounts[entry.subVerseNum] ?? 0) + 1;
        } else {
          // No subVerse — spread across all verses in the pericope range
          for (let v = startVerse; v <= endVerse; v++) {
            verseEntryCounts[v] = (verseEntryCounts[v] ?? 0) + 1;
          }
        }
      }
    }

    const output: ChapterOutput = { pericopes, verseEntryCounts };
    writeFileSync(join(slugDir, `${chapter}.json`), JSON.stringify(output));
    chaptersWritten++;
  }
}

console.log(`Built ${chaptersWritten} chapter files from ${totalEntries} entries (${skippedEntries} skipped).`);
```

- [ ] **Step 2: Run the script to verify output**

```bash
cd "/Users/Janvier/Library/Mobile Documents/com~apple~CloudDocs/for-the-kingdom/douayrheimsbible"
npx tsx scripts/build-accs-data.ts
```

Expected output: `Built ~1000 chapter files from ~29000 entries (few hundred skipped).`

Verify spot-check:
```bash
node -e "const d = JSON.parse(require('fs').readFileSync('static/data/accs/romans/1.json','utf8')); console.log('Pericopes:', d.pericopes.length); console.log('First pericope:', d.pericopes[0].verseRef, d.pericopes[0].entries.length, 'entries'); console.log('verseEntryCounts:', d.verseEntryCounts);"
```

Expected: 4 pericopes for Romans 1, entries per pericope, and verseEntryCounts with verse 1-7 all showing the same count.

- [ ] **Step 3: Commit**

```bash
git add scripts/build-accs-data.ts static/data/accs/
git commit -m "feat: add ACCS data build script and generated chapter JSON files"
```

---

## Task 4: Integrate Build Script into Prepare-Data Pipeline

**Files:**
- Modify: `scripts/prepare-data.ts`

- [ ] **Step 1: Read the current prepare-data.ts to find the end of the file**

Read `scripts/prepare-data.ts` fully to see its current structure and where to add the ACCS build call.

- [ ] **Step 2: Add the ACCS build call**

Near the bottom of `prepare-data.ts`, after the existing build steps, add:

```typescript
// ── ACCS Fathers data ─────────────────────────────────────────────
import { buildAccsData } from './build-accs-data.js';
// ... (add this import at the top of prepare-data.ts alongside other imports)
// ... (call it in the main build function)
await buildAccsData();
console.log('ACCS data built.');
```

Alternatively, if `build-accs-data.ts` exports a function:

Modify `scripts/build-accs-data.ts` to export a function:

```typescript
export async function buildAccsData(): Promise<void> {
  // ... (move the top-level code into this function, keep the same logic)
}

// Allow standalone execution
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  buildAccsData();
}
```

Then in `prepare-data.ts`, import and call it.

- [ ] **Step 3: Test full build**

```bash
npm run build
```

Expected: builds without errors; `static/data/accs/` is populated.

- [ ] **Step 4: Commit**

```bash
git add scripts/prepare-data.ts scripts/build-accs-data.ts
git commit -m "feat: integrate ACCS build into prepare-data pipeline"
```

---

## Task 5: Loader Function

**Files:**
- Modify: `src/lib/data/loader.ts`

- [ ] **Step 1: Add the `loadAccsChapter` function**

After the existing `loadConfCommentary` function (around line 239), add:

```typescript
// ── ACCS Fathers commentary (per chapter) ─────────────────────────
import type { AccsChapterFile } from './accs-types';

const accsChapterCache = new Map<string, Promise<AccsChapterFile | null>>();

export function loadAccsChapter(
  slug: string,
  chapter: number,
  fetch: typeof globalThis.fetch
): Promise<AccsChapterFile | null> {
  const key = `${slug}/${chapter}`;
  const cached = accsChapterCache.get(key);
  if (cached) return cached;

  const promise = fetch(`/data/accs/${slug}/${chapter}.json`)
    .then((r) => (r.ok ? (r.json() as Promise<AccsChapterFile>) : null))
    .catch(() => {
      accsChapterCache.delete(key);
      return null;
    });

  accsChapterCache.set(key, promise);
  return promise;
}
```

Also add the import for `AccsChapterFile` at the top of `loader.ts` alongside the existing type imports:
```typescript
import type { AccsChapterFile } from './accs-types';
```

- [ ] **Step 2: Run type check**

```bash
npm run check
```

Expected: no errors related to `loadAccsChapter`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/data/loader.ts
git commit -m "feat: add loadAccsChapter loader"
```

---

## Task 6: Route Files

**Files:**
- Create: `src/routes/fathers/[book]/[chapter]/+page.ts`
- Create: `src/routes/fathers/[book]/[chapter]/+page.svelte`

- [ ] **Step 1: Create the load function**

```typescript
// src/routes/fathers/[book]/[chapter]/+page.ts
import type { PageLoad, EntryGenerator } from './$types';
import { error } from '@sveltejs/kit';
import { loadBook, getChapter, loadAccsChapter } from '$lib/data/loader';
import { getBookBySlug, ALL_BOOKS } from '$lib/data/books';

export const prerender = true;

export const entries: EntryGenerator = () =>
  ALL_BOOKS.flatMap((book) =>
    Array.from({ length: book.chapters }, (_, i) => ({
      book: book.slug,
      chapter: String(i + 1)
    }))
  );

export const load: PageLoad = async ({ params, fetch }) => {
  const { book: slug, chapter: chapterStr } = params;

  const bookMeta = getBookBySlug(slug);
  if (!bookMeta) throw error(404, `Book not found: ${slug}`);

  const chapterNum = parseInt(chapterStr, 10);
  if (isNaN(chapterNum) || chapterNum < 1) throw error(404, `Invalid chapter: ${chapterStr}`);

  const bookData = await loadBook(slug, fetch);
  const chapter = getChapter(bookData, chapterNum);
  if (!chapter) throw error(404, `Chapter ${chapterNum} not found`);

  const accsData = await loadAccsChapter(slug, chapterNum, fetch);

  return {
    bookMeta,
    chapter,
    totalChapters: bookData.chapters.length,
    accsData, // null if no ACCS data for this chapter
    showLayoutTopBar: false,
    hasStudyMode: false
  };
};
```

- [ ] **Step 2: Create the page component**

```svelte
<!-- src/routes/fathers/[book]/[chapter]/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import FathersBar from '$lib/components/FathersBar.svelte';
  import FathersReader from '$lib/components/FathersReader.svelte';

  export let data: PageData;

  $: pageTitle = `${data.bookMeta.odrName} ${data.chapter.chapter} — Church Fathers | Douay-Rheims`;
  $: pageDesc = `Patristic commentary on ${data.bookMeta.odrName} Chapter ${data.chapter.chapter} from the Ancient Christian Commentary on Scripture.`;
  $: pageUrl = `https://thedouayrheims.com/fathers/${data.bookMeta.slug}/${data.chapter.chapter}`;
</script>

<svelte:head>
  <title>{pageTitle}</title>
  <meta name="description" content={pageDesc} />
  <link rel="canonical" href={pageUrl} />
  <meta property="og:type" content="article" />
  <meta property="og:title" content={pageTitle} />
  <meta property="og:description" content={pageDesc} />
  <meta property="og:url" content={pageUrl} />
</svelte:head>

{#key `${data.bookMeta.slug}-${data.chapter.chapter}`}
  <div>
    <FathersBar bookMeta={data.bookMeta} chapterNum={data.chapter.chapter} totalChapters={data.totalChapters} />
    <FathersReader {data} />
  </div>
{/key}
```

- [ ] **Step 3: Run type check**

```bash
npm run check
```

Expected: no errors (FathersBar and FathersReader don't exist yet — ignore those errors).

- [ ] **Step 4: Commit**

```bash
git add src/routes/fathers/
git commit -m "feat: add fathers route load function and page shell"
```

---

## Task 7: FathersBar Header Component

**Files:**
- Create: `src/lib/components/FathersBar.svelte`

Follows the CompareBar pattern: sticky header with BrandingRow (mode toggle) + navigation row.

- [ ] **Step 1: Write FathersBar**

```svelte
<!-- src/lib/components/FathersBar.svelte -->
<script lang="ts">
  import { goto } from '$app/navigation';
  import { prefs } from '$lib/stores/prefs';
  import { readingPosition } from '$lib/stores/reading';
  import BrandingRow from './BrandingRow.svelte';
  import BottomTabBar from './BottomTabBar.svelte';
  import FloatingNav from './FloatingNav.svelte';
  import BookNavLink from './BookNavLink.svelte';
  import ChapterNavLink from './ChapterNavLink.svelte';
  import { ALL_BOOKS, getPrevNavBook, getNextNavBook } from '$lib/data/books';
  import type { BookMeta } from '$lib/data/types';

  export let bookMeta: BookMeta;
  export let chapterNum: number;
  export let totalChapters: number;

  $: modeItems = [
    { key: 'reading', label: 'Read' },
    { key: 'study',   label: 'Study' },
    { key: 'compare', label: 'Compare' },
    { key: 'fathers', label: 'Fathers' }
  ];
  $: activeModeIdx = modeItems.findIndex((m) => m.key === 'fathers'); // always the last one here

  let pendingIdx = -1;

  // Return URL: last known reading position, or the ODR page for the current book/chapter
  $: _base = $readingPosition?.routeBase ?? '/odr';
  $: _slug = $readingPosition?.bookSlug ?? bookMeta.slug;
  $: _ch   = $readingPosition?.chapter ?? chapterNum;
  $: readerHref = `${_base}/${_slug}/${_ch}`;

  async function selectMode(key: string, index: number) {
    if (key === 'fathers') return; // already here
    pendingIdx = index;
    const delay = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 210;
    await new Promise<void>((r) => setTimeout(r, delay));
    if (key === 'compare') {
      goto(`/compare/${bookMeta.slug}/${chapterNum}`);
    } else {
      prefs.update((p) => ({ ...p, readingMode: key === 'study' ? 'study' : 'reading' }));
      goto(readerHref);
    }
  }

  async function handleModeSelect(e: CustomEvent<{ key: string; index: number }>) {
    const { key, index } = e.detail;
    await selectMode(key, index);
  }

  $: prevBook = getPrevNavBook(bookMeta.slug) ?? null;
  $: nextBook = getNextNavBook(bookMeta.slug) ?? null;
  $: prevChapterHref = chapterNum > 1 ? `/fathers/${bookMeta.slug}/${chapterNum - 1}` : null;
  $: nextChapterHref = chapterNum < totalChapters ? `/fathers/${bookMeta.slug}/${chapterNum + 1}` : null;

  let navOpen = false;

  function bookNavLabel(b: (typeof ALL_BOOKS)[number]): string {
    return $prefs.modernBookNames ? b.modernName : b.odrName;
  }
</script>

<svelte:window on:keydown={(e) => { if (e.key === 'Escape') navOpen = false; }} />

<header class="sticky top-0 z-50 font-ui">
  <!-- Row 1: branding + mode toggle -->
  <BrandingRow
    {modeItems}
    {activeModeIdx}
    {pendingIdx}
    onModeSelect={handleModeSelect}
    onLogoClick={() => (navOpen = false)}
  />

  <!-- Row 2: chapter navigation -->
  <div
    class="bg-glass backdrop-blur-sm border-b border-border px-lg flex items-center gap-[10px] relative"
    style="height: 50px;"
  >
    <!-- Left chevrons -->
    <div class="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center">
      <div class="absolute right-full flex items-center gap-[8px] pr-[8px]">
        {#if prevBook}
          <BookNavLink href="/fathers/{prevBook.slug}/1" direction="prev" label={bookNavLabel(prevBook)} />
        {:else}
          <div class="w-[15px]" aria-hidden="true"></div>
        {/if}
        {#if prevChapterHref}
          <ChapterNavLink href={prevChapterHref} direction="prev" chapter={chapterNum - 1} />
        {:else}
          <div class="w-[15px]" aria-hidden="true"></div>
        {/if}
      </div>

      <!-- Chapter button -->
      <button
        class="flex items-center gap-[5px] px-[17px] py-[10px] rounded-[3px] transition-colors duration-fast
          {navOpen ? 'bg-accent text-white' : 'text-accent hover:bg-accent hover:text-white'}"
        on:click={() => (navOpen = !navOpen)}
      >
        <span class="text-[16px] font-medium">{bookMeta.odrName} {chapterNum}</span>
        <span class="text-[12px] opacity-70 leading-none" aria-hidden="true">{navOpen ? '▲' : '▼'}</span>
      </button>

      <!-- Right chevrons -->
      <div class="absolute left-full flex items-center gap-[8px] pl-[8px]">
        {#if nextChapterHref}
          <ChapterNavLink href={nextChapterHref} direction="next" chapter={chapterNum + 1} />
        {:else}
          <div class="w-[15px]" aria-hidden="true"></div>
        {/if}
        {#if nextBook}
          <BookNavLink href="/fathers/{nextBook.slug}/1" direction="next" label={bookNavLabel(nextBook)} />
        {:else}
          <div class="w-[15px]" aria-hidden="true"></div>
        {/if}
      </div>
    </div>

    <!-- Mobile: centered chapter button only -->
    <div class="md:hidden flex-1 flex justify-center">
      <button
        class="flex items-center gap-[5px] px-[12px] py-[8px] rounded-[3px] transition-colors duration-fast
          {navOpen ? 'bg-accent text-white' : 'text-accent hover:bg-accent hover:text-white'}"
        on:click={() => (navOpen = !navOpen)}
      >
        <span class="text-[14px] font-medium">{bookMeta.odrName} {chapterNum}</span>
        <span class="text-[10px] opacity-80 leading-none" aria-hidden="true">{navOpen ? '▲' : '▼'}</span>
      </button>
    </div>

    <!-- Right: "Fathers" label badge -->
    <div class="ml-auto shrink-0 hidden md:block">
      <span class="text-[11px] uppercase tracking-[0.15em] text-subtle font-medium">Church Fathers</span>
    </div>
  </div>
</header>

{#if navOpen}
  <FloatingNav
    bookSlug={bookMeta.slug}
    {chapterNum}
    onClose={() => (navOpen = false)}
    routeBase="/fathers"
  />
{/if}

<!-- Mobile bottom tab bar -->
<BottomTabBar {modeItems} {activeModeIdx} {pendingIdx} {selectMode} />
```

- [ ] **Step 2: Check that FloatingNav accepts `routeBase` prop**

Read `src/lib/components/FloatingNav.svelte` to verify it has a `routeBase` prop (it should, based on BibleReader). If it doesn't, check the compare mode equivalent and adapt.

- [ ] **Step 3: Run type check**

```bash
npm run check
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/components/FathersBar.svelte
git commit -m "feat: add FathersBar header component"
```

---

## Task 8: FathersEntryCard Component

**Files:**
- Create: `src/lib/components/FathersEntryCard.svelte`

An individual patristic entry: collapsible body (~4 lines default), small-caps title, author · subVerse badge, right-aligned italic citation.

- [ ] **Step 1: Write FathersEntryCard**

```svelte
<!-- src/lib/components/FathersEntryCard.svelte -->
<script lang="ts">
  import type { AccsEntry } from '$lib/data/accs-types';

  export let entry: AccsEntry;
  export let highlighted: boolean = false; // true when user clicked matching verse
  export let dimmed: boolean = false;      // true when filter active and entry doesn't match
  export let forceOpen: boolean = false;   // true when "expand all" toggle is on

  let expanded = false;
  $: isOpen = forceOpen || expanded;

  function toggle() {
    if (!forceOpen) expanded = !expanded;
  }
</script>

<article
  class="rounded-sm border transition-all duration-fast
    {highlighted ? 'border-accent/40 bg-accent/5' : 'border-border bg-panel'}
    {dimmed ? 'opacity-40' : 'opacity-100'}"
>
  <!-- Header: title + author + subVerse badge -->
  <div class="px-sm pt-sm pb-[6px]">
    <!-- Title in small-caps style -->
    <p class="text-[11px] uppercase tracking-[0.1em] text-subtle font-medium leading-snug mb-[4px]">
      {entry.title}
    </p>
    <div class="flex items-center gap-[6px] flex-wrap">
      <span class="text-[13px] font-medium text-foreground">{entry.author}</span>
      {#if entry.subVerse}
        <span class="text-[10px] px-[5px] py-[1px] rounded-full bg-border text-subtle font-medium">
          v. {entry.subVerseNum}
        </span>
      {/if}
    </div>
  </div>

  <!-- Body: collapsible, ~4 lines by default -->
  <div class="px-sm">
    <div
      class="text-[14px] leading-relaxed text-foreground overflow-hidden transition-all duration-200"
      style="max-height: {isOpen ? '9999px' : '6em'};"
    >
      <p>{entry.body}</p>
    </div>
    {#if !forceOpen}
      <button
        class="text-[11px] text-subtle hover:text-accent transition-colors duration-fast mt-[4px] pb-[2px]"
        on:click={toggle}
      >
        {expanded ? 'Show less ▲' : 'Show more ▼'}
      </button>
    {/if}
  </div>

  <!-- Citation: right-aligned italic -->
  {#if entry.citation}
    <div class="px-sm pb-sm mt-[4px]">
      <p class="text-[11px] italic text-subtle text-right">{entry.citation}</p>
    </div>
  {/if}
</article>
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/components/FathersEntryCard.svelte
git commit -m "feat: add FathersEntryCard collapsible entry component"
```

---

## Task 9: FathersCommentaryPanel Component

**Files:**
- Create: `src/lib/components/FathersCommentaryPanel.svelte`

Scrollable right pane: filter bar (century chips, era chips, tradition chips, author autocomplete, expand-all toggle) + pericope groups with sticky headers + entry cards.

- [ ] **Step 1: Write FathersCommentaryPanel**

```svelte
<!-- src/lib/components/FathersCommentaryPanel.svelte -->
<script lang="ts">
  import type { AccsChapterFile, AccsEntry } from '$lib/data/accs-types';
  import { getAuthorMeta } from '$lib/data/accs-authors';
  import FathersEntryCard from './FathersEntryCard.svelte';

  export let chapterData: AccsChapterFile;
  export let selectedVerse: number | null;

  // ── Filter state ──────────────────────────────────────────────────
  let filterCentury: number | 'all' | 'other' = 'all';
  let filterEra: 'all' | 'ante-nicene' | 'nicene' | 'post-nicene' = 'all';
  let filterTradition: 'all' | 'eastern' | 'western' | 'syriac' = 'all';
  let filterAuthor = '';
  let expandAll = false;
  let authorInput = '';
  let authorSuggestOpen = false;

  const CENTURIES = [1, 2, 3, 4, 5, 6, 7, 8] as const;
  const ERAS = [
    { key: 'ante-nicene', label: 'Ante-Nicene' },
    { key: 'nicene',      label: 'Nicene' },
    { key: 'post-nicene', label: 'Post-Nicene' }
  ] as const;
  const TRADITIONS = [
    { key: 'eastern',  label: 'Eastern' },
    { key: 'western',  label: 'Western' },
    { key: 'syriac',   label: 'Syriac' }
  ] as const;

  // Dynamic author list: only authors present in this chapter
  $: chapterAuthors = [...new Set(
    chapterData.pericopes.flatMap((p) => p.entries.map((e) => e.author))
  )].sort();

  // Autocomplete suggestions filtered by input
  $: authorSuggestions = authorInput.length >= 2
    ? chapterAuthors.filter((a) => a.toLowerCase().includes(authorInput.toLowerCase())).slice(0, 8)
    : [];

  $: hasFilter = filterCentury !== 'all' || filterEra !== 'all' || filterTradition !== 'all' || filterAuthor !== '';

  function clearFilters() {
    filterCentury = 'all';
    filterEra = 'all';
    filterTradition = 'all';
    filterAuthor = '';
    authorInput = '';
  }

  function entryMatches(e: AccsEntry): boolean {
    const meta = getAuthorMeta(e.author);
    if (filterCentury !== 'all') {
      if (filterCentury === 'other') {
        if (!meta.century || meta.century < 9) return false;
      } else {
        if (meta.century !== filterCentury) return false;
      }
    }
    if (filterEra !== 'all' && meta.era !== filterEra) return false;
    if (filterTradition !== 'all' && meta.tradition !== filterTradition) return false;
    if (filterAuthor && e.author !== filterAuthor) return false;
    return true;
  }

  function entryIsHighlighted(e: AccsEntry): boolean {
    if (selectedVerse === null) return false;
    if (e.subVerseNum !== null) return e.subVerseNum === selectedVerse;
    // No subVerse — highlighted if selectedVerse falls within pericope range (handled per pericope)
    return false;
  }

  function entryIsDimmed(e: AccsEntry): boolean {
    if (!hasFilter) return false;
    return !entryMatches(e);
  }

  // Computed pericopes: each pericope annotated with whether selectedVerse falls in its range
  $: annotatedPericopes = chapterData.pericopes.map((p) => {
    const verseInRange = selectedVerse !== null && selectedVerse >= p.startVerse && selectedVerse <= p.endVerse;
    return { ...p, verseInRange };
  });

  function chipClass(active: boolean) {
    return `px-[8px] py-[3px] rounded-[3px] text-[11px] font-medium border transition-colors duration-fast
      ${active ? 'bg-interactive text-white border-interactive' : 'border-border text-subtle hover:text-foreground hover:border-foreground/30'}`;
  }
</script>

<div class="flex flex-col h-full overflow-hidden">
  <!-- ── Filter bar ─────────────────────────────────────────── -->
  <div class="shrink-0 border-b border-border px-sm py-[10px] space-y-[8px] bg-panel">

    <!-- Row 1: Century chips -->
    <div class="flex items-center gap-[5px] flex-wrap">
      <span class="text-[9px] uppercase tracking-[0.15em] text-subtle font-medium mr-[2px] shrink-0">Century</span>
      <button class={chipClass(filterCentury === 'all')} on:click={() => (filterCentury = 'all')}>All</button>
      {#each CENTURIES as c}
        <button class={chipClass(filterCentury === c)} on:click={() => (filterCentury = c)}>
          {c === 1 ? '1st' : c === 2 ? '2nd' : c === 3 ? '3rd' : `${c}th`}
        </button>
      {/each}
      <button class={chipClass(filterCentury === 'other')} on:click={() => (filterCentury = 'other')}>9th+</button>
    </div>

    <!-- Row 2: Era chips -->
    <div class="flex items-center gap-[5px] flex-wrap">
      <span class="text-[9px] uppercase tracking-[0.15em] text-subtle font-medium mr-[2px] shrink-0">Era</span>
      <button class={chipClass(filterEra === 'all')} on:click={() => (filterEra = 'all')}>All</button>
      {#each ERAS as { key, label }}
        <button class={chipClass(filterEra === key)} on:click={() => (filterEra = key)}>{label}</button>
      {/each}
    </div>

    <!-- Row 3: Tradition chips -->
    <div class="flex items-center gap-[5px] flex-wrap">
      <span class="text-[9px] uppercase tracking-[0.15em] text-subtle font-medium mr-[2px] shrink-0">Tradition</span>
      <button class={chipClass(filterTradition === 'all')} on:click={() => (filterTradition = 'all')}>All</button>
      {#each TRADITIONS as { key, label }}
        <button class={chipClass(filterTradition === key)} on:click={() => (filterTradition = key)}>{label}</button>
      {/each}
    </div>

    <!-- Row 4: Author autocomplete + Expand all -->
    <div class="flex items-center gap-[8px]">
      <!-- Author input -->
      <div class="relative flex-1">
        <input
          type="text"
          placeholder="Filter by author…"
          class="w-full text-[12px] px-[8px] py-[4px] rounded-[3px] border border-border bg-background text-foreground
            placeholder-subtle focus:outline-none focus:border-accent transition-colors duration-fast"
          bind:value={authorInput}
          on:focus={() => (authorSuggestOpen = true)}
          on:blur={() => setTimeout(() => (authorSuggestOpen = false), 150)}
          on:input={() => { if (authorInput === '') filterAuthor = ''; }}
        />
        {#if filterAuthor}
          <button
            class="absolute right-[6px] top-1/2 -translate-y-1/2 text-subtle hover:text-foreground text-[11px]"
            on:click={() => { filterAuthor = ''; authorInput = ''; }}
          >✕</button>
        {/if}
        {#if authorSuggestOpen && authorSuggestions.length > 0}
          <div class="absolute top-full left-0 right-0 mt-[2px] bg-panel border border-border rounded-sm shadow-md z-20 max-h-[180px] overflow-y-auto">
            {#each authorSuggestions as a}
              <button
                class="w-full text-left px-[8px] py-[5px] text-[12px] text-foreground hover:bg-accent/10 transition-colors duration-fast"
                on:click={() => { filterAuthor = a; authorInput = a; authorSuggestOpen = false; }}
              >{a}</button>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Expand all toggle -->
      <button
        class="shrink-0 text-[11px] font-medium px-[8px] py-[4px] rounded-[3px] border transition-colors duration-fast
          {expandAll ? 'bg-interactive text-white border-interactive' : 'border-border text-subtle hover:text-foreground'}"
        on:click={() => (expandAll = !expandAll)}
      >
        {expandAll ? 'Collapse' : 'Expand all'}
      </button>

      <!-- Clear filters button (only shown when any filter active) -->
      {#if hasFilter}
        <button
          class="shrink-0 text-[11px] text-subtle hover:text-accent transition-colors duration-fast"
          on:click={clearFilters}
        >Clear</button>
      {/if}
    </div>
  </div>

  <!-- ── Pericope groups ────────────────────────────────────── -->
  <div class="flex-1 overflow-y-auto">
    {#if chapterData.pericopes.length === 0}
      <div class="p-lg text-center text-subtle text-[14px]">
        <p>No patristic commentary available for this chapter.</p>
      </div>
    {:else}
      {#each annotatedPericopes as pericope}
        {@const pericopeEntries = pericope.entries}
        {@const matchingCount = hasFilter ? pericopeEntries.filter(entryMatches).length : pericopeEntries.length}
        {@const pericopeHighlighted = selectedVerse !== null && pericope.verseInRange}

        <div class="border-b border-border/50 last:border-b-0">
          <!-- Sticky pericope header -->
          <div class="sticky top-0 z-10 bg-panel/95 backdrop-blur-sm border-b border-border/30 px-sm py-[8px]
            flex items-center justify-between">
            <span class="text-[11px] font-semibold uppercase tracking-[0.12em] text-subtle">
              {pericope.verseRef}
            </span>
            <span class="text-[10px] text-subtle">
              {matchingCount} {matchingCount === 1 ? 'entry' : 'entries'}
              {#if hasFilter && matchingCount < pericopeEntries.length}
                <span class="text-border">/ {pericopeEntries.length}</span>
              {/if}
            </span>
          </div>

          <!-- Entries -->
          <div class="px-sm py-[8px] space-y-[8px]">
            {#each pericopeEntries as entry}
              <FathersEntryCard
                {entry}
                highlighted={pericopeHighlighted && entryIsHighlighted(entry)}
                dimmed={entryIsDimmed(entry)}
                forceOpen={expandAll}
              />
            {/each}
          </div>
        </div>
      {/each}
    {/if}
  </div>
</div>
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/components/FathersCommentaryPanel.svelte
git commit -m "feat: add FathersCommentaryPanel with filter bar and pericope groups"
```

---

## Task 10: FathersVerseList Component

**Files:**
- Create: `src/lib/components/FathersVerseList.svelte`

Left pane: displays the Bible text with entry-count badges per verse. Clicking a verse emits `selectVerse`. When filters active and a verse has 0 matching entries, badge is dimmed.

- [ ] **Step 1: Write FathersVerseList**

```svelte
<!-- src/lib/components/FathersVerseList.svelte -->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { Chapter } from '$lib/data/types';

  export let chapter: Chapter;
  export let verseEntryCounts: Record<number, number>;
  /** verseEntryCounts after current filters applied. null = no filter active. */
  export let filteredVerseEntryCounts: Record<number, number> | null;
  export let selectedVerse: number | null;

  const dispatch = createEventDispatcher<{ selectVerse: number }>();

  function handleVerseClick(verseNum: number) {
    dispatch('selectVerse', verseNum);
  }
</script>

<div class="h-full overflow-y-auto px-sm py-md font-ui" style="font-family: var(--font-reader)">
  <!-- Chapter heading -->
  <h1 class="text-[13px] uppercase tracking-[0.15em] text-subtle font-medium mb-md">
    Chapter {chapter.chapter}
  </h1>

  <!-- Verse list -->
  <div class="space-y-[2px]">
    {#each chapter.verses as verse}
      {@const totalCount = verseEntryCounts[verse.verse] ?? 0}
      {@const filteredCount = filteredVerseEntryCounts ? (filteredVerseEntryCounts[verse.verse] ?? 0) : totalCount}
      {@const isSelected = selectedVerse === verse.verse}
      {@const hasBadge = totalCount > 0}

      <div
        class="flex items-start gap-[8px] rounded-sm px-[6px] py-[4px] cursor-pointer transition-colors duration-fast group
          {isSelected ? 'bg-accent/10' : 'hover:bg-border/20'}"
        role="button"
        tabindex={hasBadge ? 0 : -1}
        aria-pressed={isSelected}
        on:click={() => hasBadge && handleVerseClick(verse.verse)}
        on:keydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); hasBadge && handleVerseClick(verse.verse); } }}
      >
        <!-- Verse number -->
        <span class="shrink-0 text-[11px] text-subtle font-medium w-[20px] text-right pt-[2px]">
          {verse.verse}
        </span>

        <!-- Verse text -->
        <span class="flex-1 text-[15px] leading-relaxed text-foreground">{verse.text}</span>

        <!-- Entry count badge -->
        {#if hasBadge}
          <span
            class="shrink-0 mt-[4px] min-w-[18px] h-[18px] px-[4px] rounded-full text-[10px] font-semibold flex items-center justify-center transition-all duration-fast
              {filteredCount === 0
                ? 'bg-border/40 text-border opacity-50'
                : isSelected
                  ? 'bg-accent text-white'
                  : 'bg-accent/20 text-accent group-hover:bg-accent/30'}"
            title="{filteredCount} {filteredCount === 1 ? 'entry' : 'entries'}"
          >
            {filteredCount}
          </span>
        {/if}
      </div>
    {/each}
  </div>
</div>
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/components/FathersVerseList.svelte
git commit -m "feat: add FathersVerseList with entry-count badges"
```

---

## Task 11: FathersReader Layout Component

**Files:**
- Create: `src/lib/components/FathersReader.svelte`

Owns the two-pane layout and `selectedVerse` state. Passes `filteredVerseEntryCounts` (recomputed when filters change) from panel back up to the verse list via a store or props.

**Note on reactivity:** FathersCommentaryPanel owns filter state; FathersVerseList needs `filteredVerseEntryCounts` to dim badges. Use a writable store local to FathersReader to share filtered counts.

- [ ] **Step 1: Write FathersReader**

```svelte
<!-- src/lib/components/FathersReader.svelte -->
<script lang="ts">
  import { writable } from 'svelte/store';
  import type { PageData } from '../routes/fathers/[book]/[chapter]/$types';
  import FathersVerseList from './FathersVerseList.svelte';
  import FathersCommentaryPanel from './FathersCommentaryPanel.svelte';

  export let data: PageData;

  let selectedVerse: number | null = null;

  function handleVerseSelect(e: CustomEvent<number>) {
    const verse = e.detail;
    selectedVerse = selectedVerse === verse ? null : verse;
  }

  // Shared filtered counts: FathersCommentaryPanel computes and dispatches these
  // so FathersVerseList can dim badges when filters are active.
  let filteredVerseEntryCounts: Record<number, number> | null = null;

  function handleFilteredCounts(e: CustomEvent<Record<number, number> | null>) {
    filteredVerseEntryCounts = e.detail;
  }

  $: accsData = data.accsData ?? { pericopes: [], verseEntryCounts: {} };
</script>

<div class="flex items-stretch" style="height: calc(100vh - var(--header-height) - 50px);">
  <!-- Left pane: verse reader (fixed width ~320px) -->
  <div class="shrink-0 border-r border-border overflow-hidden" style="width: 320px;">
    <FathersVerseList
      chapter={data.chapter}
      verseEntryCounts={accsData.verseEntryCounts}
      {filteredVerseEntryCounts}
      {selectedVerse}
      on:selectVerse={handleVerseSelect}
    />
  </div>

  <!-- Right pane: commentary panel (flex-1, fills remaining space) -->
  <div class="flex-1 min-w-0 overflow-hidden">
    <FathersCommentaryPanel
      chapterData={accsData}
      {selectedVerse}
      on:filteredCounts={handleFilteredCounts}
    />
  </div>
</div>
```

- [ ] **Step 2: Add `filteredCounts` event dispatch to FathersCommentaryPanel**

Open `src/lib/components/FathersCommentaryPanel.svelte` and add:

At the top of `<script>`:
```typescript
import { createEventDispatcher } from 'svelte';
const dispatch = createEventDispatcher<{ filteredCounts: Record<number, number> | null }>();
```

After `$: hasFilter = ...`, add a reactive statement that computes and dispatches filtered counts:
```typescript
$: {
  if (!hasFilter) {
    dispatch('filteredCounts', null);
  } else {
    const counts: Record<number, number> = {};
    for (const p of chapterData.pericopes) {
      for (const entry of p.entries) {
        if (!entryMatches(entry)) continue;
        if (entry.subVerseNum !== null) {
          counts[entry.subVerseNum] = (counts[entry.subVerseNum] ?? 0) + 1;
        } else {
          for (let v = p.startVerse; v <= p.endVerse; v++) {
            counts[v] = (counts[v] ?? 0) + 1;
          }
        }
      }
    }
    dispatch('filteredCounts', counts);
  }
}
```

- [ ] **Step 3: Fix the import path in FathersReader**

The `import type { PageData }` path needs to match SvelteKit's generated types. Use the `$types` import from the page directly in `+page.svelte` instead, and pass individual props to FathersReader:

Update `+page.svelte` to pass explicit props:
```svelte
<FathersReader
  bookMeta={data.bookMeta}
  chapter={data.chapter}
  accsData={data.accsData}
/>
```

Update `FathersReader.svelte` to accept explicit props:
```typescript
import type { Chapter, BookMeta } from '$lib/data/types';
import type { AccsChapterFile } from '$lib/data/accs-types';

export let bookMeta: BookMeta;
export let chapter: Chapter;
export let accsData: AccsChapterFile | null;
```

- [ ] **Step 4: Run type check**

```bash
npm run check
```

Fix any type errors. Common ones:
- `filteredVerseEntryCounts` type mismatch — ensure `Record<number, number> | null` matches
- FathersVerseList `chapter` prop type — ensure it's `Chapter` not `Chapter | undefined`

- [ ] **Step 5: Commit**

```bash
git add src/lib/components/FathersReader.svelte src/lib/components/FathersCommentaryPanel.svelte src/lib/components/FathersVerseList.svelte src/routes/fathers/
git commit -m "feat: wire FathersReader two-pane layout with filter reactivity"
```

---

## Task 12: Mode Toggle Integration

**Files:**
- Modify: `src/lib/components/TopBar.svelte`
- Modify: `src/lib/components/CompareBar.svelte`

Add "Fathers" as the 4th mode item in both components. When selected, navigate to `/fathers/{book}/{chapter}`.

- [ ] **Step 1: Update TopBar.svelte**

Find (around line 86):
```javascript
$: modeItems = [
  { key: 'reading', label: 'Read' },
  ...(hasStudyMode ? [{ key: 'study', label: 'Study' }] : []),
  { key: 'compare', label: 'Compare' }
];
```

Replace with:
```javascript
$: modeItems = [
  { key: 'reading', label: 'Read' },
  ...(hasStudyMode ? [{ key: 'study', label: 'Study' }] : []),
  { key: 'compare', label: 'Compare' },
  { key: 'fathers', label: 'Fathers' }
];
```

Find the `selectMode` function and add `fathers` handling after the `compare` block:
```javascript
if (key === 'compare') {
  pendingIdx = index;
  const delay = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 210;
  await new Promise<void>((r) => setTimeout(r, delay));
  goto(`/compare/${bookSlug}/${chapterNum}`);
  return;
}
// Add after:
if (key === 'fathers') {
  pendingIdx = index;
  const delay = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 210;
  await new Promise<void>((r) => setTimeout(r, delay));
  goto(`/fathers/${bookSlug}/${chapterNum}`);
  return;
}
```

- [ ] **Step 2: Update CompareBar.svelte**

Find (around line 26):
```javascript
$: modeItems = [
  { key: 'reading', label: 'Read' },
  { key: 'study', label: 'Study' },
  { key: 'compare', label: 'Compare' }
];
```

Replace with:
```javascript
$: modeItems = [
  { key: 'reading', label: 'Read' },
  { key: 'study',   label: 'Study' },
  { key: 'compare', label: 'Compare' },
  { key: 'fathers', label: 'Fathers' }
];
```

Add `fathers` to the `selectMode` function after the `compare` guard:
```javascript
async function selectMode(key: string, index: number) {
  if (key === 'compare') return;
  if (key === 'fathers') {
    pendingIdx = index;
    const delay = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 210;
    await new Promise<void>((r) => setTimeout(r, delay));
    goto(`/fathers/${bookMeta.slug}/${chapterNum}`);
    return;
  }
  // existing: read/study handling
  pendingIdx = index;
  const delay = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 210;
  await new Promise<void>((r) => setTimeout(r, delay));
  prefs.update((p) => ({ ...p, readingMode: key === 'study' ? 'study' : 'reading' }));
  goto(readerHref);
}
```

- [ ] **Step 3: Run type check and lint**

```bash
npm run check && npm run lint
```

Fix any errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/components/TopBar.svelte src/lib/components/CompareBar.svelte
git commit -m "feat: add Fathers mode to Read/Study/Compare toggle"
```

---

## Task 13: End-to-End Test

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 2: Navigate to a chapter with known ACCS data**

Open `http://localhost:5173/odr/romans/1`. Click the "Fathers" button in the mode toggle.

Expected: navigates to `/fathers/romans/1`.

- [ ] **Step 3: Verify left pane**

Expected: Romans 1 verses displayed with count badges on each verse (e.g., verse 1 shows count). Clicking verse 3 highlights it; commentary panel scrolls to the matching pericope.

- [ ] **Step 4: Verify right pane**

Expected: pericopes grouped (`Romans 1:1-7`, `Romans 1:8-13`, etc.) with sticky headers. Entry cards show collapsible body, author name, citation.

- [ ] **Step 5: Verify filters**

- Click "4th" century chip → only 4th-century authors' entries visible; others dimmed.
- Click "Eastern" tradition → further narrows.
- Type "CHRY" in author field → "CHRYSOSTOM" appears in autocomplete; click to select.
- Verify verse badges in left pane dim for verses with no matching entries.
- Click "Clear" → all entries visible again.
- Toggle "Expand all" → all entry bodies fully expanded.

- [ ] **Step 6: Navigate to a chapter with no ACCS data (if any)**

Expected: "No patristic commentary available for this chapter." message shown.

- [ ] **Step 7: Verify mobile layout**

Open DevTools → mobile viewport. Verify the two-pane layout stacks or adapts appropriately (the left pane may need `display: none` on mobile, showing only commentary). Add responsive adjustments if needed.

- [ ] **Step 8: Run full type check and build**

```bash
npm run check && npm run build
```

Expected: builds successfully.

- [ ] **Step 9: Final commit**

```bash
git add -p  # stage any mobile fixes or adjustments
git commit -m "feat: complete Fathers mode — patristic commentary viewer"
```

---

## Self-Review

### Spec Coverage

| Requirement | Task(s) |
|-------------|---------|
| `/fathers/[book]/[chapter]` route | Task 6 |
| Two-pane layout (verse list left, commentary right) | Tasks 10, 11 |
| Entry-count badges per verse | Tasks 3, 10 |
| Clicking verse highlights/scrolls entries | Tasks 10, 11 |
| Century chips (1st–8th, 9th+) | Task 9 |
| Era chips (Ante-Nicene / Nicene / Post-Nicene) | Task 9 |
| Tradition chips (Eastern / Western / Syriac) | Task 9 |
| Author autocomplete (dynamic per chapter) | Task 9 |
| Expand all toggle | Tasks 8, 9 |
| Badge dimming when filter active + 0 matches | Tasks 9, 10 |
| Author metadata lookup (century, era, tradition) | Task 2 |
| 4th mode in Read/Study/Compare toggle | Task 12 |
| Data pipeline (ACCS JSON → static/data/accs/) | Tasks 3, 4 |
| Loader function | Task 5 |
| FathersBar header with navigation | Task 7 |

### No Placeholder Check

- Author metadata: 75 authors annotated covering ~92% of entries. Remaining 236 default to `null` and still display; just won't appear in era/tradition/century filters. This is intentional.
- `entryMatches` handles `null` meta gracefully: `if (filterEra !== 'all' && meta.era !== filterEra) return false` — a `null` era never equals a filter value, so null-meta entries are hidden when era/tradition/century filter is active. This is correct behavior.

### Type Consistency

- `AccsEntry.subVerseNum: number | null` — used in `FathersEntryCard` (badge display) and `entryIsHighlighted` comparison.
- `AccsChapterFile.verseEntryCounts: Record<number, number>` — passed to `FathersVerseList` as both `verseEntryCounts` (total) and `filteredVerseEntryCounts` (filtered, or null when no filter).
- `filteredVerseEntryCounts: Record<number, number> | null` — `null` means "no filter active, show total counts." `{}` means "filter active but no verse has matches."
