// scripts/export-lib.ts
// Pure helpers for turning the committed ODR corpus into the distribution
// bundle. No fs, no side effects, so tests import this without running a build
// (the same reason odr-lemma-lib.ts lives apart from its script).
//
// The corpus markup is a closed nine-tag vocabulary that does not recurse: no
// marker tag ever appears inside a note body, so the apparatus is exactly two
// levels deep and every pass here is flat.

export type TagName = 'i' | 'na' | 'mn' | 'cr' | 'sc' | 'alt' | 'br' | 'col-left' | 'col-right';

/** Which kind of text is being read. Decides both the legal tags and the array
 *  a marker resolves against, so it is always passed explicitly. */
export type BlockKind = 'verse' | 'summary' | 'prose';

export type Node =
	| { kind: 'text'; value: string; start: number }
	| { kind: 'tag'; name: TagName; close: boolean; content: string; start: number; length: number };

/** Raised for any condition that should stop the export rather than emit
 *  damaged output. Always carries the ref of the offending text. */
export class ExportError extends Error {
	constructor(ref: string, message: string) {
		super(`${ref}: ${message}`);
		this.name = 'ExportError';
	}
}

/** <br> is the one tag the corpus never closes. */
export const VOID_TAGS: ReadonlySet<TagName> = new Set<TagName>(['br']);

/** Measured against the whole corpus: each tag appears only where listed.
 *  Enforcing this is what catches an <na>/<mn> mix-up, which would otherwise
 *  resolve every note against the wrong array and still produce output. */
export const TAGS_BY_BLOCK: Record<BlockKind, ReadonlySet<TagName>> = {
	verse: new Set<TagName>(['i', 'na', 'cr', 'sc', 'alt']),
	summary: new Set<TagName>(['i', 'na']),
	prose: new Set<TagName>(['i', 'mn', 'sc', 'br', 'col-left', 'col-right'])
};

const TAG_RE = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)>/g;

export function tokenize(text: string, block: BlockKind, ref: string): Node[] {
	const legal = TAGS_BY_BLOCK[block];
	const nodes: Node[] = [];
	const open: TagName[] = [];
	let cursor = 0;

	for (const m of text.matchAll(TAG_RE)) {
		const [raw, slash, rawName] = m;
		const name = rawName as TagName;
		const at = m.index!;

		if (!legal.has(name)) {
			throw new ExportError(
				ref,
				`<${rawName}> is not legal in a ${block} block (legal: ${[...legal].join(', ')})`
			);
		}

		if (at > cursor) nodes.push({ kind: 'text', value: text.slice(cursor, at), start: cursor });

		const close = slash === '/';
		if (VOID_TAGS.has(name)) {
			if (close) throw new ExportError(ref, `<${name}> is void and must not be closed`);
		} else if (close) {
			if (open.pop() !== name) throw new ExportError(ref, `</${name}> does not match the open tag`);
		} else {
			open.push(name);
		}

		// A marker's content is the text up to its closing tag.
		let content = '';
		if (!close && (name === 'na' || name === 'mn' || name === 'cr')) {
			const end = text.indexOf(`</${name}>`, at);
			if (end === -1) throw new ExportError(ref, `unclosed <${name}>`);
			content = text.slice(at + raw.length, end);
		}

		nodes.push({ kind: 'tag', name, close, content, start: at, length: raw.length });
		cursor = at + raw.length;
	}

	if (open.length) throw new ExportError(ref, `unclosed <${open[open.length - 1]}>`);
	if (cursor < text.length) nodes.push({ kind: 'text', value: text.slice(cursor), start: cursor });
	return nodes;
}

/** Markers come in three forms, and one tag may carry several: `(c)[1]` is two
 *  markers at one position. Parsing content as a sequence rather than a single
 *  label is what makes those 33 cases work. */
const MARKER_TOKEN_RE = /\[(\d+)\]|\((.+?)\)|(◦)/g;

export function parseMarkerTokens(content: string): string[] {
	const out: string[] = [];
	for (const m of content.matchAll(MARKER_TOKEN_RE)) out.push(m[1] ?? m[2] ?? m[3]);
	return out.length ? out : [content];
}

export interface NoteLike {
	/** Every notes array but a verse's keys on this. Number, or the string '◦'. */
	marker?: number | string;
	/** Verse notes key on this instead. A string: '1', or 'a'. */
	label?: string;
	text: string;
}

export interface MarkerHit {
	token: string;
	noteIndex: number;
	/** Offset of the whole marker tag in the tagged text. */
	start: number;
	length: number;
}

export interface BindResult {
	hits: MarkerHit[];
	/** Tokens that matched no note. */
	unbound: string[];
	/** Indices of notes no marker referenced. */
	unreferenced: number[];
}

const noteKey = (n: NoteLike) => String(n.marker ?? n.label);

/**
 * Bind every marker in `text` to an entry of `notes`.
 *
 * The rule, verified against the whole corpus: the k-th occurrence of token t
 * binds to the k-th entry whose marker/label is t. A '◦' that matches no entry
 * binds instead to the next not-yet-consumed note in array order, because one
 * array can hold many notes all marked '◦' and the ring carries no number to
 * tell them apart.
 */
export function bindMarkers(
	text: string,
	notes: NoteLike[],
	block: BlockKind,
	ref: string
): BindResult {
	const markerTag = block === 'prose' ? 'mn' : 'na';
	const byToken = new Map<string, number[]>();
	notes.forEach((n, i) => {
		const k = noteKey(n);
		if (!byToken.has(k)) byToken.set(k, []);
		byToken.get(k)!.push(i);
	});

	const hits: MarkerHit[] = [];
	const unbound: string[] = [];
	const consumed = new Set<number>();
	const taken = new Map<string, number>();

	for (const node of tokenize(text, block, ref)) {
		if (node.kind !== 'tag' || node.close || node.name !== markerTag) continue;
		const full = `<${markerTag}>${node.content}</${markerTag}>`;
		for (const token of parseMarkerTokens(node.content)) {
			// A slot claimed by the ring fallback below is still on this token's
			// list (e.g. a note keyed '1' that a stray '◦' already consumed), so
			// skip past any already-consumed entries rather than trusting `taken`
			// alone. A token whose every entry is spoken for falls through to
			// unbound instead of double-binding someone else's note.
			const slots = byToken.get(token) ?? [];
			let nth = taken.get(token) ?? 0;
			while (nth < slots.length && consumed.has(slots[nth])) nth++;
			const slot = slots[nth];
			if (slot !== undefined) {
				taken.set(token, nth + 1);
				consumed.add(slot);
				hits.push({ token, noteIndex: slot, start: node.start, length: full.length });
				continue;
			}
			// A '◦' stands in for a note whose real marker never made it into the
			// text (or that isn't itself keyed '◦'). It claims the next unclaimed
			// note in array order; the `consumed` check above is what keeps that
			// claim from later being handed out a second time to a numbered token.
			if (token === '◦') {
				const next = notes.findIndex((_, i) => !consumed.has(i));
				if (next !== -1) {
					consumed.add(next);
					hits.push({ token, noteIndex: next, start: node.start, length: full.length });
					continue;
				}
			}
			unbound.push(token);
		}
	}

	const unreferenced = notes.map((_, i) => i).filter((i) => !consumed.has(i));
	return { hits, unbound, unreferenced };
}
