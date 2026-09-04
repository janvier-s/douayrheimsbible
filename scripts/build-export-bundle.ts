// scripts/build-export-bundle.ts
// @ts-nocheck: build script run with tsx
//
// Builds the janvier-s/original-douay-rheims distribution bundle from the
// committed corpus. The published bundle was hand-maintained and went stale
// (it advertised 1,707 annotations against an actual 1,677); deriving every
// copy in one run is what stops that recurring.
//
// Reads static/data/odr/** and static/data/reference/odr/**. Writes only to
// --out. Never modifies the corpus.
//
//   npx tsx scripts/build-export-bundle.ts
//   npx tsx scripts/build-export-bundle.ts --out /tmp/bundle
//   npx tsx scripts/build-export-bundle.ts --only genesis

import { readdirSync, existsSync, mkdirSync, writeFileSync, copyFileSync, rmSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { homedir } from 'os';
import { execSync } from 'child_process';
import { readJson } from './odr-corpus-json.js';
import {
	renderUsfm,
	stripMarkup,
	usfmFilename,
	bookCode,
	assertSafeOutDir,
	introRef,
	endMatterRef,
	articleRef,
	summaryRef,
	verseRef
} from './export-lib.js';
import { ALL_BOOKS } from '../src/lib/data/books.js';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const ODR_DIR = join(ROOT, 'static', 'data', 'odr');
const REF_DIR = join(ROOT, 'static', 'data', 'reference', 'odr');

const argOf = (flag, fallback) => {
	const i = process.argv.indexOf(flag);
	return i === -1 ? fallback : process.argv[i + 1];
};
// Resolved and vetted before use: the build's first act deletes this directory
// recursively, so a mistyped --out would be destructive with no confirmation.
const OUT_ARG = argOf('--out', join(ROOT, 'dist-export'));
// Checked before resolve() as well as after: resolve('') silently returns the
// cwd, so `--out` with its value omitted would otherwise become "delete the
// directory I happen to be standing in".
assertSafeOutDir(OUT_ARG, ROOT, homedir());
const OUT = resolve(OUT_ARG);
assertSafeOutDir(OUT, ROOT, homedir());
const ONLY = argOf('--only', null);

/** The three non-book artifacts that live alongside the book files. */

const write = (rel, body) => {
	const path = join(OUT, rel);
	mkdirSync(dirname(path), { recursive: true });
	writeFileSync(path, body);
};

function readAnnotations(slug) {
	const dir = join(ODR_DIR, slug, 'annotations');
	const byChapter = new Map();
	if (!existsSync(dir)) return { byChapter, files: 0, count: 0, subNotes: 0 };
	let files = 0;
	let count = 0;
	let subNotes = 0;
	for (const file of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
		files++;
		const { data } = readJson(join(dir, file));
		byChapter.set(data.chapter, data.annotations);
		count += data.annotations.length;
		for (const a of data.annotations) subNotes += (a.notes ?? []).length;
		write(`annotations/${slug}/${file}`, JSON.stringify(data, null, 2));
	}
	return { byChapter, files, count, subNotes };
}

/** Strips every note's own text in place, using `ref` (already scoped to the
 *  owning block) to name the note if stripMarkup ever has to report one. */
function stripNotes(notes, block, ref) {
	for (const note of notes ?? []) note.text = stripMarkup(note.text, block, `${ref} note`);
}

/** bible/raw/: the same tree with markup stripped, including note and
 *  cross-reference bodies, and notes kept structured (as objects, not
 *  flattened into the prose). */
function toRaw(slug, book) {
	const out = structuredClone(book);
	(out.intros ?? []).forEach((intro, i) => {
		const ref = introRef(slug, i);
		intro.text = stripMarkup(intro.text, 'prose', ref);
		stripNotes(intro.notes, 'prose', ref);
	});
	(out.endMatters ?? []).forEach((end, i) => {
		const ref = endMatterRef(slug, i);
		end.text = stripMarkup(end.text, 'prose', ref);
		stripNotes(end.notes, 'prose', ref);
	});
	for (const chapter of out.chapters) {
		const sref = summaryRef(slug, chapter.chapter);
		if (chapter.summary) chapter.summary = stripMarkup(chapter.summary, 'summary', sref);
		stripNotes(chapter.summary_notes, 'summary', sref);
		(chapter.articles ?? []).forEach((article, i) => {
			const ref = articleRef(slug, chapter.chapter, i);
			article.text = stripMarkup(article.text, 'prose', ref);
			stripNotes(article.notes, 'prose', ref);
		});
		for (const verse of chapter.verses) {
			const vref = verseRef(slug, chapter.chapter, verse.verse);
			verse.text = stripMarkup(verse.text, 'verse', vref);
			stripNotes(verse.notes, 'verse', vref);
			stripNotes(verse.cross_refs, 'verse', vref);
			delete verse.lemmas;
		}
	}
	return out;
}

/** Drops the inline catchword spans from a serialized book. They are
 *  duplicated into index/lemmas/, and inline they read as fact when they
 *  are a fuzzy match whose tier the tuple does not carry. */
const dropLemmas = (key: string, value: unknown) => (key === 'lemmas' ? undefined : value);

rmSync(OUT, { recursive: true, force: true });

const counts = {
	books: 0,
	chapters: 0,
	verses: 0,
	usfmVerses: 0,
	annotations: 0,
	annotationFiles: 0,
	subNotes: 0,
	referenceFiles: 0
};
const books = [];

for (const meta of ALL_BOOKS) {
	if (ONLY && meta.slug !== ONLY) continue;
	const file = `${meta.slug}.json`;
	const { data: book } = readJson(join(ODR_DIR, file));
	const anns = readAnnotations(meta.slug);

	// Catchword spans ship in index/lemmas/ alone. A replacer rather than a
	// delete because `book` is still needed intact for the USFM render and
	// for the lemma index built below.
	write(`bible/tagged/${file}`, JSON.stringify(book, dropLemmas, 2));
	write(`bible/raw/${file}`, JSON.stringify(toRaw(meta.slug, book), null, 2));
	const plainUsfm = renderUsfm(
		meta.slug,
		book,
		anns.byChapter,
		{ includeAnnotations: false },
		meta.odrName
	);
	write(`usfm/${usfmFilename(meta.slug)}`, plainUsfm);
	write(
		`usfm-study/${usfmFilename(meta.slug)}`,
		renderUsfm(meta.slug, book, anns.byChapter, { includeAnnotations: true }, meta.odrName)
	);

	// Catchword spans are offsets into the tagged text and carry a match tier,
	// so they ship as a separate index rather than inline where a consumer
	// would read them as fact.
	const lemmas = {};
	for (const chapter of book.chapters) {
		for (const verse of chapter.verses) {
			if (verse.lemmas?.length) lemmas[`${chapter.chapter}:${verse.verse}`] = verse.lemmas;
		}
	}
	if (Object.keys(lemmas).length) write(`index/lemmas/${file}`, JSON.stringify(lemmas, null, 2));

	counts.books++;
	counts.chapters += book.chapters.length;
	for (const c of book.chapters) counts.verses += c.verses.length;
	// Two different true numbers: the corpus counts a summary that overran its
	// field as a verse, and the USFM does not emit those. Naming only one of
	// them "verses" is what let the manifest drift in the first place.
	counts.usfmVerses += plainUsfm.split('\n').filter((l) => l.startsWith('\\v ')).length;
	counts.annotations += anns.count;
	counts.annotationFiles += anns.files;
	counts.subNotes += anns.subNotes;
	books.push({ slug: meta.slug, ...bookCode(meta.slug), chapters: book.chapters.length });
}

for (const testament of ['ot', 'nt']) {
	for (const file of readdirSync(join(REF_DIR, testament)).filter((f) => f.endsWith('.json'))) {
		mkdirSync(join(OUT, 'reference', testament), { recursive: true });
		copyFileSync(join(REF_DIR, testament, file), join(OUT, 'reference', testament, file));
		counts.referenceFiles++;
	}
}

const commit = execSync('git rev-parse HEAD', { cwd: ROOT }).toString().trim();
write(
	'manifest.json',
	`${JSON.stringify({ schema: 1, generated: new Date().toISOString(), commit, counts, books }, null, 2)}\n`
);

console.log(`wrote ${OUT}`);
console.table(counts);
