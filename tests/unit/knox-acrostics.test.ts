import { describe, it, expect } from 'vitest';
import acrostics from '../../scripts/data/knox-acrostics.json';

/**
 * Knox reproduced the Hebrew alphabetic acrostics in English. The New Advent
 * HTML this data descends from marks each stanza's initial with <strong>, and
 * the conversion to JSON dropped the tag and left a space behind, so verses
 * arrived as "A h, blessed they".
 *
 * prepare-data closes those gaps from scripts/data/knox-acrostics.json, which
 * is generated from the markup. These tests check the shipped data against
 * that list, so a regeneration that loses the step fails here rather than in
 * the reader.
 *
 * The seven sites recorded as keeping their space are the reason the list
 * exists at all: "A far from wrong-doing" closes up while "A man who has found
 * a vigorous wife" does not, and no rule over the letters can tell them apart.
 */

interface Book {
	chapters?: Array<{ chapter: number; verses?: Array<{ verse: number; text?: string }> }>;
}

/** [chapter, verse, letter, following text, whether the letter joins it] */
type Site = [number, number, string, string, boolean];

const modules = import.meta.glob<Book>('../../static/data/knox/*.json', {
	eager: true,
	import: 'default'
});

const bySlug = new Map<string, Book>();
for (const [path, book] of Object.entries(modules)) {
	bySlug.set(path.slice(path.lastIndexOf('/') + 1, -'.json'.length), book);
}

const table = acrostics as unknown as Record<string, Site[]>;

function verseText(slug: string, chapter: number, verse: number): string {
	const book = bySlug.get(slug);
	const text = book?.chapters
		?.find((c) => c.chapter === chapter)
		?.verses?.find((v) => v.verse === verse)?.text;
	if (text === undefined) throw new Error(`knox ${slug} ${chapter}:${verse} not found`);
	return text;
}

describe('knox acrostic initials', () => {
	it('covers the four books that carry an acrostic', () => {
		expect(Object.keys(table).sort()).toEqual([
			'ecclesiasticus',
			'lamentations',
			'proverbs',
			'psalms'
		]);
	});

	it('has a site list that matches the markup it was generated from', () => {
		const all = Object.values(table).flat();
		expect(all.length).toBe(479);
		expect(all.filter((s) => s[4]).length).toBe(472);
	});

	it('closes the gap at every site the markup joins', () => {
		const stranded: string[] = [];
		for (const [slug, sites] of Object.entries(table)) {
			for (const [chapter, verse, letter, context, joins] of sites) {
				if (!joins) continue;
				const text = verseText(slug, chapter, verse);
				if (!text.includes(`<ac>${letter}</ac>${context}`)) {
					stranded.push(`${slug} ${chapter}:${verse} missing "${letter}${context}"`);
				}
				if (text.includes(`${letter} ${context}`)) {
					stranded.push(`${slug} ${chapter}:${verse} still split at "${letter} ${context}"`);
				}
			}
		}
		expect(stranded).toEqual([]);
	});

	it('tags every initial, including the ones that keep their space', () => {
		const untagged: string[] = [];
		for (const [slug, sites] of Object.entries(table)) {
			for (const [chapter, verse, letter, context, joins] of sites) {
				const text = verseText(slug, chapter, verse);
				if (!text.includes(`<ac>${letter}</ac>${joins ? '' : ' '}${context}`)) {
					untagged.push(`${slug} ${chapter}:${verse} "${letter}"`);
				}
			}
		}
		expect(untagged).toEqual([]);
	});

	it('tags exactly as many letters as the markup marks', () => {
		let tagged = 0;
		for (const book of bySlug.values())
			for (const c of book.chapters ?? [])
				for (const v of c.verses ?? []) tagged += (v.text?.match(/<ac>/g) ?? []).length;
		expect(tagged).toBe(479);
	});

	// The first generator located sites by searching for the bare letter, which
	// found the "m " inside "leave him still" and produced "leave himstill".
	it('never welds the initial onto the word before it', () => {
		const welded: string[] = [];
		for (const [slug, sites] of Object.entries(table)) {
			for (const [chapter, verse, letter, context, joins] of sites) {
				if (!joins) continue;
				const text = verseText(slug, chapter, verse);
				const at = text.indexOf(`<ac>${letter}</ac>${context}`);
				if (at > 0 && /[A-Za-z’']/.test(text[at - 1])) {
					welded.push(`${slug} ${chapter}:${verse} ${JSON.stringify(text.slice(at - 8, at + 10))}`);
				}
			}
		}
		expect(welded).toEqual([]);
	});

	it('leaves the space where the initial is a word in its own right', () => {
		const wrong: string[] = [];
		for (const [slug, sites] of Object.entries(table)) {
			for (const [chapter, verse, letter, context, joins] of sites) {
				if (joins) continue;
				const text = verseText(slug, chapter, verse);
				if (!text.includes(`<ac>${letter}</ac> ${context}`)) {
					wrong.push(`${slug} ${chapter}:${verse} lost the space at "${letter} ${context}"`);
				}
			}
		}
		expect(wrong).toEqual([]);
	});

	it('reads correctly at the cases a rule would get wrong', () => {
		expect(verseText('psalms', 118, 3)).toMatch(/^<ac>A<\/ac>far from wrong-doing/);
		expect(verseText('psalms', 118, 7)).toMatch(/^<ac>A<\/ac> true heart/);
		expect(verseText('proverbs', 31, 10)).toMatch(/^<ac>A<\/ac> man who has found/);
		// The H joins; the "I claim" later in the same verse must not.
		expect(verseText('psalms', 118, 57)).toBe(
			'<ac>H</ac>eritage, Lord, I claim no other, but to obey thy word.'
		);
	});

	it('joins an initial that falls mid-verse', () => {
		expect(verseText('psalms', 110, 1)).toContain('in praise, <ac>b</ac>efore the assembly');
		expect(verseText('ecclesiasticus', 51, 20)).toContain(
			'rejoiced at it. <ac>D</ac>own a straight path'
		);
	});
});
