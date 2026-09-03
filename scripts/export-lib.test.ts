// scripts/export-lib.test.ts
// Unit tests for the pure export helpers. Fixtures are hand-written so a
// corpus edit cannot quietly change what these assert; the corpus itself is
// covered by export.corpus.test.ts.

import { describe, it, expect } from 'vitest';
import {
	tokenize,
	ExportError,
	parseMarkerTokens,
	bindMarkers,
	assertOnlyKnownDefects,
	KNOWN_UNBOUND,
	KNOWN_UNREFERENCED,
	KNOWN_UNBALANCED,
	balanceInline,
	stripMarkup,
	BOOK_CODES,
	usfmFilename,
	renderVerse,
	renderAnnotation,
	renderUsfm,
	assertSafeOutDir
} from './export-lib';

describe('tokenize', () => {
	it('splits text and tags, recording offsets into the tagged string', () => {
		const nodes = tokenize('a <i>b</i> c', 'verse', 'test 1:1');
		expect(nodes).toEqual([
			{ kind: 'text', value: 'a ', start: 0 },
			{ kind: 'tag', name: 'i', close: false, content: '', start: 2, length: 3 },
			{ kind: 'text', value: 'b', start: 5 },
			{ kind: 'tag', name: 'i', close: true, content: '', start: 6, length: 4 },
			{ kind: 'text', value: ' c', start: 10 }
		]);
	});

	it('captures marker content', () => {
		const nodes = tokenize('x <na>[1]</na>', 'verse', 'test 1:1');
		const tag = nodes.find((n) => n.kind === 'tag' && !n.close);
		expect(tag).toMatchObject({ name: 'na', content: '[1]' });
	});

	it('treats <br> as void', () => {
		const nodes = tokenize('a<br>b', 'prose', 'test intro');
		expect(nodes.filter((n) => n.kind === 'tag')).toHaveLength(1);
	});

	it('rejects a tag outside the vocabulary', () => {
		expect(() => tokenize('a <b>x</b>', 'verse', 'test 1:1')).toThrow(ExportError);
	});

	it('rejects <mn> in a verse and <na> in prose', () => {
		expect(() => tokenize('a <mn>[1]</mn>', 'verse', 'test 1:1')).toThrow(/mn/);
		expect(() => tokenize('a <na>[1]</na>', 'prose', 'test intro')).toThrow(/na/);
	});

	it('rejects an unbalanced tag', () => {
		expect(() => tokenize('a <i>b', 'verse', 'test 1:1')).toThrow(/unclosed/);
	});
});

describe('parseMarkerTokens', () => {
	it('reads a bracketed number', () => {
		expect(parseMarkerTokens('[1]')).toEqual(['1']);
	});

	it('reads a parenthesised letter', () => {
		expect(parseMarkerTokens('(a)')).toEqual(['a']);
	});

	it('reads a ring', () => {
		expect(parseMarkerTokens('◦')).toEqual(['◦']);
	});

	it('reads several tokens from one tag', () => {
		expect(parseMarkerTokens('(c)[1]')).toEqual(['c', '1']);
	});
});

describe('bindMarkers', () => {
	it('binds numeric and lettered markers by their token', () => {
		const notes = [
			{ label: 'a', text: 'first' },
			{ label: '1', text: 'second' }
		];
		const r = bindMarkers('x <na>(a)</na> y <na>[1]</na>', notes, 'verse', 'ref');
		expect(r.hits.map((h) => h.noteIndex)).toEqual([0, 1]);
		expect(r.unbound).toEqual([]);
		expect(r.unreferenced).toEqual([]);
	});

	it('binds two tokens carried by one tag', () => {
		const notes = [
			{ label: 'c', text: 'first' },
			{ label: '1', text: 'second' }
		];
		const r = bindMarkers('x <na>(c)[1]</na>', notes, 'verse', 'ref');
		expect(r.hits.map((h) => h.noteIndex)).toEqual([0, 1]);
	});

	it('binds the k-th occurrence to the k-th note carrying that token', () => {
		const notes = [
			{ marker: 1, text: 'first' },
			{ marker: 1, text: 'second' }
		];
		const r = bindMarkers('<mn>[1]</mn> a <mn>[1]</mn>', notes, 'prose', 'ref');
		expect(r.hits.map((h) => h.noteIndex)).toEqual([0, 1]);
	});

	it('binds a ring marker directly when a note is itself keyed by it', () => {
		const notes = [
			{ marker: '◦', text: 'ring' },
			{ marker: 1, text: 'one' }
		];
		const r = bindMarkers('<mn>◦</mn> a <mn>[1]</mn>', notes, 'prose', 'ref');
		expect(r.hits.map((h) => h.noteIndex)).toEqual([0, 1]);
		expect(r.unbound).toEqual([]);
	});

	it('falls back to the next unconsumed note for a ring that matches nothing', () => {
		// The 1-peter-intro shape: no note is keyed '◦', so every ring must fall
		// back to the next unclaimed note in array order.
		const notes = [
			{ marker: 1, text: 'one' },
			{ marker: 2, text: 'two' }
		];
		const r = bindMarkers('<mn>◦</mn> a <mn>[2]</mn>', notes, 'prose', 'ref');
		expect(r.hits.map((h) => h.noteIndex)).toEqual([0, 1]);
		expect(r.unbound).toEqual([]);
		expect(r.unreferenced).toEqual([]);
	});

	it('never binds one note twice, reporting the loser as unbound', () => {
		const notes = [
			{ marker: 1, text: 'one' },
			{ marker: 2, text: 'two' }
		];
		const r = bindMarkers('<mn>◦</mn> a <mn>[1]</mn> b <mn>[2]</mn>', notes, 'prose', 'ref');
		expect(new Set(r.hits.map((h) => h.noteIndex)).size).toBe(r.hits.length);
		expect(r.unbound).toEqual(['1']);
	});

	it('reports a marker with no note', () => {
		const r = bindMarkers('<na>[1]</na> <na>[1]</na>', [{ label: '1', text: 'x' }], 'verse', 'ref');
		expect(r.hits).toHaveLength(1);
		expect(r.unbound).toEqual(['1']);
	});

	it('reports a note no marker asked for', () => {
		const r = bindMarkers('plain text', [{ label: '1', text: 'x' }], 'verse', 'ref');
		expect(r.unreferenced).toEqual([0]);
	});

	it('records the offset of each marker in the tagged text', () => {
		const r = bindMarkers('ab <na>[1]</na>', [{ label: '1', text: 'x' }], 'verse', 'ref');
		expect(r.hits[0]).toMatchObject({ start: 3, length: '<na>[1]</na>'.length });
	});
});

describe('the known-defect list', () => {
	it('holds exactly the measured irregularities', () => {
		expect(KNOWN_UNBOUND.size).toBe(2);
		expect(KNOWN_UNREFERENCED.size).toBe(26);
	});

	it('passes a clean bind', () => {
		const notes = [{ label: '1', text: 'x' }];
		const r = bindMarkers('<na>[1]</na>', notes, 'verse', 'genesis 1:1');
		expect(() => assertOnlyKnownDefects(r, notes, 'genesis 1:1')).not.toThrow();
	});

	it('allows a listed unbound marker', () => {
		const notes = [{ label: '1', text: 'x' }];
		const r = bindMarkers('<na>[1]</na> <na>[1]</na>', notes, 'verse', '1-timothy 2:6');
		expect(() => assertOnlyKnownDefects(r, notes, '1-timothy 2:6')).not.toThrow();
	});

	it('rejects the same defect at an unlisted ref', () => {
		const notes = [{ label: '1', text: 'x' }];
		const r = bindMarkers('<na>[1]</na> <na>[1]</na>', notes, 'verse', 'genesis 1:1');
		expect(() => assertOnlyKnownDefects(r, notes, 'genesis 1:1')).toThrow(ExportError);
	});

	it('allows a listed unreferenced note', () => {
		const notes = [{ label: '1', text: 'x' }];
		const r = bindMarkers('no marker here', notes, 'verse', 'john 1:51');
		expect(() => assertOnlyKnownDefects(r, notes, 'john 1:51')).not.toThrow();
	});

	it('rejects an unlisted unreferenced note', () => {
		const notes = [{ label: '1', text: 'x' }];
		const r = bindMarkers('no marker here', notes, 'verse', 'genesis 1:1');
		expect(() => assertOnlyKnownDefects(r, notes, 'genesis 1:1')).toThrow(/unreferenced/);
	});
});

describe('balanceInline', () => {
	it('closes a tag left open at the end', () => {
		expect(balanceInline('<i>S. Aug. &c.')).toBe('<i>S. Aug. &c.</i>');
	});

	it('drops a closer with no opener', () => {
		expect(balanceInline("Theodotion's Edition.</i>")).toBe("Theodotion's Edition.");
	});

	it('leaves balanced text untouched', () => {
		expect(balanceInline('the <i>Lord</i> God')).toBe('the <i>Lord</i> God');
	});

	it('is only applied to enumerated refs', () => {
		expect(KNOWN_UNBALANCED.has('daniel ann 12:7')).toBe(true);
		expect(KNOWN_UNBALANCED.size).toBe(1);
	});
});

describe('stripMarkup', () => {
	it('keeps the words inside formatting tags', () => {
		expect(stripMarkup('the <i>Lord</i> God', 'verse', 'ref')).toBe('the Lord God');
		expect(stripMarkup('<sc>Paul</sc> called', 'verse', 'ref')).toBe('Paul called');
	});

	it('removes markers and their content', () => {
		expect(stripMarkup('a <na>[1]</na> b', 'verse', 'ref')).toBe('a b');
		expect(stripMarkup('a <cr>[1]</cr> b', 'verse', 'ref')).toBe('a b');
	});

	it('keeps the words inside <alt>', () => {
		expect(stripMarkup('are you not <na>[1]</na> <alt>men</alt>?', 'verse', 'ref')).toBe(
			'are you not men?'
		);
	});

	it('turns <br> into a newline', () => {
		expect(stripMarkup('one<br>two', 'prose', 'ref')).toBe('one\ntwo');
	});

	it('leaves no angle bracket behind', () => {
		const messy = '<sc>A</sc> <i>b <na>(a)</na> c</i>';
		expect(stripMarkup(messy, 'verse', 'ref')).not.toMatch(/[<>]/);
	});

	it('is idempotent', () => {
		const once = stripMarkup('a <i>b</i> <na>[1]</na> c', 'verse', 'ref');
		expect(stripMarkup(once, 'verse', 'ref')).toBe(once);
	});
});

describe('BOOK_CODES', () => {
	it('covers all 76 books with unique codes and ordinals', () => {
		const entries = Object.values(BOOK_CODES);
		expect(entries).toHaveLength(76);
		expect(new Set(entries.map((e) => e.usfm)).size).toBe(76);
		expect(entries.map((e) => e.ordinal).sort((a, b) => a - b)).toEqual(
			Array.from({ length: 76 }, (_, i) => i + 1)
		);
	});

	it('maps the Douay names to their modern equivalents', () => {
		expect(BOOK_CODES['1-kings'].usfm).toBe('1SA');
		expect(BOOK_CODES['3-kings'].usfm).toBe('1KI');
		expect(BOOK_CODES['1-paralipomenon'].usfm).toBe('1CH');
		expect(BOOK_CODES['canticle-of-canticles'].usfm).toBe('SNG');
		expect(BOOK_CODES['ecclesiasticus'].usfm).toBe('SIR');
		expect(BOOK_CODES['apocalypse'].usfm).toBe('REV');
	});

	it('follows Vulgate numbering for the Esdras family', () => {
		expect(BOOK_CODES['1-esdras'].usfm).toBe('EZR');
		expect(BOOK_CODES['2-esdras'].usfm).toBe('NEH');
		expect(BOOK_CODES['3-esdras'].usfm).toBe('1ES');
		expect(BOOK_CODES['4-esdras'].usfm).toBe('2ES');
	});

	it('uses the composite code where the ODR ships a composite book', () => {
		expect(BOOK_CODES['esther'].usfm).toBe('ESG');
		expect(BOOK_CODES['daniel'].usfm).toBe('DAG');
		expect(BOOK_CODES['baruch'].usfm).toBe('BAR');
	});

	it('orders the appendix books after the OT and before the NT', () => {
		expect(BOOK_CODES['malachie'].ordinal).toBe(46);
		expect(BOOK_CODES['prayer-of-manasses'].ordinal).toBe(47);
		expect(BOOK_CODES['4-esdras'].ordinal).toBe(49);
		expect(BOOK_CODES['matthew'].ordinal).toBe(50);
	});

	it('builds a zero-padded filename', () => {
		expect(usfmFilename('genesis')).toBe('01-GEN.usfm');
		expect(usfmFilename('apocalypse')).toBe('76-REV.usfm');
	});

	it('throws on an unknown slug', () => {
		expect(() => usfmFilename('nonesuch')).toThrow(ExportError);
	});
});

describe('renderVerse', () => {
	it('emits \\v with plain text', () => {
		expect(renderVerse({ verse: 3, text: 'And God said' }, 1, 'ref')).toBe('\\v 3 And God said');
	});

	it('maps <sc> and <i> to character markers', () => {
		const out = renderVerse({ verse: 1, text: '<sc>Paul</sc> an <i>Apostle</i>' }, 1, 'ref');
		expect(out).toBe('\\v 1 \\sc Paul\\sc* an \\it Apostle\\it*');
	});

	// Body text is outside any character environment, so these stay bare - the
	// \+ form is only for markers nested inside a note. See the note-body tests.
	it('leaves body-text character markers unprefixed', () => {
		const out = renderVerse({ verse: 1, text: '<sc>Paul</sc> an <i>Apostle</i>' }, 1, 'ref');
		expect(out).not.toContain('\\+');
	});

	it('collapses a literal newline in the verse text onto one line', () => {
		const out = renderVerse({ verse: 1, text: 'And God\nsaid' }, 1, 'ref');
		expect(out).toBe('\\v 1 And God said');
	});

	it('turns a note marker into a footnote reusing the original label', () => {
		const out = renderVerse(
			{ verse: 1, text: 'Paul <na>[1]</na> called', notes: [{ label: '1', text: 'The Epistle.' }] },
			1,
			'ref'
		);
		expect(out).toBe('\\v 1 Paul \\f 1 \\fr 1.1 \\ft The Epistle.\\f* called');
	});

	it('keeps a lettered label', () => {
		const out = renderVerse(
			{ verse: 2, text: 'x <na>(a)</na> y', notes: [{ label: 'a', text: 'note' }] },
			5,
			'ref'
		);
		expect(out).toContain('\\f a \\fr 5.2 \\ft note\\f*');
	});

	it('turns a cross-reference into \\x', () => {
		const out = renderVerse(
			{ verse: 14, text: 'but <cr>[1]</cr> Crispus', cross_refs: [{ text: 'Act. 18, 8.' }] },
			1,
			'ref'
		);
		expect(out).toBe('\\v 14 but \\x - \\xt Act. 18, 8.\\x* Crispus');
	});

	it('moves an <alt> span into its footnote as \\fq', () => {
		const out = renderVerse(
			{
				verse: 4,
				text: 'are you not <na>[1]</na> <alt>men</alt>?',
				notes: [{ label: '1', text: '<i>carnal</i>' }]
			},
			3,
			'ref'
		);
		// \+it, not \it: the note body is already inside the \f character environment.
		expect(out).toBe('\\v 4 are you not \\f 1 \\fr 3.4 \\fq men \\ft \\+it carnal\\+it*\\f* men?');
	});
});

describe('renderAnnotation', () => {
	it('emits \\ef with the catchword as \\fq', () => {
		const out = renderAnnotation(
			{ verse: 1, title: 'In the beginning.', text: 'Holy Moyses telleth.' },
			1,
			'ref'
		);
		expect(out).toBe('\\ef - \\fr 1.1 \\fq In the beginning. \\ft Holy Moyses telleth.\\ef*');
	});

	it('replaces each sub-note marker with a superscript and appends the notes', () => {
		const out = renderAnnotation(
			{
				verse: 1,
				title: 'A.',
				text: '<mn>[1]</mn> First part <mn>[2]</mn> second part',
				notes: [
					{ marker: 1, text: 'S. Aug.' },
					{ marker: 2, text: 'Contra Epist.' }
				]
			},
			1,
			'ref'
		);
		expect(out).toBe(
			'\\ef - \\fr 1.1 \\fq A. \\ft ¹ First part ² second part \\fq ¹ \\ft S. Aug. \\fq ² \\ft Contra Epist.\\ef*'
		);
	});

	it('numbers a ring marker by its ordinal, since the ring carries no number', () => {
		const out = renderAnnotation(
			{
				verse: 2,
				title: 'B.',
				text: 'text <mn>◦</mn> more',
				notes: [{ marker: '◦', text: 'src' }]
			},
			4,
			'ref'
		);
		expect(out).toContain('text ¹ more');
		expect(out).toContain('\\fq ¹ \\ft src');
	});

	// The whole \ef body, and each trailing sub-note, sit inside a character
	// environment: USFM 3 requires \+it there.
	// https://ubsicap.github.io/usfm/characters/nesting.html
	it('nests character markers inside the note with \\+', () => {
		const out = renderAnnotation(
			{
				verse: 1,
				title: 'A.',
				text: 'see <i>Gen.</i> <mn>[1]</mn>',
				notes: [{ marker: 1, text: '<sc>Aug.</sc>' }]
			},
			1,
			'ref'
		);
		expect(out).toBe(
			'\\ef - \\fr 1.1 \\fq A. \\ft see \\+it Gen.\\+it* ¹ \\fq ¹ \\ft \\+sc Aug.\\+sc*\\ef*'
		);
	});

	it('omits \\fq when the annotation has no title', () => {
		const out = renderAnnotation({ verse: 1, title: null, text: 'body' }, 1, 'ref');
		expect(out).toBe('\\ef - \\fr 1.1 \\ft body\\ef*');
	});

	it('still throws on unbalanced note formatting at an unlisted ref', () => {
		expect(() =>
			renderAnnotation(
				{
					verse: 1,
					title: 'A.',
					text: '<mn>[1]</mn> part',
					notes: [{ marker: 1, text: '<i>unterminated' }]
				},
				1,
				'ref'
			)
		).toThrow(ExportError);
	});
});

const book = {
	book: 'Genesis',
	book_title: 'THE BOOK OF GENESIS',
	short_title: 'Genesis',
	intros: [{ title: 'THE ARGUMENT', text: 'First para.<br>Second para.' }],
	chapters: [
		{
			chapter: 1,
			summary: 'God created heaven.',
			summary_notes: [],
			verses: [{ verse: 1, text: 'In the beginning' }]
		}
	]
};

describe('renderUsfm', () => {
	it('emits the identification and heading block', () => {
		const out = renderUsfm('genesis', book, new Map(), { includeAnnotations: false }, 'Genesis');
		expect(out).toContain('\\id GEN');
		expect(out).toContain('\\usfm 3.0');
		expect(out).toContain('\\ide UTF-8');
		expect(out).toContain('\\h Genesis');
		expect(out).toContain('\\mt1 THE BOOK OF GENESIS');
	});

	it('renders the intro, splitting paragraphs on <br>', () => {
		const out = renderUsfm('genesis', book, new Map(), { includeAnnotations: false }, 'Genesis');
		expect(out).toContain('\\is THE ARGUMENT');
		expect(out).toContain('\\ip First para.');
		expect(out).toContain('\\ip Second para.');
	});

	it('turns an intro marker into a footnote instead of leaking its token', () => {
		const withNote = {
			...book,
			intros: [
				{
					title: 'ARG',
					text: 'was written <mn>[1]</mn> by Moyses',
					notes: [{ marker: 1, text: 'Gen. 1.' }]
				}
			]
		};
		const out = renderUsfm(
			'genesis',
			withNote,
			new Map(),
			{ includeAnnotations: false },
			'Genesis'
		);
		expect(out).toContain('\\ip was written \\f - \\ft Gen. 1.\\f* by Moyses');
		expect(out).not.toContain('[1]');
	});

	it('renders chapters, summaries, and verses', () => {
		const out = renderUsfm('genesis', book, new Map(), { includeAnnotations: false }, 'Genesis');
		expect(out).toContain('\\c 1');
		expect(out).toContain('\\cd God created heaven.');
		expect(out).toContain('\\v 1 In the beginning');
	});

	it('falls back to the supplied title when the book has none', () => {
		const bare = { book: '3 Esdras', chapters: [{ chapter: 1, verses: [] }] };
		const out = renderUsfm('3-esdras', bare, new Map(), { includeAnnotations: false }, '3 Esdras');
		expect(out).toContain('\\id 1ES');
		expect(out).toContain('\\h 3 Esdras');
		expect(out).toContain('\\mt1 3 Esdras');
	});

	it('omits annotations unless asked, and includes them when asked', () => {
		const anns = new Map([[1, [{ verse: 1, title: 'Catchword.', text: 'Comment.' }]]]);
		const plain = renderUsfm('genesis', book, anns, { includeAnnotations: false }, 'Genesis');
		const study = renderUsfm('genesis', book, anns, { includeAnnotations: true }, 'Genesis');
		expect(plain).not.toContain('\\ef');
		expect(study).toContain('\\ef - \\fr 1.1 \\fq Catchword. \\ft Comment.\\ef*');
	});
});

describe('assertSafeOutDir', () => {
	const ROOT = '/home/me/repo';
	const HOME = '/home/me';
	const ok = (p: string) => assertSafeOutDir(p, ROOT, HOME);

	it('accepts a directory inside the repo', () => {
		expect(() => ok('/home/me/repo/dist-export')).not.toThrow();
	});

	it('accepts a directory outside the repo that contains nothing of ours', () => {
		expect(() => ok('/tmp/bundle')).not.toThrow();
	});

	it('rejects a missing or blank value', () => {
		expect(() => ok(undefined as unknown as string)).toThrow(ExportError);
		expect(() => ok('')).toThrow(ExportError);
		expect(() => ok('   ')).toThrow(ExportError);
	});

	it('rejects a relative path, which is what `--out .` arrives as', () => {
		expect(() => ok('.')).toThrow(/absolute/);
		expect(() => ok('..')).toThrow(/absolute/);
		expect(() => ok('dist')).toThrow(/absolute/);
	});

	it('rejects the filesystem root', () => {
		expect(() => ok('/')).toThrow(/filesystem root/);
	});

	it('rejects the home directory', () => {
		expect(() => ok('/home/me')).toThrow(/home directory/);
		expect(() => ok('/home/me/')).toThrow(/home directory/);
	});

	it('rejects the repository root', () => {
		expect(() => ok('/home/me/repo')).toThrow(/repository root/);
		expect(() => ok('/home/me/repo/')).toThrow(/repository root/);
	});

	it('rejects any ancestor of the repository', () => {
		expect(() => ok('/home')).toThrow(/contains the repository/);
	});

	it('does not mistake a sibling with a shared prefix for an ancestor', () => {
		expect(() => ok('/home/me/repo-export')).not.toThrow();
	});
});
