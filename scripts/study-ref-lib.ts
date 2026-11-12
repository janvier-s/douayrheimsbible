// scripts/study-ref-lib.ts
// The reference documents (prefaces, censures, tables, glossary, index,
// errata) as a format-neutral model. The files share a few shapes, listed in
// toRefDoc below; a file with a shape not listed throws, so a new one cannot
// be dropped silently.

import { ExportError } from './export-lib.js';
import { markedInline, plainInline, splitParas, type Inline } from './study-lib.js';

export type RBlock =
	| { k: 'h'; level: number; text: string }
	| { k: 'p'; lead?: string; inl: Inline[] }
	| { k: 'table'; head?: Inline[][]; rows: Inline[][][] };

export interface RefDoc {
	slug: string;
	title: string;
	subtitles: string[];
	blocks: RBlock[];
}

/** Title strings carry `<br><span class="ref-title-sub">…</span>`. */
export function splitTitle(raw: string): { title: string; subs: string[] } {
	const parts = raw
		.replace(/<\/?span[^>]*>/gi, '')
		.split(/<br\s*\/?>/i)
		.map((s) =>
			s
				.replace(/<[^>]+>/g, '')
				.replace(/\s+/g, ' ')
				.trim()
		)
		.filter(Boolean);
	return { title: parts[0] ?? '', subs: parts.slice(1) };
}

type Json = any; // reference JSON is heterogeneous by design

export function toRefDoc(slug: string, d: Json): RefDoc {
	const ref = `reference ${slug}`;
	const t = splitTitle(d.title ?? slug);
	const subtitles = [...t.subs];
	if (d.subtitle) subtitles.push(...splitTitle(d.subtitle).title.split('\n'));
	const blocks: RBlock[] = [];
	const cellOf = (s: string) => plainInline(String(s ?? ''), 'prose', ref);
	const prose = (text: string, notes: any[] = []) =>
		splitParas(
			markedInline(text, 'prose', ref, { notes, noteBlock: 'prose', keepUnreferenced: true })
		);
	const addProse = (text: string | null | undefined, notes?: any[]) => {
		if (!text) return;
		for (const inl of prose(text, notes)) blocks.push({ k: 'p', inl });
	};
	let known = false;

	if (d.marginal_note) addProse(d.marginal_note);

	for (const p of d.paragraphs ?? []) {
		known = true;
		if (typeof p.text === 'string') addProse(p.text, p.notes);
		else if (p.table) {
			const [head, ...rows] = p.table as string[][];
			blocks.push({ k: 'table', head: head.map(cellOf), rows: rows.map((r) => r.map(cellOf)) });
		} else if (p.letter) {
			blocks.push({ k: 'h', level: 1, text: String(p.letter) });
			for (const e of p.entries) addProse(e, p.notes);
		} else throw new ExportError(ref, `unrecognised paragraph shape: ${Object.keys(p)}`);
	}

	if (d.articles) {
		known = true;
		for (const a of d.articles) blocks.push({ k: 'p', lead: `${a.number}.`, inl: cellOf(a.text) });
	}

	if (d.subsections) {
		known = true;
		for (const s of d.subsections) {
			blocks.push({ k: 'h', level: 1, text: `${s.number}. ${splitTitle(s.heading).title}` });
			for (const p of s.paragraphs) addProse(p.text, p.notes);
		}
	}

	if (d.columns && d.entries) {
		known = true;
		const keys =
			d.entries[0]?.emperor !== undefined
				? ['emperor', 'col1', 'col2', 'col3', 'desc']
				: ['mt', 'mr', 'lu', 'io', 'desc'];
		const head =
			d.entries[0]?.emperor !== undefined
				? [d.columns[0], d.columns[1], d.columns[2], '', d.columns[3]]
				: d.columns;
		let rows: Inline[][][] = [];
		const closeTable = () => {
			if (rows.length) blocks.push({ k: 'table', head: head.map(cellOf), rows });
			rows = [];
		};
		for (const e of d.entries) {
			if (e.note) {
				closeTable();
				blocks.push({ k: 'h', level: 1, text: e.note });
			}
			rows.push(keys.map((k) => cellOf(e[k])));
		}
		closeTable();
		for (const c of d.closing ?? []) (addProse(c.text), c.note && addProse(c.note));
	} else if (d.entries && d.entries[0]?.words) {
		known = true;
		for (const g of d.entries) {
			blocks.push({ k: 'h', level: 1, text: String(g.letter) });
			blocks.push({
				k: 'table',
				head: [cellOf('Word'), cellOf('Meaning')],
				rows: g.words.map((w: Json) => [cellOf(w.word), cellOf(w.definition)])
			});
		}
	} else if (d.entries && d.entries[0]?.entries) {
		known = true;
		for (const g of d.entries) {
			blocks.push({ k: 'h', level: 1, text: String(g.letter) });
			for (const e of g.entries) addProse(e);
		}
		if (typeof d.closing === 'string') addProse(d.closing);
	}

	if (d.books) {
		known = true;
		for (const b of d.books) {
			blocks.push({ k: 'h', level: 1, text: String(b.book) });
			for (const e of b.entries) addProse(e);
		}
		if (d.closing?.text) addProse(d.closing.text, d.closing.notes);
	}

	if (d.sections) {
		known = true;
		for (const s of d.sections) {
			blocks.push({ k: 'h', level: 1, text: splitTitle(s.title).title });
			for (const e of s.entries) {
				if (typeof e === 'string') addProse(e);
				else {
					blocks.push({ k: 'p', lead: `${e.group}:`, inl: [] });
					for (const x of e.bracket_entries) addProse(x);
				}
			}
		}
		for (const n of d.notes ?? []) addProse(`[${n.marker}] ${n.text}`);
	}

	// scripture-authority closes with a paragraph object, not a string.
	if (d.subsections && d.closing?.text) addProse(d.closing.text, d.closing.notes);

	if (!known) throw new ExportError(ref, `unrecognised reference shape: ${Object.keys(d)}`);
	return { slug, title: t.title, subtitles, blocks };
}
