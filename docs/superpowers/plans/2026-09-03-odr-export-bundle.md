# ODR Export Bundle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate the `janvier-s/original-douay-rheims` distribution bundle from `static/data/odr/**` with one scripted run, and correct the `/download` page copy to match the corpus.

**Architecture:** A pure library (`scripts/export-lib.ts`) holds the markup tokenizer, marker resolution, USFM rendering, and the book-code map. A thin I/O script (`scripts/build-export-bundle.ts`) reads the corpus and writes `dist-export/`. A whole-corpus test asserts measured invariants so drift fails the build.

**Tech Stack:** TypeScript, tsx (scripts), Vitest (tests). No new dependencies.

**Spec:** `docs/superpowers/specs/2026-09-02-odr-export-bundle-design.md`

## Global Constraints

- **Never reformat `static/data/odr/`.** It is hand-maintained, checked in, and a deliberate mix of minified and 2-space-indented JSON. This work only *reads* it. Use `readJson` from `scripts/odr-corpus-json.ts`.
- **Style:** tabs, single quotes, no trailing comma, `printWidth: 100` (`.prettierrc`). Run `npm run format` before each commit.
- **Imports inside `scripts/`** use the `.js` extension (`from './export-lib.js'`) — the tree is ESM run under tsx.
- `tsconfig.json` excludes `scripts/**`. I/O scripts in this repo carry `// @ts-nocheck: build script run with tsx`. **`export-lib.ts` does not** — it is fully typed, like `odr-lemma-lib.ts`, because the tests import it.
- **Every file starts with a `// scripts/<name>.ts` line and a comment saying why the file exists**, matching `odr-lemma-lib.ts` and `odr-corpus-json.ts`.
- Vitest picks up `scripts/**/*.test.ts` (`vite.config.ts`). New tests go in `scripts/`, not `tests/unit/`, because they walk `static/data/` and need node builtins.
- **The nine-tag vocabulary is closed:** `i`, `na`, `mn`, `cr`, `sc`, `alt`, `br`, `col-left`, `col-right`. Anything else is fatal.
- **Output is `dist-export/`**, gitignored. Never commit generated bundle files.

---

## File Structure

| File | Responsibility |
|---|---|
| `scripts/export-lib.ts` | Pure. Tokenizer, marker binding, `stripMarkup`, book codes, USFM rendering, manifest counting. No `fs`. |
| `scripts/export-lib.test.ts` | Unit tests on the above. Hand-written fixtures only. |
| `scripts/export.corpus.test.ts` | Whole-corpus invariants with exact expected counts. |
| `scripts/build-export-bundle.ts` | All I/O. Reads corpus, writes `dist-export/`. |
| `src/routes/download/+page.svelte` | Copy refresh (lines 63–98). |
| `.gitignore` | Add `dist-export/`. |

`export-lib.ts` will land around 500 lines. That is acceptable for one cohesive unit — every part is the same transformation pipeline — but if it passes ~700, split the USFM renderer into `scripts/export-usfm.ts` and keep tokenizing/binding in `export-lib.ts`.

---

### Task 1: Tokenizer and the closed tag vocabulary

**Files:**
- Create: `scripts/export-lib.ts`
- Create: `scripts/export-lib.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type TagName = 'i' | 'na' | 'mn' | 'cr' | 'sc' | 'alt' | 'br' | 'col-left' | 'col-right'`
  - `type BlockKind = 'verse' | 'summary' | 'prose'`
  - `type Node = { kind: 'text'; value: string; start: number } | { kind: 'tag'; name: TagName; close: boolean; content: string; start: number; length: number }`
  - `class ExportError extends Error`
  - `function tokenize(text: string, block: BlockKind, ref: string): Node[]`
  - `const TAGS_BY_BLOCK: Record<BlockKind, ReadonlySet<TagName>>`

- [ ] **Step 1: Write the failing test**

```ts
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
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `npx vitest run scripts/export-lib.test.ts`
Expected: FAIL, `Failed to resolve import "./export-lib"`.

- [ ] **Step 3: Implement the tokenizer**

```ts
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
```

- [ ] **Step 4: Run the tests and make sure they pass**

Run: `npx vitest run scripts/export-lib.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
npm run format
git add scripts/export-lib.ts scripts/export-lib.test.ts
git commit -m "feat(export): add markup tokenizer with a closed tag vocabulary"
```

---

### Task 2: Marker tokens and the resolution rule

**Files:**
- Modify: `scripts/export-lib.ts`
- Modify: `scripts/export-lib.test.ts`

**Interfaces:**
- Consumes: `tokenize`, `ExportError`, `Node` from Task 1.
- Produces:
  - `function parseMarkerTokens(content: string): string[]`
  - `interface NoteLike { marker?: number | string; label?: string; text: string }`
  - `interface MarkerHit { token: string; noteIndex: number; start: number; length: number }`
  - `interface BindResult { hits: MarkerHit[]; unbound: string[]; unreferenced: number[] }`
  - `function bindMarkers(text: string, notes: NoteLike[], block: BlockKind, ref: string): BindResult`

- [ ] **Step 1: Write the failing test**

```ts
// append to scripts/export-lib.test.ts
import { parseMarkerTokens, bindMarkers } from './export-lib';

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
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `npx vitest run scripts/export-lib.test.ts`
Expected: FAIL, `parseMarkerTokens is not a function`.

- [ ] **Step 3: Implement**

```ts
// append to scripts/export-lib.ts

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
			const nth = taken.get(token) ?? 0;
			const slot = byToken.get(token)?.[nth];
			if (slot !== undefined) {
				taken.set(token, nth + 1);
				consumed.add(slot);
				hits.push({ token, noteIndex: slot, start: node.start, length: full.length });
				continue;
			}
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
```

- [ ] **Step 4: Run the tests and make sure they pass**

Run: `npx vitest run scripts/export-lib.test.ts`
Expected: PASS, 18 tests.

- [ ] **Step 5: Commit**

```bash
npm run format
git add scripts/export-lib.ts scripts/export-lib.test.ts
git commit -m "feat(export): resolve note markers, including lettered and ring forms"
```

---

### Task 3: The known-defect list

**Files:**
- Modify: `scripts/export-lib.ts`
- Modify: `scripts/export-lib.test.ts`

The corpus contains 28 real irregularities. A tolerant matcher would absorb the next one silently, so they are pinned as data and anything outside the list is fatal.

**Interfaces:**
- Consumes: `BindResult`, `ExportError`.
- Produces:
  - `const KNOWN_UNBOUND: ReadonlySet<string>` — refs allowed to have an unbindable marker
  - `const KNOWN_UNREFERENCED: ReadonlySet<string>` — `` `${ref} note ${token}` `` entries allowed to go unreferenced
  - `function assertOnlyKnownDefects(result: BindResult, notes: NoteLike[], ref: string): void`

- [ ] **Step 1: Write the failing test**

```ts
// append to scripts/export-lib.test.ts
import {
	assertOnlyKnownDefects,
	KNOWN_UNBOUND,
	KNOWN_UNREFERENCED
} from './export-lib';

describe('the known-defect list', () => {
	it('holds exactly the measured irregularities', () => {
		expect(KNOWN_UNBOUND.size).toBe(2);
		expect(KNOWN_UNREFERENCED.size).toBe(26);
	});

	it('passes a clean bind', () => {
		const notes = [{ label: '1', text: 'x' }];
		const r = bindMarkers('<na>[1]</na>', notes, 'verse', 'genesis 1:1');
		expect(() => assertOnlyKnownDefects(r, notes, 'genesis 1:1')).not.toThrow();
	});

	it('allows a listed unbound marker', () => {
		const notes = [{ label: '1', text: 'x' }];
		const r = bindMarkers('<na>[1]</na> <na>[1]</na>', notes, 'verse', '1-timothy 2:6');
		expect(() => assertOnlyKnownDefects(r, notes, '1-timothy 2:6')).not.toThrow();
	});

	it('rejects the same defect at an unlisted ref', () => {
		const notes = [{ label: '1', text: 'x' }];
		const r = bindMarkers('<na>[1]</na> <na>[1]</na>', notes, 'verse', 'genesis 1:1');
		expect(() => assertOnlyKnownDefects(r, notes, 'genesis 1:1')).toThrow(ExportError);
	});

	it('allows a listed unreferenced note', () => {
		const notes = [{ label: '1', text: 'x' }];
		const r = bindMarkers('no marker here', notes, 'verse', 'john 1:51');
		expect(() => assertOnlyKnownDefects(r, notes, 'john 1:51')).not.toThrow();
	});

	it('rejects an unlisted unreferenced note', () => {
		const notes = [{ label: '1', text: 'x' }];
		const r = bindMarkers('no marker here', notes, 'verse', 'genesis 1:1');
		expect(() => assertOnlyKnownDefects(r, notes, 'genesis 1:1')).toThrow(/unreferenced/);
	});
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `npx vitest run scripts/export-lib.test.ts`
Expected: FAIL, `assertOnlyKnownDefects is not a function`.

- [ ] **Step 3: Implement**

```ts
// append to scripts/export-lib.ts

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
```

- [ ] **Step 4: Run the tests and make sure they pass**

Run: `npx vitest run scripts/export-lib.test.ts`
Expected: PASS, 24 tests.

- [ ] **Step 5: Commit**

```bash
npm run format
git add scripts/export-lib.ts scripts/export-lib.test.ts
git commit -m "feat(export): pin the 28 known corpus marker defects"
```

---

### Task 4: `stripMarkup` for `bible/raw/`

**Files:**
- Modify: `scripts/export-lib.ts`
- Modify: `scripts/export-lib.test.ts`

**Interfaces:**
- Consumes: `tokenize`.
- Produces: `function stripMarkup(text: string, block: BlockKind, ref: string): string`

Markers are removed along with their content; formatting tags drop their delimiters and keep their text; `<br>` becomes a newline.

- [ ] **Step 1: Write the failing test**

```ts
// append to scripts/export-lib.test.ts
import { stripMarkup } from './export-lib';

describe('stripMarkup', () => {
	it('keeps the words inside formatting tags', () => {
		expect(stripMarkup('the <i>Lord</i> God', 'verse', 'ref')).toBe('the Lord God');
		expect(stripMarkup('<sc>Paul</sc> called', 'verse', 'ref')).toBe('Paul called');
	});

	it('removes markers and their content', () => {
		expect(stripMarkup('a <na>[1]</na> b', 'verse', 'ref')).toBe('a b');
		expect(stripMarkup('a <cr>[1]</cr> b', 'verse', 'ref')).toBe('a b');
	});

	it('keeps the words inside <alt>', () => {
		expect(stripMarkup('are you not <na>[1]</na> <alt>men</alt>?', 'verse', 'ref')).toBe(
			'are you not men?'
		);
	});

	it('turns <br> into a newline', () => {
		expect(stripMarkup('one<br>two', 'prose', 'ref')).toBe('one\ntwo');
	});

	it('leaves no angle bracket behind', () => {
		const messy = '<sc>A</sc> <i>b <na>(a)</na> c</i>';
		expect(stripMarkup(messy, 'verse', 'ref')).not.toMatch(/[<>]/);
	});

	it('is idempotent', () => {
		const once = stripMarkup('a <i>b</i> <na>[1]</na> c', 'verse', 'ref');
		expect(stripMarkup(once, 'verse', 'ref')).toBe(once);
	});
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `npx vitest run scripts/export-lib.test.ts`
Expected: FAIL, `stripMarkup is not a function`.

- [ ] **Step 3: Implement**

```ts
// append to scripts/export-lib.ts

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
```

- [ ] **Step 4: Run the tests and make sure they pass**

Run: `npx vitest run scripts/export-lib.test.ts`
Expected: PASS, 30 tests.

- [ ] **Step 5: Commit**

```bash
npm run format
git add scripts/export-lib.ts scripts/export-lib.test.ts
git commit -m "feat(export): strip markup to plain prose for bible/raw"
```

---

### Task 5: The book-code map

**Files:**
- Modify: `scripts/export-lib.ts`
- Modify: `scripts/export-lib.test.ts`

**Interfaces:**
- Consumes: `ExportError`.
- Produces:
  - `interface BookCode { usfm: string; paratext: string; ordinal: number }`
  - `const BOOK_CODES: Readonly<Record<string, BookCode>>` — 76 entries
  - `function usfmFilename(slug: string): string` — `'01-GEN.usfm'`

Filenames are prefixed with the **ODR canonical position (01–76)**, not the Paratext number, so a directory listing follows the order the ODR prints. The Paratext number is kept for the manifest.

- [ ] **Step 1: Write the failing test**

```ts
// append to scripts/export-lib.test.ts
import { BOOK_CODES, usfmFilename } from './export-lib';

describe('BOOK_CODES', () => {
	it('covers all 76 books with unique codes and ordinals', () => {
		const entries = Object.values(BOOK_CODES);
		expect(entries).toHaveLength(76);
		expect(new Set(entries.map((e) => e.usfm)).size).toBe(76);
		expect(entries.map((e) => e.ordinal).sort((a, b) => a - b)).toEqual(
			Array.from({ length: 76 }, (_, i) => i + 1)
		);
	});

	it('maps the Douay names to their modern equivalents', () => {
		expect(BOOK_CODES['1-kings'].usfm).toBe('1SA');
		expect(BOOK_CODES['3-kings'].usfm).toBe('1KI');
		expect(BOOK_CODES['1-paralipomenon'].usfm).toBe('1CH');
		expect(BOOK_CODES['canticle-of-canticles'].usfm).toBe('SNG');
		expect(BOOK_CODES['ecclesiasticus'].usfm).toBe('SIR');
		expect(BOOK_CODES['apocalypse'].usfm).toBe('REV');
	});

	it('follows Vulgate numbering for the Esdras family', () => {
		expect(BOOK_CODES['1-esdras'].usfm).toBe('EZR');
		expect(BOOK_CODES['2-esdras'].usfm).toBe('NEH');
		expect(BOOK_CODES['3-esdras'].usfm).toBe('1ES');
		expect(BOOK_CODES['4-esdras'].usfm).toBe('2ES');
	});

	it('uses the composite code where the ODR ships a composite book', () => {
		expect(BOOK_CODES['esther'].usfm).toBe('ESG');
		expect(BOOK_CODES['daniel'].usfm).toBe('DAG');
		expect(BOOK_CODES['baruch'].usfm).toBe('BAR');
	});

	it('orders the appendix books after the OT and before the NT', () => {
		expect(BOOK_CODES['malachie'].ordinal).toBe(46);
		expect(BOOK_CODES['prayer-of-manasses'].ordinal).toBe(47);
		expect(BOOK_CODES['4-esdras'].ordinal).toBe(49);
		expect(BOOK_CODES['matthew'].ordinal).toBe(50);
	});

	it('builds a zero-padded filename', () => {
		expect(usfmFilename('genesis')).toBe('01-GEN.usfm');
		expect(usfmFilename('apocalypse')).toBe('76-REV.usfm');
	});

	it('throws on an unknown slug', () => {
		expect(() => usfmFilename('nonesuch')).toThrow(ExportError);
	});
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `npx vitest run scripts/export-lib.test.ts`
Expected: FAIL, `BOOK_CODES is undefined`.

- [ ] **Step 3: Implement**

```ts
// append to scripts/export-lib.ts

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
```

- [ ] **Step 4: Run the tests and make sure they pass**

Run: `npx vitest run scripts/export-lib.test.ts`
Expected: PASS, 37 tests.

- [ ] **Step 5: Cross-check the map against `books.ts`**

Run:
```bash
npx tsx -e "
import { ALL_BOOKS } from './src/lib/data/books.ts';
import { BOOK_CODES } from './scripts/export-lib.ts';
const missing = ALL_BOOKS.filter((b) => !BOOK_CODES[b.slug]).map((b) => b.slug);
const extra = Object.keys(BOOK_CODES).filter((s) => !ALL_BOOKS.some((b) => b.slug === s));
const misordered = ALL_BOOKS.filter((b, i) => BOOK_CODES[b.slug]?.ordinal !== i + 1).map((b) => b.slug);
console.log({ missing, extra, misordered });
"
```
Expected: `{ missing: [], extra: [], misordered: [] }`.

- [ ] **Step 6: Commit**

```bash
npm run format
git add scripts/export-lib.ts scripts/export-lib.test.ts
git commit -m "feat(export): map all 76 slugs to USFM book codes in ODR order"
```

---

### Task 6: Render verse text to USFM

**Files:**
- Modify: `scripts/export-lib.ts`
- Modify: `scripts/export-lib.test.ts`

**Interfaces:**
- Consumes: `tokenize`, `bindMarkers`, `assertOnlyKnownDefects`.
- Produces:
  - `interface Verse { verse: number; text: string; notes?: NoteLike[]; cross_refs?: Array<{ text: string }>; has_annotation?: boolean }`
  - `function renderVerse(verse: Verse, chapter: number, ref: string): string`

`<alt>` needs no invented body marker: USFM already models "the words this note is about" as `\fq` inside the note, so the span stays plain in the body and moves into its bound footnote.

- [ ] **Step 1: Write the failing test**

```ts
// append to scripts/export-lib.test.ts
import { renderVerse } from './export-lib';

describe('renderVerse', () => {
	it('emits \\v with plain text', () => {
		expect(renderVerse({ verse: 3, text: 'And God said' }, 1, 'ref')).toBe('\\v 3 And God said');
	});

	it('maps <sc> and <i> to character markers', () => {
		const out = renderVerse({ verse: 1, text: '<sc>Paul</sc> an <i>Apostle</i>' }, 1, 'ref');
		expect(out).toBe('\\v 1 \\sc Paul\\sc* an \\it Apostle\\it*');
	});

	it('turns a note marker into a footnote reusing the original label', () => {
		const out = renderVerse(
			{ verse: 1, text: 'Paul <na>[1]</na> called', notes: [{ label: '1', text: 'The Epistle.' }] },
			1,
			'ref'
		);
		expect(out).toBe('\\v 1 Paul \\f 1 \\fr 1.1 \\ft The Epistle.\\f* called');
	});

	it('keeps a lettered label', () => {
		const out = renderVerse(
			{ verse: 2, text: 'x <na>(a)</na> y', notes: [{ label: 'a', text: 'note' }] },
			5,
			'ref'
		);
		expect(out).toContain('\\f a \\fr 5.2 \\ft note\\f*');
	});

	it('turns a cross-reference into \\x', () => {
		const out = renderVerse(
			{ verse: 14, text: 'but <cr>[1]</cr> Crispus', cross_refs: [{ text: 'Act. 18, 8.' }] },
			1,
			'ref'
		);
		expect(out).toBe('\\v 14 but \\x - \\xt Act. 18, 8.\\x* Crispus');
	});

	it('moves an <alt> span into its footnote as \\fq', () => {
		const out = renderVerse(
			{
				verse: 4,
				text: 'are you not <na>[1]</na> <alt>men</alt>?',
				notes: [{ label: '1', text: '<i>carnal</i>' }]
			},
			3,
			'ref'
		);
		expect(out).toBe('\\v 4 are you not \\f 1 \\fr 3.4 \\fq men \\ft \\it carnal\\it*\\f* men?');
	});
});
```

Note the last expectation: the `<alt>` words appear **twice** — once as `\fq` inside the note, once in the body where the reader reads them. That is deliberate and matches how `\fq` is used throughout USFM.

- [ ] **Step 2: Run it to make sure it fails**

Run: `npx vitest run scripts/export-lib.test.ts`
Expected: FAIL, `renderVerse is not a function`.

- [ ] **Step 3: Implement**

```ts
// append to scripts/export-lib.ts

export interface Verse {
	verse: number;
	text: string;
	notes?: NoteLike[];
	cross_refs?: Array<{ text: string }>;
	has_annotation?: boolean;
	lemmas?: Array<[number, number, number]>;
}

const CHAR_MARKERS: Partial<Record<TagName, string>> = { i: 'it', sc: 'sc' };

/** Inline formatting only. Used for note bodies, where markers never occur. */
function renderInline(text: string, block: BlockKind, ref: string): string {
	let out = '';
	for (const node of tokenize(text, block, ref)) {
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
		const before = nodes.slice(0, i).reverse().find((m) => m.kind === 'tag' && !m.close && m.name !== 'alt');
		const after = nodes.slice(i).find((m) => m.kind === 'tag' && !m.close && (m.name === 'na' || m.name === 'cr'));
		const anchor = before?.kind === 'tag' && (before.name === 'na' || before.name === 'cr') ? before : after;
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
	return out.replace(/[ \t]{2,}/g, ' ').trimEnd();
}
```

- [ ] **Step 4: Run the tests and make sure they pass**

Run: `npx vitest run scripts/export-lib.test.ts`
Expected: PASS, 44 tests.

- [ ] **Step 5: Commit**

```bash
npm run format
git add scripts/export-lib.ts scripts/export-lib.test.ts
git commit -m "feat(export): render verses to USFM with footnotes and cross-refs"
```

---

### Task 7: Flatten annotations into `\ef`

**Files:**
- Modify: `scripts/export-lib.ts`
- Modify: `scripts/export-lib.test.ts`

USFM notes cannot nest. The corpus has two levels — sub-notes inside annotation texts — so `usfm-study/` is a faithful-but-flattened projection while the JSON stays canonical.

**Interfaces:**
- Consumes: `bindMarkers`, `renderInline`, `assertOnlyKnownDefects`.
- Produces:
  - `interface Annotation { verse: number; part?: number; title?: string | null; text: string; notes?: NoteLike[] }`
  - `function renderAnnotation(ann: Annotation, chapter: number, ref: string): string`

- [ ] **Step 1: Write the failing test**

```ts
// append to scripts/export-lib.test.ts
import { renderAnnotation } from './export-lib';

describe('renderAnnotation', () => {
	it('emits \\ef with the catchword as \\fq', () => {
		const out = renderAnnotation(
			{ verse: 1, title: 'In the beginning.', text: 'Holy Moyses telleth.' },
			1,
			'ref'
		);
		expect(out).toBe('\\ef - \\fr 1.1 \\fq In the beginning. \\ft Holy Moyses telleth.\\ef*');
	});

	it('replaces each sub-note marker with a superscript and appends the notes', () => {
		const out = renderAnnotation(
			{
				verse: 1,
				title: 'A.',
				text: '<mn>[1]</mn> First part <mn>[2]</mn> second part',
				notes: [
					{ marker: 1, text: 'S. Aug.' },
					{ marker: 2, text: 'Contra Epist.' }
				]
			},
			1,
			'ref'
		);
		expect(out).toBe(
			'\\ef - \\fr 1.1 \\fq A. \\ft ¹ First part ² second part \\fq ¹ \\ft S. Aug. \\fq ² \\ft Contra Epist.\\ef*'
		);
	});

	it('numbers a ring marker by its ordinal, since the ring carries no number', () => {
		const out = renderAnnotation(
			{ verse: 2, title: 'B.', text: 'text <mn>◦</mn> more', notes: [{ marker: '◦', text: 'src' }] },
			4,
			'ref'
		);
		expect(out).toContain('text ¹ more');
		expect(out).toContain('\\fq ¹ \\ft src');
	});

	it('omits \\fq when the annotation has no title', () => {
		const out = renderAnnotation({ verse: 1, title: null, text: 'body' }, 1, 'ref');
		expect(out).toBe('\\ef - \\fr 1.1 \\ft body\\ef*');
	});
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `npx vitest run scripts/export-lib.test.ts`
Expected: FAIL, `renderAnnotation is not a function`.

- [ ] **Step 3: Implement**

```ts
// append to scripts/export-lib.ts

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
	body = body.replace(/\n+/g, ' ').replace(/[ \t]{2,}/g, ' ').trim();

	const parts = [`\\ef - \\fr ${chapter}.${ann.verse}`];
	if (ann.title) parts.push(`\\fq ${ann.title}`);
	parts.push(`\\ft ${body}`);

	const trailing = bound.hits.map((hit, i) => {
		const text = renderInline(notes[hit.noteIndex].text, 'prose', ref);
		return `\\fq ${superscript(i + 1)} \\ft ${text}`;
	});

	return `${[...parts, ...trailing].join(' ')}\\ef*`;
}
```

- [ ] **Step 4: Run the tests and make sure they pass**

Run: `npx vitest run scripts/export-lib.test.ts`
Expected: PASS, 48 tests.

- [ ] **Step 5: Commit**

```bash
npm run format
git add scripts/export-lib.ts scripts/export-lib.test.ts
git commit -m "feat(export): flatten annotation sub-notes into \\ef study notes"
```

---

### Task 8: Render a whole book

**Files:**
- Modify: `scripts/export-lib.ts`
- Modify: `scripts/export-lib.test.ts`

**Interfaces:**
- Consumes: `bindMarkers`, `assertOnlyKnownDefects`, `stripMarkup`, `renderVerse`, `renderAnnotation`, `bookCode`, and the module-private `renderInline` / `CHAR_MARKERS` from Task 6.
- Produces:
  - `interface Prose { title?: string; text: string; notes?: NoteLike[] }`
  - `interface Chapter { chapter: number; verses: Verse[]; summary?: string; summary_notes?: NoteLike[]; articles?: Prose[] }`
  - `interface Book { book: string; book_title?: string; short_title?: string; intros?: Prose[]; endMatters?: Prose[]; chapters: Chapter[] }`
  - `function renderUsfm(slug: string, book: Book, annotations: Map<number, Annotation[]>, opts: { includeAnnotations: boolean }, fallbackTitle: string): string`

Both USFM trees come from this one function, differing only by `includeAnnotations`, so they cannot diverge.

- [ ] **Step 1: Write the failing test**

```ts
// append to scripts/export-lib.test.ts
import { renderUsfm } from './export-lib';

const book = {
	book: 'Genesis',
	book_title: 'THE BOOK OF GENESIS',
	short_title: 'Genesis',
	intros: [{ title: 'THE ARGUMENT', text: 'First para.<br>Second para.' }],
	chapters: [
		{
			chapter: 1,
			summary: 'God created heaven.',
			summary_notes: [],
			verses: [{ verse: 1, text: 'In the beginning' }]
		}
	]
};

describe('renderUsfm', () => {
	it('emits the identification and heading block', () => {
		const out = renderUsfm('genesis', book, new Map(), { includeAnnotations: false }, 'Genesis');
		expect(out).toContain('\\id GEN');
		expect(out).toContain('\\usfm 3.0');
		expect(out).toContain('\\ide UTF-8');
		expect(out).toContain('\\h Genesis');
		expect(out).toContain('\\mt1 THE BOOK OF GENESIS');
	});

	it('renders the intro, splitting paragraphs on <br>', () => {
		const out = renderUsfm('genesis', book, new Map(), { includeAnnotations: false }, 'Genesis');
		expect(out).toContain('\\is THE ARGUMENT');
		expect(out).toContain('\\ip First para.');
		expect(out).toContain('\\ip Second para.');
	});

	it('turns an intro marker into a footnote instead of leaking its token', () => {
		const withNote = {
			...book,
			intros: [{ title: 'ARG', text: 'was written <mn>[1]</mn> by Moyses', notes: [{ marker: 1, text: 'Gen. 1.' }] }]
		};
		const out = renderUsfm('genesis', withNote, new Map(), { includeAnnotations: false }, 'Genesis');
		expect(out).toContain('\\ip was written \\f - \\ft Gen. 1.\\f* by Moyses');
		expect(out).not.toContain('[1]');
	});

	it('renders chapters, summaries, and verses', () => {
		const out = renderUsfm('genesis', book, new Map(), { includeAnnotations: false }, 'Genesis');
		expect(out).toContain('\\c 1');
		expect(out).toContain('\\cd God created heaven.');
		expect(out).toContain('\\v 1 In the beginning');
	});

	it('falls back to the supplied title when the book has none', () => {
		const bare = { book: '3 Esdras', chapters: [{ chapter: 1, verses: [] }] };
		const out = renderUsfm('3-esdras', bare, new Map(), { includeAnnotations: false }, '3 Esdras');
		expect(out).toContain('\\id 1ES');
		expect(out).toContain('\\h 3 Esdras');
		expect(out).toContain('\\mt1 3 Esdras');
	});

	it('omits annotations unless asked, and includes them when asked', () => {
		const anns = new Map([[1, [{ verse: 1, title: 'Catchword.', text: 'Comment.' }]]]);
		const plain = renderUsfm('genesis', book, anns, { includeAnnotations: false }, 'Genesis');
		const study = renderUsfm('genesis', book, anns, { includeAnnotations: true }, 'Genesis');
		expect(plain).not.toContain('\\ef');
		expect(study).toContain('\\ef - \\fr 1.1 \\fq Catchword. \\ft Comment.\\ef*');
	});
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `npx vitest run scripts/export-lib.test.ts`
Expected: FAIL, `renderUsfm is not a function`.

- [ ] **Step 3: Implement**

```ts
// append to scripts/export-lib.ts

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
	const long = book.book_title ?? fallbackTitle;
	const short = book.short_title ?? book.book ?? fallbackTitle;

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
			lines.push(`\\cd ${cd}`);
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
```

- [ ] **Step 4: Run the tests and make sure they pass**

Run: `npx vitest run scripts/export-lib.test.ts`
Expected: PASS, 54 tests.

- [ ] **Step 5: Commit**

```bash
npm run format
git add scripts/export-lib.ts scripts/export-lib.test.ts
git commit -m "feat(export): render a whole book to USFM, with and without annotations"
```

---

### Task 9: The build script

**Files:**
- Create: `scripts/build-export-bundle.ts`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: everything from `export-lib.ts`; `readJson` from `odr-corpus-json.ts`; `ALL_BOOKS` from `src/lib/data/books.ts`.
- Produces: a `dist-export/` tree, and `manifest.json` inside it.

- [ ] **Step 1: Add the gitignore entry**

Append to `.gitignore`, under the `# Test + tooling artifacts` group:

```
# Generated distribution bundle
dist-export/
```

- [ ] **Step 2: Write the script**

```ts
// scripts/build-export-bundle.ts
// @ts-nocheck: build script run with tsx
//
// Builds the janvier-s/original-douay-rheims distribution bundle from the
// committed corpus. The published bundle was hand-maintained and went stale
// (it advertised 1,707 annotations against an actual 1,677); deriving every
// copy in one run is what stops that recurring.
//
// Reads static/data/odr/** and static/data/reference/odr/**. Writes only to
// --out. Never modifies the corpus.
//
//   npx tsx scripts/build-export-bundle.ts
//   npx tsx scripts/build-export-bundle.ts --out /tmp/bundle
//   npx tsx scripts/build-export-bundle.ts --only genesis

import { readdirSync, existsSync, mkdirSync, writeFileSync, copyFileSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { readJson } from './odr-corpus-json.js';
import { renderUsfm, stripMarkup, usfmFilename, bookCode } from './export-lib.js';
import { ALL_BOOKS } from '../src/lib/data/books.js';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const ODR_DIR = join(ROOT, 'static', 'data', 'odr');
const REF_DIR = join(ROOT, 'static', 'data', 'reference', 'odr');

const argOf = (flag, fallback) => {
	const i = process.argv.indexOf(flag);
	return i === -1 ? fallback : process.argv[i + 1];
};
const OUT = argOf('--out', join(ROOT, 'dist-export'));
const ONLY = argOf('--only', null);

/** The three non-book artifacts that live alongside the book files. */
const SKIP = new Set(['search-index.json', 'search-notes-index.json', 'search-suggestions.json']);

const write = (rel, body) => {
	const path = join(OUT, rel);
	mkdirSync(dirname(path), { recursive: true });
	writeFileSync(path, body);
};

function readAnnotations(slug) {
	const dir = join(ODR_DIR, slug, 'annotations');
	const byChapter = new Map();
	if (!existsSync(dir)) return { byChapter, files: 0, count: 0, subNotes: 0 };
	let files = 0;
	let count = 0;
	let subNotes = 0;
	for (const file of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
		files++;
		const { data } = readJson(join(dir, file));
		byChapter.set(data.chapter, data.annotations);
		count += data.annotations.length;
		for (const a of data.annotations) subNotes += (a.notes ?? []).length;
		write(`annotations/${slug}/${file}`, JSON.stringify(data, null, 2));
	}
	return { byChapter, files, count, subNotes };
}

/** bible/raw/: the same tree with markup stripped and notes kept structured. */
function toRaw(slug, book) {
	const out = structuredClone(book);
	for (const intro of out.intros ?? []) intro.text = stripMarkup(intro.text, 'prose', `${slug} intro`);
	for (const end of out.endMatters ?? [])
		end.text = stripMarkup(end.text, 'prose', `${slug} endMatter`);
	for (const chapter of out.chapters) {
		const cref = `${slug} ${chapter.chapter}`;
		if (chapter.summary) chapter.summary = stripMarkup(chapter.summary, 'summary', `${cref} summary`);
		for (const article of chapter.articles ?? [])
			article.text = stripMarkup(article.text, 'prose', `${cref} article`);
		for (const verse of chapter.verses) {
			verse.text = stripMarkup(verse.text, 'verse', `${cref}:${verse.verse}`);
			delete verse.lemmas;
		}
	}
	return out;
}

rmSync(OUT, { recursive: true, force: true });

const counts = {
	books: 0,
	chapters: 0,
	verses: 0,
	annotations: 0,
	annotationFiles: 0,
	subNotes: 0,
	referenceFiles: 0
};
const books = [];

for (const meta of ALL_BOOKS) {
	if (ONLY && meta.slug !== ONLY) continue;
	const file = `${meta.slug}.json`;
	if (SKIP.has(file)) continue;
	const { data: book } = readJson(join(ODR_DIR, file));
	const anns = readAnnotations(meta.slug);

	write(`bible/tagged/${file}`, JSON.stringify(book, null, 2));
	write(`bible/raw/${file}`, JSON.stringify(toRaw(meta.slug, book), null, 2));
	write(`usfm/${usfmFilename(meta.slug)}`, renderUsfm(meta.slug, book, anns.byChapter, { includeAnnotations: false }, meta.odrName));
	write(`usfm-study/${usfmFilename(meta.slug)}`, renderUsfm(meta.slug, book, anns.byChapter, { includeAnnotations: true }, meta.odrName));

	// Catchword spans are offsets into the tagged text and carry a match tier,
	// so they ship as a separate index rather than inline where a consumer
	// would read them as fact.
	const lemmas = {};
	for (const chapter of book.chapters) {
		for (const verse of chapter.verses) {
			if (verse.lemmas?.length) lemmas[`${chapter.chapter}:${verse.verse}`] = verse.lemmas;
		}
	}
	if (Object.keys(lemmas).length) write(`index/lemmas/${file}`, JSON.stringify(lemmas, null, 2));

	counts.books++;
	counts.chapters += book.chapters.length;
	for (const c of book.chapters) counts.verses += c.verses.length;
	counts.annotations += anns.count;
	counts.annotationFiles += anns.files;
	counts.subNotes += anns.subNotes;
	books.push({ slug: meta.slug, ...bookCode(meta.slug), chapters: book.chapters.length });
}

for (const testament of ['ot', 'nt']) {
	for (const file of readdirSync(join(REF_DIR, testament)).filter((f) => f.endsWith('.json'))) {
		mkdirSync(join(OUT, 'reference', testament), { recursive: true });
		copyFileSync(join(REF_DIR, testament, file), join(OUT, 'reference', testament, file));
		counts.referenceFiles++;
	}
}

const commit = execSync('git rev-parse HEAD', { cwd: ROOT }).toString().trim();
write(
	'manifest.json',
	`${JSON.stringify({ schema: 1, generated: new Date().toISOString(), commit, counts, books }, null, 2)}\n`
);

console.log(`wrote ${OUT}`);
console.table(counts);
```

- [ ] **Step 3: Run it**

Run: `npx tsx scripts/build-export-bundle.ts`
Expected: exits 0, and the table reads:

| key | value |
|---|---|
| books | 76 |
| chapters | 1361 |
| verses | 37180 |
| annotations | 1677 |
| annotationFiles | 397 |
| subNotes | 3609 |
| referenceFiles | 26 |

If any marker defect outside the pinned list exists, the run throws an `ExportError` naming the ref. That is the intended behaviour: investigate the ref rather than widening the list.

- [ ] **Step 4: Spot-check the output**

```bash
head -20 dist-export/usfm/01-GEN.usfm
grep -c '\\ef' dist-export/usfm-study/55-ROM.usfm
grep -c '\\ef' dist-export/usfm/55-ROM.usfm   # expect 0
ls dist-export/usfm | head -3                  # expect 01-GEN.usfm, 02-EXO.usfm, 03-LEV.usfm
grep -o '<[a-z-]*>' dist-export/bible/raw/genesis.json | sort -u   # expect no output
```

- [ ] **Step 5: Commit**

```bash
npm run format
git add scripts/build-export-bundle.ts .gitignore
git commit -m "feat(export): add the bundle build script"
```

---

### Task 10: Whole-corpus invariants

**Files:**
- Create: `scripts/export.corpus.test.ts`

This is the test that catches a future corpus edit silently changing what the bundle means. It asserts exact counts rather than "no errors", because a tolerant assertion passes just as happily when a book stops being read at all.

**Interfaces:**
- Consumes: `export-lib.ts`, `odr-corpus-json.ts`, `books.ts`.
- Produces: nothing.

- [ ] **Step 1: Write the test**

```ts
// scripts/export.corpus.test.ts
// Whole-corpus invariants for the export, mirroring odr-lemmas.corpus.test.ts.
// Lives here rather than in tests/unit because it walks static/data and
// tsconfig excludes scripts/** where the node builtins it needs are typed.
//
// The numbers below were measured, not guessed. They are asserted exactly so
// that a corpus edit which changes the shape of the apparatus fails here
// rather than silently producing a different bundle.

import { describe, it, expect } from 'vitest';
import { readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readJson } from './odr-corpus-json';
import { bindMarkers, tokenize, stripMarkup, TAGS_BY_BLOCK, BOOK_CODES } from './export-lib';
import { ALL_BOOKS } from '../src/lib/data/books';

const ODR_DIR = join(dirname(dirname(fileURLToPath(import.meta.url))), 'static', 'data', 'odr');

interface Block {
	ref: string;
	text: string;
	notes: Array<{ marker?: number | string; label?: string; text: string }>;
	block: 'verse' | 'summary' | 'prose';
}

/** Every piece of marked-up text in the corpus, with the notes it resolves against. */
function readBlocks(): Block[] {
	const blocks: Block[] = [];
	for (const meta of ALL_BOOKS) {
		const slug = meta.slug;
		const { data: book } = readJson<any>(join(ODR_DIR, `${slug}.json`));

		for (const i of book.intros ?? [])
			blocks.push({ ref: `${slug} intro`, text: i.text, notes: i.notes ?? [], block: 'prose' });
		for (const e of book.endMatters ?? [])
			blocks.push({ ref: `${slug} endMatter`, text: e.text, notes: e.notes ?? [], block: 'prose' });

		for (const c of book.chapters) {
			if (c.summary)
				blocks.push({
					ref: `${slug} ${c.chapter} summary`,
					text: c.summary,
					notes: c.summary_notes ?? [],
					block: 'summary'
				});
			for (const a of c.articles ?? [])
				blocks.push({
					ref: `${slug} ${c.chapter} article`,
					text: a.text,
					notes: a.notes ?? [],
					block: 'prose'
				});
			for (const v of c.verses)
				blocks.push({
					ref: `${slug} ${c.chapter}:${v.verse}`,
					text: v.text,
					notes: v.notes ?? [],
					block: 'verse'
				});
		}

		const annDir = join(ODR_DIR, slug, 'annotations');
		if (!existsSync(annDir)) continue;
		for (const f of readdirSync(annDir).filter((x) => x.endsWith('.json'))) {
			const { data: sidecar } = readJson<any>(join(annDir, f));
			for (const a of sidecar.annotations)
				blocks.push({
					ref: `${slug} ann ${sidecar.chapter}:${a.verse}`,
					text: a.text,
					notes: a.notes ?? [],
					block: 'prose'
				});
		}
	}
	return blocks;
}

const blocks = readBlocks();

describe('the corpus markup', () => {
	it('reads every block without an illegal or unbalanced tag', () => {
		const bad: string[] = [];
		for (const b of blocks) {
			try {
				tokenize(b.text, b.block, b.ref);
			} catch (e) {
				bad.push(`${b.ref}: ${(e as Error).message}`);
			}
		}
		expect(bad).toEqual([]);
	});

	it('uses only the nine known tags', () => {
		const legal = new Set([...Object.values(TAGS_BY_BLOCK)].flatMap((s) => [...s]));
		expect([...legal].sort()).toEqual(
			['alt', 'br', 'col-left', 'col-right', 'cr', 'i', 'mn', 'na', 'sc'].sort()
		);
	});

	it('binds 13,606 of 13,608 markers', () => {
		let bound = 0;
		let unbound = 0;
		for (const b of blocks) {
			const r = bindMarkers(b.text, b.notes, b.block, b.ref);
			bound += r.hits.length;
			unbound += r.unbound.length;
		}
		expect(bound).toBe(13606);
		expect(unbound).toBe(2);
		expect(bound + unbound).toBe(13608);
	});

	it('leaves exactly 26 notes unreferenced', () => {
		let unreferenced = 0;
		for (const b of blocks) unreferenced += bindMarkers(b.text, b.notes, b.block, b.ref).unreferenced.length;
		expect(unreferenced).toBe(26);
	});

	it('strips to prose with no angle bracket surviving', () => {
		const leaked = blocks.filter((b) => /[<>]/.test(stripMarkup(b.text, b.block, b.ref)));
		expect(leaked.map((b) => b.ref)).toEqual([]);
	});

	it('covers every book with a unique code', () => {
		expect(ALL_BOOKS).toHaveLength(76);
		expect(ALL_BOOKS.every((b) => BOOK_CODES[b.slug])).toBe(true);
	});
});
```

- [ ] **Step 2: Run it**

Run: `npx vitest run scripts/export.corpus.test.ts`
Expected: PASS, 6 tests.

If the marker counts come out different, **do not adjust the expected numbers to match**. A changed count means the corpus changed; find out which block moved and why, then update the numbers and the spec's counts table together in one commit.

- [ ] **Step 3: Run the whole suite**

Run: `npm run test`
Expected: PASS, including the pre-existing `odr-lemmas.corpus.test.ts`.

- [ ] **Step 4: Commit**

```bash
npm run format
git add scripts/export.corpus.test.ts
git commit -m "test(export): assert whole-corpus markup invariants"
```

---

### Task 11: Refresh the download page copy

**Files:**
- Modify: `src/routes/download/+page.svelte:63-98`

The page advertises 1,707 annotations against an actual 1,677, and lists neither of the two trees this work adds. The licence copy stays untouched: the bundle is ODR-only, so the CC0 1.0 claim remains true.

- [ ] **Step 1: Update the annotation count and add the new bullets**

Replace the `<ul>` at lines 75–98 with:

```svelte
	<ul>
		<li>
			<strong><code>bible/tagged/</code></strong> — verse text with all original markup preserved (<code
				>&lt;sc&gt;</code
			>, <code>&lt;i&gt;</code>, footnote anchors, marginal note markers, cross-reference markers),
			plus <code>cross_refs</code> arrays and inline footnotes. This is the canonical form.
		</li>
		<li>
			<strong><code>bible/raw/</code></strong> — plain prose text with all markup stripped. Footnotes
			and cross-references preserved as structured data.
		</li>
		<li>
			<strong><code>usfm/</code></strong> — USFM 3 files with inline footnotes (<code>\f</code>) and
			cross-references (<code>\x</code>).
		</li>
		<li>
			<strong><code>usfm-study/</code></strong> — the same USFM, plus the annotations as study notes
			(<code>\ef</code>). Kept separate so the plain <code>usfm/</code> files stay small.
		</li>
		<li>
			<strong><code>annotations/</code></strong> — the 1,677 annotations with their 3,609 sub-notes, one
			file per chapter.
		</li>
		<li>
			<strong><code>reference/</code></strong> — 26 JSON files for the original prefatory material: prefaces,
			tables, glossaries, and historical tables from the 1582 and 1609–1610 editions.
		</li>
		<li>
			<strong><code>index/lemmas/</code></strong> — character offsets locating each annotation's catchword
			in the verse it annotates, with the confidence tier of the match.
		</li>
		<li>
			<strong><code>manifest.json</code></strong> — schema version, source commit, and counts for every
			part of the bundle.
		</li>
	</ul>
```

- [ ] **Step 2: Verify the page builds and typechecks**

Run: `npm run check`
Expected: no new errors. (The 12 pre-existing `state_referenced_locally` warnings are expected and unrelated.)

- [ ] **Step 3: Verify it renders**

Run: `npm run dev`, open `/download`, confirm the Structured Data list shows eight bullets and reads 1,677.

- [ ] **Step 4: Commit**

```bash
npm run format
git add src/routes/download/+page.svelte
git commit -m "docs(download): correct annotation count and list the new bundle trees"
```

---

## Delivery

The distribution repo is not on this machine and network access is sandboxed, so this plan stops at a reviewed `dist-export/`. Once the repo is cloned, copying the tree across and committing it there is a follow-up — `LICENSE` and `SCHEMA.md` are authored in that repo at that point, since their content is the spec's markup and book-code sections rather than anything derived from the corpus.

## Notes for the executor

- **Do not widen `KNOWN_UNBOUND` or `KNOWN_UNREFERENCED` to make a run pass.** Those lists are the defect inventory. A new entry means the corpus changed; find out how first.
- **Do not write to `static/data/odr/`.** This work only reads it.
- The `<alt>` handling in Task 6 deliberately repeats the annotated words: once as `\fq` in the note, once in the body. That is idiomatic USFM, not a duplication bug.
- Task 6's `renderVerse` is the most intricate function here. If its `<alt>` anchoring resists, note that only 5 of 106 cases anchor to anything other than an immediately preceding `<na>`, so getting the common path right first and then handling the `<cr>`-anchored and following-marker cases is a reasonable order.
