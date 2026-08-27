import { describe, it, expect } from 'vitest';
import { highlightLemmas, lemmasForPart } from '../../src/lib/utils/lemmas';
import type { LemmaSpan } from '../../src/lib/data/types';

/** Both fixtures are the verse and the spans as the corpus records them. */
const LUKE_1_28 =
	'And the Angel being entered in, said unto her: <na>[1]</na> <i><sc>Hail</sc> full of grace, our Lord is with thee: blessed art thou among women.</i>';
const LUKE_1_28_SPANS: LemmaSpan[] = [
	[63, 27, 1],
	[77, 13, 2]
];

const ISAIE_32_1 =
	'Behold <na>[1]</na> the king shall reign in justice, & the princes shall rule in judgement.';
const ISAIE_32_1_SPANS: LemmaSpan[] = [
	[20, 20, 1],
	[35, 55, 2]
];

/** The text of each mark in order, with the depth it was given. */
function runs(html: string): Array<[string, string]> {
	return [...html.matchAll(/<mark class="lemma"[^>]*data-depth="(\d)">([\s\S]*?)<\/mark>/g)].map(
		(m) => [m[2], m[1]]
	);
}

describe('highlightLemmas', () => {
	it('leaves a verse with no spans exactly as it was', () => {
		expect(highlightLemmas(ISAIE_32_1, [], 1, true)).toBe(ISAIE_32_1);
	});

	it('marks the words the catchword quotes and nothing either side', () => {
		const html = highlightLemmas(ISAIE_32_1, [ISAIE_32_1_SPANS[0]], 1, true);
		expect(runs(html)).toEqual([['the king shall reign', '1']]);
		expect(html.startsWith('Behold <na>[1]</na> <mark')).toBe(true);
	});

	it('deepens a run two catchwords both cover instead of nesting', () => {
		// "Hail full of grace" and "full of grace" are two annotations on Luke 1:28
		expect(runs(highlightLemmas(LUKE_1_28, LUKE_1_28_SPANS, 28, true))).toEqual([
			['<sc>Hail</sc> ', '1'],
			['full of grace', '2']
		]);
	});

	it('renders a crossing pair that no nesting could express', () => {
		// Isaie 32:1 is the only one in the corpus: the two share "reign" and
		// neither contains the other.
		expect(runs(highlightLemmas(ISAIE_32_1, ISAIE_32_1_SPANS, 1, true))).toEqual([
			['the king shall ', '1'],
			['reign', '2'],
			[' in justice, & the princes shall rule in judgement', '1']
		]);
	});

	it('gives the click to the narrowest catchword over the run', () => {
		const html = highlightLemmas(LUKE_1_28, LUKE_1_28_SPANS, 28, true);
		const parts = [...html.matchAll(/data-marker="(\d)"/g)].map((m) => m[1]);
		expect(parts).toEqual(['1', '2']);
	});

	it('tints without offering a click when there is no panel to open', () => {
		const html = highlightLemmas(ISAIE_32_1, ISAIE_32_1_SPANS, 1, false);
		expect(html).not.toContain('data-marker-type');
		expect(runs(html)).toHaveLength(3);
	});

	it('keeps every tag it wraps balanced', () => {
		for (const [text, spans] of [
			[LUKE_1_28, LUKE_1_28_SPANS],
			[ISAIE_32_1, ISAIE_32_1_SPANS]
		] as Array<[string, LemmaSpan[]]>) {
			for (const [run] of runs(highlightLemmas(text, spans, 1, true))) {
				const open = (run.match(/<(?!\/)[a-z]/g) ?? []).length;
				const close = (run.match(/<\//g) ?? []).length;
				expect(open).toBe(close);
			}
		}
	});
});

describe('lemmasForPart', () => {
	const spans: LemmaSpan[] = [
		[5, 10, 1],
		[40, 6, 2]
	];

	it('drops what falls outside the part and rebases what does not', () => {
		expect(lemmasForPart(spans, 0, 20)).toEqual([[5, 10, 1]]);
		expect(lemmasForPart(spans, 30, 20)).toEqual([[10, 6, 2]]);
	});

	it('tints both halves of a catchword split across a line break', () => {
		expect(lemmasForPart(spans, 0, 10)).toEqual([[5, 5, 1]]);
		expect(lemmasForPart(spans, 10, 10)).toEqual([[0, 5, 1]]);
	});

	it('returns nothing for a part the catchword never reaches', () => {
		expect(lemmasForPart(spans, 20, 10)).toEqual([]);
	});
});
