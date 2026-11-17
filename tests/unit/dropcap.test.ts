import { describe, it, expect } from 'vitest';
import { injectDropcap } from '../../src/lib/utils/dropcap';
import { allcapsToSmallcaps } from '../../src/lib/utils/text';

describe('injectDropcap', () => {
	it('wraps the first letter of plain text', () => {
		expect(injectDropcap('And it came to pass')).toBe(
			'<span class="dropcap">A</span>nd it came to pass'
		);
	});

	it('pulls the letter out of an opening small-caps run, leaving the rest in small caps', () => {
		// Genesis 1:1 — the print reads "IN THE beginning": drop cap I, then "N THE" in small caps.
		const html = allcapsToSmallcaps('<sc>In</sc> <cr>[1]</cr> <sc>the</sc> beginning');
		expect(injectDropcap(html)).toBe(
			'<span class="dropcap">I</span><span class="sc">n</span> <cr>[1]</cr> <span class="sc">the</span> beginning'
		);
	});

	it('caps the first letter after a leading study-mode marker button', () => {
		// Matthew 1:1 in original spelling: the margin gloss has no printed mark,
		// so its button opens the verse, before "THE booke".
		const btn = '<button class="study-marker" data-marker-type="note" data-marker="2">◦</button>';
		expect(injectDropcap(`${btn} <span class="sc">The</span> booke`)).toBe(
			`${btn} <span class="dropcap">T</span><span class="sc">he</span> booke`
		);
	});

	it('keeps a run split by a study-mode marker button in one case', () => {
		const btn =
			'<button class="study-marker" data-marker="1" aria-label="Cross-reference 1">1</button>';
		expect(allcapsToSmallcaps(`IN ${btn} THE beginning`)).toBe(
			`<span class="sc">In</span> ${btn} <span class="sc">the</span> beginning`
		);
	});

	it('still capitalises a new run after ordinary words', () => {
		expect(allcapsToSmallcaps('said <sc>THE LORD</sc>, and <sc>GOD</sc>')).toBe(
			'said <span class="sc">The Lord</span>, and <span class="sc">God</span>'
		);
	});

	it('does the same for the original spelling, whose opening run is bare capitals', () => {
		const html = allcapsToSmallcaps('IN THE beginning');
		expect(injectDropcap(html)).toBe(
			'<span class="dropcap">I</span><span class="sc">n the</span> beginning'
		);
	});

	it('drops the small-caps span when the cap was its only letter', () => {
		expect(injectDropcap('<span class="sc">A</span> Psalm')).toBe(
			'<span class="dropcap">A</span> Psalm'
		);
	});

	it('hoists the cap out in front of a catchword mark, through a small-caps run', () => {
		const html = '<mark class="lemma" data-x="1"><span class="sc">The</span> book</mark> of';
		expect(injectDropcap(html)).toBe(
			'<span class="dropcap">T</span><mark class="lemma" data-x="1"><span class="sc">he</span> book</mark> of'
		);
	});
});
