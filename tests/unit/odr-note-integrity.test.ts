import { describe, it, expect } from 'vitest';

/**
 * Guards against a data defect where an annotation's notes bleed into a nearby
 * verse: the verse gains spurious <na> markers, and its note texts end up
 * holding a copy of the verse's own body text.
 *
 * Genesis 16:6 was the reported case. Its notes were byte-identical copies of
 * Genesis 16:3's annotation notes, whose legitimate home is the sidecar in
 * static/data/odr/genesis/annotations/016.json. Real verse notes in this corpus
 * use letter labels — "(a)" — while the injected markers used the annotation
 * numbering style, "[1]".
 */

interface Verse {
	verse: number;
	text?: string;
	notes?: Array<{ label?: string; text?: string }>;
}

interface Book {
	chapters?: Array<{ chapter: number; verses?: Verse[] }>;
}

const books = import.meta.glob<Book>('../../static/data/odr/*.json', {
	eager: true,
	import: 'default'
});

const genesis = books['../../static/data/odr/genesis.json'];

const genesisAnnotations = import.meta.glob<{
	annotations: Array<{ verse: number; notes?: Array<{ marker: number; text: string }> }>;
}>('../../static/data/odr/genesis/annotations/016.json', { eager: true, import: 'default' })[
	'../../static/data/odr/genesis/annotations/016.json'
];

const stripTags = (s: string) => s.replace(/<[^>]+>/g, '');

function slugOf(path: string): string {
	return path.slice(path.lastIndexOf('/') + 1, -5);
}

describe('ODR verse note integrity', () => {
	it('loads the whole ODR corpus', () => {
		expect(Object.keys(books).length).toBeGreaterThan(70);
		expect(genesis?.chapters).toBeDefined();
	});

	it('no verse note repeats a long run of its own verse body', () => {
		const offenders: string[] = [];

		for (const [path, book] of Object.entries(books)) {
			if (!book?.chapters) continue;
			for (const ch of book.chapters) {
				for (const verse of ch.verses ?? []) {
					const body = stripTags((verse.text ?? '').replace(/<na>.*?<\/na>/g, '')).trim();
					if (body.length <= 40) continue;

					for (const note of verse.notes ?? []) {
						const noteText = stripTags(note.text ?? '').trim();
						if (noteText.length <= 40) continue;
						if (body.includes(noteText.slice(-60))) {
							offenders.push(`${slugOf(path)} ${ch.chapter}:${verse.verse}`);
							break;
						}
					}
				}
			}
		}

		expect(offenders).toEqual([]);
	});

	it('Genesis 16:6 carries neither the spurious markers nor the copied notes', () => {
		const ch = genesis.chapters!.find((c) => c.chapter === 16)!;
		const v6 = ch.verses!.find((v) => v.verse === 6)!;

		expect(v6.text).not.toMatch(/<na>/);
		expect(v6.notes ?? []).toEqual([]);
		expect(v6.text).toContain('To whom Abram making answer');
	});

	it('Genesis 16:4 keeps its own legitimate lettered note', () => {
		const ch = genesis.chapters!.find((c) => c.chapter === 16)!;
		const v4 = ch.verses!.find((v) => v.verse === 4)!;

		expect(v4.text).toContain('<na>(a)</na>');
		expect(v4.notes).toHaveLength(1);
		expect(v4.notes![0].label).toBe('a');
	});

	it('Isaie 58:6 no longer carries the annotation bleed from 58:5', () => {
		const isaie = books['../../static/data/odr/isaie.json'];
		const ch = isaie.chapters!.find((c) => c.chapter === 58)!;
		const v6 = ch.verses!.find((v) => v.verse === 6)!;

		expect(v6.text).not.toMatch(/<na>/);
		expect(v6.notes ?? []).toEqual([]);
	});

	it('the three clobbered marginal notes carry their printed text', () => {
		const cases: Array<[string, number, number, string, string]> = [
			[
				'1-machabees',
				15,
				35,
				'c',
				'Simon subdued these two towns because they annoyed the Jews: but because they otherwise pertained not to Jury he payed for them an hundred talents.'
			],
			[
				'leviticus',
				2,
				11,
				'b',
				'As literally no leaven nor honey might be offered in sacrifice: so all sin and carnal delectation must be excluded in Christian life.'
			],
			[
				'proverbs',
				30,
				15,
				'e',
				'Concupiscence of the flesh, & of the eyes. Envy, Luxury, Avarice, & Ambition.'
			]
		];

		for (const [slug, chapter, verseNum, label, text] of cases) {
			const book = books[`../../static/data/odr/${slug}.json`];
			const ch = book.chapters!.find((c) => c.chapter === chapter)!;
			const verse = ch.verses!.find((v) => v.verse === verseNum)!;

			expect(verse.notes, `${slug} ${chapter}:${verseNum}`).toHaveLength(1);
			expect(verse.notes![0].label).toBe(label);
			expect(verse.notes![0].text).toBe(text);
			// The marker itself is genuine here and must survive.
			expect(verse.text).toContain(`<na>(${label})</na>`);
		}
	});

	it("Genesis 16:3's annotation notes remain intact in their own sidecar", () => {
		const entry = genesisAnnotations.annotations.find((a) => a.verse === 3)!;

		expect(entry.notes).toHaveLength(11);
		expect(entry.notes![0].text).toBe('Manichees condemned plurality of wives in the Patriarchs.');
		expect(entry.notes![5].text).toBe('Two sorts of precepts in the law of nature.');
	});
});
