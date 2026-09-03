// scripts/export-lib.test.ts
// Unit tests for the pure export helpers. Fixtures are hand-written so a
// corpus edit cannot quietly change what these assert; the corpus itself is
// covered by export.corpus.test.ts.

import { describe, it, expect } from 'vitest';
import { tokenize, ExportError, parseMarkerTokens, bindMarkers } from './export-lib';

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

	it('falls back to the next unconsumed note for a ring that matches nothing', () => {
		// The 1-esdras shape: rings interleaved with numbered notes.
		const notes = [
			{ marker: '◦', text: 'ring' },
			{ marker: 1, text: 'one' }
		];
		const r = bindMarkers('<mn>◦</mn> a <mn>[1]</mn>', notes, 'prose', 'ref');
		expect(r.hits.map((h) => h.noteIndex)).toEqual([0, 1]);
		expect(r.unbound).toEqual([]);
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
