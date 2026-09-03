// scripts/export.corpus.test.ts
// Whole-corpus invariants for the export, mirroring odr-lemmas.corpus.test.ts.
// Lives here rather than in tests/unit because it walks static/data and
// tsconfig excludes scripts/** where the node builtins it needs are typed.
//
// The numbers below were measured, not guessed. They are asserted exactly so
// that a corpus edit which changes the shape of the apparatus fails here
// rather than silently producing a different bundle.

import { describe, it, expect } from 'vitest';
import { readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readJson } from './odr-corpus-json';
import {
	bindMarkers,
	tokenize,
	stripMarkup,
	TAGS_BY_BLOCK,
	BOOK_CODES,
	KNOWN_UNBALANCED,
	type BlockKind,
	type NoteLike
} from './export-lib';
import { ALL_BOOKS } from '../src/lib/data/books';

const ODR_DIR = join(dirname(dirname(fileURLToPath(import.meta.url))), 'static', 'data', 'odr');

interface Block {
	ref: string;
	text: string;
	notes: NoteLike[];
	block: BlockKind;
}

/** Every piece of marked-up text in the corpus, with the notes it resolves against. */
function readBlocks(): Block[] {
	const blocks: Block[] = [];
	for (const meta of ALL_BOOKS) {
		const slug = meta.slug;
		const { data: book } = readJson<any>(join(ODR_DIR, `${slug}.json`));

		for (const i of book.intros ?? [])
			blocks.push({ ref: `${slug} intro`, text: i.text, notes: i.notes ?? [], block: 'prose' });
		for (const e of book.endMatters ?? [])
			blocks.push({
				ref: `${slug} endMatter`,
				text: e.text,
				notes: e.notes ?? [],
				block: 'prose'
			});

		for (const c of book.chapters) {
			if (c.summary)
				blocks.push({
					ref: `${slug} ${c.chapter} summary`,
					text: c.summary,
					notes: c.summary_notes ?? [],
					block: 'summary'
				});
			for (const a of c.articles ?? [])
				blocks.push({
					ref: `${slug} ${c.chapter} article`,
					text: a.text,
					notes: a.notes ?? [],
					block: 'prose'
				});
			for (const v of c.verses)
				blocks.push({
					ref: `${slug} ${c.chapter}:${v.verse}`,
					text: v.text,
					notes: v.notes ?? [],
					block: 'verse'
				});
		}

		const annDir = join(ODR_DIR, slug, 'annotations');
		if (!existsSync(annDir)) continue;
		for (const f of readdirSync(annDir).filter((x) => x.endsWith('.json'))) {
			const { data: sidecar } = readJson<any>(join(annDir, f));
			for (const a of sidecar.annotations)
				blocks.push({
					ref: `${slug} ann ${sidecar.chapter}:${a.verse}`,
					text: a.text,
					notes: a.notes ?? [],
					block: 'prose'
				});
		}
	}
	return blocks;
}

const blocks = readBlocks();

describe('the corpus markup', () => {
	it('reads every block without an illegal or unbalanced tag', () => {
		const bad: string[] = [];
		for (const b of blocks) {
			try {
				tokenize(b.text, b.block, b.ref);
			} catch (e) {
				bad.push(`${b.ref}: ${(e as Error).message}`);
			}
		}
		expect(bad).toEqual([]);
	});

	// The block text above balances everywhere; the one irregularity the export
	// pins lives in note bodies instead, where an italic run opens in one note
	// and closes in the next. Asserting the failing set exactly, rather than
	// "no errors outside the list", is what makes a thirtieth defect fail here.
	it('leaves exactly the pinned refs unbalanced in their note bodies', () => {
		const unbalanced = new Set<string>();
		for (const b of blocks) {
			for (const n of b.notes) {
				try {
					tokenize(n.text, b.block, b.ref);
				} catch {
					unbalanced.add(b.ref);
				}
			}
		}
		expect([...unbalanced].sort()).toEqual([...KNOWN_UNBALANCED].sort());
	});

	// Scans real text rather than comparing TAGS_BY_BLOCK against a hardcoded
	// list, which would be a tautology over a constant in the library under
	// test: it would pass unchanged if the corpus vanished. Reading the corpus
	// is also what makes it say something test 1 cannot, which only reports
	// that a tag was illegal *for its block*, never which tags exist at all.
	it('uses only the nine known tags, counted over real text', () => {
		const tagRe = /<\/?([a-zA-Z][a-zA-Z0-9-]*)>/g;
		const found = new Set<string>();
		for (const b of blocks) {
			for (const m of b.text.matchAll(tagRe)) found.add(m[1]);
			for (const n of b.notes) for (const m of n.text.matchAll(tagRe)) found.add(m[1]);
		}
		expect([...found].sort()).toEqual(
			['alt', 'br', 'col-left', 'col-right', 'cr', 'i', 'mn', 'na', 'sc'].sort()
		);

		// and the library's vocabulary is exactly what the corpus uses
		const declared = new Set([...Object.values(TAGS_BY_BLOCK)].flatMap((s) => [...s]));
		expect([...declared].sort()).toEqual([...found].sort());
	});

	it('binds 13,606 of 13,608 markers', () => {
		let bound = 0;
		let unbound = 0;
		for (const b of blocks) {
			const r = bindMarkers(b.text, b.notes, b.block, b.ref);
			bound += r.hits.length;
			unbound += r.unbound.length;
		}
		expect(bound).toBe(13606);
		expect(unbound).toBe(2);
		expect(bound + unbound).toBe(13608);
	});

	// BindResult cannot report a double-bind on its own: two markers claiming
	// one note would show up as two ordinary hits and one fewer unreferenced
	// note. The hit list is the only place the collision is visible.
	it('binds no note twice', () => {
		const doubled: string[] = [];
		for (const b of blocks) {
			const seen = new Set<number>();
			for (const hit of bindMarkers(b.text, b.notes, b.block, b.ref).hits) {
				if (seen.has(hit.noteIndex)) doubled.push(`${b.ref} note index ${hit.noteIndex}`);
				seen.add(hit.noteIndex);
			}
		}
		expect(doubled).toEqual([]);
	});

	it('leaves exactly 26 notes unreferenced', () => {
		let unreferenced = 0;
		for (const b of blocks)
			unreferenced += bindMarkers(b.text, b.notes, b.block, b.ref).unreferenced.length;
		expect(unreferenced).toBe(26);
	});

	it('strips to prose with no angle bracket surviving', () => {
		const leaked = blocks.filter((b) => /[<>]/.test(stripMarkup(b.text, b.block, b.ref)));
		expect(leaked.map((b) => b.ref)).toEqual([]);
	});

	it('covers every book with a unique code', () => {
		expect(ALL_BOOKS).toHaveLength(76);
		expect(ALL_BOOKS.every((b) => BOOK_CODES[b.slug])).toBe(true);
	});
});
