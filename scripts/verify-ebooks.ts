// scripts/verify-ebooks.ts
// @ts-nocheck: build-time check run with tsx
// Leak check for the verse-only EPUB, DOCX and OSIS files: reads each output
// back, takes its plain text, and fails if any apparatus is present (inline
// markers, tag names, or the opening words of an intro, summary, annotation
// or note). Also checks every verse's words are present, so a leak check
// cannot pass on an empty file.
//
//   npx tsx scripts/verify-ebooks.ts <bundle-dir> [epub|docx|osis ...]

import { readdirSync, readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';
import { readJson } from './odr-corpus-json.js';
import { ALL_BOOKS } from '../src/lib/data/books.js';
import { stripMarkup } from './export-lib.js';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const ODR = join(ROOT, 'static', 'data', 'odr');
const norm = (s) =>
	s
		.replace(/\s+/g, ' ')
		.replace(/ ([,.;:!?)])/g, '$1')
		.trim();

/** `full` is every word in the file. `words` leaves out footnote markers and
 *  inline notes, so a note sitting inside a verse does not split its words. */
export function plainText(path) {
	if (path.endsWith('.osis.xml')) {
		const xml = readFileSync(path, 'utf8');
		const flat = (x) =>
			norm(
				x
					.replace(/<\/?hi[^>]*>/g, '')
					.replace(/<[^>]+>/g, ' ')
					.replace(/&amp;/g, '&')
					.replace(/&lt;/g, '<')
					.replace(/&gt;/g, '>')
					.replace(/ ([,.;:!?)])/g, '$1')
			);
		const noMarks = xml.replace(/<hi type="super">\d+<\/hi>/g, '');
		return { raw: flat(xml), full: flat(noMarks), words: flat(noMarks.replace(/<note[\s\S]*?<\/note>/g, '')) };
	}
	const full = norm(
		execFileSync(process.env.PANDOC ?? 'pandoc', ['-t', 'plain', '--wrap=none', path], {
			encoding: 'utf8',
			maxBuffer: 1 << 28
		})
	);
	const full2 = norm(full.replace(/\[\d+\]/g, ''));
	return { raw: full, full: full2, words: full2 };
}

const clean = (t, kind, ref) => {
	try {
		return norm(stripMarkup(t, kind, ref));
	} catch {
		return norm(String(t).replace(/<[^>]+>/g, ''));
	}
};
const head = (s, n = 45) => s.slice(0, n);

export function checkBook(slug, { raw, full, words }, edition) {
	// Small caps render upper case in plain text; compare case-insensitively.
	const text = full.toLowerCase();
	const verseText = words.toLowerCase();
	const { data: book } = readJson(join(ODR, `${slug}.json`));
	const problems = [];
	const scripture = book.chapters
		.filter((c) => c.chapter !== 0)
		.flatMap((c) => c.verses.filter((v) => v.verse !== 0).map((v) => clean(v.text, 'verse', slug)))
		.join(' ')
		.toLowerCase();
	// Words must be there. Spot-check every verse by its opening words.
	for (const ch of book.chapters) {
		if (ch.chapter === 0) continue;
		for (const v of ch.verses) {
			if (v.verse === 0) continue;
			const w = head(clean(v.text, 'verse', `${slug} ${ch.chapter}:${v.verse}`), 30);
			if (w.length >= 8 && !verseText.includes(w.toLowerCase()))
				problems.push(`missing verse ${ch.chapter}:${v.verse} "${w}"`);
		}
	}
	if (edition === 'verse-only' && /<\/?(na|cr|alt|mn|sc|i|br)>|\[\d+\]|&lt;|\\\*/.test(raw))
		problems.push('markup or marker residue in text');
	const apparatus = [];
	for (const [i, it] of (book.intros ?? []).entries())
		apparatus.push(['intro', clean(it.text, 'prose', `${slug} intro[${i}]`)]);
	for (const ch of book.chapters) {
		if (ch.summary)
			apparatus.push([
				`summary ${ch.chapter}`,
				clean(ch.summary, 'summary', `${slug} ${ch.chapter} summary`)
			]);
		for (const a of ch.articles ?? [])
			apparatus.push(['article', clean(a.text, 'prose', `${slug} article`)]);
		for (const v of ch.verses)
			for (const n of [...(v.notes ?? []), ...(v.cross_refs ?? []).filter((r) => r.source !== 'sancta')])
				apparatus.push([`note ${ch.chapter}:${v.verse}`, clean(n.text, 'verse', `${slug} note`)]);
	}
	const annDir = join(ODR, slug, 'annotations');
	if (existsSync(annDir))
		for (const f of readdirSync(annDir).filter((x) => x.endsWith('.json'))) {
			const { data } = readJson(join(annDir, f));
			for (const a of data.annotations)
				apparatus.push([
					`annotation ${data.chapter}:${a.verse}`,
					clean(a.text, 'prose', `${slug} ann`)
				]);
		}
	for (const [kind, t] of apparatus) {
		const h = head(t);
		if (h.length < 30) continue;
		// Notes and annotations are notes in OSIS; everything else is checked against the words outside notes.
		const inNote = kind.startsWith('note') || kind.startsWith('annotation');
		const present = (inNote ? text : verseText).includes(h.toLowerCase());
		if (edition === 'verse-only') {
			// A note that quotes the verse itself is not a leak.
			if (!scripture.includes(h.toLowerCase()) && present)
				problems.push(`apparatus leaked: ${kind} "${h}"`);
		} else if (!present) {
			// The study edition must carry every note, annotation, summary and intro.
			problems.push(`apparatus missing: ${kind} "${h}"`);
		}
	}
	return problems;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const dir = process.argv[2];
	const wanted = process.argv.slice(3);
	const edition = process.env.EDITION ?? 'verse-only';
	let bad = 0,
		n = 0;
	const ext = { epub: '.epub', docx: '.docx', osis: '.osis.xml' };
	for (const fmt of wanted.length ? wanted : Object.keys(ext)) {
		const d = join(dir, edition, fmt);
		if (!existsSync(d)) continue;
		for (const f of readdirSync(d).filter((x) => x.endsWith(ext[fmt]))) {
			const m = f.match(/^\d+-(.+?)\.[a-z.]+$/);
			n++;
			if (!m) continue; // whole-Bible file: checked through its books
			const probs = checkBook(m[1], plainText(join(d, f)), edition);
			for (const p of probs.slice(0, 5)) {
				console.log(`${fmt}/${f}: ${p}`);
			}
			if (probs.length) bad++;
		}
	}
	console.log(`checked ${n} files, ${bad} with problems`);
	process.exit(bad ? 1 : 0);
}
