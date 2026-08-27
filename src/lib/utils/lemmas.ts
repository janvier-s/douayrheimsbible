// src/lib/utils/lemmas.ts
// Turning the catchword spans recorded on a verse into the markup the reader
// sees. Pure, so the awkward parts (overlap, crossing, a verse split across
// paragraph lines) can be tested without rendering a component.

import type { LemmaSpan } from '$lib/data/types';

/**
 * Tints each annotation's catchword inside the verse it annotates.
 *
 * Spans overlap: "<sc>Hail</sc> full of grace" contains "full of grace", and
 * at Isaie 32:1 "the king shall reign" and "reign in justice, & the princes
 * shall rule in judgement" share a word without either containing the other.
 * Nested <mark> cannot express the second, so the verse is cut at every span
 * edge instead and each run records how many spans cover it. Depth shades
 * what nesting would have shaded, and the crossing case needs no special
 * handling.
 *
 * Offsets index the raw verse text with its markup, so this runs before
 * anything else in renderVerse rewrites it. No span edge in the corpus falls
 * inside a tag, which scripts/odr-lemmas.corpus.test.ts keeps true, so cutting at one
 * never splits a tag.
 */
export function highlightLemmas(
	text: string,
	lemmas: LemmaSpan[],
	verseNum: number,
	isStudy: boolean
): string {
	const edges = new Set<number>([0, text.length]);
	for (const [start, length] of lemmas) {
		edges.add(start);
		edges.add(start + length);
	}
	const points = [...edges].sort((a, b) => a - b);
	let out = '';
	for (let i = 0; i < points.length - 1; i++) {
		const from = points[i];
		const to = points[i + 1];
		const slice = text.slice(from, to);
		const covering = lemmas.filter(([start, length]) => start <= from && start + length >= to);
		if (covering.length === 0) {
			out += slice;
			continue;
		}
		// The narrowest span over a run is the annotation a reader clicking
		// there means, the one whose catchword is these exact words.
		const inner = covering.reduce((a, b) => (b[1] < a[1] ? b : a));
		// Clickable only where there is a panel to open. In reading mode the
		// tint is a tint, with no cursor promising something that will not
		// happen and nothing for the marker handlers to catch.
		const opens = isStudy
			? ` data-marker-type="lemma" data-marker="${inner[2]}" data-verse="${verseNum}"`
			: '';
		out += `<mark class="lemma"${opens} data-depth="${Math.min(covering.length, 3)}">${slice}</mark>`;
	}
	return out;
}

/** A verse's spans as they fall inside one paragraph part, rebased on it. A
 *  catchword running across a line or block break is tinted on both sides. */
export function lemmasForPart(lemmas: LemmaSpan[], off: number, length: number): LemmaSpan[] {
	const out: LemmaSpan[] = [];
	for (const [start, len, part] of lemmas) {
		const from = Math.max(start, off);
		const to = Math.min(start + len, off + length);
		if (to > from) out.push([from - off, to - from, part]);
	}
	return out;
}
