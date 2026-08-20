import { describe, it, expect } from 'vitest';
import { splitAnnotationParagraphs } from '$lib/utils/text';

describe('splitAnnotationParagraphs', () => {
	it('splits on blank lines', () => {
		expect(splitAnnotationParagraphs('First para.\n\nSecond para.')).toEqual([
			'First para.',
			'Second para.'
		]);
	});

	it('folds a stranded marker into the paragraph that follows', () => {
		// James 2:24 in the ODR corpus, condensed.
		const raw =
			'Of which thing else-where there is enough said.\n\n<mn>◦</mn>\n\nThe fathers indeed use sometimes this exclusive.';

		expect(splitAnnotationParagraphs(raw)).toEqual([
			'Of which thing else-where there is enough said.',
			'<mn>◦</mn> The fathers indeed use sometimes this exclusive.'
		]);
	});

	it('folds a stranded numeric marker too', () => {
		const raw = 'Ending here.\n\n<mn>[1]</mn>\n\nAnd lastly, plainly.';

		expect(splitAnnotationParagraphs(raw)).toEqual([
			'Ending here.',
			'<mn>[1]</mn> And lastly, plainly.'
		]);
	});

	it('folds several stranded markers sharing one blank-line block', () => {
		const raw = 'Ending here.\n\n<mn>[1]</mn> <mn>[2]</mn>\n\nNext paragraph.';

		expect(splitAnnotationParagraphs(raw)).toEqual([
			'Ending here.',
			'<mn>[1]</mn> <mn>[2]</mn> Next paragraph.'
		]);
	});

	it('folds consecutive stranded marker blocks into the same paragraph', () => {
		const raw = 'Ending here.\n\n<mn>[1]</mn>\n\n<mn>◦</mn>\n\nNext paragraph.';

		expect(splitAnnotationParagraphs(raw)).toEqual([
			'Ending here.',
			'<mn>[1]</mn> <mn>◦</mn> Next paragraph.'
		]);
	});

	it('leaves a marker that already opens its paragraph untouched', () => {
		const raw = '<mn>◦</mn> He meaneth not that whosoever is a thief.';

		expect(splitAnnotationParagraphs(raw)).toEqual([raw]);
	});

	it('leaves mid-paragraph markers untouched', () => {
		const raw = 'by charity, <mn>[2]</mn> as he expoundeth himself.';

		expect(splitAnnotationParagraphs(raw)).toEqual([raw]);
	});

	it('keeps a trailing stranded marker rather than dropping it', () => {
		const raw = 'A paragraph.\n\n<mn>◦</mn>';

		expect(splitAnnotationParagraphs(raw)).toEqual(['A paragraph.', '<mn>◦</mn>']);
	});

	it('drops empty segments from runs of blank lines', () => {
		expect(splitAnnotationParagraphs('One.\n\n\n\nTwo.')).toEqual(['One.', 'Two.']);
	});

	it('trims surrounding whitespace on each paragraph', () => {
		expect(splitAnnotationParagraphs('  One.  \n\n  Two.  ')).toEqual(['One.', 'Two.']);
	});

	it('returns nothing for empty input', () => {
		expect(splitAnnotationParagraphs('')).toEqual([]);
	});
});
