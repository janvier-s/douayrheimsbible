// scripts/odr-lemmas.corpus.test.ts
// Lives here rather than in tests/unit because it walks static/data/odr, and
// tsconfig excludes scripts/** where the node builtins it needs are typed.
// Re-derives every catchword span recorded in the corpus and fails if the
// stored value and the resolver have drifted apart.
//
// The spans in static/data/odr/ are derived data checked into a hand-maintained
// tree, which is the arrangement that rots quietest: an edit to a verse or a
// catchword moves the words without moving the numbers, and the highlight goes
// on tinting whatever now sits at the old offset. Nothing in the build would
// notice. This does, and the fix is to re-run scripts/build-odr-lemmas.ts.

import { describe, it, expect } from 'vitest';
import { readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { resolveLemma, resolvePartialLemma } from './odr-lemma-lib';
import { readJson } from './odr-corpus-json';

const ODR_DIR = join(dirname(dirname(fileURLToPath(import.meta.url))), 'static', 'data', 'odr');

interface Verse {
	verse: number;
	text: string;
	has_annotation?: boolean;
	lemmas?: Array<[number, number, number]>;
}

/** Every titled annotation in the corpus, paired with the verse it annotates. */
function readCorpus() {
	const rows: Array<{ ref: string; title: string; part: number; verse: Verse }> = [];
	const verses: Array<{ ref: string; verse: Verse }> = [];

	for (const file of readdirSync(ODR_DIR).filter((f) => f.endsWith('.json'))) {
		const slug = file.replace(/\.json$/, '');
		const annDir = join(ODR_DIR, slug, 'annotations');
		if (!existsSync(annDir)) continue;

		const { data: book } = readJson<{ chapters: Array<{ chapter: number; verses: Verse[] }> }>(
			join(ODR_DIR, file)
		);
		for (const chapter of book.chapters)
			for (const verse of chapter.verses)
				verses.push({ ref: `${slug} ${chapter.chapter}:${verse.verse}`, verse });

		const chapters = new Map(book.chapters.map((c) => [c.chapter, c]));
		for (const annFile of readdirSync(annDir).filter((f) => f.endsWith('.json'))) {
			const { data: sidecar } = readJson<{
				chapter: number;
				annotations: Array<{ verse: number; part?: number; title?: string | null }>;
			}>(join(annDir, annFile));
			const byVerse = new Map(chapters.get(sidecar.chapter)!.verses.map((v) => [v.verse, v]));
			for (const ann of sidecar.annotations) {
				if (!ann.title) continue;
				rows.push({
					ref: `${slug} ${sidecar.chapter}:${ann.verse}`,
					title: ann.title,
					part: ann.part ?? 1,
					verse: byVerse.get(ann.verse)!
				});
			}
		}
	}
	return { rows, verses };
}

const { rows, verses } = readCorpus();
const key = (s: [number, number, number]) => s.join(',');

describe('the recorded catchword spans', () => {
	it('has one for every catchword, at the offsets the resolver derives now', () => {
		const drifted: string[] = [];
		for (const { ref, title, part, verse } of rows) {
			const span = resolveLemma(title, verse.text) ?? resolvePartialLemma(title, verse.text);
			if (!span) {
				drifted.push(`${ref} "${title}" no longer resolves`);
				continue;
			}
			const want: [number, number, number] = [span.start, span.length, part];
			if (!(verse.lemmas ?? []).some((s) => key(s) === key(want)))
				drifted.push(
					`${ref} "${title}" resolves to [${want}], recorded [${(verse.lemmas ?? []).map((s) => `${s}`).join('] [')}]`
				);
		}
		expect(drifted).toEqual([]);
	});

	it('records nothing that no catchword asked for', () => {
		const wanted = new Map<Verse, Set<string>>();
		for (const { title, part, verse } of rows) {
			const span = resolveLemma(title, verse.text) ?? resolvePartialLemma(title, verse.text);
			if (!span) continue;
			if (!wanted.has(verse)) wanted.set(verse, new Set());
			wanted.get(verse)!.add(key([span.start, span.length, part]));
		}
		const orphans: string[] = [];
		for (const { ref, verse } of verses)
			for (const span of verse.lemmas ?? [])
				if (!wanted.get(verse)?.has(key(span))) orphans.push(`${ref} [${span}]`);
		expect(orphans).toEqual([]);
	});

	it('keeps every span inside its verse and its markup', () => {
		const broken: string[] = [];
		for (const { ref, verse } of verses)
			for (const [start, length] of verse.lemmas ?? []) {
				if (start < 0 || start + length > verse.text.length) {
					broken.push(`${ref} [${start},${length}] runs past the verse`);
					continue;
				}
				const slice = verse.text.slice(start, start + length);
				let depth = 0;
				for (const tag of slice.match(/<\/?[a-zA-Z][^<>]*>/g) ?? [])
					depth += tag.startsWith('</') ? -1 : 1;
				if (depth !== 0) broken.push(`${ref} [${start},${length}] cuts a tag: ${slice}`);
			}
		expect(broken).toEqual([]);
	});

	it('never puts a span edge inside a tag', () => {
		// The reader cuts the verse at every edge to render overlapping spans as
		// depth. An edge inside a tag would split it and put half of it on the page.
		const cutting: string[] = [];
		for (const { ref, verse } of verses) {
			const spans = verse.lemmas ?? [];
			if (spans.length === 0) continue;
			const tags: Array<[number, number]> = [];
			for (const m of verse.text.matchAll(/<[^<>]*>/g))
				tags.push([m.index!, m.index! + m[0].length]);
			for (const [start, length] of spans)
				for (const edge of [start, start + length])
					if (tags.some(([from, to]) => edge > from && edge < to))
						cutting.push(`${ref} edge ${edge} in ${verse.text.slice(edge - 10, edge + 10)}`);
		}
		expect(cutting).toEqual([]);
	});

	it('orders spans so a containing highlight opens before the one inside it', () => {
		const misordered: string[] = [];
		for (const { ref, verse } of verses) {
			const spans = verse.lemmas ?? [];
			for (let i = 1; i < spans.length; i++) {
				const [ps, pl] = spans[i - 1];
				const [s, l] = spans[i];
				if (s < ps || (s === ps && l > pl))
					misordered.push(`${ref} [${spans[i - 1]}] before [${spans[i]}]`);
			}
		}
		expect(misordered).toEqual([]);
	});

	it('anchors every catchword in the corpus', () => {
		expect(rows.length).toBeGreaterThan(1500);
		const unresolved = rows.filter(
			({ title, verse }) =>
				!(resolveLemma(title, verse.text) ?? resolvePartialLemma(title, verse.text))
		);
		expect(unresolved.map((r) => `${r.ref} "${r.title}"`)).toEqual([]);
	});
});
