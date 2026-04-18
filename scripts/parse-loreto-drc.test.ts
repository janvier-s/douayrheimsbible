import { describe, it, expect } from 'vitest';
import {
	convertMarkerToSuperscript,
	parseVerseNumber,
	collapseSpans,
	extractVersesFromParagraphs,
	parseCrossRefBlock,
	parseNoteBlock,
	BOOK_ANCHOR_TO_SLUG
} from './parse-loreto-drc.js';

// ---------------------------------------------------------------------------
// convertMarkerToSuperscript
// ---------------------------------------------------------------------------

describe('convertMarkerToSuperscript', () => {
	it('converts single digit 0', () => {
		expect(convertMarkerToSuperscript(0)).toBe('⁰');
	});
	it('converts single digit 1', () => {
		expect(convertMarkerToSuperscript(1)).toBe('¹');
	});
	it('converts single digit 9', () => {
		expect(convertMarkerToSuperscript(9)).toBe('⁹');
	});
	it('converts multi-digit 12', () => {
		expect(convertMarkerToSuperscript(12)).toBe('¹²');
	});
	it('converts multi-digit 99', () => {
		expect(convertMarkerToSuperscript(99)).toBe('⁹⁹');
	});
	it('converts all digits 0-9', () => {
		expect(convertMarkerToSuperscript(1234567890)).toBe('¹²³⁴⁵⁶⁷⁸⁹⁰');
	});
});

// ---------------------------------------------------------------------------
// parseVerseNumber
// ---------------------------------------------------------------------------

describe('parseVerseNumber', () => {
	it('extracts leading single-digit verse number', () => {
		expect(parseVerseNumber('2 And the earth')).toEqual({ verse: 2, text: 'And the earth' });
	});
	it('extracts leading multi-digit verse number', () => {
		expect(parseVerseNumber('12 In the beginning')).toEqual({
			verse: 12,
			text: 'In the beginning'
		});
	});
	it('returns verse 1 when no leading number', () => {
		expect(parseVerseNumber('In the beginning')).toEqual({ verse: 1, text: 'In the beginning' });
	});
	it('returns verse 1 for empty string', () => {
		expect(parseVerseNumber('')).toEqual({ verse: 1, text: '' });
	});
	it('handles verse number 1 explicitly', () => {
		expect(parseVerseNumber('1 In the beginning God')).toEqual({
			verse: 1,
			text: 'In the beginning God'
		});
	});
	it('preserves extra spaces in text after verse number', () => {
		const result = parseVerseNumber('3 And God said, Let');
		expect(result.verse).toBe(3);
		expect(result.text).toBe('And God said, Let');
	});
});

// ---------------------------------------------------------------------------
// collapseSpans
// ---------------------------------------------------------------------------

describe('collapseSpans', () => {
	it('collapses plain-bible1 span to plain text', () => {
		const html = '<span class="plain-bible1">Hello world</span>';
		expect(collapseSpans(html)).toBe('Hello world');
	});

	it('converts reference-letters span to superscript', () => {
		const html = '<span class="reference-letters">1</span>';
		expect(collapseSpans(html)).toBe('¹');
	});

	it('converts multi-digit reference-letters to superscript', () => {
		const html = '<span class="reference-letters">12</span>';
		expect(collapseSpans(html)).toBe('¹²');
	});

	it('converts char-style-override3 (drop-cap) to plain letter', () => {
		const html = '<span class="char-style-override3">I</span>';
		expect(collapseSpans(html)).toBe('I');
	});

	it('converts br to space', () => {
		const html = 'word<br class="calibre5"/>word';
		expect(collapseSpans(html)).toBe('word word');
	});

	it('wraps bible-italic span in <i> tags', () => {
		const html = '<span class="bible-italic">saying</span>';
		expect(collapseSpans(html)).toBe('<i>saying</i>');
	});

	it('handles word-per-span encoding collapsed into single text', () => {
		const html =
			'<span class="plain-bible1">In </span><span class="plain-bible1">the </span><span class="plain-bible1">beginning</span>';
		expect(collapseSpans(html)).toBe('In the beginning');
	});

	it('collapses multiple spaces', () => {
		const html = '<span class="plain-bible1">word  </span><span class="plain-bible1">  word</span>';
		expect(collapseSpans(html)).toBe('word word');
	});

	it('handles a mix of reference-letters and plain text', () => {
		const html =
			'<span class="plain-bible1">And God said</span><span class="reference-letters">1</span><span class="plain-bible1">, Let there be light</span>';
		expect(collapseSpans(html)).toBe('And God said¹, Let there be light');
	});

	it('handles char-style-override variants (not just "3")', () => {
		// char-style-override2 should also pass through as plain text
		const html = '<span class="char-style-override2">A</span>';
		expect(collapseSpans(html)).toBe('A');
	});

	it('trims leading and trailing whitespace from result', () => {
		const html = '  <span class="plain-bible1">  text  </span>  ';
		expect(collapseSpans(html)).toBe('text');
	});
});

// ---------------------------------------------------------------------------
// extractVersesFromParagraphs
// ---------------------------------------------------------------------------

describe('extractVersesFromParagraphs', () => {
	it('extracts verse number and text from a single paragraph', () => {
		const paragraphs = ['<span class="plain-bible1">2 And the earth was void</span>'];
		const result = extractVersesFromParagraphs(paragraphs);
		expect(result).toHaveLength(1);
		expect(result[0].verse).toBe(2);
		expect(result[0].text).toBe('And the earth was void');
	});

	it('defaults to verse 1 when no leading number', () => {
		const paragraphs = ['<span class="plain-bible1">In the beginning God</span>'];
		const result = extractVersesFromParagraphs(paragraphs);
		expect(result[0].verse).toBe(1);
	});

	it('extracts superscript markers from verse text', () => {
		const paragraphs = [
			'<span class="plain-bible1">3 </span><span class="reference-letters">1</span><span class="plain-bible1"> And God said</span>'
		];
		const result = extractVersesFromParagraphs(paragraphs);
		expect(result[0].verse).toBe(3);
		expect(result[0].markers).toContain(1);
	});

	it('extracts multiple markers from a verse', () => {
		const paragraphs = [
			'<span class="plain-bible1">5 And</span><span class="reference-letters">1</span><span class="plain-bible1"> God</span><span class="reference-letters">2</span><span class="plain-bible1"> saw</span>'
		];
		const result = extractVersesFromParagraphs(paragraphs);
		expect(result[0].markers).toEqual([1, 2]);
	});

	it('returns empty array for empty input', () => {
		expect(extractVersesFromParagraphs([])).toEqual([]);
	});

	it('processes multiple paragraphs', () => {
		const paragraphs = [
			'<span class="plain-bible1">1 In the beginning</span>',
			'<span class="plain-bible1">2 And the earth</span>'
		];
		const result = extractVersesFromParagraphs(paragraphs);
		expect(result).toHaveLength(2);
		expect(result[0].verse).toBe(1);
		expect(result[1].verse).toBe(2);
	});
});

// ---------------------------------------------------------------------------
// parseCrossRefBlock
// ---------------------------------------------------------------------------

describe('parseCrossRefBlock', () => {
	it('parses basic cross-ref entries', () => {
		const html =
			'<span class="foot-note-s--script">1. </span><span class="plain-bible1">Acts 14:14, 17:24  </span>' +
			'<span class="foot-note-s--script">2.</span><span class="plain-bible1"> Heb. 11:3  </span>';
		const result = parseCrossRefBlock(html);
		expect(result).toHaveLength(2);
		expect(result[0].marker).toBe(1);
		expect(result[0].refs).toBe('Acts 14:14, 17:24');
		expect(result[1].marker).toBe(2);
		expect(result[1].refs).toBe('Heb. 11:3');
	});

	it('parses single cross-ref entry', () => {
		const html =
			'<span class="foot-note-s--script">3. </span><span class="plain-bible1">Gen. 1:1</span>';
		const result = parseCrossRefBlock(html);
		expect(result).toHaveLength(1);
		expect(result[0].marker).toBe(3);
		expect(result[0].refs).toBe('Gen. 1:1');
	});

	it('parses chapter breaks in cross-ref block', () => {
		const html =
			'<span class="foot-note-s--script">11. </span><span class="plain-bible1">Ecclus. 39:21; Mk. 7:37 CHAP. 2  </span>' +
			'<span class="foot-note-s--script">1.</span><span class="plain-bible1"> Exod. 20:11</span>';
		const result = parseCrossRefBlock(html);
		expect(result).toHaveLength(2);
		expect(result[0].marker).toBe(11);
		expect(result[0].refs).toBe('Ecclus. 39:21; Mk. 7:37');
		expect(result[0].chapterBreak).toBe(2);
		expect(result[1].marker).toBe(1);
		expect(result[1].refs).toBe('Exod. 20:11');
		expect(result[1].chapter).toBe(2);
	});

	it('handles chapter break setting chapter for subsequent entries', () => {
		const html =
			'<span class="foot-note-s--script">5. </span><span class="plain-bible1">Rom. 1:1 CHAP. 3  </span>' +
			'<span class="foot-note-s--script">1.</span><span class="plain-bible1"> Gen. 1:1</span>' +
			'<span class="foot-note-s--script">2.</span><span class="plain-bible1"> Ps. 1:1</span>';
		const result = parseCrossRefBlock(html);
		expect(result[1].chapter).toBe(3);
		expect(result[2].chapter).toBe(3);
	});

	it('returns empty array for empty input', () => {
		expect(parseCrossRefBlock('')).toEqual([]);
	});

	it('handles multi-digit markers', () => {
		const html =
			'<span class="foot-note-s--script">12. </span><span class="plain-bible1">Col. 1:15</span>';
		const result = parseCrossRefBlock(html);
		expect(result[0].marker).toBe(12);
	});
});

// ---------------------------------------------------------------------------
// parseNoteBlock
// ---------------------------------------------------------------------------

describe('parseNoteBlock', () => {
	it('parses CHAP. and Ver. header with italic lemma', () => {
		const html =
			'<span class="plain-bible1">CHAP. 1. Ver. 6. </span>' +
			'<span class="bible-italic">A firmament</span>' +
			'<span class="plain-bible1">. By this name is here understood...</span>';
		const result = parseNoteBlock(html);
		expect(result.chapter).toBe(1);
		expect(result.verse).toBe(6);
		expect(result.text).toContain('"A firmament"');
		expect(result.text).toContain('By this name is here understood');
	});

	it('parses Ver.-only header (chapter: null)', () => {
		const html =
			'<span class="plain-bible1">Ver. 3. </span>' +
			'<span class="bible-italic">The Spirit</span>' +
			'<span class="plain-bible1">. Moving over the waters...</span>';
		const result = parseNoteBlock(html);
		expect(result.chapter).toBeNull();
		expect(result.verse).toBe(3);
		expect(result.text).toContain('"The Spirit"');
	});

	it('wraps lemma in quotes', () => {
		const html =
			'<span class="plain-bible1">CHAP. 2. Ver. 1. </span>' +
			'<span class="bible-italic">Created</span>' +
			'<span class="plain-bible1">. This means...</span>';
		const result = parseNoteBlock(html);
		expect(result.text.startsWith('"Created"')).toBe(true);
	});

	it('converts ". " after lemma to "... "', () => {
		const html =
			'<span class="plain-bible1">CHAP. 1. Ver. 1. </span>' +
			'<span class="bible-italic">Beginning</span>' +
			'<span class="plain-bible1">. The word beginning...</span>';
		const result = parseNoteBlock(html);
		expect(result.text).toContain('... ');
	});

	it('parses chapter 10 and verse 20', () => {
		const html =
			'<span class="plain-bible1">CHAP. 10. Ver. 20. </span>' +
			'<span class="plain-bible1">Some note text without lemma.</span>';
		const result = parseNoteBlock(html);
		expect(result.chapter).toBe(10);
		expect(result.verse).toBe(20);
	});

	it('handles note text without italic lemma', () => {
		const html =
			'<span class="plain-bible1">CHAP. 3. Ver. 5. </span>' +
			'<span class="plain-bible1">Plain note text here.</span>';
		const result = parseNoteBlock(html);
		expect(result.chapter).toBe(3);
		expect(result.verse).toBe(5);
		expect(result.text).toBe('Plain note text here.');
	});
});

// ---------------------------------------------------------------------------
// BOOK_ANCHOR_TO_SLUG
// ---------------------------------------------------------------------------

describe('BOOK_ANCHOR_TO_SLUG', () => {
	it('has at least 68 entries (73 once unknown anchors are discovered)', () => {
		// The spec lists 68 known anchors; 5+ more (1-thessalonians, 2-thessalonians,
		// 1-timothy, 2-timothy, 1-john, revelation) have unknown anchors to be
		// filled in after parsing the epub. Once discovered this should reach >= 73.
		expect(Object.keys(BOOK_ANCHOR_TO_SLUG).length).toBeGreaterThanOrEqual(68);
	});

	it('maps GENESIS to genesis', () => {
		expect(BOOK_ANCHOR_TO_SLUG['GENESIS']).toBe('genesis');
	});

	it('maps JOSUE to joshua', () => {
		expect(BOOK_ANCHOR_TO_SLUG['JOSUE']).toBe('joshua');
	});

	it('maps The-First-book-of--SAMUEL to 1-samuel', () => {
		expect(BOOK_ANCHOR_TO_SLUG['The-First-book-of--SAMUEL']).toBe('1-samuel');
	});

	it('maps The-Third-Book-of--KINGS to 1-kings', () => {
		expect(BOOK_ANCHOR_TO_SLUG['The-Third-Book-of--KINGS']).toBe('1-kings');
	});

	it('maps THE-FOURTH-Book-of--KINGS to 2-kings', () => {
		expect(BOOK_ANCHOR_TO_SLUG['THE-FOURTH-Book-of--KINGS']).toBe('2-kings');
	});

	it('maps PARALIPOMENON to 1-chronicles', () => {
		expect(BOOK_ANCHOR_TO_SLUG['PARALIPOMENON']).toBe('1-chronicles');
	});

	it('maps THE-SECOND-BOOK-OF-PARALIPOMENON to 2-chronicles', () => {
		expect(BOOK_ANCHOR_TO_SLUG['THE-SECOND-BOOK-OF-PARALIPOMENON']).toBe('2-chronicles');
	});

	it('maps CANTICLE-OF-CANTICLES to song-of-solomon', () => {
		expect(BOOK_ANCHOR_TO_SLUG['CANTICLE-OF-CANTICLES']).toBe('song-of-solomon');
	});

	it('maps JEREMIAS-17 to lamentations', () => {
		expect(BOOK_ANCHOR_TO_SLUG['JEREMIAS-17']).toBe('lamentations');
	});

	it('maps ST.-MATTHEW to matthew', () => {
		expect(BOOK_ANCHOR_TO_SLUG['ST.-MATTHEW']).toBe('matthew');
	});

	it('maps The-Acts-of-THE-APOSTLES to acts', () => {
		expect(BOOK_ANCHOR_TO_SLUG['The-Acts-of-THE-APOSTLES']).toBe('acts');
	});

	it('maps First-Epistle-of-St.-Paul-to-the-CORINTHIANS to 1-corinthians', () => {
		expect(BOOK_ANCHOR_TO_SLUG['First-Epistle-of-St.-Paul-to-the-CORINTHIANS']).toBe(
			'1-corinthians'
		);
	});

	it('maps FIRST-EPISTLE-OF-ST.-PETER-THE-APOSTLE to 1-peter', () => {
		expect(BOOK_ANCHOR_TO_SLUG['FIRST-EPISTLE-OF-ST.-PETER-THE-APOSTLE']).toBe('1-peter');
	});

	it('maps SECOND-EPISTLE-OF-ST.-JOHN to 2-john', () => {
		expect(BOOK_ANCHOR_TO_SLUG['SECOND-EPISTLE-OF-ST.-JOHN']).toBe('2-john');
	});

	it('maps Third-Epsitle-of-ST.-JOHN to 3-john (note: typo in anchor)', () => {
		expect(BOOK_ANCHOR_TO_SLUG['Third-Epsitle-of-ST.-JOHN']).toBe('3-john');
	});

	it('maps ST.-JUDE to jude', () => {
		expect(BOOK_ANCHOR_TO_SLUG['ST.-JUDE']).toBe('jude');
	});

	it('maps ECCLESIASTICUS to sirach', () => {
		expect(BOOK_ANCHOR_TO_SLUG['ECCLESIASTICUS']).toBe('sirach');
	});

	it('maps TOBIAS to tobit', () => {
		expect(BOOK_ANCHOR_TO_SLUG['TOBIAS']).toBe('tobit');
	});

	it('maps The-First-Book-of-MACHABEES to 1-maccabees', () => {
		expect(BOOK_ANCHOR_TO_SLUG['The-First-Book-of-MACHABEES']).toBe('1-maccabees');
	});

	it('maps The-Second-Book-of--MACHABEES to 2-maccabees', () => {
		expect(BOOK_ANCHOR_TO_SLUG['The-Second-Book-of--MACHABEES']).toBe('2-maccabees');
	});
});
