import { describe, it, expect } from 'vitest';
import { formatTrailingCitation } from '$lib/utils/text';

/**
 * formatTrailingCitation pulls a citation off the end of a note and sets it on
 * its own line. Its second pattern matched a run of abbreviated segments with
 * (?:[^<.]*\.\s*){2,}, where [^<.]* and \s* can both consume a space. Every
 * space in the run could therefore be matched two ways, so a citation of n
 * segments had 2^n paths to explore before the pattern could fail.
 *
 * Genesis carries one of 30 segments in the "Sum and Partition" introduction,
 * which froze the tab for good: no error, just a wedged main thread.
 */

/** The note that hung the study panel, from static/data/odr/genesis.json. */
const GENESIS_SUM_NOTE_10 =
	'<i>Conc. Carth. An. D. 419. Conc. Laodic. cap. 59. Florent. Instruct. Armen. ' +
	'decret. 7. Trident. Sess. 4. S. Atha. in Synop. S. Aug. li. 2. doct. Christ. ' +
	'c. 8. Isidor. li. 6. Etymol. c. 1. & alibi. Nicep. l. 4. cap. 15. Euseb. l. 5. c. 8.</i>';

/** Returns the call's duration alongside its result. */
function timed(input: string): { ms: number; out: string } {
	const start = performance.now();
	const out = formatTrailingCitation(input);
	return { ms: performance.now() - start, out };
}

describe('formatTrailingCitation', () => {
	it('returns promptly on a long run of abbreviated citations', () => {
		const { ms } = timed(GENESIS_SUM_NOTE_10);
		expect(ms).toBeLessThan(100);
	});

	it('leaves that note alone, having no sentence before the citation', () => {
		expect(formatTrailingCitation(GENESIS_SUM_NOTE_10)).toBe(GENESIS_SUM_NOTE_10);
	});

	it('stays prompt as the run of segments grows', () => {
		// Doubling the segments would double the runtime; it must not square it.
		const many = 'A sentence here. S. ' + 'Aug. li. 2. '.repeat(40) + 'c. 8.';
		const { ms } = timed(many);
		expect(ms).toBeLessThan(100);
	});

	it('still lifts a trailing abbreviated citation onto its own line', () => {
		const out = formatTrailingCitation('The thing is so said. S. Aug. li. 2. doct. Christ. c. 8.');
		expect(out).toContain('note-citation');
		expect(out).toContain('The thing is so said.<br />');
	});

	it('still lifts a trailing italic citation onto its own line', () => {
		const out = formatTrailingCitation('The thing is so said. <i>S. Augustin de civ. Dei.</i>');
		expect(out).toContain('note-citation');
		expect(out).toContain('<i>S. Augustin de civ. Dei.</i>');
	});

	it('leaves ordinary prose untouched', () => {
		const plain = 'A sentence with no citation at the end of it at all.';
		expect(formatTrailingCitation(plain)).toBe(plain);
	});
});
