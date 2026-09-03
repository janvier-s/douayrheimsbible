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
