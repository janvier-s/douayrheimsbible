// scripts/ebook-build.ts
// @ts-nocheck: build helper run with tsx
// Writes the EPUB, OSIS and DOCX exports for build-export-bundle.ts, in two
// editions. Each format goes to <out>/<edition>/<format>/ as one file per book
// plus the whole Bible, and to <out>/release-assets/ as the zip and the
// whole-Bible file that ship on GitHub releases.

import { mkdirSync, mkdtempSync, rmSync, readFileSync, readdirSync, writeFileSync, copyFileSync } from 'fs';
import { join } from 'path';
import { execFileSync } from 'child_process';
import sharp from 'sharp';
import {
	renderBookMarkdown,
	renderWholeMarkdown,
	renderTitlePageMarkdown,
	runPandoc,
	EPUB_SUBTITLE
} from './epub-lib.js';
import { renderOsis, titleLinesOsis } from './osis-lib.js';
import { buildDocx, makeReferenceDocx } from './docx-lib.js';
import { newState, renderStudyBookMarkdown, renderStudyWholeMarkdown } from './study-md-lib.js';
import { renderStudyOsis } from './study-osis-lib.js';
import { toRefDoc } from './study-ref-lib.js';

export const WHOLE = 'original-douay-rheims';
const EXT = { epub: '.epub', osis: '.osis.xml', docx: '.docx' };

export async function makeCover(webp: string, outJpg: string) {
	await sharp(webp).jpeg({ quality: 90 }).toFile(outJpg);
}

const zip = (dir: string, files: string[], zipPath: string) => {
	execFileSync('zip', ['-q', '-j', zipPath, ...files.map((f) => join(dir, f))]);
};

const fileName = (b, ext) => `${String(b.ordinal).padStart(2, '0')}-${b.slug}${ext}`;
const readJson = (p: string) => JSON.parse(readFileSync(p, 'utf8'));

/**
 * Where each reference document goes. A file in neither list stops the build,
 * so a new reference document cannot be left out without anyone noticing.
 * title-page is rendered separately, as the testament's title page.
 */
const REF_ORDER = {
	ot: {
		front: ['approbatio', 'censura', 'censura-english', 'privilege', 'to-the-curteous-reader', 'preface', 'marks-of-the-reader'],
		back: ['epistles-table', 'historical-table-age-1', 'historical-table-age-2', 'historical-table-age-3', 'historical-table-age-3b', 'historical-table-age-4', 'historical-table-age-5', 'historical-table-age-6', 'job-recapitulation', 'glossary', 'index', 'errata']
	},
	nt: {
		front: ['censure', 'preface', 'scripture-authority', 'marks-of-the-reader', 'explication-words', 'apostles-creed'],
		back: ['evangelical-history', 'table-paul', 'table-peter', 'table-catholic-truths', 'table-corruptions', 'table-epistles-gospels', 'errata-and-colophon']
	}
};

export function loadRefDocs(refDir: string, t: 'ot' | 'nt') {
	const have = readdirSync(join(refDir, t)).filter((f) => f.endsWith('.json')).map((f) => f.replace('.json', ''));
	const listed = new Set([...REF_ORDER[t].front, ...REF_ORDER[t].back, 'title-page']);
	const stray = have.filter((s) => !listed.has(s));
	if (stray.length) throw new Error(`reference/${t}: no place assigned for ${stray.join(', ')}`);
	const load = (slugs) => slugs.map((s) => toRefDoc(s, readJson(join(refDir, t, `${s}.json`))));
	return { front: load(REF_ORDER[t].front), back: load(REF_ORDER[t].back) };
}

function titlePageJson(refDir: string, t: 'ot' | 'nt') {
	return readJson(join(refDir, t, 'title-page.json'));
}

/** Everything that differs between the two editions. */
function edition(name: 'verse-only' | 'study', ctx) {
	const { refDir, verseBooks, studyBooks, testamentOf } = ctx;
	const books = name === 'study' ? studyBooks : verseBooks;
	const label = name === 'study' ? 'study edition' : 'verse text only';
	const group = (t) => books.filter((b) => testamentOf[b.slug] === t);
	const tp = { OT: titlePageJson(refDir, 'ot'), NT: titlePageJson(refDir, 'nt') };
	const refs = name === 'study' ? { OT: loadRefDocs(refDir, 'ot'), NT: loadRefDocs(refDir, 'nt') } : null;
	return {
		name,
		books,
		subtitle: `${EPUB_SUBTITLE}, ${label}`,
		bookMarkdown: (b) => (name === 'study' ? renderStudyBookMarkdown(b, newState()) : renderBookMarkdown(b)),
		wholeMarkdown: () => {
			const parts = [['OT', 'The Old Testament'], ['NT', 'The New Testament']]
				.map(([t, heading]) => ({ t, heading, books: group(t) }))
				.filter((p) => p.books.length)
				.map((p) => ({
					heading: p.heading,
					books: p.books,
					titlePage: renderTitlePageMarkdown(tp[p.t]),
					front: refs?.[p.t].front ?? [],
					back: refs?.[p.t].back ?? []
				}));
			return name === 'study' ? renderStudyWholeMarkdown(parts) : renderWholeMarkdown(parts);
		},
		osisBook: (b) =>
			name === 'study'
				? renderStudyOsis([{ heading: b.shortTitle, books: [b], front: [], back: [] }], { title: b.shortTitle, whole: false })
				: renderOsis([{ heading: b.shortTitle, books: [b] }], { title: b.shortTitle, whole: false }),
		osisWhole: () => {
			const parts = [['OT', 'The Old Testament'], ['NT', 'The New Testament']]
				.map(([t, heading]) => ({ t, heading, books: group(t) }))
				.filter((p) => p.books.length)
				.map((p) => ({
					heading: p.heading,
					books: p.books,
					titleLines: titleLinesOsis(tp[p.t].paragraphs),
					front: refs?.[p.t].front ?? [],
					back: refs?.[p.t].back ?? []
				}));
			return name === 'study'
				? renderStudyOsis(parts, { title: 'The Douay-Rheims Bible', whole: true })
				: renderOsis(parts, { title: 'The Douay-Rheims Bible', whole: true });
		}
	};
}

/** Builds the given formats of one edition. */
export async function buildEbooks(ctx, editionName: 'verse-only' | 'study', formats: string[]) {
	const { out, root, only } = ctx;
	const ed = edition(editionName, ctx);
	const assets = join(out, 'release-assets');
	mkdirSync(assets, { recursive: true });
	const work = mkdtempSync(join(out, '.work-'));
	const tag = editionName === 'study' ? 'study' : 'verse-only';
	try {
		const cover = join(work, 'cover.jpg');
		await makeCover(join(root, 'static', 'images', 'dr-1582-rheims.webp'), cover);
		const css = join(root, 'scripts', 'assets', 'epub.css');
		const reference = formats.includes('docx') ? makeReferenceDocx(work) : null;

		for (const fmt of formats) {
			const dir = join(out, editionName, fmt);
			mkdirSync(dir, { recursive: true });
			const ext = EXT[fmt];
			const files = [];
			const wholeFile = `${WHOLE}${ext}`;
			const meta = (b) => ({
				title: b ? b.shortTitle : 'The Douay-Rheims Bible',
				subtitle: ed.subtitle,
				identifier: `urn:odr:${tag}:${b ? b.slug : 'whole'}`
			});
			const make = (b, path) => {
				if (fmt === 'osis') writeFileSync(path, b ? ed.osisBook(b) : ed.osisWhole());
				else if (fmt === 'epub')
					runPandoc('epub3', b ? ed.bookMarkdown(b) : ed.wholeMarkdown(), {
						...meta(b), cover, css, splitLevel: b ? 1 : 2, tocDepth: b ? 2 : 3
					}, path);
				else
					buildDocx(b ? ed.bookMarkdown(b) : ed.wholeMarkdown(), { ...meta(b), tocDepth: b ? 2 : 3 }, path, { work, cover, reference });
			};
			for (const b of ed.books) {
				const f = fileName(b, ext);
				make(b, join(dir, f));
				files.push(f);
			}
			if (!only) {
				make(null, join(dir, wholeFile));
				copyFileSync(join(dir, wholeFile), join(assets, `${WHOLE}-${tag}${ext}`));
				zip(dir, [...files, wholeFile], join(assets, `${WHOLE}-${tag}-${fmt}.zip`));
			}
		}
	} finally {
		rmSync(work, { recursive: true, force: true });
	}
}
