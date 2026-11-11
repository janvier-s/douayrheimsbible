/**
 * Inline clarifications (Sancta Clara Press, CC BY 4.0): a term in the verse
 * text carries a Latin word and an English gloss.
 *
 * Data lives in static/data/odr-clarifications/<book>.json as
 * { [chapter]: { [verse]: Clarification[] } }. `term` is the exact surface
 * string as it reads in our verse text and `occurrence` says which match of it
 * (0-based, whole words, case-insensitive) the clarification belongs to.
 *
 * The build script (scripts/build-odr-clarifications.ts) and the reader share
 * `visibleText` and `findTermMatches`, so an occurrence index always means the
 * same thing in both places.
 */

export interface Clarification {
	term: string;
	latin: string;
	gloss: string;
	occurrence: number;
}

export type BookClarifications = Record<string, Record<string, Clarification[]>>;

const WORD = '[\\p{L}\\p{N}]';

function escapeRe(s: string): string {
	return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** The reading text of a stored verse: note and cross-ref markers and all tags removed. */
export function visibleText(stored: string): string {
	return stored
		.replace(/<cr>[^<]*<\/cr>/g, '')
		.replace(/<na>[^<]*<\/na>/g, '')
		.replace(/<[^>]+>/g, '');
}

/** Whole-word, case-insensitive regex for a term; runs of space or punctuation between words are interchangeable. */
export function termRegex(term: string): RegExp {
	const parts = term
		.split(/[^\p{L}\p{N}]+/u)
		.filter(Boolean)
		.map(escapeRe);
	if (parts.length === 0) return /$^/u;
	return new RegExp(`(?<!${WORD})${parts.join('[^\\p{L}\\p{N}]+')}(?!${WORD})`, 'giu');
}

export interface TermMatch {
	start: number;
	end: number;
}

/** All non-overlapping matches of `term` in `text`, in order. */
export function findTermMatches(text: string, term: string): TermMatch[] {
	const re = termRegex(term);
	const out: TermMatch[] = [];
	let m: RegExpExecArray | null;
	while ((m = re.exec(text))) {
		out.push({ start: m.index, end: m.index + m[0].length });
		if (m[0].length === 0) re.lastIndex++;
	}
	return out;
}

function escapeAttr(s: string): string {
	return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

/**
 * Wrap each clarified term in rendered verse HTML with
 * <span class="clar" role="button" tabindex="0" data-term data-latin data-gloss>.
 *
 * Works on the final HTML (after markers, bionic and small caps are applied):
 * it walks the text nodes, skips marker buttons, and wraps every text-node
 * fragment of a match separately, so the result is well-formed whatever tags
 * (<mark>, <i>, <b>, <span>) the match crosses. The entry travels in the
 * data attributes, so a click handler needs no lookup.
 */
export function applyClarifications(html: string, items: Clarification[]): string {
	if (items.length === 0) return html;

	type Node = { text: boolean; raw: string; skip: boolean; vStart: number };
	const nodes: Node[] = [];
	let visible = '';
	let buttonDepth = 0;
	let dropcapDepth = 0;
	const tagRe = /<[^>]+>|[^<]+/g;
	let m: RegExpExecArray | null;
	const stack: boolean[] = []; // per open <span>: is it a dropcap
	while ((m = tagRe.exec(html))) {
		const raw = m[0];
		if (raw[0] === '<') {
			const open = raw.match(/^<(button|span)\b/i);
			const close = raw.match(/^<\/(button|span)\s*>/i);
			if (open) {
				if (open[1].toLowerCase() === 'button') buttonDepth++;
				else {
					const isDrop = /class="[^"]*\bdropcap\b/.test(raw);
					stack.push(isDrop);
					if (isDrop) dropcapDepth++;
				}
			} else if (close) {
				if (close[1].toLowerCase() === 'button') buttonDepth = Math.max(0, buttonDepth - 1);
				else if (stack.pop()) dropcapDepth--;
			}
			nodes.push({ text: false, raw, skip: true, vStart: visible.length });
		} else {
			const skip = buttonDepth > 0;
			nodes.push({ text: true, raw, skip: skip || dropcapDepth > 0, vStart: visible.length });
			if (!skip) visible += raw;
		}
	}

	// Collect [start, end, itemIndex] ranges in visible-text coordinates.
	const ranges: Array<[number, number, number]> = [];
	items.forEach((c, i) => {
		const hits = findTermMatches(visible, c.term);
		const hit = hits[c.occurrence];
		if (hit) ranges.push([hit.start, hit.end, i]);
	});
	if (ranges.length === 0) return html;
	ranges.sort((a, b) => a[0] - b[0]);
	// Drop overlaps; the earlier range wins.
	const kept: Array<[number, number, number]> = [];
	for (const r of ranges) if (!kept.length || r[0] >= kept[kept.length - 1][1]) kept.push(r);

	let out = '';
	for (const n of nodes) {
		// Tags, marker-button text and the drop cap letter are left as they are.
		if (!n.text || n.skip) {
			out += n.raw;
			continue;
		}
		const nStart = n.vStart;
		const nEnd = nStart + n.raw.length;
		let pos = 0;
		for (const [s, e, i] of kept) {
			if (e <= nStart || s >= nEnd) continue;
			const a = Math.max(s, nStart) - nStart;
			const b = Math.min(e, nEnd) - nStart;
			out += n.raw.slice(pos, a);
			out += `<span class="clar" role="button" tabindex="0" aria-haspopup="dialog" data-term="${escapeAttr(items[i].term)}" data-latin="${escapeAttr(items[i].latin)}" data-gloss="${escapeAttr(items[i].gloss)}">${n.raw.slice(a, b)}</span>`;
			pos = b;
		}
		out += n.raw.slice(pos);
	}
	return out;
}

/**
 * The clarifications that apply to one slice of a verse (poetry lines and
 * paragraph blocks render a verse in parts). `occurrence` counts matches over
 * the whole verse, so it is shifted by the matches that sit in the text before
 * the slice, and entries that belong to earlier or later parts are dropped.
 */
export function clarificationsForPart(
	items: Clarification[] | undefined,
	storedVerse: string,
	off: number,
	len: number
): Clarification[] | null {
	if (!items?.length) return null;
	if (off === 0 && len >= storedVerse.length) return items;
	const before = visibleText(storedVerse.slice(0, off));
	const inside = visibleText(storedVerse.slice(off, off + len));
	const out: Clarification[] = [];
	for (const c of items) {
		const occ = c.occurrence - findTermMatches(before, c.term).length;
		if (occ >= 0 && occ < findTermMatches(inside, c.term).length)
			out.push({ ...c, occurrence: occ });
	}
	return out.length ? out : null;
}
