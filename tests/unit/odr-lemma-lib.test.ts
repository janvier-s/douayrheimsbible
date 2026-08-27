import { describe, it, expect } from 'vitest';
import {
	resolveLemma,
	resolvePartialLemma,
	catchwordVariants,
	stripMarkup,
	snapToBalance
} from '../../scripts/odr-lemma-lib';

/** The span a resolver result covers, so a test can assert on what a reader
 *  would see tinted rather than on two integers. */
function highlighted(verse: string, title: string): string | null {
	const span = resolveLemma(title, verse);
	return span ? verse.slice(span.start, span.start + span.length) : null;
}

describe('stripMarkup', () => {
	it('drops marker tags with their content but keeps worded elements', () => {
		const { plain } = stripMarkup('In <cr>[1]</cr> the beginning <sc>GOD</sc> created heaven.');
		expect(plain).toBe('In  the beginning GOD created heaven.');
	});

	it('maps every surviving character back to the raw text', () => {
		const raw = 'a <i>b</i> c';
		const { plain, map } = stripMarkup(raw);
		for (let i = 0; i < plain.length; i++) expect(raw[map[i]]).toBe(plain[i]);
	});
});

describe('catchwordVariants', () => {
	it('splits a title that quotes two places in the verse', () => {
		expect(catchwordVariants('Whose sins are covered. 2. not imputed.')).toEqual([
			'whose sins are covered',
			'not imputed'
		]);
	});

	it('drops a trailing &c. rather than reading it as a word', () => {
		expect(catchwordVariants('Thy works, labour, patience, &c.')).toEqual([
			'thy works labour patience'
		]);
	});

	it('offers a spelled-out form for a title that sets a figure', () => {
		expect(catchwordVariants('To the 7 Churches.')).toContain('to the seven churches');
	});
});

describe('resolveLemma', () => {
	it('anchors a phrase quoted verbatim', () => {
		const verse =
			'<na>[1]</na> <i>Glory in the highest to God: and in earth peace to men of good will.</i>';
		expect(highlighted(verse, 'Men of good will.')).toBe('men of good will');
	});

	it('reads the 1582 ampersand as the word the title spells out', () => {
		const verse =
			'<i>Behold a Virgin shall be with child, & bring forth a son, and they shall call his name Emmanuel,</i> <cr>[1]</cr> which being interpreted is, God with us.';
		expect(highlighted(verse, 'And bring forth.')).toBe('& bring forth');
	});

	it('covers the whole quotation when the title skips words', () => {
		const verse =
			'The rest of the dead lived not, till the thousand years be consummate. This is the first resurrection.';
		expect(highlighted(verse, 'The rest lived not.')).toBe('The rest of the dead lived not');
	});

	it('matches across a difference of spelling', () => {
		const verse =
			'And behold Elizabeth thy cousin, she also hath conceived a Son in her old age; and this month, is the sixth to her that is called barren;';
		const span = resolveLemma('Elisabeth thy Cousin.', verse);
		expect(span?.tier).toBe('fuzzy');
		expect(highlighted(verse, 'Elisabeth thy Cousin.')).toBe('Elizabeth thy cousin');
	});

	it('widens a span that ends inside an element so the mark can wrap it', () => {
		const verse =
			'saith he that giveth testimony of these things. Yea I come quickly: Amen. Come Lord <sc>Jesus</sc>.';
		expect(highlighted(verse, 'Come Lord Jesus.')).toBe('Come Lord <sc>Jesus</sc>');
	});

	it('keeps a marker that falls inside the quoted phrase', () => {
		const verse = 'In <cr>[1]</cr> the beginning <sc>GOD</sc> created heaven and earth.';
		expect(highlighted(verse, 'In the beginning.')).toBe('In <cr>[1]</cr> the beginning');
	});

	it('anchors the first half of a two-part title', () => {
		const verse =
			'Blessed is the man, to whom <na>(d)</na> our Lord hath not imputed sin, neither is there <na>(e)</na> guile in his spirit.';
		expect(highlighted(verse, 'Whose sins are covered. 2. not imputed.')).toBe('not imputed');
	});

	it('returns null rather than guess when the title paraphrases', () => {
		const verse = 'and all the brethren that are with me; to the churches of Galatia.';
		expect(resolveLemma('Or an Angel.', verse)).toBeNull();
	});

	it('refuses a near-miss on a short word', () => {
		expect(resolveLemma('Him only.', 'his only son')).toBeNull();
	});
});

describe('snapToBalance', () => {
	it('leaves a span whose markup already balances', () => {
		const raw = 'a <i>b</i> c';
		expect(snapToBalance(raw, 0, raw.length - 1)).toEqual([0, raw.length - 1]);
	});
});

describe('the gap limit', () => {
	it('follows a catchword that leaves out six words', () => {
		const verse =
			'And he commanded him saying: Of every tree of Paradise thou shalt eat: but of the tree of knowledge of good and evil eat thou not.';
		expect(resolveLemma('Of the tree eat thou not.', verse)?.tier).toBe('gapped');
	});

	it('refuses a span that would swallow a negation the catchword omits', () => {
		const verse =
			'He that believeth in him, is not judged: but he that doth not believe, is already judged: because he believeth not in the name of the only-begotten Son of God.';
		expect(resolveLemma('Is judged already.', verse)).toBeNull();
	});

	it('refuses a span that stretches across a whole clause', () => {
		const verse =
			'For the law brought nothing to perfection: but an introduction of a better hope, by which we approach to God.';
		expect(resolveLemma('The introduction.', verse)).toBeNull();
	});
});

describe('the partial tier', () => {
	/** What a reader would see tinted when the strict tiers have all declined. */
	function loosely(verse: string, title: string): string | null {
		expect(resolveLemma(title, verse)).toBeNull();
		const span = resolvePartialLemma(title, verse);
		return span ? verse.slice(span.start, span.start + span.length) : null;
	}

	it('follows a catchword that quotes in a different person', () => {
		const verse =
			'For our obedience is published into every place. I rejoice therefore in you. But I would have you to be wise in good, and simple in evil.';
		const span = resolveLemma('Your obedience.', verse);
		expect(span?.tier).toBe('fuzzy');
		expect(verse.slice(span!.start, span!.start + span!.length)).toBe('our obedience');
	});

	it('reaches a reflexive the strict tiers cannot, the rest of the title missing', () => {
		const verse = 'But if we did judge ourselves, we should not be judged.';
		expect(loosely(verse, 'Judge your-selves.')).toBe('judge ourselves');
	});

	it('picks the clause the catchword quotes over the one it reads like', () => {
		const verse =
			'He that believeth in him, is not judged. But he that doth not believe, is already judged: because he hath not believed in the name of the only-begotten Son of God.';
		expect(loosely(verse, 'Is judged already.')).toBe('is already judged');
	});

	it('spans a list the verse spells out and the title names', () => {
		const verse =
			'The residue of the eruke hath the locust eaten, and the residue of the locust hath the bruke eaten, and the residue of the bruke hath the blast eaten.';
		expect(loosely(verse, 'The residue of the eruke, locust, bruke, blast.')).toBe(
			'The residue of the eruke hath the locust eaten, and the residue of the locust hath the bruke eaten, and the residue of the bruke hath the blast'
		);
	});

	it('keeps the narrow window when the wide one reaches nothing new', () => {
		const verse =
			'Nothing is without a man entering into him, that can defile him. But the things that proceed from a man those are they that make a man <na>[1]</na> common.';
		expect(loosely(verse, 'Nothing entering into a man.')).toBe(
			'Nothing is without a man entering'
		);
	});

	it('ends the span on the last word the catchword quotes', () => {
		const verse =
			'Woe be to thee Corozain, woe be to thee Beth-saida: for if in Tyre & Sidon had been wrought the miracles that have been wrought in you, they had done penance in hair-cloth & ashes long ago.';
		expect(loosely(verse, 'Penance in sackcloth.')).toBe('penance');
	});

	it('takes a lone content word when it is the whole of what the title names', () => {
		const verse =
			'For the Law brought nothing to perfection, but an introduction of a better hope, by the which we approach to God.';
		expect(loosely(verse, 'The introduction.')).toBe('introduction');
	});

	it('takes a listed equivalence the spelling measure cannot reach', () => {
		const verse =
			'And casting down the silver pieces in the temple, he departed: and went and hanged himself with an halter.';
		const span = resolveLemma('Hung himself.', verse);
		expect(verse.slice(span!.start, span!.start + span!.length)).toBe('hanged himself');
	});

	it('refuses when nothing the title names is in the verse', () => {
		const verse = 'And they received him not, because his face was to go to Jerusalem.';
		expect(loosely(verse, 'The seven golden candlesticks.')).toBeNull();
	});

	it('snaps a partial span out of the markup it lands inside', () => {
		const verse =
			'Woe unto them, <cr>[1]</cr> <alt>which</alt> have gone in the way of <na>[2]</na> Cain: and with the error of <na>[3]</na> Balaam, have for reward poured out themselves, and have perished in the contradiction of Core.';
		const span = resolvePartialLemma('Cain, Balaam, Core.', verse);
		const text = verse.slice(span!.start, span!.start + span!.length);
		expect(text.startsWith('Cain')).toBe(true);
		expect(text.endsWith('Core')).toBe(true);
		expect(text.match(/<na>/g)?.length).toBe(text.match(/<\/na>/g)?.length);
	});
});
