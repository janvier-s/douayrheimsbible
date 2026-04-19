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
