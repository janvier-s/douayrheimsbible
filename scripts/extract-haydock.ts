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

const SUPERSCRIPT_DIGITS = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'];

function toSuperscript(n: number): string {
  return String(n).split('').map(d => SUPERSCRIPT_DIGITS[parseInt(d)]).join('');
}

export interface ParsedVerse {
  verse: number;
  text: string;
}

/** Parse a \v line, converting asterisk markers to sequential superscript numbers. */
export function parseVerseText(line: string): ParsedVerse | null {
  const match = line.match(/^\\v\s+(\d+)\s+(.*)/);
  if (!match) return null;
  const verse = parseInt(match[1]);
  let text = match[2];

  // Convert asterisk markers (*, **, ***, ****) to sequential superscript numbers.
  let markerNum = 0;
  text = text.replace(/\*{1,4}/g, () => {
    markerNum++;
    return toSuperscript(markerNum);
  });

  return { verse, text: text.trim() };
}

export interface ParsedFootnote {
  chapter: number;
  verse: number;
  text: string;
}

/** Parse a \f footnote block. Returns null for non-footnote lines. */
export function parseFootnote(line: string): ParsedFootnote | null {
  const match = line.match(/^\\f\s+\+\s+\\fr\s+(\d+):(\d+)\s*\\ft\s*(.*?)\\f\*$/);
  if (!match) return null;
  const chapter = parseInt(match[1]);
  const verse = parseInt(match[2]);
  let text = match[3].trim();

  // Convert { text |} side notes to parenthetical (trim inner whitespace, ensure leading space)
  text = text.replace(/\s*\{([^|]*)\|\}/g, (_, inner) => ' (' + inner.trim() + ')');

  // Convert --- separators to <hr> tags
  text = text.replace(/\s*-{3,}\s*/g, '<hr>');

  return { chapter, verse, text };
}

export interface ParsedCrossRef {
  chapter: number;
  verse: number;
  refs: string;
}

/** Parse a \x cross-reference block. Returns null for non-crossref lines. */
export function parseCrossRef(line: string): ParsedCrossRef | null {
  const match = line.match(/^\\x\s+\+\s+\\xo\s+(\d+):(\d+)\s*\\xt\s*(.*?)\\x\*$/);
  if (!match) return null;
  return {
    chapter: parseInt(match[1]),
    verse: parseInt(match[2]),
    refs: match[3].trim(),
  };
}

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

    // Skip: \p, \cl, \h, \toc*, \ide, \s1, \periph, \tr, \th*, \tc*, \ili, \iq, \ib*
  }

  // Save last chapter
  if (currentChapter > 0) {
    chapters.push({ chapter: currentChapter, summary: currentSummary, verses: currentVerses });
  }

  return { slug, intro, chapters, commentary, crossRefs };
}
