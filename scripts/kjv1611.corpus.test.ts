// Whole-corpus invariants for static/data/kjv-1611 (the KJV in 1611 spelling).
// Lives in scripts/ like export.corpus.test.ts; skips when the data is absent.
import { describe, it, expect } from 'vitest';
import { readdirSync, existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { APOCRYPHA } from './kjv1611/slugs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MODERN = join(ROOT, 'static/data/kjv');
const ORIG = join(ROOT, 'static/data/kjv-1611');

type Book = {
	book: string;
	supplied?: boolean;
	chapters: { chapter: number; verses: { verse: number; text: string; modern?: boolean }[] }[];
};
const load = (dir: string, f: string): Book => JSON.parse(readFileSync(join(dir, f), 'utf8'));

describe.skipIf(!existsSync(ORIG))('kjv-1611 corpus', () => {
	const files = readdirSync(MODERN).filter((f) => f.endsWith('.json'));

	it('has every book the modern KJV has', () => {
		for (const f of files) expect(existsSync(join(ORIG, f)), f).toBe(true);
		expect(files.length).toBe(76);
	});

	it('has the same chapter/verse keys as kjv (except Psalm titles, verse 0)', () => {
		for (const f of files) {
			const m = load(MODERN, f);
			const o = load(ORIG, f);
			expect(
				o.chapters.map((c) => c.chapter),
				f
			).toEqual(m.chapters.map((c) => c.chapter));
			for (const [i, mc] of m.chapters.entries()) {
				const want = mc.verses.map((v) => v.verse).filter((v) => !(f === 'psalms.json' && v === 0));
				expect(
					o.chapters[i].verses.map((v) => v.verse),
					`${f} ${mc.chapter}`
				).toEqual(want);
			}
		}
	});

	it('has no thorn, entity, or word-final long s', () => {
		for (const f of files) {
			for (const c of load(ORIG, f).chapters)
				for (const v of c.verses) {
					const where = `${f} ${c.chapter}:${v.verse}`;
					expect(v.text, where).not.toMatch(/þ|&thorn;|&#?\w+;/);
					expect(v.text, where).not.toMatch(/ſ(?![\p{L}ͤͭ])/u);
					expect(v.text.trim().length, where).toBeGreaterThan(0);
				}
		}
	});

	it('flags Apocrypha books supplied:false and not the 66', () => {
		expect(APOCRYPHA.length).toBe(10);
		for (const f of files) {
			const slug = f.replace('.json', '');
			const o = load(ORIG, f);
			if (APOCRYPHA.includes(slug)) expect(o.supplied, slug).toBe(false);
			else expect(o.supplied, slug).toBeUndefined();
		}
	});

	it('uses the superscript abbreviations, not bare thorn forms', () => {
		const all = files.map((f) => readFileSync(join(ORIG, f), 'utf8')).join('');
		expect(all).toContain('yͤ');
		expect(all).toContain('yͭ');
	});
});
