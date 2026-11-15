import { describe, it, expect } from 'vitest';
import { FONTS } from '../../src/lib/data/fonts';

// The latin subsets of the reader fonts carry neither the long s nor the printer's
// abbreviation marks (y + U+0364 / U+036D). app.css declares 'Gentium Plus Marks', a face
// limited to those three code points; every stack must name it so they never fall through to tofu.
describe('original-spelling glyph fallback', () => {
	it('puts the marks face in every reader font stack', () => {
		for (const f of FONTS) expect(f.stack, f.id).toContain("'Gentium Plus Marks'");
	});
});
