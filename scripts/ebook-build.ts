// scripts/ebook-build.ts
// @ts-nocheck: build helper run with tsx
// Writes the EPUB, OSIS and DOCX exports for build-export-bundle.ts. Each
// format goes to <out>/<edition>/<format>/ as one file per book plus the
// whole Bible, and to <out>/release-assets/ as the zips and whole-Bible files
// that ship on GitHub releases.

import { mkdirSync, mkdtempSync, rmSync, readFileSync, writeFileSync, copyFileSync } from 'fs';
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

export const WHOLE = 'original-douay-rheims';

export async function makeCover(webp: string, outJpg: string) {
	await sharp(webp).jpeg({ quality: 90 }).toFile(outJpg);
}

const zip = (dir: string, files: string[], zipPath: string) => {
	execFileSync('zip', ['-q', '-j', zipPath, ...files.map((f) => join(dir, f))]);
};

function titlePages(refDir: string) {
	const tp = (t: string) =>
		renderTitlePageMarkdown(JSON.parse(readFileSync(join(refDir, t, 'title-page.json'), 'utf8')));
	return { OT: tp('ot'), NT: tp('nt') };
}

function parts(verseBooks, testamentOf, pages) {
	return [
		{
			heading: 'The Old Testament',
			books: verseBooks.filter((b) => testamentOf[b.slug] === 'OT'),
			titlePage: pages.OT
		},
		{
			heading: 'The New Testament',
			books: verseBooks.filter((b) => testamentOf[b.slug] === 'NT'),
			titlePage: pages.NT
		}
	].filter((p) => p.books.length);
}

export async function buildVerseOnlyEpubs({ out, root, refDir, verseBooks, testamentOf, only }) {
	const dir = join(out, 'verse-only', 'epub');
	mkdirSync(dir, { recursive: true });
	const assets = join(out, 'release-assets');
	mkdirSync(assets, { recursive: true });
	const work = mkdtempSync(join(out, '.work-'));
	try {
		const cover = join(work, 'cover.jpg');
		await makeCover(join(root, 'static', 'images', 'dr-1582-rheims.webp'), cover);
		const css = join(root, 'scripts', 'assets', 'epub.css');
		const files = [];
		for (const b of verseBooks) {
			const file = `${String(b.ordinal).padStart(2, '0')}-${b.slug}.epub`;
			runPandoc(
				'epub3',
				renderBookMarkdown(b),
				{
					title: b.shortTitle,
					subtitle: `${EPUB_SUBTITLE}, verse text only`,
					identifier: `urn:odr:verse-only:${b.slug}`,
					cover,
					css,
					splitLevel: 1,
					tocDepth: 2
				},
				join(dir, file)
			);
			files.push(file);
		}
		if (!only) {
			const whole = `${WHOLE}.epub`;
			runPandoc(
				'epub3',
				renderWholeMarkdown(parts(verseBooks, testamentOf, titlePages(refDir))),
				{
					title: 'The Douay-Rheims Bible',
					subtitle: `${EPUB_SUBTITLE}, verse text only`,
					identifier: 'urn:odr:verse-only:whole',
					cover,
					css,
					splitLevel: 2,
					tocDepth: 3
				},
				join(dir, whole)
			);
			copyFileSync(join(dir, whole), join(assets, `${WHOLE}-verse-only.epub`));
			zip(dir, [...files, whole], join(assets, `${WHOLE}-verse-only-epub.zip`));
		}
	} finally {
		rmSync(work, { recursive: true, force: true });
	}
}

const fileName = (b, ext) => `${String(b.ordinal).padStart(2, '0')}-${b.slug}${ext}`;

export function buildVerseOnlyOsis({ out, refDir, verseBooks, testamentOf, only }) {
	const dir = join(out, 'verse-only', 'osis');
	mkdirSync(dir, { recursive: true });
	const assets = join(out, 'release-assets');
	mkdirSync(assets, { recursive: true });
	const files = [];
	for (const b of verseBooks) {
		const file = fileName(b, '.osis.xml');
		writeFileSync(
			join(dir, file),
			renderOsis([{ heading: b.shortTitle, books: [b] }], { title: b.shortTitle, whole: false })
		);
		files.push(file);
	}
	if (!only) {
		const tp = (t) =>
			titleLinesOsis(
				JSON.parse(readFileSync(join(refDir, t, 'title-page.json'), 'utf8')).paragraphs
			);
		const whole = `${WHOLE}.osis.xml`;
		writeFileSync(
			join(dir, whole),
			renderOsis(
				[
					{
						heading: 'The Old Testament',
						books: verseBooks.filter((b) => testamentOf[b.slug] === 'OT'),
						titleLines: tp('ot')
					},
					{
						heading: 'The New Testament',
						books: verseBooks.filter((b) => testamentOf[b.slug] === 'NT'),
						titleLines: tp('nt')
					}
				],
				{ title: 'The Douay-Rheims Bible', whole: true }
			)
		);
		copyFileSync(join(dir, whole), join(assets, `${WHOLE}-verse-only.osis.xml`));
		zip(dir, [...files, whole], join(assets, `${WHOLE}-verse-only-osis.zip`));
	}
}

export async function buildVerseOnlyDocx({ out, root, refDir, verseBooks, testamentOf, only }) {
	const dir = join(out, 'verse-only', 'docx');
	mkdirSync(dir, { recursive: true });
	const assets = join(out, 'release-assets');
	mkdirSync(assets, { recursive: true });
	const work = mkdtempSync(join(out, '.work-'));
	try {
		const cover = join(work, 'cover.jpg');
		await makeCover(join(root, 'static', 'images', 'dr-1582-rheims.webp'), cover);
		const ctx = { work, cover, reference: makeReferenceDocx(work) };
		const files = [];
		for (const b of verseBooks) {
			const file = fileName(b, '.docx');
			buildDocx(
				renderBookMarkdown(b),
				{
					title: b.shortTitle,
					subtitle: `${EPUB_SUBTITLE}, verse text only`,
					identifier: `urn:odr:verse-only:${b.slug}`,
					tocDepth: 2
				},
				join(dir, file),
				ctx
			);
			files.push(file);
		}
		if (!only) {
			const whole = `${WHOLE}.docx`;
			buildDocx(
				renderWholeMarkdown(parts(verseBooks, testamentOf, titlePages(refDir))),
				{
					title: 'The Douay-Rheims Bible',
					subtitle: `${EPUB_SUBTITLE}, verse text only`,
					identifier: 'urn:odr:verse-only:whole',
					tocDepth: 3
				},
				join(dir, whole),
				ctx
			);
			copyFileSync(join(dir, whole), join(assets, `${WHOLE}-verse-only.docx`));
			zip(dir, [...files, whole], join(assets, `${WHOLE}-verse-only-docx.zip`));
		}
	} finally {
		rmSync(work, { recursive: true, force: true });
	}
}
