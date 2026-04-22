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
        ? `Ch. ${e.chapterNum} \u2014 ${e.chapterTitle}`
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
