// scripts/build-odr-lemmas.ts
// @ts-nocheck: build script run with tsx
//
// Anchors every Rheims annotation catchword to a span of the verse it annotates
// and records the result on the verse, so the reader can tint the phrase the
// annotator quoted without matching anything at runtime.
//
// static/data/odr/ is committed and hand-maintained (see the note in
// prepare-data.ts), so this is a codemod over the corpus rather than a step in
// the build. Run it after editing verse text or annotation titles. Spans are
// re-verified by scripts/odr-lemmas.corpus.test.ts, which fails if the two
// drift apart.
//
//   npx tsx scripts/build-odr-lemmas.ts            report only
//   npx tsx scripts/build-odr-lemmas.ts --write    write spans into the chapter files

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs';
import { readJson, serialize } from './odr-corpus-json.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { resolveLemma, resolvePartialLemma } from './odr-lemma-lib.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ODR_DIR = join(dirname(__dirname), 'static', 'data', 'odr');
const WRITE = process.argv.includes('--write');

/** How far either side of the stated verse to look when a title does not match
 *  the verse it is attached to. Enough to tell a misplaced annotation from a
 *  paraphrase, not enough to start inventing matches. */
const PROBE = [1, -1, 2, -2, 3, -3];

/** Rebuilds a verse with lemmas in the corpus's key order rather than appended
 *  after notes, so a book file that gains spans still diffs a line at a time. */
function setLemmas(verse) {
	const order = ['verse', 'text', 'has_annotation', 'lemmas', 'cross_refs', 'notes'];
	const rebuilt = {};
	for (const key of order) if (key in verse) rebuilt[key] = verse[key];
	for (const [key, value] of Object.entries(verse)) if (!(key in rebuilt)) rebuilt[key] = value;
	for (const key of Object.keys(verse)) delete verse[key];
	Object.assign(verse, rebuilt);
}

const books = readdirSync(ODR_DIR).filter((f) => f.endsWith('.json'));
const tally = {
	exact: 0,
	gapped: 0,
	despaced: 0,
	fuzzy: 0,
	partial: 0,
	adrift: 0,
	ambiguous: 0,
	none: 0
};
const adrift = [];
const ambiguous = [];
const unmatched = [];

for (const file of books) {
	const slug = file.replace(/\.json$/, '');
	const annDir = join(ODR_DIR, slug, 'annotations');
	if (!existsSync(annDir)) continue;

	const bookPath = join(ODR_DIR, file);
	const { raw, data: book } = readJson(bookPath);
	const chapters = new Map(book.chapters.map((c) => [c.chapter, c]));
	// Spans are derived, so every run recomputes them from nothing. Leaving the
	// last run's behind would have each one appending to it.
	for (const chapter of book.chapters) for (const verse of chapter.verses) delete verse.lemmas;
	let touched = false;

	for (const annFile of readdirSync(annDir).filter((f) => f.endsWith('.json'))) {
		const sidecar = JSON.parse(readFileSync(join(annDir, annFile), 'utf-8'));
		const chapter = chapters.get(sidecar.chapter);
		if (!chapter)
			throw new Error(`Annotations for a chapter that is not there: ${slug} ${annFile}`);
		const verses = new Map(chapter.verses.map((v) => [v.verse, v]));

		for (const ann of sidecar.annotations) {
			if (!ann.title) continue;
			const verse = verses.get(ann.verse);
			if (!verse)
				throw new Error(`Annotation on a missing verse: ${slug} ${sidecar.chapter}:${ann.verse}`);

			const span = resolveLemma(ann.title, verse.text);
			if (span) {
				tally[span.tier]++;
				const entry = [span.start, span.length, ann.part ?? 1];
				(verse.lemmas ??= []).push(entry);
				touched = true;
				continue;
			}

			let loose;
			const near = PROBE.filter((d) => {
				const other = verses.get(ann.verse + d);
				return other && resolveLemma(ann.title, other.text);
			});
			if (near.length === 1) {
				tally.adrift++;
				adrift.push({
					slug,
					chapter: sidecar.chapter,
					verse: ann.verse,
					offset: near[0],
					title: ann.title,
					part: ann.part
				});
			} else if (near.length > 1) {
				tally.ambiguous++;
				ambiguous.push({
					slug,
					chapter: sidecar.chapter,
					verse: ann.verse,
					offsets: near,
					title: ann.title
				});
			} else if ((loose = resolvePartialLemma(ann.title, verse.text))) {
				// Only once the neighbours have been ruled out: an exact match next
				// door is better evidence than a loose one here.
				tally.partial++;
				(verse.lemmas ??= []).push([loose.start, loose.length, ann.part ?? 1]);
				touched = true;
			} else {
				tally.none++;
				unmatched.push({ slug, chapter: sidecar.chapter, verse: ann.verse, title: ann.title });
			}
		}
	}

	if (WRITE && touched) {
		for (const chapter of book.chapters) {
			for (const verse of chapter.verses) {
				if (!verse.lemmas) continue;
				// Outermost first where two spans start together, so a containing
				// highlight opens before the one nested inside it.
				verse.lemmas.sort((a, b) => a[0] - b[0] || b[1] - a[1]);
				setLemmas(verse);
			}
		}
		writeFileSync(bookPath, serialize(raw, book));
	}
}

const titles = Object.values(tally).reduce((a, b) => a + b, 0);
const anchored = tally.exact + tally.gapped + tally.despaced + tally.fuzzy + tally.partial;
const pct = (n) => `${((n / titles) * 100).toFixed(1)}%`;

console.log(`\nTitles: ${titles}`);
for (const tier of ['exact', 'gapped', 'despaced', 'fuzzy', 'partial']) {
	console.log(`  ${tier.padEnd(9)} ${String(tally[tier]).padStart(5)}  ${pct(tally[tier])}`);
}
console.log(`  ${'anchored'.padEnd(9)} ${String(anchored).padStart(5)}  ${pct(anchored)}`);
console.log(
	`\n  adrift    ${String(tally.adrift).padStart(5)}  ${pct(tally.adrift)}  (matches exactly one neighbouring verse)`
);
console.log(
	`  ambiguous ${String(tally.ambiguous).padStart(5)}  ${pct(tally.ambiguous)}  (matches more than one neighbour)`
);
console.log(
	`  none      ${String(tally.none).padStart(5)}  ${pct(tally.none)}  (paraphrase; left untinted)`
);

console.log(`\nAdrift, with the verse each title actually quotes:`);
for (const a of adrift.sort(
	(x, y) => x.slug.localeCompare(y.slug) || x.chapter - y.chapter || x.verse - y.verse
)) {
	const sign = a.offset > 0 ? `+${a.offset}` : `${a.offset}`;
	console.log(
		`  ${a.slug.padEnd(14)}${String(a.chapter).padStart(3)}:${String(a.verse).padEnd(4)} -> ${String(a.verse + a.offset).padEnd(4)} (${sign})  ${a.title}`
	);
}
if (ambiguous.length) {
	console.log(`\nAmbiguous, left alone:`);
	for (const a of ambiguous) {
		console.log(`  ${a.slug} ${a.chapter}:${a.verse} offsets [${a.offsets}]  ${a.title}`);
	}
}
console.log(
	WRITE ? `\nWrote spans into ${ODR_DIR}` : `\nReport only. Pass --write to record the spans.`
);
