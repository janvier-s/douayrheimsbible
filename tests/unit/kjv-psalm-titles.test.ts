import { describe, it, expect } from 'vitest';
import titles from '../../scripts/data/kjv-psalm-titles.json';

/**
 * The KJV prints a psalm's superscription as an unnumbered heading above verse
 * 1, and its USFM carries it as a \d marker. The conversion that produced
 * static/data/kjv dropped it, so the compare view had nothing to put on the row
 * where the Douay-Rheims prints its own title as verse 1.
 *
 * prepare-data restores them from scripts/data/kjv-psalm-titles.json as verse
 * 0, the convention the ODR data already uses for text belonging to a chapter
 * rather than a numbered verse. Calling it verse 1 would put every later
 * citation out by one.
 */

interface Book {
	chapters?: Array<{ chapter: number; verses?: Array<{ verse: number; text?: string }> }>;
}

const modules = import.meta.glob<Book>('../../static/data/kjv/psalms.json', {
	eager: true,
	import: 'default'
});
const psalms = Object.values(modules)[0];
const table = titles as unknown as Record<string, string>;

const chapter = (n: number) => psalms.chapters?.find((c) => c.chapter === n);
const title = (n: number) => chapter(n)?.verses?.find((v) => v.verse === 0)?.text;

describe('kjv psalm superscriptions', () => {
	it('carries the 116 titles the USFM marks', () => {
		expect(Object.keys(table).length).toBe(116);
	});

	it('puts every one of them in the data as verse 0', () => {
		const missing: string[] = [];
		for (const [ch, text] of Object.entries(table)) {
			if (title(Number(ch)) !== text) missing.push(`psalm ${ch}`);
		}
		expect(missing).toEqual([]);
	});

	it('adds a title to no psalm the USFM leaves untitled', () => {
		const spurious: number[] = [];
		for (const c of psalms.chapters ?? []) {
			const has = c.verses?.some((v) => v.verse === 0);
			if (has && !(String(c.chapter) in table)) spurious.push(c.chapter);
		}
		expect(spurious).toEqual([]);
	});

	it('leaves the untitled psalms untitled', () => {
		// Psalms 1, 2, 10 and 33 have no superscription in Hebrew.
		for (const n of [1, 2, 10, 33]) expect(title(n)).toBeUndefined();
	});

	it('keeps verse 1 as the first line of the psalm proper', () => {
		expect(chapter(38)?.verses?.find((v) => v.verse === 1)?.text).toMatch(/^O .?LORD.?, rebuke me/);
		expect(title(38)).toBe('A Psalm of David, to bring to remembrance.');
	});

	it('strips the USFM markup from the title text', () => {
		const dirty = Object.entries(table).filter(([, t]) => /[\\*|]|strong=/.test(t));
		expect(dirty).toEqual([]);
	});
});
