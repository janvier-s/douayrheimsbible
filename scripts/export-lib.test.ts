// scripts/export-lib.test.ts
// Unit tests for the pure export helpers. Fixtures are hand-written so a
// corpus edit cannot quietly change what these assert; the corpus itself is
// covered by export.corpus.test.ts.

import { describe, it, expect } from 'vitest';
import { tokenize, ExportError } from './export-lib';

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
