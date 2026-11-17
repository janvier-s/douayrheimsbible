import { describe, expect, it } from 'vitest';
import { printNoteMark, printNoteMarks } from '$lib/utils/printMarks';

describe('printNoteMark', () => {
	it('marks a gloss or word note with ∷', () => {
		expect(printNoteMark({ label: '1', text: 'de qua.', kind: 'gloss' })).toBe('∷');
		expect(printNoteMark({ label: '1', text: 'λατρέυουσα.', kind: 'word' })).toBe('∷');
	});

	it('gives notes the print leaves unmarked a ◦', () => {
		expect(printNoteMark({ label: '1', text: 'The Goſpel vpon…', kind: 'lectionary' })).toBe('◦');
		expect(printNoteMark({ label: '1', text: 'THE 3 VISION.', kind: 'head' })).toBe('◦');
		expect(printNoteMark({ label: '2', text: 'This Goſpel…', kind: 'gloss', unmarked: true })).toBe(
			'◦'
		);
		expect(printNoteMark({ label: '1', text: '…', kind: 'gloss', table_only: true })).toBe('◦');
	});

	it('maps labels to marks for a verse', () => {
		const m = printNoteMarks([
			{ label: '1', text: 'a', kind: 'gloss' },
			{ label: '2', text: 'b', kind: 'lectionary' }
		]);
		expect(m.get('1')).toBe('∷');
		expect(m.get('2')).toBe('◦');
	});
});
