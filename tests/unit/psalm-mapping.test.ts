import { describe, it, expect } from 'vitest';
import {
	kjvPsalmsForDr,
	precedingSplitSibling,
	alignDrPsalmToKjv,
	type KjvPsalmRef
} from '$lib/data/psalm-mapping';

/** Build the flattened KJV verse refs for a chapter of n verses. */
const refs = (chapter: number, n: number, from = 1): KjvPsalmRef[] =>
	Array.from({ length: n }, (_, i) => ({ chapter, verse: from + i }));

describe('kjvPsalmsForDr', () => {
	it('leaves the psalms both traditions agree on', () => {
		for (const n of [1, 2, 8, 148, 149, 150]) expect(kjvPsalmsForDr(n)).toEqual([n]);
	});

	it('offsets the long middle stretch by one', () => {
		expect(kjvPsalmsForDr(22)).toEqual([23]);
		expect(kjvPsalmsForDr(10)).toEqual([11]);
		expect(kjvPsalmsForDr(112)).toEqual([113]);
		expect(kjvPsalmsForDr(116)).toEqual([117]);
		expect(kjvPsalmsForDr(145)).toEqual([146]);
	});

	it('expands the psalms the Vulgate merged', () => {
		expect(kjvPsalmsForDr(9)).toEqual([9, 10]);
		expect(kjvPsalmsForDr(113)).toEqual([114, 115]);
	});

	it('points both halves of a split psalm at the same KJV psalm', () => {
		expect(kjvPsalmsForDr(114)).toEqual([116]);
		expect(kjvPsalmsForDr(115)).toEqual([116]);
		expect(kjvPsalmsForDr(146)).toEqual([147]);
		expect(kjvPsalmsForDr(147)).toEqual([147]);
	});
});

describe('precedingSplitSibling', () => {
	it('identifies the second half of a split psalm', () => {
		expect(precedingSplitSibling(115)).toBe(114);
		expect(precedingSplitSibling(147)).toBe(146);
	});

	it('returns null for everything else', () => {
		for (const n of [1, 9, 22, 113, 114, 146, 150]) {
			expect(precedingSplitSibling(n)).toBeNull();
		}
	});
});

describe('alignDrPsalmToKjv', () => {
	it('maps one-to-one when the verse counts agree', () => {
		// DR 22 has 23 verses, KJV 23 has 23.
		const m = alignDrPsalmToKjv({ drVerseCount: 6, kjvRefs: refs(23, 6) });
		expect(m.get(1)).toEqual({ chapter: 23, verse: 1 });
		expect(m.get(6)).toEqual({ chapter: 23, verse: 6 });
		expect(m.size).toBe(6);
	});

	it('gives DR verse 1 the KJV superscription and shifts the rest down', () => {
		const m = alignDrPsalmToKjv({
			drVerseCount: 7,
			kjvRefs: refs(51, 6),
			titleRef: { chapter: 51, verse: 0 }
		});
		expect(m.get(1)).toEqual({ chapter: 51, verse: 0 }); // DR v1 is the Hebrew title
		expect(m.get(2)).toEqual({ chapter: 51, verse: 1 });
		expect(m.get(7)).toEqual({ chapter: 51, verse: 6 });
	});

	// Psalm 2 is untitled in both traditions; the DR just divides a verse
	// differently. Inferring a title from the verse count slid it down a row.
	it('shifts nothing when the KJV psalm has no superscription', () => {
		const m = alignDrPsalmToKjv({ drVerseCount: 13, kjvRefs: refs(2, 12) });
		expect(m.get(1)).toEqual({ chapter: 2, verse: 1 });
		expect(m.get(2)).toEqual({ chapter: 2, verse: 2 });
		expect(m.size).toBe(12); // the extra DR verse runs off the end
	});

	it('shifts nothing when the verse counts already agree, title or not', () => {
		const m = alignDrPsalmToKjv({
			drVerseCount: 6,
			kjvRefs: refs(23, 6),
			titleRef: { chapter: 23, verse: 0 }
		});
		expect(m.get(1)).toEqual({ chapter: 23, verse: 1 });
		expect(m.size).toBe(6);
	});

	it('spans two KJV psalms for a merged DR psalm', () => {
		// DR 9 (39 verses) covers KJV 9 (20) + KJV 10 (18), plus a title verse.
		const kjvRefs = [...refs(9, 20), ...refs(10, 18)];
		const m = alignDrPsalmToKjv({
			drVerseCount: 39,
			kjvRefs,
			titleRef: { chapter: 9, verse: 0 }
		});
		expect(m.get(1)).toEqual({ chapter: 9, verse: 0 });
		expect(m.get(2)).toEqual({ chapter: 9, verse: 1 });
		expect(m.get(21)).toEqual({ chapter: 9, verse: 20 });
		expect(m.get(22)).toEqual({ chapter: 10, verse: 1 });
		expect(m.get(39)).toEqual({ chapter: 10, verse: 18 });
	});

	it('takes the leading slice for the first half of a split psalm', () => {
		// DR 114 (9 verses) is the opening of KJV 116 (19 verses).
		const m = alignDrPsalmToKjv({ drVerseCount: 9, kjvRefs: refs(116, 19) });
		expect(m.get(1)).toEqual({ chapter: 116, verse: 1 });
		expect(m.get(9)).toEqual({ chapter: 116, verse: 9 });
		expect(m.size).toBe(9);
	});

	it('skips the sibling’s share for the second half of a split psalm', () => {
		// DR 115 (10 verses) is the remainder of KJV 116 after DR 114's 9.
		const m = alignDrPsalmToKjv({
			drVerseCount: 10,
			kjvRefs: refs(116, 19),
			precedingSiblingVerseCount: 9
		});
		expect(m.get(1)).toEqual({ chapter: 116, verse: 10 });
		expect(m.get(10)).toEqual({ chapter: 116, verse: 19 });
		expect(m.size).toBe(10);
	});

	it('degrades gracefully when the divisions genuinely differ', () => {
		// DR 4 has 10 verses against KJV 4's 8: title plus one extra split.
		const m = alignDrPsalmToKjv({
			drVerseCount: 10,
			kjvRefs: refs(4, 8),
			titleRef: { chapter: 4, verse: 0 }
		});
		expect(m.get(1)).toEqual({ chapter: 4, verse: 0 }); // still treats v1 as the title
		expect(m.get(2)).toEqual({ chapter: 4, verse: 1 });
		expect(m.size).toBe(9); // trailing DR verses simply go unmapped
	});

	it('aligns from verse 1 when KJV has more verses than DR', () => {
		const m = alignDrPsalmToKjv({ drVerseCount: 10, kjvRefs: refs(16, 11) });
		expect(m.get(1)).toEqual({ chapter: 16, verse: 1 });
		expect(m.size).toBe(10);
	});

	it('returns an empty map when there are no KJV verses', () => {
		expect(alignDrPsalmToKjv({ drVerseCount: 5, kjvRefs: [] }).size).toBe(0);
	});
});
