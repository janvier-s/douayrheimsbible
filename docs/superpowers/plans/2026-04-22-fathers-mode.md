# Fathers Mode Implementation Plan (v2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/fathers/[book]/[chapter]` route displaying patristic commentary (ACCS + FKB) alongside the Bible text — a two-pane layout with verse reader + entry-count badges (left) and a filtered commentary panel (right), accessible as a 4th mode in the existing Read / Study / Compare toggle.

**Architecture:** A tsx build script reads the pre-harmonized `unified-entries.json` + `verse-index.json` from the ACCS source directory and writes per-chapter JSON files to `static/data/fathers/{slug}/{chapter}.json`. Author metadata (century, era, tradition) is a bundled TypeScript const keyed by canonical name. The route follows the CompareBar pattern: returns `showLayoutTopBar: false`, uses its own `FathersBar` header. Filters are client-side only.

**Tech Stack:** SvelteKit 2, Svelte 4 syntax (`export let`, `$:`, `createEventDispatcher`, writable stores), Tailwind CSS 3, TypeScript, tsx build scripts.

---

## Harmonized Source Data

All commentary data has been pre-harmonized into two files under:

```
/Users/Janvier/Library/Mobile Documents/com~apple~CloudDocs/for-the-kingdom/SCRIPTURA/sources/ODR/ACCS/json-harmonized/
```

### `unified-entries.json` (90.9 MB, 32,009 entries)

Each entry in the flat array:

```typescript
{
  id: string;              // "accs-0" or "fkb-30820"
  source: "accs" | "fkb";
  verseRef: string;        // DRC book name + chapter:verse, e.g. "Matthew 14:1-12"
  subVerse: string | null; // ACCS only — "14:2" (specific verse within pericope)
  author: string;          // Canonical name: "St. John Chrysostom", "Tertullian"
  date: string;            // "c. 347–407", "354-430", "fl. c. 366–384", ""
  body: string;
  citation: string;        // "The Gospel of Matthew, Homily 48.2"
  title: string | null;    // ACCS entry heading
  footnotes: Array<{type: string; text: string}>;
  pericopeTitle: string | null;  // ACCS: "The Death of John the Baptist"
  overview: string | null;       // ACCS: pericope overview paragraph
  verseTitle: string | null;     // ACCS: verse-level heading
  chapterNum: number | null;     // FKB: doctrinal chapter number
  chapterTitle: string | null;   // FKB: "The One True God"
  isDocument: boolean;           // true for councils, anonymous works, documents
}
```

### `verse-index.json` (0.3 MB, 1,165 chapter keys)

```typescript
Record<string, number[]>  // "Matthew 16" → [21705, 21706, ...] (indices into unified-entries)
```

Book names in both files use DRC convention (1 Kings = 1 Samuel, Isaias = Isaiah, etc.) and match the `odrName` field in `src/lib/data/books.ts` **except** for three books:

| unified-entries | ODR odrName | ODR slug |
|----------------|-------------|----------|
| Isaias | Isaie | isaie |
| Jeremias | Jeremy | jeremie |
| Malachias | Malachie | malachie |

The build script must handle these three mappings.

### Data stats

- **ACCS**: 30,820 entries across 29 biblical books (255 canonical authors)
- **FKB**: 1,189 entries (expanded from 925 quotes) across 49 doctrinal chapters (122 canonical authors, 61 overlapping with ACCS)
- **Authors with dates**: 31,597/32,009 (98.7%)
- **isDocument entries**: 392

---

## File Map

### Created
| File | Purpose |
|------|---------|
| `scripts/build-fathers-data.ts` | Pipeline: unified-entries + verse-index → `static/data/fathers/{slug}/{chapter}.json` |
| `src/lib/data/fathers-types.ts` | TypeScript interfaces for fathers chapter data |
| `src/lib/data/fathers-authors.ts` | Author metadata const (century, era, tradition) keyed by canonical name |
| `src/lib/utils/fathers-display.ts` | `displayVerseRef(ref, useModern)` — swaps DRC book name in verseRef to modern when pref is on |
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
| `src/lib/data/loader.ts` | Add `loadFathersChapter()` |
| `scripts/prepare-data.ts` | Import and call `buildFathersData()` |
| `src/lib/components/TopBar.svelte` | Add `fathers` mode item + `goto` handler |
| `src/lib/components/CompareBar.svelte` | Add `fathers` mode item + `goto` handler |

---

## Task 1: TypeScript Types

**Files:**
- Create: `src/lib/data/fathers-types.ts`

- [ ] **Step 1: Write the types file**

```typescript
// src/lib/data/fathers-types.ts

export interface FathersEntry {
  /** Index position within pericope entries array */
  subVerse: string | null;      // e.g. "1:7" — specific verse within pericope (ACCS only)
  subVerseNum: number | null;   // 7 — parsed for quick comparison
  source: 'accs' | 'fkb';
  author: string;               // Canonical: "St. John Chrysostom"
  date: string;                 // "c. 347–407", "354-430", ""
  title: string | null;         // ACCS entry heading
  body: string;
  citation: string;
  isDocument: boolean;          // true for councils, documents, anonymous works
  footnotes: Array<{ type: string; text: string }>;
  /** FKB-specific: doctrinal chapter context */
  fkbChapter: string | null;    // e.g. "Ch. 13 — The One True God"
}

export interface FathersPericope {
  verseRef: string;             // e.g. "Romans 1:1-7" (DRC book name)
  startVerse: number;           // 1
  endVerse: number;             // 7
  pericopeTitle: string | null; // ACCS: "An Apostle Called by God"
  overview: string | null;      // ACCS: pericope overview paragraph
  entries: FathersEntry[];
}

export interface FathersChapterFile {
  pericopes: FathersPericope[];
  /** verse number → total entry count (for badge display) */
  verseEntryCounts: Record<number, number>;
  /** total entries in this chapter (ACCS + FKB) */
  totalEntries: number;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/data/fathers-types.ts
git commit -m "feat: add Fathers commentary TypeScript types"
```

---

## Task 2: Author Metadata

**Files:**
- Create: `src/lib/data/fathers-authors.ts`

Covers the top ~100 authors by entry count (representing ~95% of all entries). Keyed by canonical name (Title Case with honorifics), matching the `author` field in unified entries.

- [ ] **Step 1: Write the author metadata file**

```typescript
// src/lib/data/fathers-authors.ts

export type AuthorEra = 'ante-nicene' | 'nicene' | 'post-nicene';
export type AuthorTradition = 'eastern' | 'western' | 'syriac';

export interface AuthorMeta {
  /** Century 1–9 (9 = "9th or later") */
  century: number | null;
  era: AuthorEra | null;
  tradition: AuthorTradition | null;
}

// Key = canonical author name exactly as it appears in unified entries
export const AUTHORS: Record<string, AuthorMeta> = {
  // ── Top ACCS authors (by entry count) ──────────────────────────
  'St. John Chrysostom':         { century: 4, era: 'nicene',       tradition: 'eastern'  },
  'St. Augustine of Hippo':      { century: 4, era: 'nicene',       tradition: 'western'  },
  'Origen of Alexandria':        { century: 3, era: 'ante-nicene',  tradition: 'eastern'  },
  'St. Jerome':                  { century: 4, era: 'nicene',       tradition: 'western'  },
  'St. Ambrose of Milan':        { century: 4, era: 'nicene',       tradition: 'western'  },
  'Bede the Venerable':          { century: 8, era: 'post-nicene',  tradition: 'western'  },
  'Theodoret of Cyr':            { century: 5, era: 'post-nicene',  tradition: 'eastern'  },
  'St. Cyril of Alexandria':     { century: 5, era: 'post-nicene',  tradition: 'eastern'  },
  'Ambrosiaster':                { century: 4, era: 'nicene',       tradition: 'western'  },
  'St. Gregory the Great':       { century: 6, era: 'post-nicene',  tradition: 'western'  },
  'St. Ephrem the Syrian':       { century: 4, era: 'nicene',       tradition: 'syriac'   },
  'Oecumenius':                  { century: 6, era: 'post-nicene',  tradition: 'eastern'  },
  'Theodore of Mopsuestia':      { century: 4, era: 'nicene',       tradition: 'eastern'  },
  'St. Basil the Great':         { century: 4, era: 'nicene',       tradition: 'eastern'  },
  'St. Caesarius of Arles':      { century: 6, era: 'post-nicene',  tradition: 'western'  },
  'Tertullian':                  { century: 3, era: 'ante-nicene',  tradition: 'western'  },
  'Cassiodorus':                 { century: 6, era: 'post-nicene',  tradition: 'western'  },
  'St. Clement of Alexandria':   { century: 3, era: 'ante-nicene',  tradition: 'eastern'  },
  'Pelagius':                    { century: 4, era: 'nicene',       tradition: 'western'  },
  'Didymus the Blind':           { century: 4, era: 'nicene',       tradition: 'eastern'  },
  'St. Cyril of Jerusalem':      { century: 4, era: 'nicene',       tradition: 'eastern'  },
  'St. Gregory of Nyssa':        { century: 4, era: 'nicene',       tradition: 'eastern'  },
  'St. Athanasius of Alexandria':{ century: 4, era: 'nicene',       tradition: 'eastern'  },
  'Eusebius of Caesarea':        { century: 4, era: 'nicene',       tradition: 'eastern'  },
  'St. Hilary of Poitiers':      { century: 4, era: 'nicene',       tradition: 'western'  },
  'Andrew of Caesarea':          { century: 6, era: 'post-nicene',  tradition: 'eastern'  },
  'St. Gregory of Nazianzus':    { century: 4, era: 'nicene',       tradition: 'eastern'  },
  'St. John Cassian':            { century: 5, era: 'post-nicene',  tradition: 'western'  },
  'Marius Victorinus':           { century: 4, era: 'nicene',       tradition: 'western'  },
  'St. Cyprian of Carthage':     { century: 3, era: 'ante-nicene',  tradition: 'western'  },
  'Primasius':                   { century: 6, era: 'post-nicene',  tradition: 'western'  },
  'St. Hilary of Arles':         { century: 5, era: 'post-nicene',  tradition: 'western'  },
  'St. Hippolytus of Rome':      { century: 3, era: 'ante-nicene',  tradition: 'western'  },
  'St. Irenaeus of Lyons':       { century: 2, era: 'ante-nicene',  tradition: 'western'  },
  'Andreas':                     { century: 6, era: 'post-nicene',  tradition: 'eastern'  },
  'St. Fulgentius of Ruspe':     { century: 6, era: 'post-nicene',  tradition: 'western'  },
  'St. Leo the Great':           { century: 5, era: 'post-nicene',  tradition: 'western'  },
  'St. John of Damascus':        { century: 8, era: 'post-nicene',  tradition: 'eastern'  },
  'St. Peter Chrysologus':       { century: 5, era: 'post-nicene',  tradition: 'western'  },
  'Evagrius of Pontus':          { century: 4, era: 'nicene',       tradition: 'eastern'  },
  'Maximus of Turin':            { century: 5, era: 'post-nicene',  tradition: 'western'  },
  'Rabanus Maurus':              { century: 9, era: 'post-nicene',  tradition: 'western'  },
  'Severian of Gabala':          { century: 4, era: 'nicene',       tradition: 'eastern'  },
  'Apringius of Beja':           { century: 6, era: 'post-nicene',  tradition: 'western'  },
  'St. Chromatius of Aquileia':  { century: 4, era: 'nicene',       tradition: 'western'  },
  'St. Justin Martyr':           { century: 2, era: 'ante-nicene',  tradition: 'eastern'  },
  'Diodore of Tarsus':           { century: 4, era: 'nicene',       tradition: 'eastern'  },
  'Tyconius':                    { century: 4, era: 'nicene',       tradition: 'western'  },
  'St. Maximus the Confessor':   { century: 7, era: 'post-nicene',  tradition: 'eastern'  },
  'Theophylact':                 { century: 9, era: 'post-nicene',  tradition: 'eastern'  },
  'Isidore of Seville':          { century: 7, era: 'post-nicene',  tradition: 'western'  },
  'St. Clement of Rome':         { century: 1, era: 'ante-nicene',  tradition: 'western'  },
  'St. Polycarp of Smyrna':      { century: 2, era: 'ante-nicene',  tradition: 'eastern'  },
  'St. Ignatius of Antioch':     { century: 2, era: 'ante-nicene',  tradition: 'eastern'  },
  'Shepherd of Hermas':          { century: 2, era: 'ante-nicene',  tradition: 'western'  },
  'Letter of Barnabas':          { century: 2, era: 'ante-nicene',  tradition: 'eastern'  },
  'Dionysius of Alexandria':     { century: 3, era: 'ante-nicene',  tradition: 'eastern'  },
  'Gregory of Elvira':           { century: 4, era: 'nicene',       tradition: 'western'  },
  'Pachomius':                   { century: 4, era: 'nicene',       tradition: 'eastern'  },
  'Mark the Monk':               { century: 5, era: 'post-nicene',  tradition: 'eastern'  },
  'Diadochus of Photice':        { century: 5, era: 'post-nicene',  tradition: 'eastern'  },
  'Salvian the Presbyter':       { century: 5, era: 'post-nicene',  tradition: 'western'  },
  'Gennadius of Constantinople': { century: 5, era: 'post-nicene',  tradition: 'eastern'  },
  'Novatian':                    { century: 3, era: 'ante-nicene',  tradition: 'western'  },
  'St. Paulinus of Nola':        { century: 4, era: 'nicene',       tradition: 'western'  },
  'Arnobius the Younger':        { century: 5, era: 'post-nicene',  tradition: 'western'  },
  'Lactantius':                  { century: 4, era: 'nicene',       tradition: 'western'  },
  'Minucius Felix':              { century: 3, era: 'ante-nicene',  tradition: 'western'  },
  'Arnobius of Sicca':           { century: 4, era: 'nicene',       tradition: 'western'  },

  // ── FKB-prominent authors ─────────────────────────────────────
  'Pope St. Clement I':          { century: 1, era: 'ante-nicene',  tradition: 'western'  },
  'Pope St. Leo I':              { century: 5, era: 'post-nicene',  tradition: 'western'  },
  'Pope St. Gregory I':          { century: 6, era: 'post-nicene',  tradition: 'western'  },
  'St. Aphrahat':                { century: 4, era: 'nicene',       tradition: 'syriac'   },
  'St. Antony the Great':        { century: 4, era: 'nicene',       tradition: 'eastern'  },
  'St. Patrick':                 { century: 5, era: 'post-nicene',  tradition: 'western'  },
  'St. Vincent of Lérins':       { century: 5, era: 'post-nicene',  tradition: 'western'  },
  'Athenagoras of Athens':       { century: 2, era: 'ante-nicene',  tradition: 'eastern'  },
  'St. Theophilus of Antioch':   { century: 2, era: 'ante-nicene',  tradition: 'eastern'  },
  'St. Epiphanius of Salamis':   { century: 4, era: 'nicene',       tradition: 'eastern'  },
  'St. Melito of Sardis':        { century: 2, era: 'ante-nicene',  tradition: 'eastern'  },
  'Tatian the Syrian':           { century: 2, era: 'ante-nicene',  tradition: 'syriac'   },

  // ── Documents / anonymous works ────────────────────────────────
  'Apostolic Constitutions':     { century: 4, era: 'nicene',       tradition: 'eastern'  },
  'Didache':                     { century: 1, era: 'ante-nicene',  tradition: 'eastern'  },
  'Didascalia':                  { century: 3, era: 'ante-nicene',  tradition: 'syriac'   },
  'Second Clement':              { century: 2, era: 'ante-nicene',  tradition: null        },
  'Letter to Diognetus':         { century: 2, era: 'ante-nicene',  tradition: null        },
  'Incomplete Work on Matthew':  { century: 5, era: 'post-nicene',  tradition: 'western'  },
};

/** Returns author meta or null fallback for unlisted authors */
export function getAuthorMeta(author: string): AuthorMeta {
  return AUTHORS[author] ?? { century: null, era: null, tradition: null };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/data/fathers-authors.ts
git commit -m "feat: add Fathers author metadata (century, era, tradition)"
```

---

## Task 3: Display Verse Ref Utility

**Files:**
- Create: `src/lib/utils/fathers-display.ts`

The verseRef strings in the data use DRC book names (e.g., "1 Kings 1:1-7" for what is modernly "1 Samuel"). When the user has `modernBookNames` enabled in reading prefs, the UI should show modern names instead. This utility extracts the book name from a verseRef string, looks up the BookMeta, and swaps to `modernName` or `odrName` accordingly.

Also handles the 3 name mismatches between unified data and ODR (Isaias→Isaie, Jeremias→Jeremy, Malachias→Malachie).

- [ ] **Step 1: Write the utility**

```typescript
// src/lib/utils/fathers-display.ts
import { getBookByOdrName } from '$lib/data/books';
import type { BookMeta } from '$lib/data/types';

/**
 * Map from unified-entries DRC book names that don't exactly match
 * the ODR odrName field. These are the only 3 mismatches.
 */
const UNIFIED_TO_ODR: Record<string, string> = {
  'Isaias': 'Isaie',
  'Jeremias': 'Jeremy',
  'Malachias': 'Malachie',
};

/** Cache book lookups since verseRefs repeat heavily */
const bookCache = new Map<string, BookMeta | null>();

function lookupBook(bookName: string): BookMeta | null {
  if (bookCache.has(bookName)) return bookCache.get(bookName)!;
  // Try direct lookup first, then the mismatch map
  const odrName = UNIFIED_TO_ODR[bookName] ?? bookName;
  const meta = getBookByOdrName(odrName) ?? null;
  bookCache.set(bookName, meta);
  return meta;
}

/**
 * Convert a DRC verseRef to the user's preferred book-name style.
 * "1 Kings 1:1-7" → "1 Samuel 1:1-7" (modern) or "1 Kings 1:1-7" (DRC)
 */
export function displayVerseRef(verseRef: string, useModernNames: boolean): string {
  // Extract book name: everything before the last " \d" (chapter start)
  const m = verseRef.match(/^(.+?)\s+(\d.*)$/);
  if (!m) return verseRef;

  const [, bookName, rest] = m;
  const meta = lookupBook(bookName);
  if (!meta) return verseRef;

  const displayName = useModernNames ? meta.modernName : meta.odrName;
  return `${displayName} ${rest}`;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/utils/fathers-display.ts
git commit -m "feat: add displayVerseRef utility for DRC/modern book name toggle"
```

---

## Task 4: Data Build Script

**Files:**
- Create: `scripts/build-fathers-data.ts`

This script reads the pre-harmonized `unified-entries.json` + `verse-index.json` and writes per-chapter JSON files to `static/data/fathers/{slug}/{chapter}.json`.

- [ ] **Step 1: Write the build script**

```typescript
// scripts/build-fathers-data.ts
// @ts-nocheck — build script run with tsx
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { FathersEntry, FathersPericope, FathersChapterFile } from '../src/lib/data/fathers-types';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HARMONIZED_DIR = join(
  __dirname, '..', '..', 'SCRIPTURA', 'sources', 'ODR', 'ACCS', 'json-harmonized'
);
const OUT_DIR = join(__dirname, '..', 'static', 'data', 'fathers');

// ── DRC book name (from unified-entries verseRef) → ODR slug ────────────────
// The verse-index keys use DRC names that mostly match odrName in books.ts.
// Three exceptions need explicit mapping; rest derive slug from odrName.

// Build map from ALL_BOOKS (inline here to avoid importing Svelte module in build script)
const DRC_BOOK_TO_SLUG: Record<string, string> = {
  'Genesis': 'genesis', 'Exodus': 'exodus', 'Leviticus': 'leviticus',
  'Numbers': 'numbers', 'Deuteronomy': 'deuteronomy',
  'Josue': 'josue', 'Judges': 'judges', 'Ruth': 'ruth',
  '1 Kings': '1-kings', '2 Kings': '2-kings',
  '3 Kings': '3-kings', '4 Kings': '4-kings',
  '1 Paralipomenon': '1-paralipomenon', '2 Paralipomenon': '2-paralipomenon',
  '1 Esdras': '1-esdras', '2 Esdras': '2-esdras',
  'Tobias': 'tobias', 'Judith': 'judith', 'Esther': 'esther',
  '1 Machabees': '1-machabees', '2 Machabees': '2-machabees',
  'Job': 'job', 'Psalms': 'psalms', 'Proverbs': 'proverbs',
  'Ecclesiastes': 'ecclesiastes', 'Canticle of Canticles': 'canticle-of-canticles',
  'Wisdom': 'wisdom', 'Ecclesiasticus': 'ecclesiasticus',
  // Three name mismatches between unified data and ODR odrName:
  'Isaias': 'isaie',       // unified uses "Isaias", ODR uses "Isaie"
  'Jeremias': 'jeremie',   // unified uses "Jeremias", ODR uses "Jeremy"
  'Malachias': 'malachie', // unified uses "Malachias", ODR uses "Malachie"
  'Lamentations': 'lamentations', 'Baruch': 'baruch',
  'Ezechiel': 'ezechiel', 'Daniel': 'daniel',
  'Osee': 'osee', 'Joel': 'joel', 'Amos': 'amos', 'Abdias': 'abdias',
  'Jonas': 'jonas', 'Micheas': 'micheas', 'Nahum': 'nahum',
  'Habacuc': 'habacuc', 'Sophonias': 'sophonias',
  'Aggeus': 'aggeus', 'Zacharias': 'zacharias',
  'Matthew': 'matthew', 'Mark': 'mark', 'Luke': 'luke', 'John': 'john',
  'Acts': 'acts', 'Romans': 'romans',
  '1 Corinthians': '1-corinthians', '2 Corinthians': '2-corinthians',
  'Galatians': 'galatians', 'Ephesians': 'ephesians',
  'Philippians': 'philippians', 'Colossians': 'colossians',
  '1 Thessalonians': '1-thessalonians', '2 Thessalonians': '2-thessalonians',
  '1 Timothy': '1-timothy', '2 Timothy': '2-timothy',
  'Titus': 'titus', 'Philemon': 'philemon',
  'Hebrews': 'hebrews', 'James': 'james',
  '1 Peter': '1-peter', '2 Peter': '2-peter',
  '1 John': '1-john', '2 John': '2-john', '3 John': '3-john',
  'Jude': 'jude', 'Apocalypse': 'apocalypse',
};

interface RawUnifiedEntry {
  id: string;
  source: 'accs' | 'fkb';
  verseRef: string;
  subVerse: string | null;
  author: string;
  date: string;
  body: string;
  citation: string;
  title: string | null;
  footnotes: Array<{ type: string; text: string }>;
  pericopeTitle: string | null;
  overview: string | null;
  verseTitle: string | null;
  chapterNum: number | null;
  chapterTitle: string | null;
  isDocument: boolean;
}

/**
 * Parse a verseRef string into (book, chapter, startVerse, endVerse).
 * Returns null for unrecognised formats.
 *
 * Handles:
 *   "Romans 1:1-7"       → { book: 'Romans', chapter: 1, start: 1, end: 7 }
 *   "James 1:1"          → { book: 'James',  chapter: 1, start: 1, end: 1 }
 *   "Genesis 1:1-2:3"    → { book: 'Genesis',chapter: 1, start: 1, end: 3 } (assigns to ch 1)
 */
function parseVerseRef(verseRef: string): {
  book: string; chapter: number; startVerse: number; endVerse: number;
} | null {
  const m = verseRef.match(/^(.+?)\s+(\d+):(\d+)(?:[–\-](?:(\d+):)?(\d+))?$/);
  if (!m) return null;
  const [, book, chStr, svStr, , evStr] = m;
  return {
    book,
    chapter: parseInt(chStr, 10),
    startVerse: parseInt(svStr, 10),
    endVerse: evStr ? parseInt(evStr, 10) : parseInt(svStr, 10),
  };
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

// ── Load harmonized data ─────────────────────────────────────────

const entries: RawUnifiedEntry[] = JSON.parse(
  readFileSync(join(HARMONIZED_DIR, 'unified-entries.json'), 'utf8')
);
const verseIndex: Record<string, number[]> = JSON.parse(
  readFileSync(join(HARMONIZED_DIR, 'verse-index.json'), 'utf8')
);

// Paraphrased overviews (replaces raw ACCS editorial overviews for copyright reasons)
// Falls back to null if the file doesn't exist or a verseRef has no paraphrase yet.
interface ParaphrasedOverview { verseRef: string; paraphrased: string }
let paraphrased: Record<string, ParaphrasedOverview> = {};
const paraphrasedPath = join(HARMONIZED_DIR, 'paraphrased-overviews.json');
try {
  paraphrased = JSON.parse(readFileSync(paraphrasedPath, 'utf8'));
} catch {
  console.log('No paraphrased-overviews.json found; overviews will be null.');
}

// ── Group entries by slug + chapter into pericopes ──────────────

// Key: "slug/chapter" → Map<verseRef, pericope data>
const bySlugChapter = new Map<string, Map<string, {
  startVerse: number;
  endVerse: number;
  pericopeTitle: string | null;
  overview: string | null;
  entries: FathersEntry[];
}>>();

let totalProcessed = 0;
let skippedNoRef = 0;
let skippedNoSlug = 0;

for (const [chapterKey, indices] of Object.entries(verseIndex)) {
  // chapterKey: "Matthew 16" → book = "Matthew", chapter = 16
  const spaceIdx = chapterKey.lastIndexOf(' ');
  const bookName = chapterKey.substring(0, spaceIdx);
  const chapter = parseInt(chapterKey.substring(spaceIdx + 1), 10);
  const slug = DRC_BOOK_TO_SLUG[bookName];

  if (!slug) {
    skippedNoSlug += indices.length;
    continue;
  }

  const key = `${slug}/${chapter}`;
  if (!bySlugChapter.has(key)) bySlugChapter.set(key, new Map());
  const pericopeMap = bySlugChapter.get(key)!;

  for (const idx of indices) {
    const e = entries[idx];
    if (!e.verseRef) { skippedNoRef++; continue; }

    const parsed = parseVerseRef(e.verseRef);
    if (!parsed) { skippedNoRef++; continue; }

    if (!pericopeMap.has(e.verseRef)) {
      // Use paraphrased overview if available; never ship raw ACCS editorial text
      const overviewText = paraphrased[e.verseRef]?.paraphrased ?? null;
      pericopeMap.set(e.verseRef, {
        startVerse: parsed.startVerse,
        endVerse: parsed.endVerse,
        pericopeTitle: e.pericopeTitle,
        overview: overviewText,
        entries: [],
      });
    }

    const pericope = pericopeMap.get(e.verseRef)!;
    if (!pericope.pericopeTitle && e.pericopeTitle) pericope.pericopeTitle = e.pericopeTitle;

    pericope.entries.push({
      subVerse: e.subVerse,
      subVerseNum: parseSubVerseNum(e.subVerse),
      source: e.source,
      author: e.author,
      date: e.date,
      title: e.title,
      body: e.body,
      citation: e.citation,
      isDocument: e.isDocument,
      footnotes: e.footnotes,
      fkbChapter: e.chapterNum && e.chapterTitle
        ? `Ch. ${e.chapterNum} — ${e.chapterTitle}`
        : null,
    });
    totalProcessed++;
  }
}

// ── Write per-chapter JSON files ────────────────────────────────

let chaptersWritten = 0;

for (const [slugChapter, pericopeMap] of bySlugChapter) {
  const [slug, chStr] = slugChapter.split('/');
  const slugDir = join(OUT_DIR, slug);
  mkdirSync(slugDir, { recursive: true });

  const pericopes: FathersPericope[] = [];
  const verseEntryCounts: Record<number, number> = {};
  let totalEntries = 0;

  // Sort pericopes by startVerse
  const sorted = [...pericopeMap.entries()].sort(
    (a, b) => a[1].startVerse - b[1].startVerse
  );

  for (const [verseRef, { startVerse, endVerse, pericopeTitle, overview, entries: perEntries }] of sorted) {
    pericopes.push({ verseRef, startVerse, endVerse, pericopeTitle, overview, entries: perEntries });
    totalEntries += perEntries.length;

    // Compute verse entry counts
    for (const entry of perEntries) {
      if (entry.subVerseNum !== null) {
        verseEntryCounts[entry.subVerseNum] = (verseEntryCounts[entry.subVerseNum] ?? 0) + 1;
      } else {
        for (let v = startVerse; v <= endVerse; v++) {
          verseEntryCounts[v] = (verseEntryCounts[v] ?? 0) + 1;
        }
      }
    }
  }

  const output: FathersChapterFile = { pericopes, verseEntryCounts, totalEntries };
  writeFileSync(join(slugDir, `${chStr}.json`), JSON.stringify(output));
  chaptersWritten++;
}

console.log(`Built ${chaptersWritten} chapter files from ${totalProcessed} entries.`);
console.log(`Skipped: ${skippedNoRef} (no ref), ${skippedNoSlug} (no slug).`);

// ── Export for pipeline integration ─────────────────────────────

export async function buildFathersData(): Promise<void> {
  // Already runs on import — this is a no-op wrapper for prepare-data.ts
  // The build logic above executes at module load time.
}

// Allow standalone execution
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  // Already executed above
}
```

- [ ] **Step 2: Run the script to verify output**

```bash
cd "/Users/Janvier/Library/Mobile Documents/com~apple~CloudDocs/for-the-kingdom/douayrheimsbible"
npx tsx scripts/build-fathers-data.ts
```

Expected output: `Built ~1165 chapter files from ~32000 entries.`

Verify spot-check:
```bash
node -e "const d = JSON.parse(require('fs').readFileSync('static/data/fathers/romans/1.json','utf8')); console.log('Pericopes:', d.pericopes.length); console.log('Total entries:', d.totalEntries); console.log('First pericope:', d.pericopes[0].verseRef, d.pericopes[0].entries.length, 'entries'); console.log('First entry author:', d.pericopes[0].entries[0].author); console.log('Has date:', !!d.pericopes[0].entries[0].date); console.log('Has FKB:', d.pericopes.some(p => p.entries.some(e => e.source === 'fkb')));"
```

- [ ] **Step 3: Commit**

```bash
git add scripts/build-fathers-data.ts
git commit -m "feat: add Fathers data build script (unified ACCS + FKB → per-chapter JSON)"
```

**Note:** Do NOT commit `static/data/fathers/` yet — it will be generated at build time via the pipeline.

---

## Task 5: Integrate Build Script into Prepare-Data Pipeline

**Files:**
- Modify: `scripts/prepare-data.ts`

- [ ] **Step 1: Read the current prepare-data.ts to find the end of the file**

Read `scripts/prepare-data.ts` fully to see its structure and where to add the Fathers build call.

- [ ] **Step 2: Add the Fathers build call**

At the top of `prepare-data.ts`, add the import:
```typescript
import { buildFathersData } from './build-fathers-data.js';
```

Near the bottom, after the existing build steps, add:
```typescript
// ── Fathers commentary data (ACCS + FKB) ────────────────────────
await buildFathersData();
console.log('Fathers commentary data built.');
```

**Note:** The build-fathers-data.ts script executes its logic at module load time (top-level), so importing it triggers the build. The `buildFathersData()` call is a no-op wrapper to fit the pipeline convention. If this causes issues (double execution), refactor the build logic into the exported function and remove top-level execution.

- [ ] **Step 3: Test full build**

```bash
npm run build
```

Expected: builds without errors; `static/data/fathers/` is populated with ~1165 chapter JSON files.

- [ ] **Step 4: Commit**

```bash
git add scripts/prepare-data.ts scripts/build-fathers-data.ts
git commit -m "feat: integrate Fathers build into prepare-data pipeline"
```

---

## Task 6: Loader Function

**Files:**
- Modify: `src/lib/data/loader.ts`

- [ ] **Step 1: Add the `loadFathersChapter` function**

After the existing `loadConfCommentary` or `loadConfBackMatter` function (whichever is last), add:

```typescript
// ── Fathers commentary (ACCS + FKB, per chapter) ────────────────
import type { FathersChapterFile } from './fathers-types';

const fathersChapterCache = new Map<string, Promise<FathersChapterFile | null>>();

export function loadFathersChapter(
  slug: string,
  chapter: number,
  fetch: typeof globalThis.fetch
): Promise<FathersChapterFile | null> {
  const key = `${slug}/${chapter}`;
  const cached = fathersChapterCache.get(key);
  if (cached) return cached;

  const promise = fetch(`/data/fathers/${slug}/${chapter}.json`)
    .then((r) => (r.ok ? (r.json() as Promise<FathersChapterFile>) : null))
    .catch(() => {
      fathersChapterCache.delete(key);
      return null;
    });

  fathersChapterCache.set(key, promise);
  return promise;
}
```

Also add the type import at the top of `loader.ts`:
```typescript
import type { FathersChapterFile } from './fathers-types';
```

- [ ] **Step 2: Run type check**

```bash
npm run check
```

Expected: no errors related to `loadFathersChapter`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/data/loader.ts
git commit -m "feat: add loadFathersChapter loader"
```

---

## Task 7: Route Files

**Files:**
- Create: `src/routes/fathers/[book]/[chapter]/+page.ts`
- Create: `src/routes/fathers/[book]/[chapter]/+page.svelte`

- [ ] **Step 1: Create the load function**

```typescript
// src/routes/fathers/[book]/[chapter]/+page.ts
import type { PageLoad, EntryGenerator } from './$types';
import { error } from '@sveltejs/kit';
import { loadBook, getChapter, loadFathersChapter } from '$lib/data/loader';
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

  const fathersData = await loadFathersChapter(slug, chapterNum, fetch);

  return {
    bookMeta,
    chapter,
    totalChapters: bookData.chapters.length,
    fathersData, // null if no commentary for this chapter
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
  $: pageDesc = `Patristic commentary on ${data.bookMeta.odrName} Chapter ${data.chapter.chapter} from the Church Fathers.`;
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
    <FathersReader
      bookMeta={data.bookMeta}
      chapter={data.chapter}
      fathersData={data.fathersData}
    />
  </div>
{/key}
```

- [ ] **Step 3: Run type check**

```bash
npm run check
```

Expected: errors about missing FathersBar/FathersReader components — that's fine, they come next.

- [ ] **Step 4: Commit**

```bash
git add src/routes/fathers/
git commit -m "feat: add fathers route load function and page shell"
```

---

## Task 8: FathersBar Header Component

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
  $: activeModeIdx = modeItems.findIndex((m) => m.key === 'fathers');

  let pendingIdx = -1;

  $: _base = $readingPosition?.routeBase ?? '/odr';
  $: _slug = $readingPosition?.bookSlug ?? bookMeta.slug;
  $: _ch   = $readingPosition?.chapter ?? chapterNum;
  $: readerHref = `${_base}/${_slug}/${_ch}`;

  async function selectMode(key: string, index: number) {
    if (key === 'fathers') return;
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

Read `src/lib/components/FloatingNav.svelte` to verify it has a `routeBase` prop. If it doesn't, add it — it should already exist based on the compare mode.

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

## Task 9: FathersEntryCard Component

**Files:**
- Create: `src/lib/components/FathersEntryCard.svelte`

Displays a single patristic entry: collapsible body, author name + date, source badge (ACCS/FKB), subVerse badge, citation, footnotes.

- [ ] **Step 1: Write FathersEntryCard**

```svelte
<!-- src/lib/components/FathersEntryCard.svelte -->
<script lang="ts">
  import type { FathersEntry } from '$lib/data/fathers-types';

  export let entry: FathersEntry;
  export let highlighted: boolean = false;
  export let dimmed: boolean = false;
  export let forceOpen: boolean = false;

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
  <!-- Header: title + author + badges -->
  <div class="px-sm pt-sm pb-[6px]">
    <!-- Entry title (ACCS only) -->
    {#if entry.title}
      <p class="text-[11px] uppercase tracking-[0.1em] text-subtle font-medium leading-snug mb-[4px]">
        {entry.title}
      </p>
    {/if}
    <div class="flex items-center gap-[6px] flex-wrap">
      <!-- Author name (italic for documents) -->
      <span class="text-[13px] font-medium text-foreground {entry.isDocument ? 'italic' : ''}">
        {entry.author}
      </span>
      <!-- Date -->
      {#if entry.date}
        <span class="text-[11px] text-subtle">({entry.date})</span>
      {/if}
      <!-- Source badge -->
      <span class="text-[9px] px-[4px] py-[1px] rounded-full font-semibold uppercase tracking-wider
        {entry.source === 'fkb' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400'}">
        {entry.source === 'fkb' ? 'FKB' : 'ACCS'}
      </span>
      <!-- SubVerse badge -->
      {#if entry.subVerse}
        <span class="text-[10px] px-[5px] py-[1px] rounded-full bg-border text-subtle font-medium">
          v. {entry.subVerseNum}
        </span>
      {/if}
    </div>
    <!-- FKB doctrinal chapter context -->
    {#if entry.fkbChapter}
      <p class="text-[10px] text-subtle italic mt-[2px]">{entry.fkbChapter}</p>
    {/if}
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
        {expanded ? 'Show less' : 'Show more'}
      </button>
    {/if}
  </div>

  <!-- Footnotes (if any) -->
  {#if entry.footnotes.length > 0 && isOpen}
    <div class="px-sm mt-[6px] border-t border-border/30 pt-[6px]">
      {#each entry.footnotes as fn, i}
        <p class="text-[11px] text-subtle leading-snug">
          <span class="font-semibold">[{i + 1}]</span> {fn.text}
        </p>
      {/each}
    </div>
  {/if}

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
git commit -m "feat: add FathersEntryCard component with date, source badge, footnotes"
```

---

## Task 10: FathersCommentaryPanel Component

**Files:**
- Create: `src/lib/components/FathersCommentaryPanel.svelte`

Scrollable right pane: filter bar (century chips, era chips, tradition chips, source toggle, author autocomplete, expand-all toggle) + pericope groups with sticky headers + overview text + entry cards.

- [ ] **Step 1: Write FathersCommentaryPanel**

```svelte
<!-- src/lib/components/FathersCommentaryPanel.svelte -->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { FathersChapterFile, FathersEntry } from '$lib/data/fathers-types';
  import { getAuthorMeta } from '$lib/data/fathers-authors';
  import { displayVerseRef } from '$lib/utils/fathers-display';
  import { prefs } from '$lib/stores/prefs';
  import FathersEntryCard from './FathersEntryCard.svelte';

  export let chapterData: FathersChapterFile;
  export let selectedVerse: number | null;

  const dispatch = createEventDispatcher<{ filteredCounts: Record<number, number> | null }>();

  // ── Filter state ──────────────────────────────────────────────────
  let filterCentury: number | 'all' | 'other' = 'all';
  let filterEra: 'all' | 'ante-nicene' | 'nicene' | 'post-nicene' = 'all';
  let filterTradition: 'all' | 'eastern' | 'western' | 'syriac' = 'all';
  let filterSource: 'all' | 'accs' | 'fkb' = 'all';
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

  // Check if chapter has FKB entries (to conditionally show source filter)
  $: hasFkb = chapterData.pericopes.some((p) => p.entries.some((e) => e.source === 'fkb'));

  // Autocomplete suggestions filtered by input
  $: authorSuggestions = authorInput.length >= 2
    ? chapterAuthors.filter((a) => a.toLowerCase().includes(authorInput.toLowerCase())).slice(0, 8)
    : [];

  $: hasFilter = filterCentury !== 'all' || filterEra !== 'all' || filterTradition !== 'all' || filterSource !== 'all' || filterAuthor !== '';

  function clearFilters() {
    filterCentury = 'all';
    filterEra = 'all';
    filterTradition = 'all';
    filterSource = 'all';
    filterAuthor = '';
    authorInput = '';
  }

  function entryMatches(e: FathersEntry): boolean {
    if (filterSource !== 'all' && e.source !== filterSource) return false;
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

  function entryIsHighlighted(e: FathersEntry): boolean {
    if (selectedVerse === null) return false;
    if (e.subVerseNum !== null) return e.subVerseNum === selectedVerse;
    return false;
  }

  function entryIsDimmed(e: FathersEntry): boolean {
    if (!hasFilter) return false;
    return !entryMatches(e);
  }

  // Computed pericopes with selectedVerse annotation
  $: annotatedPericopes = chapterData.pericopes.map((p) => {
    const verseInRange = selectedVerse !== null && selectedVerse >= p.startVerse && selectedVerse <= p.endVerse;
    return { ...p, verseInRange };
  });

  // Dispatch filtered counts for verse list badge dimming
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

    <!-- Row 4: Source toggle (only if chapter has FKB entries) + Author + Expand all -->
    <div class="flex items-center gap-[8px]">
      <!-- Source toggle (only when FKB entries exist in this chapter) -->
      {#if hasFkb}
        <div class="flex items-center gap-[3px] shrink-0">
          <button class={chipClass(filterSource === 'all')} on:click={() => (filterSource = 'all')}>All</button>
          <button class={chipClass(filterSource === 'accs')} on:click={() => (filterSource = 'accs')}>ACCS</button>
          <button class={chipClass(filterSource === 'fkb')} on:click={() => (filterSource = 'fkb')}>FKB</button>
        </div>
      {/if}

      <!-- Author input -->
      <div class="relative flex-1">
        <input
          type="text"
          placeholder="Filter by author..."
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
          <div class="sticky top-0 z-10 bg-panel/95 backdrop-blur-sm border-b border-border/30 px-sm py-[8px]">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-semibold uppercase tracking-[0.12em] text-subtle">
                {displayVerseRef(pericope.verseRef, $prefs.modernBookNames)}
              </span>
              <span class="text-[10px] text-subtle">
                {matchingCount} {matchingCount === 1 ? 'entry' : 'entries'}
                {#if hasFilter && matchingCount < pericopeEntries.length}
                  <span class="text-border">/ {pericopeEntries.length}</span>
                {/if}
              </span>
            </div>
            <!-- Pericope title (ACCS) -->
            {#if pericope.pericopeTitle}
              <p class="text-[12px] font-medium text-foreground/80 mt-[2px]">{pericope.pericopeTitle}</p>
            {/if}
          </div>

          <!-- Overview text (ACCS, if present — shown once per pericope) -->
          {#if pericope.overview && expandAll}
            <div class="px-sm py-[8px] bg-accent/3 border-b border-border/20">
              <p class="text-[9px] uppercase tracking-[0.15em] text-subtle font-medium mb-[4px]">Overview</p>
              <p class="text-[13px] leading-relaxed text-foreground/80 italic">{pericope.overview}</p>
            </div>
          {/if}

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
git commit -m "feat: add FathersCommentaryPanel with filters, pericope groups, overview"
```

---

## Task 11: FathersVerseList Component

**Files:**
- Create: `src/lib/components/FathersVerseList.svelte`

Left pane: displays the Bible text with entry-count badges per verse.

- [ ] **Step 1: Write FathersVerseList**

```svelte
<!-- src/lib/components/FathersVerseList.svelte -->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { Chapter } from '$lib/data/types';

  export let chapter: Chapter;
  export let verseEntryCounts: Record<number, number>;
  export let filteredVerseEntryCounts: Record<number, number> | null;
  export let selectedVerse: number | null;

  const dispatch = createEventDispatcher<{ selectVerse: number }>();

  function handleVerseClick(verseNum: number) {
    dispatch('selectVerse', verseNum);
  }
</script>

<div class="h-full overflow-y-auto px-sm py-md font-ui" style="font-family: var(--font-reader)">
  <h1 class="text-[13px] uppercase tracking-[0.15em] text-subtle font-medium mb-md">
    Chapter {chapter.chapter}
  </h1>

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
        <span class="shrink-0 text-[11px] text-subtle font-medium w-[20px] text-right pt-[2px]">
          {verse.verse}
        </span>
        <span class="flex-1 text-[15px] leading-relaxed text-foreground">{verse.text}</span>
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

## Task 12: FathersReader Layout Component

**Files:**
- Create: `src/lib/components/FathersReader.svelte`

Owns the two-pane layout and `selectedVerse` state.

- [ ] **Step 1: Write FathersReader**

```svelte
<!-- src/lib/components/FathersReader.svelte -->
<script lang="ts">
  import type { Chapter, BookMeta } from '$lib/data/types';
  import type { FathersChapterFile } from '$lib/data/fathers-types';
  import FathersVerseList from './FathersVerseList.svelte';
  import FathersCommentaryPanel from './FathersCommentaryPanel.svelte';

  export let bookMeta: BookMeta;
  export let chapter: Chapter;
  export let fathersData: FathersChapterFile | null;

  let selectedVerse: number | null = null;

  function handleVerseSelect(e: CustomEvent<number>) {
    const verse = e.detail;
    selectedVerse = selectedVerse === verse ? null : verse;
  }

  let filteredVerseEntryCounts: Record<number, number> | null = null;

  function handleFilteredCounts(e: CustomEvent<Record<number, number> | null>) {
    filteredVerseEntryCounts = e.detail;
  }

  $: data = fathersData ?? { pericopes: [], verseEntryCounts: {}, totalEntries: 0 };
</script>

<div class="flex items-stretch" style="height: calc(100vh - var(--header-height) - 50px);">
  <!-- Left pane: verse reader (fixed width ~320px) -->
  <div class="shrink-0 border-r border-border overflow-hidden hidden md:block" style="width: 320px;">
    <FathersVerseList
      {chapter}
      verseEntryCounts={data.verseEntryCounts}
      {filteredVerseEntryCounts}
      {selectedVerse}
      on:selectVerse={handleVerseSelect}
    />
  </div>

  <!-- Right pane: commentary panel (flex-1) -->
  <div class="flex-1 min-w-0 overflow-hidden">
    <FathersCommentaryPanel
      chapterData={data}
      {selectedVerse}
      on:filteredCounts={handleFilteredCounts}
    />
  </div>
</div>
```

- [ ] **Step 2: Run type check**

```bash
npm run check
```

Fix any type errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/components/FathersReader.svelte
git commit -m "feat: wire FathersReader two-pane layout with filter reactivity"
```

---

## Task 13: Mode Toggle Integration

**Files:**
- Modify: `src/lib/components/TopBar.svelte`
- Modify: `src/lib/components/CompareBar.svelte`

Add "Fathers" as the 4th mode item in both components.

- [ ] **Step 1: Update TopBar.svelte**

Find the `modeItems` reactive declaration (around line 86):
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
if (key === 'fathers') {
  pendingIdx = index;
  const delay = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 210;
  await new Promise<void>((r) => setTimeout(r, delay));
  goto(`/fathers/${bookSlug}/${chapterNum}`);
  return;
}
```

- [ ] **Step 2: Update CompareBar.svelte**

Find the `modeItems` declaration (around line 26):
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

Add `fathers` handling in `selectMode`:
```javascript
if (key === 'fathers') {
  pendingIdx = index;
  const delay = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 210;
  await new Promise<void>((r) => setTimeout(r, delay));
  goto(`/fathers/${bookMeta.slug}/${chapterNum}`);
  return;
}
```

- [ ] **Step 3: Run type check and lint**

```bash
npm run check && npm run lint
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/components/TopBar.svelte src/lib/components/CompareBar.svelte
git commit -m "feat: add Fathers mode to Read/Study/Compare toggle"
```

---

## Task 14: End-to-End Test

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 2: Navigate to a chapter with known data**

Open `http://localhost:5173/odr/romans/1`. Click the "Fathers" button in the mode toggle.

Expected: navigates to `/fathers/romans/1`.

- [ ] **Step 3: Verify left pane**

Expected: Romans 1 verses displayed with count badges. Clicking verse 3 highlights it; matching entries in the right pane highlight.

- [ ] **Step 4: Verify right pane**

Expected: Pericope groups with sticky headers showing verse range + pericope title (e.g., "An Apostle Called by God"). Entry cards show:
- Canonical author names (e.g., "Ambrosiaster", "St. John Chrysostom")
- Dates in parentheses (e.g., "(fl. c. 366-384)")
- ACCS/FKB source badge
- Collapsible body text
- Right-aligned italic citation
- Footnotes visible when expanded

- [ ] **Step 5: Verify filters**

- Click "4th" century chip → only 4th-century entries visible; others dimmed.
- Click "Eastern" tradition → further narrows.
- Type "Chrys" in author field → "St. John Chrysostom" appears in autocomplete; click to select.
- Verify verse badges in left pane dim for verses with no matching entries.
- Click "Clear" → all entries visible again.
- Toggle "Expand all" → all entries expanded; overview text shown per pericope.

- [ ] **Step 6: Test a chapter with FKB entries**

Navigate to `/fathers/matthew/16`. Expected: both ACCS and FKB entries present. The ACCS/FKB source filter buttons should appear. Toggle to "FKB" → only FKB entries shown with amber badge, doctrinal chapter context.

- [ ] **Step 7: Verify mobile layout**

Open DevTools → mobile viewport. The left pane (verse list) should be hidden on mobile (`hidden md:block` in FathersReader). Only the commentary panel is visible.

- [ ] **Step 8: Test a chapter with no commentary**

Navigate to a chapter that has no Fathers data (e.g., an OT appendix like `/fathers/prayer-of-manasses/1`). Expected: "No patristic commentary available for this chapter."

- [ ] **Step 9: Run full type check and build**

```bash
npm run check && npm run build
```

Expected: builds successfully.

- [ ] **Step 10: Final commit**

```bash
git add -p  # stage any fixes
git commit -m "feat: complete Fathers mode — ACCS + FKB patristic commentary viewer"
```

---

## Self-Review

### Spec Coverage

| Requirement | Task(s) |
|-------------|---------|
| `/fathers/[book]/[chapter]` route | Task 7 |
| Two-pane layout (verse list left, commentary right) | Tasks 11, 12 |
| Entry-count badges per verse | Tasks 4, 11 |
| Clicking verse highlights/scrolls entries | Tasks 11, 12 |
| Century chips (1st–8th, 9th+) | Task 10 |
| Era chips (Ante-Nicene / Nicene / Post-Nicene) | Task 10 |
| Tradition chips (Eastern / Western / Syriac) | Task 10 |
| Source filter (ACCS / FKB) | Task 10 |
| Author autocomplete (dynamic per chapter) | Task 10 |
| Expand all toggle | Tasks 9, 10 |
| Badge dimming when filter active + 0 matches | Tasks 10, 11 |
| Author metadata lookup (century, era, tradition) | Task 2 |
| 4th mode in Read/Study/Compare toggle | Task 13 |
| Data pipeline (unified-entries → static/data/fathers/) | Tasks 4, 5 |
| Loader function | Task 6 |
| FathersBar header with navigation | Task 8 |
| Canonical author names with dates | Tasks 1, 4, 9 |
| isDocument distinction (italic for documents) | Tasks 1, 9 |
| Footnote display | Task 9 |
| Pericope titles and overview text | Tasks 1, 10 |
| FKB doctrinal chapter context | Tasks 1, 9 |
| DRC book name → ODR slug mapping (Isaias/Jeremias/Malachias) | Task 4 |
| DRC/modern book name toggle in verseRef display | Tasks 3, 10 |
| Mobile layout (commentary-only) | Task 12 |

### No Placeholder Check

- Author metadata: ~85 authors annotated covering ~95% of entries. Remaining authors default to `{ century: null, era: null, tradition: null }` and display but are excluded from century/era/tradition filters when a specific value is selected. Correct behavior.
- Three DRC→ODR name mismatches (Isaias→Isaie, Jeremias→Jeremy, Malachias→Malachie) handled in build script (Task 4) and display utility (Task 3).
- Book names in pericope headers respect `$prefs.modernBookNames` toggle via `displayVerseRef()` utility.
- Overview text shown only when "Expand all" is toggled — prevents cluttering default view.
- Footnotes shown only when entry is expanded — prevents overwhelming the card.

### Type Consistency

- `FathersEntry.subVerseNum: number | null` — used in `FathersEntryCard` (badge) and `entryIsHighlighted`.
- `FathersChapterFile.verseEntryCounts: Record<number, number>` — passed to `FathersVerseList` as both total and filtered.
- `filteredVerseEntryCounts: Record<number, number> | null` — `null` = no filter, show totals.
- `FathersEntry.source: 'accs' | 'fkb'` — used for badge color and source filter.
- `FathersEntry.fkbChapter: string | null` — only non-null for FKB entries.
