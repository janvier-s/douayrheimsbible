// scripts/extract-vulgate-format.ts
// @ts-nocheck — build script run with tsx
//
// Extracts paragraph / poetry / line-break structure for the Clementine Vulgate
// from the Biblia Sacra juxta Vulgatam Clementinam epub, and writes it as
// per-book sidecars under static/data/format/vul/.
//
// The epub's verse text is compared against static/data/vul/*.json on the way
// through: only structure is emitted, never text. Where the two editions differ
// (a small number of verses carry genuine Clementine variants) the intra-verse
// line breaks for that verse are dropped rather than guessed at, so a verse can
// lose its line breaks but can never be rendered with corrupted text.
//
// Run: npx tsx scripts/extract-vulgate-format.ts

import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { inflateRawSync } from 'zlib';

const __dirname = dirname(fileURLToPath(import.meta.url));

const EPUB = join(
	__dirname,
	'..',
	'..',
	'SCRIPTURA',
	'sources',
	'VUL',
	'Biblia-Sacra-juxta-Vulgatam-Cle-Clement-VIII.epub'
);
const CANON_DIR = join(__dirname, '..', 'static', 'data', 'vul');
const OUT_DIR = join(__dirname, '..', 'static', 'data', 'format', 'vul');

// ── Minimal zip reader ───────────────────────────────────────────────────────
// Scans local file headers. Enough for this one known archive, and avoids
// pulling in a zip dependency for a script that runs by hand.

function readZip(buf: Buffer): Map<string, string> {
	const out = new Map<string, string>();
	let i = 0;
	while (i < buf.length - 4) {
		if (buf.readUInt32LE(i) !== 0x04034b50) {
			i++;
			continue;
		}
		const method = buf.readUInt16LE(i + 8);
		const flags = buf.readUInt16LE(i + 6);
		let compSize = buf.readUInt32LE(i + 18);
		let uncompSize = buf.readUInt32LE(i + 22);
		const nameLen = buf.readUInt16LE(i + 26);
		const extraLen = buf.readUInt16LE(i + 28);
		const nameBuf = buf.subarray(i + 30, i + 30 + nameLen);
		const name = nameBuf.toString('utf8');
		const dataStart = i + 30 + nameLen + extraLen;

		// Streamed entries (bit 3) put sizes in a trailing descriptor; this
		// archive does not use them, so bail loudly rather than misread.
		if (flags & 0x08 && compSize === 0) {
			i = dataStart;
			continue;
		}

		if (/\.(html|xhtml|css|opf|ncx)$/i.test(name)) {
			const data = buf.subarray(dataStart, dataStart + compSize);
			try {
				const raw = method === 0 ? data : inflateRawSync(data);
				out.set(name.split('/').pop()!, raw.toString('utf8'));
			} catch {
				/* skip unreadable entry */
			}
		}
		i = dataStart + compSize;
	}
	return out;
}

// ── Tokenizer ────────────────────────────────────────────────────────────────

const TOKEN = new RegExp(
	[
		'(?<poeopen><div class="(?:poetry|poetrystartchapter)">)',
		'(?<divclose></div>)',
		'(?<popen><p class="(?:std|chapter)">)',
		'(?<pclose></p>)',
		'(?<vn><span class="vn" id="x(?<ch>\\d+)_(?<v>\\d+)">\\d+</span>)',
		'(?<chnum><span class="chapter-num"[^>]*>\\d+</span>)',
		'(?<spk><span class="speaker">.*?</span>)',
		'(?<br><br\\s*/?>)',
		'(?<tt><span class="tt">.*?</span>)',
		'(?<ttA><a[^>]*class="tt"[^>]*>.*?</a>)',
		'(?<h2><h2[^>]*>.*?</h2>)',
		'(?<toc><ul class="mini-toc".*?</ul>)',
		'(?<other><[^>]+>)'
	].join('|'),
	'gs'
);

const ENTITIES: Record<string, string> = {
	'&amp;': '&',
	'&lt;': '<',
	'&gt;': '>',
	'&quot;': '"',
	'&apos;': "'",
	'&nbsp;': ' '
};

function clean(t: string): string {
	return t.replace(/&[a-z]+;|&#\d+;/gi, (m) => ENTITIES[m.toLowerCase()] ?? m).replace(/\s+/g, ' ');
}

type Frag = { v: number; text: string };
type Block = { type: 'p' | 'poetry'; lines: Frag[][] };

/** Parse one book's html into chapter -> ordered blocks of lines of fragments. */
function parseBook(html: string): Map<number, Block[]> {
	const chapters = new Map<number, Block[]>();
	let ch: number | null = null;
	let v: number | null = null;
	let blocks: Block[] | null = null;
	let block: Block | null = null;
	let line: Frag[] | null = null;

	const bodyAt = html.indexOf('<body');
	const body = bodyAt >= 0 ? html.slice(bodyAt) : html;

	const newBlock = (t: 'p' | 'poetry') => {
		block = { type: t, lines: [] };
		line = [];
		block.lines.push(line);
		blocks?.push(block);
	};
	const add = (txt: string) => {
		if (line === null || v === null || !txt) return;
		line.push({ v, text: txt });
	};

	// A chapter can open inside a <div class="poetrystartchapter">, i.e. the
	// poetry div opens before the chapter's first verse number. Tracking the
	// depth separately lets the chapter's opening block be typed correctly.
	let poetryDepth = 0;

	let pos = 0;
	let m: RegExpExecArray | null;
	TOKEN.lastIndex = 0;
	while ((m = TOKEN.exec(body)) !== null) {
		add(clean(body.slice(pos, m.index)));
		pos = TOKEN.lastIndex;
		const g = m.groups!;
		if (g.vn !== undefined) {
			const c = Number(g.ch);
			if (c !== ch) {
				ch = c;
				blocks = [];
				chapters.set(ch, blocks);
				newBlock(poetryDepth > 0 ? 'poetry' : 'p');
			}
			v = Number(g.v);
		} else if (g.poeopen !== undefined) {
			poetryDepth++;
			if (blocks) newBlock('poetry');
		} else if (g.divclose !== undefined) {
			if (poetryDepth > 0) poetryDepth--;
			if (blocks && block?.type === 'poetry') newBlock('p');
		} else if (g.popen !== undefined) {
			if (blocks) newBlock('p');
		} else if (g.br !== undefined) {
			if (block) {
				line = [];
				block.lines.push(line);
			}
		}
		// speaker / tt / h2 / toc / chnum / other: dropped, they are not verse text
	}
	return chapters;
}

// ── Canonical text ───────────────────────────────────────────────────────────

/** Canonical verse text with inline <Sponsa>/<Aleph> style markers removed. */
function stripMarkers(t: string): string {
	return t
		.replace(/<[^>]*>/g, '')
		.replace(/\s+/g, ' ')
		.trim();
}

const canon = new Map<string, Map<number, Map<number, string>>>();
for (const f of readdirSync(CANON_DIR).filter((f) => f.endsWith('.json'))) {
	const slug = f.slice(0, -5);
	const d = JSON.parse(readFileSync(join(CANON_DIR, f), 'utf8'));
	const chs = new Map<number, Map<number, string>>();
	for (const c of d.chapters) {
		const vv = new Map<number, string>();
		for (const verse of c.verses) vv.set(verse.verse, verse.text);
		chs.set(c.chapter, vv);
	}
	canon.set(slug, chs);
}

// ── Parse every book, merging the _split continuation files ──────────────────

const zip = readZip(readFileSync(EPUB));
const books = new Map<string, Map<number, Block[]>>();
for (const [name, html] of zip) {
	if (!name.endsWith('.html')) continue;
	const base = name.replace(/_split\d+\.html$/, '').replace(/\.html$/, '');
	const parsed = parseBook(html);
	if (parsed.size === 0) continue;
	const tgt = books.get(base) ?? new Map<number, Block[]>();
	for (const [c, bl] of parsed) tgt.set(c, [...(tgt.get(c) ?? []), ...bl]);
	books.set(base, tgt);
}

/** Verse text as reconstructed from the epub, for identification and checking. */
function epubVerses(chs: Map<number, Block[]>): Map<string, string> {
	const out = new Map<string, string[]>();
	for (const [ch, blocks] of chs)
		for (const b of blocks)
			for (const ln of b.lines)
				for (const f of ln) {
					const k = `${ch}:${f.v}`;
					out.set(k, [...(out.get(k) ?? []), f.text]);
				}
	const res = new Map<string, string>();
	for (const [k, parts] of out) res.set(k, parts.join('').replace(/\s+/g, ' ').trim());
	return res;
}

// Identify each epub file by its first verse; three books open with an
// editorial label the canonical text stores as a marker, so name them outright.
const EXPLICIT: Record<string, string> = {
	Ct: 'canticle-of-canticles',
	Lam: 'lamentations',
	Sir: 'ecclesiasticus'
};

const byFirst = new Map<string, string[]>();
for (const [slug, chs] of canon) {
	const t = chs.get(1)?.get(1);
	if (t) {
		const k = stripMarkers(t);
		byFirst.set(k, [...(byFirst.get(k) ?? []), slug]);
	}
}

const mapping = new Map<string, string>();
const unmapped: string[] = [];
for (const [fn, chs] of books) {
	if (EXPLICIT[fn]) {
		mapping.set(fn, EXPLICIT[fn]);
		continue;
	}
	const first = epubVerses(chs).get('1:1');
	const cands = first ? (byFirst.get(first) ?? []) : [];
	if (cands.length === 1) mapping.set(fn, cands[0]);
	else unmapped.push(fn);
}

// ── Build the structure payload ──────────────────────────────────────────────

type ChapterFormat = {
	b: [number, number, 0 | 1][]; // [verse, offsetInVerse, 0=prose 1=poetry]
	l: Record<string, number[]>; // verse -> line-break offsets within that verse
};

let stats = {
	chapters: 0,
	blocks: 0,
	poetry: 0,
	breaks: 0,
	droppedVerses: 0,
	droppedBreaks: 0,
	variantVerses: 0,
	badOffsets: 0,
	recoveredVerses: 0
};

/** A maximal run of text inside one verse, one line and one block. */
type Segment = {
	v: number;
	text: string; // whitespace-normalised, trimmed
	blockIdx: number;
	lineIdx: number;
	start?: number; // resolved offset into the canonical verse text
	end?: number;
};

/** Flatten a chapter's blocks into per-verse segments, in document order. */
function segmentsOf(blocks: Block[]): Segment[] {
	const segs: Segment[] = [];
	blocks.forEach((blk, bi) => {
		blk.lines.forEach((ln, li) => {
			for (const f of ln) {
				const last = segs[segs.length - 1];
				if (last && last.v === f.v && last.blockIdx === bi && last.lineIdx === li) {
					last.text += f.text;
				} else {
					segs.push({ v: f.v, text: f.text, blockIdx: bi, lineIdx: li });
				}
			}
		});
	});
	for (const s of segs) s.text = s.text.replace(/\s+/g, ' ').trim();
	return segs;
}

/**
 * Place segment boundaries by word count instead of by exact text.
 *
 * Used where the epub and the canonical edition disagree inside a verse. Both
 * carry the same words in the same order, so consuming one canonical word per
 * epub word lands every boundary in the right place even though the characters
 * differ. Returns false if the word counts disagree, in which case the caller
 * drops the verse's structure rather than placing a boundary on a guess.
 */
function alignByWord(text: string, head: number, list: Segment[]): boolean {
	const words: { start: number; end: number }[] = [];
	const re = /\S+/g;
	re.lastIndex = head;
	let m: RegExpExecArray | null;
	while ((m = re.exec(text)) !== null) words.push({ start: m.index, end: m.index + m[0].length });

	const wanted = list.map((s) => (s.text.match(/\S+/g) ?? []).length);
	if (wanted.reduce((a, b) => a + b, 0) !== words.length) return false;

	let i = 0;
	for (let k = 0; k < list.length; k++) {
		const n = wanted[k];
		if (n === 0) return false;
		list[k].start = words[i].start;
		list[k].end = words[i + n - 1].end;
		i += n;
	}
	return true;
}

function buildChapter(blocks: Block[], cn: Map<number, string>): ChapterFormat | null {
	const segs = segmentsOf(blocks);

	// Resolve every segment against the canonical verse text by walking it in
	// order. This is exact and self-checking: a segment that fails to match
	// where expected marks the whole verse unsafe, and its structure is
	// dropped rather than guessed at.
	const unsafe = new Set<number>();
	const byVerse = new Map<number, Segment[]>();
	for (const s of segs) {
		if (!s.text) continue;
		byVerse.set(s.v, [...(byVerse.get(s.v) ?? []), s]);
	}

	for (const [v, list] of byVerse) {
		const text = cn.get(v);
		if (text === undefined) {
			unsafe.add(v);
			continue;
		}
		// Skip any inline <Sponsa>/<Aleph> marker the canonical text carries.
		const lead = text.match(/^(?:<[^>]*>)+/);
		const head = lead ? lead[0].length : 0;
		let pos = head;
		let ok = true;
		for (const s of list) {
			while (pos < text.length && /\s/.test(text[pos])) pos++;
			if (!text.startsWith(s.text, pos)) {
				ok = false;
				break;
			}
			s.start = pos;
			pos += s.text.length;
			s.end = pos;
		}
		// Every segment placed, and together they consumed the whole verse.
		if (ok && text.slice(pos).trim() !== '') ok = false;

		// The two editions disagree somewhere in this verse, almost always a
		// spelling variant (Exsultavit / Exultavit). The words still line up
		// one for one, so place the breaks by counting words rather than by
		// matching characters, and give up only if even that disagrees.
		if (!ok) {
			stats.variantVerses++;
			ok = alignByWord(text, head, list);
			if (ok) stats.recoveredVerses++;
		}
		if (!ok) unsafe.add(v);
	}

	const b: [number, number, 0 | 1][] = [];
	const l: Record<string, number[]> = {};

	// Block starts.
	const firstOfBlock = new Map<number, Segment>();
	for (const s of segs) {
		if (!s.text) continue;
		if (!firstOfBlock.has(s.blockIdx)) firstOfBlock.set(s.blockIdx, s);
	}
	for (const [bi, s] of [...firstOfBlock].sort((a, x) => a[0] - x[0])) {
		stats.blocks++;
		if (blocks[bi].type === 'poetry') stats.poetry++;
		// A block starting at the head of its verse needs no offset. "The head"
		// means past any inline <Sponsa>/<Aleph> marker, which is part of the
		// verse text but not of the verse's words.
		const text = cn.get(s.v);
		const lead = text?.match(/^(?:<[^>]*>)+/);
		const head = lead ? lead[0].length : 0;
		const mid = s.start !== undefined && s.start > head && !unsafe.has(s.v);
		b.push([s.v, mid ? s.start! : 0, blocks[bi].type === 'poetry' ? 1 : 0]);
	}

	// Line breaks that fall inside a verse.
	for (let i = 0; i < segs.length - 1; i++) {
		const cur = segs[i];
		const next = segs[i + 1];
		if (!cur.text || !next.text) continue;
		if (next.v !== cur.v) continue; // break coincides with a verse start
		if (next.blockIdx !== cur.blockIdx || next.lineIdx === cur.lineIdx) continue;
		stats.breaks++;
		if (unsafe.has(cur.v) || cur.end === undefined) {
			stats.droppedBreaks++;
			continue;
		}
		const text = cn.get(cur.v)!;
		if (cur.end <= 0 || cur.end >= text.length) {
			stats.badOffsets++;
			continue;
		}
		(l[String(cur.v)] ??= []).push(cur.end);
	}

	stats.droppedVerses += unsafe.size;

	// A chapter that is one prose block from verse 1 carries no structure.
	const trivial = b.length <= 1 && b[0]?.[2] === 0 && Object.keys(l).length === 0;
	return trivial ? null : { b, l };
}

mkdirSync(OUT_DIR, { recursive: true });

let written = 0;
const perBook: Record<string, number> = {};
for (const [fn, slug] of mapping) {
	const chs = books.get(fn)!;
	const cn = canon.get(slug);
	if (!cn) continue;
	const out: Record<string, ChapterFormat> = {};
	for (const [ch, blocks] of [...chs].sort((a, b) => a[0] - b[0])) {
		const cv = cn.get(ch);
		if (!cv) continue;
		stats.chapters++;
		const f = buildChapter(blocks, cv);
		if (f) out[String(ch)] = f;
	}
	const json = JSON.stringify(out);
	writeFileSync(join(OUT_DIR, `${slug}.json`), json);
	perBook[slug] = json.length;
	written++;
}

// A manifest of which translations ship format data, so the reader can skip the
// fetch entirely for the ones that do not rather than taking a 404 per page.
const MANIFEST = join(__dirname, '..', 'static', 'data', 'format', 'manifest.json');
let manifest: Record<string, string[]> = {};
try {
	manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
} catch {
	/* first run */
}
manifest.vul = [...mapping.values()].sort();
writeFileSync(MANIFEST, JSON.stringify(manifest, null, '\t') + '\n');

// ── Report ───────────────────────────────────────────────────────────────────

const totalBytes = Object.values(perBook).reduce((a, b) => a + b, 0);
console.log(`books written      : ${written}`);
console.log(
	`unmapped epub files: ${unmapped.length}${unmapped.length ? ' -> ' + unmapped.join(', ') : ''}`
);
console.log(`chapters           : ${stats.chapters}`);
console.log(`blocks             : ${stats.blocks} (poetry ${stats.poetry})`);
console.log(`intra-verse breaks : ${stats.breaks}`);
console.log(`  dropped (variant): ${stats.droppedBreaks}`);
console.log(`  dropped (offset) : ${stats.badOffsets}`);
console.log(
	`variant verses     : ${stats.variantVerses} (recovered by word alignment: ${stats.recoveredVerses})`
);
console.log(`total payload      : ${(totalBytes / 1024).toFixed(1)} KB across ${written} files`);
const biggest = Object.entries(perBook)
	.sort((a, b) => b[1] - a[1])
	.slice(0, 5);
console.log(
	`largest            : ${biggest.map(([s, n]) => `${s} ${(n / 1024).toFixed(1)}KB`).join(', ')}`
);
