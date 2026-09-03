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
	renderUsfm,
	TAGS_BY_BLOCK,
	BOOK_CODES,
	KNOWN_UNBALANCED,
	KNOWN_UNBOUND,
	KNOWN_UNREFERENCED,
	KNOWN_DUPLICATE_VERSE,
	PREFACE_CHAPTER,
	introRef,
	endMatterRef,
	articleRef,
	summaryRef,
	verseRef,
	annotationRef,
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

/** Every piece of marked-up text in the corpus, with the notes it resolves against.
 *
 *  Titles and cross-reference bodies carry no markup today, but nothing keeps
 *  them that way, and they are the same field set the literal-newline defect
 *  hid in. They are visited so the invariants below cover them; each is a block
 *  in its own right, with no notes of its own to resolve against. */
function readBlocks(): Block[] {
	const blocks: Block[] = [];
	/** A title or cross-reference body: text with no apparatus behind it. */
	const bare = (ref: string, text: string | null | undefined, block: BlockKind) => {
		if (text) blocks.push({ ref, text, notes: [], block });
	};

	for (const meta of ALL_BOOKS) {
		const slug = meta.slug;
		const { data: book } = readJson<any>(join(ODR_DIR, `${slug}.json`));

		(book.intros ?? []).forEach((i: any, n: number) => {
			blocks.push({ ref: introRef(slug, n), text: i.text, notes: i.notes ?? [], block: 'prose' });
			bare(`${introRef(slug, n)} title`, i.title, 'prose');
		});
		(book.endMatters ?? []).forEach((e: any, n: number) => {
			blocks.push({
				ref: endMatterRef(slug, n),
				text: e.text,
				notes: e.notes ?? [],
				block: 'prose'
			});
			bare(`${endMatterRef(slug, n)} title`, e.title, 'prose');
		});

		for (const c of book.chapters) {
			if (c.summary)
				blocks.push({
					ref: summaryRef(slug, c.chapter),
					text: c.summary,
					notes: c.summary_notes ?? [],
					block: 'summary'
				});
			(c.articles ?? []).forEach((a: any, n: number) => {
				blocks.push({
					ref: articleRef(slug, c.chapter, n),
					text: a.text,
					notes: a.notes ?? [],
					block: 'prose'
				});
				bare(`${articleRef(slug, c.chapter, n)} title`, a.title, 'prose');
			});
			for (const v of c.verses) {
				blocks.push({
					ref: verseRef(slug, c.chapter, v.verse),
					text: v.text,
					notes: v.notes ?? [],
					block: 'verse'
				});
				(v.cross_refs ?? []).forEach((x: any, n: number) =>
					bare(`${verseRef(slug, c.chapter, v.verse)} cross_ref[${n}]`, x.text, 'verse')
				);
			}
		}

		const annDir = join(ODR_DIR, slug, 'annotations');
		if (!existsSync(annDir)) continue;
		for (const f of readdirSync(annDir).filter((x) => x.endsWith('.json'))) {
			const { data: sidecar } = readJson<any>(join(annDir, f));
			for (const a of sidecar.annotations) {
				blocks.push({
					ref: annotationRef(slug, sidecar.chapter, a),
					text: a.text,
					notes: a.notes ?? [],
					block: 'prose'
				});
				bare(`${annotationRef(slug, sidecar.chapter, a)} title`, a.title, 'prose');
			}
		}
	}
	return blocks;
}

/** The annotation sidecars for one book, keyed by chapter, as the build loads them. */
function readAnnotations(slug: string): Map<number, any[]> {
	const byChapter = new Map<number, any[]>();
	const dir = join(ODR_DIR, slug, 'annotations');
	if (!existsSync(dir)) return byChapter;
	for (const f of readdirSync(dir).filter((x) => x.endsWith('.json'))) {
		const { data } = readJson<any>(join(dir, f));
		byChapter.set(data.chapter, data.annotations);
	}
	return byChapter;
}

const blocks = readBlocks();

describe('the corpus markup', () => {
	// Every defect inventory is keyed by a ref, so a ref two blocks share lets a
	// pin written for one excuse the other. 210 refs were shared before array
	// position entered them: `matthew intro` alone covered three blocks.
	// `3-esdras 2:1` is the one that remains, and it is pinned as a duplicate
	// verse rather than a naming collision.
	// Without this the invariants below could quietly stop covering a field and
	// still pass: they only ever assert that nothing is wrong.
	it('visits every title and cross-reference body', () => {
		const titles = blocks.filter((b) => b.ref.endsWith(' title'));
		const crossRefs = blocks.filter((b) => / cross_ref\[\d+\]$/.test(b.ref));
		expect(titles).toHaveLength(1618);
		expect(crossRefs).toHaveLength(1989);
		expect(blocks).toHaveLength(43797);
	});

	it('names exactly one block per ref', () => {
		const seen = new Map<string, number>();
		for (const b of blocks) seen.set(b.ref, (seen.get(b.ref) ?? 0) + 1);
		const shared = [...seen].filter(([, n]) => n > 1).map(([ref]) => ref);
		expect(shared.sort()).toEqual([...KNOWN_DUPLICATE_VERSE].sort());
	});

	// Every pinned ref must still match a block. A pin that stops matching is a
	// repaired defect the export is still excusing, which is how the list rots.
	// Re-derives the defects instead of checking that each pin's ref exists
	// somewhere. Anchoring on the ref alone let a pin outlive the note it
	// named: repair the note, keep the verse, and the stale pin sits there
	// silently excusing a defect that is gone. Set equality catches a dead pin
	// and an unpinned defect in one assertion.
	it('pins exactly the defects the corpus still has', () => {
		const unbound: string[] = [];
		const unreferenced: string[] = [];
		for (const b of blocks) {
			const r = bindMarkers(b.text, b.notes, b.block, b.ref);
			for (const token of r.unbound) unbound.push(`${b.ref} marker ${token}`);
			for (const i of r.unreferenced) {
				const n = b.notes[i];
				unreferenced.push(`${b.ref} note ${String(n.marker ?? n.label)}`);
			}
		}
		expect(unbound.sort()).toEqual([...KNOWN_UNBOUND].sort());
		expect(unreferenced.sort()).toEqual([...KNOWN_UNREFERENCED].sort());
	});

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

	// The invariant that USFM is a line-oriented format: every line is either a
	// marker line or a continuation, and this export emits no continuations, so
	// a line not starting with a backslash is unparseable. Its absence is what
	// let 187 such lines ship, from literal newlines inside \\h/\\toc/\\mt1/\\cd/\\v
	// values that the corpus stores unescaped.
	it.each([false, true])(
		'renders no line without a leading backslash (annotations: %s)',
		(includeAnnotations) => {
			const offenders: string[] = [];
			for (const meta of ALL_BOOKS) {
				const { data: book } = readJson<any>(join(ODR_DIR, `${meta.slug}.json`));
				const usfm = renderUsfm(
					meta.slug,
					book,
					readAnnotations(meta.slug),
					{ includeAnnotations },
					meta.odrName
				);
				usfm.split('\n').forEach((line, i) => {
					if (line !== '' && !line.startsWith('\\')) {
						offenders.push(`${meta.slug}:${i + 1}: ${line.slice(0, 60)}`);
					}
				});
			}
			expect(offenders).toEqual([]);
		}
	);

	// The corpus numbers a summary that overran its field as verse 0. USFM
	// verse numbers start at 1, so those 49 fragments must reach the reader as
	// \cd text and never as scripture. Counting the chapters that carry one and
	// checking each fragment's words landed in its \cd is what distinguishes
	// "folded in" from "dropped".
	it.each([false, true])(
		'emits no \\v 0 and folds all 49 fragments into \\cd (annotations: %s)',
		(includeAnnotations) => {
			let carriers = 0;
			const missing: string[] = [];
			for (const meta of ALL_BOOKS) {
				const { data: book } = readJson<any>(join(ODR_DIR, `${meta.slug}.json`));
				const usfm = renderUsfm(
					meta.slug,
					book,
					readAnnotations(meta.slug),
					{ includeAnnotations },
					meta.odrName
				);
				expect(usfm).not.toMatch(/^\\v 0\b/m);

				const lines = usfm.split('\n');
				for (const chapter of book.chapters) {
					const zero = chapter.verses.find((v: any) => v.verse === 0);
					if (!zero) continue;
					carriers++;
					const ref = `${meta.slug} ${chapter.chapter}:0`;
					const words = stripMarkup(zero.text, 'verse', ref).replace(/\s+/g, ' ');
					// The fold keeps <i>/<sc> as \it/\sc, so the words are no longer a
					// contiguous substring of the raw line. Drop the markers from the
					// emitted \cd before looking for them; the words themselves still
					// have to be there, in order.
					// Closing markers first, and without eating a following space: only an
					// opening marker consumes one, so `\sc*` before ` come` must leave it
					// or the words run together as "Jesuscome".
					const plain = (l: string) =>
						l
							.replace(/\\\+?[a-z0-9]+\*/g, '')
							.replace(/\\\+?[a-z0-9]+ ?/g, '')
							.replace(/\s+/g, ' ');
					// The preface chapter is introduction material, not a chapter
					// description, so its fragment lands in an \ip. Every other one
					// belongs in a \cd, and asserting the right marker per chapter
					// keeps this from passing on a fragment that went astray.
					const marker = chapter.chapter === PREFACE_CHAPTER ? '\\ip ' : '\\cd ';
					const carrier = lines.find((l) => l.startsWith(marker) && plain(l).includes(words));
					if (!carrier) missing.push(ref);
				}
			}
			expect(missing).toEqual([]);
			expect(carriers).toBe(49);
		}
	);

	// 10 of the 49 fragments carry notes and one carries cross-references; the
	// fold must move the apparatus, not only the words.
	it('keeps every verse-0 note and cross-reference in the bundle', () => {
		let notes = 0;
		let crossRefs = 0;
		const lost: string[] = [];
		for (const meta of ALL_BOOKS) {
			const { data: book } = readJson<any>(join(ODR_DIR, `${meta.slug}.json`));
			const usfm = renderUsfm(
				meta.slug,
				book,
				readAnnotations(meta.slug),
				{ includeAnnotations: false },
				meta.odrName
			);
			for (const chapter of book.chapters) {
				const zero = chapter.verses.find((v: any) => v.verse === 0);
				if (!zero) continue;
				for (const n of zero.notes ?? []) {
					notes++;
					if (!usfm.includes(n.text.replace(/\s+/g, ' '))) {
						lost.push(`${meta.slug} ${chapter.chapter}:0 note`);
					}
				}
				// Standalone \\xt, the one cross-reference form the \\cd content
				// model admits; an \\x note there is a hard parse error.
				for (const x of zero.cross_refs ?? []) {
					crossRefs++;
					if (!usfm.includes(`\\xt ${x.text}\\xt*`)) {
						lost.push(`${meta.slug} ${chapter.chapter}:0 xref ${x.text}`);
					}
				}
			}
		}
		expect(lost).toEqual([]);
		expect(notes).toBe(10);
		expect(crossRefs).toBe(5);
	});

	// renderUsfm throws on an unpinned repeat, so the whole-corpus render above
	// already proves the set is no larger than the pin. This asserts it is no
	// smaller either: a pin that stops matching anything is itself a defect.
	it('repeats a verse number at exactly the pinned refs', () => {
		const repeated = new Set<string>();
		for (const meta of ALL_BOOKS) {
			const { data: book } = readJson<any>(join(ODR_DIR, `${meta.slug}.json`));
			for (const c of book.chapters) {
				const seen = new Set<number>();
				for (const v of c.verses) {
					if (seen.has(v.verse)) repeated.add(`${meta.slug} ${c.chapter}:${v.verse}`);
					seen.add(v.verse);
				}
			}
		}
		expect([...repeated].sort()).toEqual([...KNOWN_DUPLICATE_VERSE].sort());
	});

	// 102 of the 106 <alt> spans anchor to an <na> and reach the reader as \fq
	// inside the footnote; the other four anchor to a <cr>, and the cross-
	// reference note's equivalent element is \xq. Asserting the count as well as
	// the four strings is what catches a fifth appearing or one of these being
	// re-anchored.
	it('renders every <cr>-anchored <alt> span as \\xq', () => {
		const expected: Record<string, string> = {
			matthew: '\\x - \\xq make \\xt Gen. 1, 27.\\x*',
			mark: '\\x - \\xq Esay the Prophet \\xt Esa. 40, 3.\\x*',
			acts: '\\x - \\xq to our children \\xt Ps. 2, 7.\\x*',
			jude: '\\x - \\xq which \\xt Gen. 4, 8.\\x*'
		};
		let total = 0;
		const missing: string[] = [];
		for (const meta of ALL_BOOKS) {
			const { data: book } = readJson<any>(join(ODR_DIR, `${meta.slug}.json`));
			const usfm = renderUsfm(
				meta.slug,
				book,
				readAnnotations(meta.slug),
				{ includeAnnotations: false },
				meta.odrName
			);
			total += usfm.split('\\xq ').length - 1;
			const want = expected[meta.slug];
			if (want && !usfm.includes(want)) missing.push(meta.slug);
		}
		expect(missing).toEqual([]);
		expect(total).toBe(4);
	});

	it('covers every book with a unique code', () => {
		expect(ALL_BOOKS).toHaveLength(76);
		expect(ALL_BOOKS.every((b) => BOOK_CODES[b.slug])).toBe(true);
	});
});
