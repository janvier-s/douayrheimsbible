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

/**
 * The two markers in the corpus that cannot bind. Both are transcription
 * defects in the source, not forms the resolver fails to handle:
 *
 *   1-timothy 2:6        prints <na>[1]</na> twice against a single note
 *   ecclesiasticus 14:10 carries a <na>(†)</na> and has no notes array at all
 */
export const KNOWN_UNBOUND: ReadonlySet<string> = new Set([
	'1-timothy 2:6',
	'ecclesiasticus 14:10'
]);

/** The 26 notes no marker references, as `${ref} note ${token}`. */
export const KNOWN_UNREFERENCED: ReadonlySet<string> = new Set([
	'1-corinthians 14 article note 8',
	'1-john 4:21 note 1',
	'1-peter 5:14 note 1',
	'3-kings 6:38 note 1',
	'acts endMatter note 1',
	'acts 15:41 note 1',
	'acts ann 8:38 note 1',
	'acts ann 8:38 note 2',
	'apocalypse 20:15 note 1',
	'james intro note ◦',
	'john 1:51 note 1',
	'john 21:25 note 1',
	'john 21:25 note 2',
	'matthew intro note 1',
	'matthew intro note 2',
	'matthew 16:28 note 1',
	'psalms 98:6 note 1',
	'romans intro note 1',
	'romans intro note 2',
	'romans intro note 3',
	'romans 9:33 note 1',
	'romans 10:16 note 1',
	'romans ann 8:30 note 2',
	'romans ann 8:38 note 1',
	'romans ann 8:38 note 2',
	'romans ann 9:14 note ◦'
]);

/**
 * The one annotation whose inline formatting does not balance inside a single
 * note. Daniel 12:7 opens <i> on its list of Fathers in note 3 and closes it in
 * note 4 — one italic run the printed source spread across two footnotes, which
 * a string-per-note shape cannot represent. Rendered independently, note 3 has
 * an unclosed tag and note 4 an orphaned closer.
 *
 * Listed rather than repaired: static/data/odr/ is hand-maintained and this
 * export only reads it.
 */
export const KNOWN_UNBALANCED: ReadonlySet<string> = new Set(['daniel ann 12:7']);

/**
 * Fail on any irregularity that is not one of the 28 recorded above.
 *
 * The list is data rather than a tolerance rule on purpose. A rule that simply
 * skipped unbindable markers would absorb the next defect in silence; an exact
 * list makes a new one stop the build.
 */
export function assertOnlyKnownDefects(result: BindResult, notes: NoteLike[], ref: string): void {
	if (result.unbound.length && !KNOWN_UNBOUND.has(ref)) {
		throw new ExportError(ref, `marker(s) ${result.unbound.join(', ')} bind to no note`);
	}
	for (const i of result.unreferenced) {
		const entry = `${ref} note ${noteKey(notes[i])}`;
		if (!KNOWN_UNREFERENCED.has(entry)) {
			throw new ExportError(ref, `unreferenced note ${noteKey(notes[i])}`);
		}
	}
}

const MARKER_TAGS: ReadonlySet<TagName> = new Set<TagName>(['na', 'mn', 'cr']);

/** Plain prose: markers gone entirely, formatting delimiters gone but their
 *  words kept. Notes and cross-references survive as structured data in the
 *  JSON alongside, so nothing is actually lost by dropping the anchors here. */
export function stripMarkup(text: string, block: BlockKind, ref: string): string {
	let out = '';
	let skipUntilClose: TagName | null = null;

	for (const node of tokenize(text, block, ref)) {
		if (node.kind === 'tag') {
			if (skipUntilClose) {
				if (node.close && node.name === skipUntilClose) skipUntilClose = null;
				continue;
			}
			if (!node.close && MARKER_TAGS.has(node.name)) {
				skipUntilClose = node.name;
				continue;
			}
			if (node.name === 'br') out += '\n';
			continue;
		}
		if (!skipUntilClose) out += node.value;
	}

	// Removing a marker leaves the space on either side of it.
	return out.replace(/[ \t]{2,}/g, ' ').trim();
}

export interface BookCode {
	/** USFM 3.0 book identifier, for \id. */
	usfm: string;
	/** Paratext's number for that identifier. Recorded in the manifest only. */
	paratext: string;
	/** Position in the ODR canon, 1-76. Drives the filename prefix. */
	ordinal: number;
}

/**
 * Every slug in books.ts, in ODR canonical order.
 *
 * Filenames use `ordinal`, not `paratext`, because Paratext numbers the
 * deuterocanon from 68 up and would sort Tobias after Revelation. The ODR
 * prints them among the OT, and a bundle named for the ODR should list them
 * that way.
 *
 * Where the ODR ships a composite that USFM also publishes split, the
 * composite code wins: ESG not EST (Esther has the Greek additions as ch.
 * 11-16), DAG not DAN (Daniel has Susanna and Bel as ch. 13-14), BAR with the
 * Letter of Jeremiah as ch. 6 rather than a separate LJE, and 2ES not
 * EZA+5EZ+6EZ. Splitting would invent a structure the source does not have.
 */
export const BOOK_CODES: Readonly<Record<string, BookCode>> = {
	genesis: { usfm: 'GEN', paratext: '01', ordinal: 1 },
	exodus: { usfm: 'EXO', paratext: '02', ordinal: 2 },
	leviticus: { usfm: 'LEV', paratext: '03', ordinal: 3 },
	numbers: { usfm: 'NUM', paratext: '04', ordinal: 4 },
	deuteronomy: { usfm: 'DEU', paratext: '05', ordinal: 5 },
	josue: { usfm: 'JOS', paratext: '06', ordinal: 6 },
	judges: { usfm: 'JDG', paratext: '07', ordinal: 7 },
	ruth: { usfm: 'RUT', paratext: '08', ordinal: 8 },
	'1-kings': { usfm: '1SA', paratext: '09', ordinal: 9 },
	'2-kings': { usfm: '2SA', paratext: '10', ordinal: 10 },
	'3-kings': { usfm: '1KI', paratext: '11', ordinal: 11 },
	'4-kings': { usfm: '2KI', paratext: '12', ordinal: 12 },
	'1-paralipomenon': { usfm: '1CH', paratext: '13', ordinal: 13 },
	'2-paralipomenon': { usfm: '2CH', paratext: '14', ordinal: 14 },
	'1-esdras': { usfm: 'EZR', paratext: '15', ordinal: 15 },
	'2-esdras': { usfm: 'NEH', paratext: '16', ordinal: 16 },
	tobias: { usfm: 'TOB', paratext: '68', ordinal: 17 },
	judith: { usfm: 'JDT', paratext: '69', ordinal: 18 },
	esther: { usfm: 'ESG', paratext: '70', ordinal: 19 },
	'1-machabees': { usfm: '1MA', paratext: '78', ordinal: 20 },
	'2-machabees': { usfm: '2MA', paratext: '79', ordinal: 21 },
	job: { usfm: 'JOB', paratext: '18', ordinal: 22 },
	psalms: { usfm: 'PSA', paratext: '19', ordinal: 23 },
	proverbs: { usfm: 'PRO', paratext: '20', ordinal: 24 },
	ecclesiastes: { usfm: 'ECC', paratext: '21', ordinal: 25 },
	'canticle-of-canticles': { usfm: 'SNG', paratext: '22', ordinal: 26 },
	wisdom: { usfm: 'WIS', paratext: '71', ordinal: 27 },
	ecclesiasticus: { usfm: 'SIR', paratext: '72', ordinal: 28 },
	isaie: { usfm: 'ISA', paratext: '23', ordinal: 29 },
	jeremie: { usfm: 'JER', paratext: '24', ordinal: 30 },
	lamentations: { usfm: 'LAM', paratext: '25', ordinal: 31 },
	baruch: { usfm: 'BAR', paratext: '73', ordinal: 32 },
	ezechiel: { usfm: 'EZK', paratext: '26', ordinal: 33 },
	daniel: { usfm: 'DAG', paratext: '27', ordinal: 34 },
	osee: { usfm: 'HOS', paratext: '28', ordinal: 35 },
	joel: { usfm: 'JOL', paratext: '29', ordinal: 36 },
	amos: { usfm: 'AMO', paratext: '30', ordinal: 37 },
	abdias: { usfm: 'OBA', paratext: '31', ordinal: 38 },
	jonas: { usfm: 'JON', paratext: '32', ordinal: 39 },
	micheas: { usfm: 'MIC', paratext: '33', ordinal: 40 },
	nahum: { usfm: 'NAM', paratext: '34', ordinal: 41 },
	habacuc: { usfm: 'HAB', paratext: '35', ordinal: 42 },
	sophonias: { usfm: 'ZEP', paratext: '36', ordinal: 43 },
	aggeus: { usfm: 'HAG', paratext: '37', ordinal: 44 },
	zacharias: { usfm: 'ZEC', paratext: '38', ordinal: 45 },
	malachie: { usfm: 'MAL', paratext: '39', ordinal: 46 },
	'prayer-of-manasses': { usfm: 'MAN', paratext: '84', ordinal: 47 },
	'3-esdras': { usfm: '1ES', paratext: '82', ordinal: 48 },
	'4-esdras': { usfm: '2ES', paratext: '83', ordinal: 49 },
	matthew: { usfm: 'MAT', paratext: '41', ordinal: 50 },
	mark: { usfm: 'MRK', paratext: '42', ordinal: 51 },
	luke: { usfm: 'LUK', paratext: '43', ordinal: 52 },
	john: { usfm: 'JHN', paratext: '44', ordinal: 53 },
	acts: { usfm: 'ACT', paratext: '45', ordinal: 54 },
	romans: { usfm: 'ROM', paratext: '46', ordinal: 55 },
	'1-corinthians': { usfm: '1CO', paratext: '47', ordinal: 56 },
	'2-corinthians': { usfm: '2CO', paratext: '48', ordinal: 57 },
	galatians: { usfm: 'GAL', paratext: '49', ordinal: 58 },
	ephesians: { usfm: 'EPH', paratext: '50', ordinal: 59 },
	philippians: { usfm: 'PHP', paratext: '51', ordinal: 60 },
	colossians: { usfm: 'COL', paratext: '52', ordinal: 61 },
	'1-thessalonians': { usfm: '1TH', paratext: '53', ordinal: 62 },
	'2-thessalonians': { usfm: '2TH', paratext: '54', ordinal: 63 },
	'1-timothy': { usfm: '1TI', paratext: '55', ordinal: 64 },
	'2-timothy': { usfm: '2TI', paratext: '56', ordinal: 65 },
	titus: { usfm: 'TIT', paratext: '57', ordinal: 66 },
	philemon: { usfm: 'PHM', paratext: '58', ordinal: 67 },
	hebrews: { usfm: 'HEB', paratext: '59', ordinal: 68 },
	james: { usfm: 'JAS', paratext: '60', ordinal: 69 },
	'1-peter': { usfm: '1PE', paratext: '61', ordinal: 70 },
	'2-peter': { usfm: '2PE', paratext: '62', ordinal: 71 },
	'1-john': { usfm: '1JN', paratext: '63', ordinal: 72 },
	'2-john': { usfm: '2JN', paratext: '64', ordinal: 73 },
	'3-john': { usfm: '3JN', paratext: '65', ordinal: 74 },
	jude: { usfm: 'JUD', paratext: '66', ordinal: 75 },
	apocalypse: { usfm: 'REV', paratext: '67', ordinal: 76 }
};

export function bookCode(slug: string): BookCode {
	const code = BOOK_CODES[slug];
	if (!code) throw new ExportError(slug, 'no USFM book code for this slug');
	return code;
}

export function usfmFilename(slug: string): string {
	const { usfm, ordinal } = bookCode(slug);
	return `${String(ordinal).padStart(2, '0')}-${usfm}.usfm`;
}

export interface Verse {
	verse: number;
	text: string;
	notes?: NoteLike[];
	cross_refs?: Array<{ text: string }>;
	has_annotation?: boolean;
	lemmas?: Array<[number, number, number]>;
}

const CHAR_MARKERS: Partial<Record<TagName, string>> = { i: 'it', sc: 'sc' };

/**
 * Collapses every run of whitespace to one space.
 *
 * Only for values of markers whose content must stay on one line (\h, \toc1-3,
 * \mt1, \cd, \v): the corpus has literal newlines inside them, and a USFM line
 * that does not start with a backslash is unparseable. Deliberately NOT applied
 * inside stripMarkup, whose `\n` for <br> is what renderProse splits \ip on.
 */
const oneLine = (text: string): string => text.replace(/\s+/g, ' ').trim();

/**
 * Drops a closing tag with no matching opener and appends closers for any tag
 * still open at the end, leaving everything else byte for byte as it was.
 * Void tags (<br>) are not tracked. Exists only for KNOWN_UNBALANCED refs; the
 * text is otherwise left to fail tokenize()'s strict balance check.
 */
export function balanceInline(text: string): string {
	const open: TagName[] = [];
	let out = '';
	let cursor = 0;

	for (const m of text.matchAll(TAG_RE)) {
		const [raw, slash, rawName] = m;
		const name = rawName as TagName;
		const at = m.index!;
		out += text.slice(cursor, at);
		cursor = at + raw.length;

		if (VOID_TAGS.has(name)) {
			out += raw;
			continue;
		}
		if (slash === '/') {
			if (open.length && open[open.length - 1] === name) {
				open.pop();
				out += raw;
			}
			// else: orphaned closer, dropped
		} else {
			open.push(name);
			out += raw;
		}
	}
	out += text.slice(cursor);
	for (let i = open.length - 1; i >= 0; i--) out += `</${open[i]}>`;
	return out;
}

/** Inline formatting only. Used for note bodies, where markers never occur. */
function renderInline(text: string, block: BlockKind, ref: string): string {
	const source = KNOWN_UNBALANCED.has(ref) ? balanceInline(text) : text;
	let out = '';
	for (const node of tokenize(source, block, ref)) {
		if (node.kind === 'text') {
			out += node.value;
		} else if (CHAR_MARKERS[node.name]) {
			out += node.close ? `\\${CHAR_MARKERS[node.name]}*` : `\\${CHAR_MARKERS[node.name]} `;
		} else if (node.name === 'br') {
			out += '\n';
		}
	}
	return out;
}

/**
 * One verse as USFM.
 *
 * <alt> marks the span a marginal variant applies to. USFM has no body-text
 * marker for that, and needs none: \fq inside the note is exactly "the words
 * this note is about". So the span stays plain in the body and is repeated as
 * \fq in its footnote, which is the idiomatic form.
 */
export function renderVerse(verse: Verse, chapter: number, ref: string): string {
	const notes = verse.notes ?? [];
	const refs = verse.cross_refs ?? [];
	const bound = bindMarkers(verse.text, notes, 'verse', ref);
	assertOnlyKnownDefects(bound, notes, ref);

	// Keyed by offset, and a list because one tag may carry several tokens:
	// `<na>(c)[1]</na>` is two markers at one position, so both notes print.
	const notesAt = new Map<number, MarkerHit[]>();
	for (const hit of bound.hits) {
		if (!notesAt.has(hit.start)) notesAt.set(hit.start, []);
		notesAt.get(hit.start)!.push(hit);
	}
	const altFor = new Map<number, string>(); // marker offset -> alt words
	const nodes = tokenize(verse.text, 'verse', ref);

	// Pair each <alt> with the nearest marker on either side.
	for (let i = 0; i < nodes.length; i++) {
		const n = nodes[i];
		if (n.kind !== 'tag' || n.close || n.name !== 'alt') continue;
		let words = '';
		for (let j = i + 1; j < nodes.length; j++) {
			const m = nodes[j];
			if (m.kind === 'tag' && m.close && m.name === 'alt') break;
			if (m.kind === 'text') words += m.value;
		}
		const before = nodes
			.slice(0, i)
			.reverse()
			.find((m) => m.kind === 'tag' && !m.close && m.name !== 'alt');
		const after = nodes
			.slice(i)
			.find((m) => m.kind === 'tag' && !m.close && (m.name === 'na' || m.name === 'cr'));
		const anchor =
			before?.kind === 'tag' && (before.name === 'na' || before.name === 'cr') ? before : after;
		if (anchor?.kind === 'tag') altFor.set(anchor.start, words.trim());
	}

	let out = `\\v ${verse.verse} `;
	let crossRefIndex = 0;
	let skipUntilClose: TagName | null = null;

	for (const node of nodes) {
		if (node.kind === 'text') {
			if (!skipUntilClose) out += node.value;
			continue;
		}
		if (skipUntilClose) {
			if (node.close && node.name === skipUntilClose) skipUntilClose = null;
			continue;
		}
		if (node.close) {
			if (CHAR_MARKERS[node.name]) out += `\\${CHAR_MARKERS[node.name]}*`;
			continue;
		}
		if (CHAR_MARKERS[node.name]) {
			out += `\\${CHAR_MARKERS[node.name]} `;
		} else if (node.name === 'na') {
			skipUntilClose = 'na';
			const alt = altFor.get(node.start);
			// Empty when the marker is one of the pinned defects, in which case
			// it prints nothing rather than a dangling \f.
			for (const hit of notesAt.get(node.start) ?? []) {
				const body = renderInline(notes[hit.noteIndex].text, 'verse', ref);
				const fq = alt ? `\\fq ${alt} ` : '';
				out += `\\f ${hit.token} \\fr ${chapter}.${verse.verse} ${fq}\\ft ${body}\\f*`;
			}
		} else if (node.name === 'cr') {
			skipUntilClose = 'cr';
			const target = refs[crossRefIndex++];
			if (!target) throw new ExportError(ref, 'cross-reference marker with no cross_refs entry');
			out += `\\x - \\xt ${target.text}\\x*`;
		}
		// <alt> delimiters themselves emit nothing; their words fall through as text.
	}

	if (crossRefIndex !== refs.length) {
		throw new ExportError(ref, `${refs.length - crossRefIndex} cross_refs with no marker`);
	}
	// oneLine, not just a space squeeze: 5 verse notes carry a literal newline,
	// and the `verse` block kind permits no <br>, so no real break is lost.
	return oneLine(out);
}

export interface Annotation {
	verse: number;
	part?: number;
	title?: string | null;
	text: string;
	notes?: NoteLike[];
}

const SUPERSCRIPTS = '⁰¹²³⁴⁵⁶⁷⁸⁹';
const superscript = (n: number) =>
	String(n)
		.split('')
		.map((d) => SUPERSCRIPTS[Number(d)])
		.join('');

/**
 * One annotation as an \ef study note.
 *
 * USFM notes cannot nest: the spec allows nested character markers via the \+
 * prefix, but there is no legal way to put an \f or \ef inside another. The
 * corpus nonetheless has two levels of apparatus, so the sub-notes are
 * flattened explicitly rather than misrepresented — each marker becomes a
 * superscript where it stood, and the notes follow as a trailing \fq/\ft run
 * inside the same \ef. Position, text, and association survive; structural
 * containment does not.
 *
 * The superscript comes from the note's ordinal within the annotation, not
 * from the marker token, because a '◦' carries no number to render.
 */
export function renderAnnotation(ann: Annotation, chapter: number, ref: string): string {
	const notes = ann.notes ?? [];
	const bound = bindMarkers(ann.text, notes, 'prose', ref);
	assertOnlyKnownDefects(bound, notes, ref);

	// A list per offset, since one tag may carry several tokens.
	const ordinalsAt = new Map<number, number[]>();
	bound.hits.forEach((hit, i) => {
		if (!ordinalsAt.has(hit.start)) ordinalsAt.set(hit.start, []);
		ordinalsAt.get(hit.start)!.push(i + 1);
	});

	let body = '';
	let skip = false;
	for (const node of tokenize(ann.text, 'prose', ref)) {
		if (node.kind === 'text') {
			if (!skip) body += node.value;
			continue;
		}
		if (skip) {
			if (node.close && node.name === 'mn') skip = false;
			continue;
		}
		if (node.name === 'mn' && !node.close) {
			skip = true;
			for (const ordinal of ordinalsAt.get(node.start) ?? []) body += superscript(ordinal);
		} else if (CHAR_MARKERS[node.name]) {
			body += node.close ? `\\${CHAR_MARKERS[node.name]}*` : `\\${CHAR_MARKERS[node.name]} `;
		} else if (node.name === 'br') {
			body += ' ';
		}
		// <col-left>/<col-right> collapse: USFM has no column model inside a note.
	}

	// Paragraph breaks cannot survive inside a note either.
	body = body
		.replace(/\n+/g, ' ')
		.replace(/[ \t]{2,}/g, ' ')
		.trim();

	const parts = [`\\ef - \\fr ${chapter}.${ann.verse}`];
	if (ann.title) parts.push(`\\fq ${ann.title}`);
	parts.push(`\\ft ${body}`);

	const trailing = bound.hits.map((hit, i) => {
		const text = renderInline(notes[hit.noteIndex].text, 'prose', ref);
		return `\\fq ${superscript(i + 1)} \\ft ${text}`;
	});

	return `${[...parts, ...trailing].join(' ')}\\ef*`;
}

export interface Prose {
	title?: string;
	text: string;
	notes?: NoteLike[];
}

export interface Chapter {
	chapter: number;
	verses: Verse[];
	summary?: string;
	summary_notes?: NoteLike[];
	articles?: Prose[];
}

export interface Book {
	book: string;
	book_title?: string;
	short_title?: string;
	intros?: Prose[];
	endMatters?: Prose[];
	chapters: Chapter[];
}

/**
 * An intro, article, or end-matter block.
 *
 * Paragraphs are real \ip here rather than collapsing, because unlike a note
 * body this is ordinary body text. Its <mn> markers become \f footnotes; they
 * cannot be passed through renderInline, which would drop the delimiters and
 * leave the marker's content ('[1]') sitting in the prose as literal text.
 */
function renderProse(block: Prose, ref: string): string[] {
	const notes = block.notes ?? [];
	const bound = bindMarkers(block.text, notes, 'prose', ref);
	assertOnlyKnownDefects(bound, notes, ref);

	const notesAt = new Map<number, MarkerHit[]>();
	for (const hit of bound.hits) {
		if (!notesAt.has(hit.start)) notesAt.set(hit.start, []);
		notesAt.get(hit.start)!.push(hit);
	}

	let flat = '';
	let skip = false;
	for (const node of tokenize(block.text, 'prose', ref)) {
		if (node.kind === 'text') {
			if (!skip) flat += node.value;
			continue;
		}
		if (skip) {
			if (node.close && node.name === 'mn') skip = false;
			continue;
		}
		if (node.name === 'mn' && !node.close) {
			skip = true;
			for (const hit of notesAt.get(node.start) ?? []) {
				flat += `\\f - \\ft ${renderInline(notes[hit.noteIndex].text, 'prose', ref)}\\f*`;
			}
		} else if (CHAR_MARKERS[node.name]) {
			flat += node.close ? `\\${CHAR_MARKERS[node.name]}*` : `\\${CHAR_MARKERS[node.name]} `;
		} else if (node.name === 'br') {
			flat += '\n';
		}
		// <col-left>/<col-right> have no USFM column model; their text runs on.
	}

	const lines: string[] = [];
	if (block.title) lines.push(`\\is ${block.title}`);
	for (const para of flat.split(/\n+/).map((p) => p.trim())) {
		if (para) lines.push(`\\ip ${para}`);
	}
	return lines;
}

export function renderUsfm(
	slug: string,
	book: Book,
	annotations: Map<number, Annotation[]>,
	opts: { includeAnnotations: boolean },
	fallbackTitle: string
): string {
	const { usfm } = bookCode(slug);
	// The three appendix books carry no book_title/short_title, so the caller
	// supplies odrName from books.ts. USFM requires \h and \mt1.
	// 34 book_title values carry a literal newline; \h/\toc/\mt1 are single-line.
	const long = oneLine(book.book_title ?? fallbackTitle);
	const short = oneLine(book.short_title ?? book.book ?? fallbackTitle);

	const lines: string[] = [
		`\\id ${usfm} Original Douay-Rheims (1582/1610)`,
		'\\usfm 3.0',
		'\\ide UTF-8',
		`\\h ${short}`,
		`\\toc1 ${long}`,
		`\\toc2 ${short}`,
		`\\toc3 ${usfm}`,
		`\\mt1 ${long}`
	];

	for (const intro of book.intros ?? []) lines.push(...renderProse(intro, `${slug} intro`));

	for (const chapter of book.chapters) {
		lines.push(`\\c ${chapter.chapter}`);

		if (chapter.summary) {
			const ref = `${slug} ${chapter.chapter} summary`;
			const notes = chapter.summary_notes ?? [];
			const bound = bindMarkers(chapter.summary, notes, 'summary', ref);
			assertOnlyKnownDefects(bound, notes, ref);
			// \cd is a single-line chapter description, so its notes trail the
			// text rather than sitting at their markers. Marker position is the
			// one thing that does not survive here; the JSON keeps it.
			let cd = stripMarkup(chapter.summary, 'summary', ref);
			for (const hit of bound.hits) {
				cd += ` \\f - \\ft ${renderInline(notes[hit.noteIndex].text, 'prose', ref)}\\f*`;
			}
			// 113 summaries and their notes carry literal newlines; \cd is one line.
			lines.push(`\\cd ${oneLine(cd)}`);
		}

		for (const article of chapter.articles ?? []) {
			lines.push(...renderProse(article, `${slug} ${chapter.chapter} article`));
		}

		const byVerse = new Map<number, Annotation[]>();
		if (opts.includeAnnotations) {
			for (const ann of annotations.get(chapter.chapter) ?? []) {
				if (!byVerse.has(ann.verse)) byVerse.set(ann.verse, []);
				byVerse.get(ann.verse)!.push(ann);
			}
		}

		lines.push('\\p');
		for (const verse of chapter.verses) {
			const ref = `${slug} ${chapter.chapter}:${verse.verse}`;
			let line = renderVerse(verse, chapter.chapter, ref);
			for (const ann of byVerse.get(verse.verse) ?? []) {
				line += ` ${renderAnnotation(ann, chapter.chapter, `${slug} ann ${chapter.chapter}:${ann.verse}`)}`;
			}
			lines.push(line);
		}
	}

	for (const end of book.endMatters ?? []) lines.push(...renderProse(end, `${slug} endMatter`));

	return `${lines.join('\n')}\n`;
}

/**
 * Refuses an output directory that the build would then delete recursively.
 *
 * The build's first act is `rmSync(OUT, { recursive: true, force: true })`, so
 * a mistyped `--out` is destructive with no confirmation: `--out .` from the
 * repo root removes the repo, `--out /` removes the filesystem. Pure string
 * logic on already-resolved absolute paths, so it lives here and is tested.
 *
 * Rejects: a missing or empty value, a non-absolute path, the filesystem root,
 * the home directory, the repo root, and any ancestor of the repo root (which
 * is what catches `..` and `/Users`).
 */
export function assertSafeOutDir(out: string | undefined, root: string, home: string): void {
	const ref = 'export --out';
	if (!out || !out.trim()) throw new ExportError(ref, 'no output directory given');
	if (!out.startsWith('/')) throw new ExportError(ref, `must be an absolute path, got ${out}`);

	const trim = (p: string) => (p.length > 1 && p.endsWith('/') ? p.slice(0, -1) : p);
	const o = trim(out);
	const r = trim(root);
	const h = trim(home);

	if (o === '/') throw new ExportError(ref, 'refusing to delete the filesystem root');
	if (o === h) throw new ExportError(ref, 'refusing to delete the home directory');
	if (o === r) throw new ExportError(ref, 'refusing to delete the repository root');
	if (r === o || r.startsWith(`${o}/`))
		throw new ExportError(ref, `refusing to delete ${o}, which contains the repository`);
}
