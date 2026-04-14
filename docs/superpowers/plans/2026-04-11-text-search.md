# Text Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add full-text search to the ODR Bible search page, letting users search verse text and notes/annotations by words and phrases, with query expansion for archaic/British spellings.

**Architecture:** Pre-built MiniSearch indexes generated at build time, served as static JSON. The browser lazily loads the relevant index on first text search. Query expansion via a curated word-pair map handles British/archaic→modern spelling mismatches. The search page gets a mode toggle (verse/text) and a scope toggle within text mode (verses/notes).

**Tech Stack:** SvelteKit 5, MiniSearch, TypeScript, `spelling-variations` (dev-only for generating the expansion map)

**Spec:** `docs/superpowers/specs/2026-04-11-text-search-design.md`

---

## File Structure

### New files

| File | Responsibility |
|------|---------------|
| `src/lib/search/normalize.ts` | Shared tokenizer and punctuation stripping used by both build script and client |
| `src/lib/search/expand-query.ts` | Loads `query-expansions.json`, expands query tokens with ODR equivalents |
| `src/lib/search/query-expansions.json` | Curated word-pair map (modern/American → ODR spelling) |
| `src/lib/search/text-search.ts` | MiniSearch initialization, query execution, result formatting |
| `scripts/build-search-index.ts` | Builds both MiniSearch indexes (verse + notes) at build time |
| `scripts/generate-expansions.ts` | One-time script to generate query-expansions.json from ODR vocabulary |
| `tests/unit/search/normalize.test.ts` | Tests for normalize module |
| `tests/unit/search/expand-query.test.ts` | Tests for query expansion |
| `tests/unit/search/text-search.test.ts` | Tests for text search engine |

### Modified files

| File | Changes |
|------|---------|
| `src/routes/search/+page.ts` | Read `mode` and `scope` from URL params |
| `src/routes/search/+page.svelte` | Mode toggle, scope toggle, text search integration |
| `scripts/prepare-data.ts` | Import and call build-search-index after book data prep |
| `package.json` | Add `minisearch` (runtime), `spelling-variations` (dev) |

### Generated files (not committed, built by `prepare-data`)

| File | Contents |
|------|----------|
| `static/data/odr/search-index.json` | Serialized MiniSearch verse index |
| `static/data/odr/search-notes-index.json` | Serialized MiniSearch notes/annotations index |

---

## Task 1: Install dependencies and configure

**Files:**
- Modify: `package.json`
- Modify: `vite.config.ts` (no change needed, just verify)

- [ ] **Step 1: Install minisearch**

```bash
cd douayrheimsbible && npm install minisearch
```

- [ ] **Step 2: Install spelling-variations as devDependency**

```bash
cd douayrheimsbible && npm install --save-dev spelling-variations
```

- [ ] **Step 3: Verify package.json**

Run: `cat package.json | grep -E 'minisearch|spelling-variations'`
Expected: `minisearch` in `dependencies`, `spelling-variations` in `devDependencies`.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add minisearch and spelling-variations dependencies"
```

---

## Task 2: Shared normalize module

**Files:**
- Create: `src/lib/search/normalize.ts`
- Create: `tests/unit/search/normalize.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/search/normalize.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { tokenize, stripHtml } from '$lib/search/normalize';

describe('stripHtml', () => {
	it('removes all HTML tags', () => {
		expect(stripHtml('<sc>The</sc> <cr>[1]</cr> book of <i>life</i>')).toBe(
			'The [1] book of life'
		);
	});

	it('removes <na> tags and their contents', () => {
		expect(stripHtml('word <na>[2]</na> more')).toBe('word  more');
	});

	it('removes <cr> tags and their contents', () => {
		expect(stripHtml('word <cr>[1]</cr> more')).toBe('word  more');
	});

	it('handles text with no tags', () => {
		expect(stripHtml('plain text')).toBe('plain text');
	});
});

describe('tokenize', () => {
	it('lowercases and splits on whitespace', () => {
		expect(tokenize('The Lord God')).toEqual(['the', 'lord', 'god']);
	});

	it('strips hyphens within words', () => {
		expect(tokenize('to-day for-ever')).toEqual(['today', 'forever']);
	});

	it('strips punctuation attached to words', () => {
		expect(tokenize('heaven. And, lo:')).toEqual(['heaven', 'and', 'lo']);
	});

	it('removes bracket markers like [1]', () => {
		expect(tokenize('[1] the beginning')).toEqual(['the', 'beginning']);
	});

	it('returns empty array for empty input', () => {
		expect(tokenize('')).toEqual([]);
	});

	it('handles semicolons and colons', () => {
		expect(tokenize('faith; hope: charity')).toEqual(['faith', 'hope', 'charity']);
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd douayrheimsbible && npx vitest run tests/unit/search/normalize.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `src/lib/search/normalize.ts`:

```typescript
/**
 * Shared text normalization for the ODR text search index.
 * Used by both the build-time indexer and the client-side query engine.
 */

/** Strip all HTML tags from verse/note text. Removes <cr> and <na> tags WITH their content. */
export function stripHtml(text: string): string {
	return text.replace(/<cr>[^<]*<\/cr>/g, '').replace(/<na>[^<]*<\/na>/g, '').replace(/<[^>]+>/g, '');
}

/** Tokenize text into normalized search tokens: lowercase, strip punctuation, remove hyphens. */
export function tokenize(text: string): string[] {
	if (!text) return [];
	return text
		.toLowerCase()
		.replace(/\[[\d]+\]/g, '') // remove bracket markers [1], [2], etc.
		.replace(/[.,;:!?()"']/g, ' ') // punctuation to spaces
		.split(/\s+/)
		.map((w) => w.replace(/-/g, '')) // strip hyphens: to-day → today
		.filter((w) => w.length > 0);
}

/** The MiniSearch processTerm function. Returns null for empty tokens. */
export function processTerm(term: string): string | null {
	const normalized = term
		.toLowerCase()
		.replace(/[.,;:!?()"']/g, '')
		.replace(/-/g, '');
	return normalized.length > 0 ? normalized : null;
}

/**
 * The MiniSearch tokenizer function.
 * Splits on whitespace and punctuation, removes bracket markers.
 */
export function searchTokenizer(text: string): string[] {
	if (!text) return [];
	return text
		.replace(/\[[\d]+\]/g, '')
		.split(/[\s.,;:!?()"']+/)
		.filter((w) => w.length > 0);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd douayrheimsbible && npx vitest run tests/unit/search/normalize.test.ts`
Expected: All 8 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/search/normalize.ts tests/unit/search/normalize.test.ts
git commit -m "feat(search): add shared normalize module for text search tokenization"
```

---

## Task 3: Query expansion module

**Files:**
- Create: `src/lib/search/query-expansions.json`
- Create: `src/lib/search/expand-query.ts`
- Create: `tests/unit/search/expand-query.test.ts`

- [ ] **Step 1: Create a starter query-expansions.json**

Create `src/lib/search/query-expansions.json` with a small initial set of known ODR spellings. This will be replaced later by the generate-expansions script output, but we need it now for development and testing:

```json
{
	"honor": ["honour"],
	"honor's": ["honour's"],
	"baptize": ["baptise"],
	"baptized": ["baptised"],
	"savior": ["saviour"],
	"favor": ["favour"],
	"color": ["colour"],
	"today": ["to-day"],
	"forever": ["for-ever"],
	"recognize": ["recognise"],
	"labor": ["labour"],
	"neighbor": ["neighbour"],
	"passover": ["pasch"]
}
```

- [ ] **Step 2: Write the failing tests**

Create `tests/unit/search/expand-query.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { expandTokens, isAllStopWords } from '$lib/search/expand-query';

describe('expandTokens', () => {
	it('expands a modern word to its ODR equivalent', () => {
		expect(expandTokens(['baptize'])).toEqual(['baptize', 'baptise']);
	});

	it('does not duplicate words already present', () => {
		expect(expandTokens(['honour'])).toEqual(['honour']);
	});

	it('expands multiple tokens', () => {
		const result = expandTokens(['honor', 'god']);
		expect(result).toContain('honor');
		expect(result).toContain('honour');
		expect(result).toContain('god');
	});

	it('returns tokens unchanged when no expansions match', () => {
		expect(expandTokens(['grace', 'faith'])).toEqual(['grace', 'faith']);
	});

	it('handles empty array', () => {
		expect(expandTokens([])).toEqual([]);
	});
});

describe('isAllStopWords', () => {
	it('returns true for common stop words', () => {
		expect(isAllStopWords(['the', 'and', 'of'])).toBe(true);
	});

	it('returns false when at least one non-stop word', () => {
		expect(isAllStopWords(['the', 'lord'])).toBe(false);
	});

	it('returns true for empty array', () => {
		expect(isAllStopWords([])).toBe(true);
	});

	it('returns true for single stop word', () => {
		expect(isAllStopWords(['the'])).toBe(true);
	});

	it('returns false for single non-stop word', () => {
		expect(isAllStopWords(['peter'])).toBe(false);
	});
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd douayrheimsbible && npx vitest run tests/unit/search/expand-query.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Write the implementation**

Create `src/lib/search/expand-query.ts`:

```typescript
import expansions from './query-expansions.json';

const expansionMap: Record<string, string[]> = expansions;

const STOP_WORDS = new Set([
	'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
	'of', 'with', 'by', 'from', 'is', 'it', 'as', 'be', 'was', 'are',
	'were', 'been', 'has', 'had', 'do', 'did', 'not', 'no', 'nor',
	'so', 'if', 'than', 'that', 'this', 'then', 'them', 'they',
	'he', 'she', 'his', 'her', 'him', 'i', 'me', 'my', 'we', 'us',
	'our', 'you', 'your', 'who', 'whom', 'which', 'what', 'when',
	'where', 'how', 'all', 'each', 'every', 'both', 'few', 'more',
	'most', 'other', 'some', 'such', 'up', 'out', 'about', 'into',
	'over', 'after', 'before', 'between', 'under', 'again', 'there',
	'here', 'once', 'will', 'shall', 'may', 'can', 'could', 'would',
	'should', 'might', 'must'
]);

/**
 * Expand query tokens with ODR spelling equivalents.
 * e.g. ["baptize", "peter"] → ["baptize", "baptise", "peter"]
 */
export function expandTokens(tokens: string[]): string[] {
	const result: string[] = [];
	const seen = new Set<string>();

	for (const token of tokens) {
		if (!seen.has(token)) {
			seen.add(token);
			result.push(token);
		}
		const alts = expansionMap[token];
		if (alts) {
			for (const alt of alts) {
				if (!seen.has(alt)) {
					seen.add(alt);
					result.push(alt);
				}
			}
		}
	}

	return result;
}

/** Returns true if every token is a stop word (or the array is empty). */
export function isAllStopWords(tokens: string[]): boolean {
	return tokens.every((t) => STOP_WORDS.has(t));
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd douayrheimsbible && npx vitest run tests/unit/search/expand-query.test.ts`
Expected: All 10 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/search/query-expansions.json src/lib/search/expand-query.ts tests/unit/search/expand-query.test.ts
git commit -m "feat(search): add query expansion module for archaic/British spelling support"
```

---

## Task 4: Build search index script

**Files:**
- Create: `scripts/build-search-index.ts`
- Modify: `scripts/prepare-data.ts`

- [ ] **Step 1: Write the build script**

Create `scripts/build-search-index.ts`:

```typescript
import { readdir, readFile, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import MiniSearch from 'minisearch';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');
const DATA_DIR = join(PROJECT_ROOT, 'static', 'data', 'odr');

interface VerseDoc {
	id: string;
	book: string;
	chapter: number;
	verse: number;
	text: string;
}

interface NoteDoc {
	id: string;
	book: string;
	chapter: number;
	verse: number;
	text: string;
	type: string;
}

function stripHtml(text: string): string {
	return text
		.replace(/<cr>[^<]*<\/cr>/g, '')
		.replace(/<na>[^<]*<\/na>/g, '')
		.replace(/<[^>]+>/g, '');
}

function cleanText(text: string): string {
	return stripHtml(text)
		.replace(/\[[\d]+\]/g, '')
		.replace(/  +/g, ' ')
		.trim();
}

const MINISEARCH_OPTIONS = {
	fields: ['text'] as const,
	storeFields: ['book', 'chapter', 'verse'] as string[],
	tokenize: (text: string): string[] => {
		if (!text) return [];
		return text
			.replace(/\[[\d]+\]/g, '')
			.split(/[\s.,;:!?()"']+/)
			.filter((w) => w.length > 0);
	},
	processTerm: (term: string): string | null => {
		const normalized = term
			.toLowerCase()
			.replace(/[.,;:!?()"']/g, '')
			.replace(/-/g, '');
		return normalized.length > 0 ? normalized : null;
	}
};

const NOTES_MINISEARCH_OPTIONS = {
	...MINISEARCH_OPTIONS,
	storeFields: ['book', 'chapter', 'verse', 'type'] as string[]
};

async function buildVerseIndex(): Promise<void> {
	const miniSearch = new MiniSearch(MINISEARCH_OPTIONS);
	const docs: VerseDoc[] = [];

	const files = await readdir(DATA_DIR);
	for (const file of files.sort()) {
		if (!file.endsWith('.json') || file.startsWith('search-')) continue;
		const raw = await readFile(join(DATA_DIR, file), 'utf-8');
		const book = JSON.parse(raw);
		if (!book.book || !book.chapters) continue;

		const slug = file.replace('.json', '');
		for (const ch of book.chapters) {
			for (const v of ch.verses) {
				docs.push({
					id: `${slug}:${ch.chapter}:${v.verse}`,
					book: slug,
					chapter: ch.chapter,
					verse: v.verse,
					text: cleanText(v.text)
				});
			}
		}
	}

	miniSearch.addAll(docs);
	const json = JSON.stringify(miniSearch);
	await writeFile(join(DATA_DIR, 'search-index.json'), json);
	console.log(`✓ Verse search index: ${docs.length} documents (${(json.length / 1024 / 1024).toFixed(2)} MB)`);
}

async function buildNotesIndex(): Promise<void> {
	const miniSearch = new MiniSearch(NOTES_MINISEARCH_OPTIONS);
	const docs: NoteDoc[] = [];

	const files = await readdir(DATA_DIR);
	for (const file of files.sort()) {
		if (!file.endsWith('.json') || file.startsWith('search-')) continue;
		const raw = await readFile(join(DATA_DIR, file), 'utf-8');
		const book = JSON.parse(raw);
		if (!book.book || !book.chapters) continue;

		const slug = file.replace('.json', '');

		// Index inline verse notes
		for (const ch of book.chapters) {
			for (const v of ch.verses) {
				if (v.notes) {
					for (let i = 0; i < v.notes.length; i++) {
						const note = v.notes[i];
						const text = cleanText(note.text);
						if (text) {
							docs.push({
								id: `${slug}:${ch.chapter}:${v.verse}:n${i}`,
								book: slug,
								chapter: ch.chapter,
								verse: v.verse,
								text,
								type: 'note'
							});
						}
					}
				}
			}
		}

		// Index annotation sidecars
		const annotDir = join(DATA_DIR, slug, 'annotations');
		try {
			const annFiles = await readdir(annotDir);
			for (const annFile of annFiles.sort()) {
				if (!annFile.endsWith('.json')) continue;
				// Skip nested annotations directories (annotations/annotations/)
				const annPath = join(annotDir, annFile);
				const annRaw = await readFile(annPath, 'utf-8');
				const annData = JSON.parse(annRaw);
				if (!annData.annotations) continue;

				for (let i = 0; i < annData.annotations.length; i++) {
					const ann = annData.annotations[i];
					const parts: string[] = [];
					if (ann.title) parts.push(ann.title);
					if (ann.text) parts.push(cleanText(ann.text));
					if (ann.notes) {
						for (const n of ann.notes) {
							if (n.text) parts.push(cleanText(n.text));
						}
					}
					const text = parts.join(' ');
					if (text) {
						docs.push({
							id: `${slug}:${ann.verse || annData.chapter}:${ann.verse || 0}:a${i}`,
							book: slug,
							chapter: annData.chapter,
							verse: ann.verse || 0,
							text,
							type: 'annotation'
						});
					}
				}
			}
		} catch {
			// No annotations directory for this book — skip
		}
	}

	miniSearch.addAll(docs);
	const json = JSON.stringify(miniSearch);
	await writeFile(join(DATA_DIR, 'search-notes-index.json'), json);
	console.log(`✓ Notes search index: ${docs.length} documents (${(json.length / 1024 / 1024).toFixed(2)} MB)`);
}

export async function buildSearchIndexes(): Promise<void> {
	console.log('\nBuilding search indexes...');
	await buildVerseIndex();
	await buildNotesIndex();
}

// Allow running standalone
if (process.argv[1] && process.argv[1].includes('build-search-index')) {
	buildSearchIndexes().catch((e) => {
		console.error(e);
		process.exit(1);
	});
}
```

- [ ] **Step 2: Integrate into prepare-data.ts**

In `scripts/prepare-data.ts`, add the import at the top and call it at the end of `main()`:

Add this import at the top of the file (after existing imports):

```typescript
import { buildSearchIndexes } from './build-search-index.js';
```

Add this at the end of the `main()` function, just before the closing `}`:

```typescript
	await buildSearchIndexes();
```

- [ ] **Step 3: Run the build script to generate indexes**

Run: `cd douayrheimsbible && npx tsx scripts/build-search-index.ts`
Expected output:
```
Building search indexes...
✓ Verse search index: ~37000 documents (X.XX MB)
✓ Notes search index: ~XXXX documents (X.XX MB)
```

- [ ] **Step 4: Add generated indexes to .gitignore**

Add to `.gitignore` (these are generated at build time, not committed):

```
static/data/odr/search-index.json
static/data/odr/search-notes-index.json
```

- [ ] **Step 5: Commit**

```bash
git add scripts/build-search-index.ts scripts/prepare-data.ts .gitignore
git commit -m "feat(search): add build-time MiniSearch index generation for verse text and notes"
```

---

## Task 5: Text search engine module

**Files:**
- Create: `src/lib/search/text-search.ts`
- Create: `tests/unit/search/text-search.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/search/text-search.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseResultId, buildTextResultGroups, type TextSearchResult } from '$lib/search/text-search';

describe('parseResultId', () => {
	it('parses a verse id', () => {
		expect(parseResultId('matthew:16:18')).toEqual({
			book: 'matthew',
			chapter: 16,
			verse: 18
		});
	});

	it('parses a note id', () => {
		expect(parseResultId('genesis:1:1:n0')).toEqual({
			book: 'genesis',
			chapter: 1,
			verse: 1
		});
	});

	it('parses an annotation id', () => {
		expect(parseResultId('matthew:22:2:a0')).toEqual({
			book: 'matthew',
			chapter: 22,
			verse: 2
		});
	});
});

describe('buildTextResultGroups', () => {
	it('groups results by chapter', () => {
		const results: TextSearchResult[] = [
			{ id: 'matthew:16:18', score: 5, book: 'matthew', chapter: 16, verse: 18 },
			{ id: 'matthew:16:19', score: 4, book: 'matthew', chapter: 16, verse: 19 }
		];

		const groups = buildTextResultGroups(results);
		expect(groups).toHaveLength(1);
		expect(groups[0].slug).toBe('matthew');
		expect(groups[0].chapter).toBe(16);
		expect(groups[0].verseNumbers).toEqual([18, 19]);
	});

	it('creates separate groups for different chapters', () => {
		const results: TextSearchResult[] = [
			{ id: 'matthew:16:18', score: 5, book: 'matthew', chapter: 16, verse: 18 },
			{ id: 'john:6:53', score: 3, book: 'john', chapter: 6, verse: 53 }
		];

		const groups = buildTextResultGroups(results);
		expect(groups).toHaveLength(2);
		expect(groups[0].slug).toBe('matthew');
		expect(groups[1].slug).toBe('john');
	});

	it('preserves relevance order (does not re-sort to canonical)', () => {
		const results: TextSearchResult[] = [
			{ id: 'john:6:53', score: 10, book: 'john', chapter: 6, verse: 53 },
			{ id: 'matthew:16:18', score: 5, book: 'matthew', chapter: 16, verse: 18 }
		];

		const groups = buildTextResultGroups(results);
		expect(groups[0].slug).toBe('john');
		expect(groups[1].slug).toBe('matthew');
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd douayrheimsbible && npx vitest run tests/unit/search/text-search.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `src/lib/search/text-search.ts`:

```typescript
import MiniSearch from 'minisearch';
import { searchTokenizer, processTerm } from './normalize';
import { expandTokens, isAllStopWords } from './expand-query';
import { tokenize } from './normalize';
import { loadBook, getChapter } from '$lib/data/loader';
import { ALL_BOOKS } from '$lib/data/books';
import type { Verse } from '$lib/data/types';

export interface TextSearchResult {
	id: string;
	score: number;
	book: string;
	chapter: number;
	verse: number;
	type?: string; // 'note' | 'annotation' (notes index only)
}

export interface TextResultGroup {
	heading: string;
	slug: string;
	chapter: number;
	bookName: string;
	verseNumbers: number[];
	verses: Verse[];
	/** Query tokens for highlighting */
	queryTokens: string[];
}

export interface NoteResultItem {
	book: string;
	slug: string;
	bookName: string;
	chapter: number;
	verse: number;
	type: string;
	text: string;
	score: number;
	queryTokens: string[];
}

const MINISEARCH_OPTIONS = {
	fields: ['text'] as string[],
	storeFields: ['book', 'chapter', 'verse'] as string[],
	tokenize: searchTokenizer,
	processTerm
};

const NOTES_MINISEARCH_OPTIONS = {
	...MINISEARCH_OPTIONS,
	storeFields: ['book', 'chapter', 'verse', 'type'] as string[]
};

let verseIndex: MiniSearch | null = null;
let notesIndex: MiniSearch | null = null;
let verseIndexPromise: Promise<MiniSearch> | null = null;
let notesIndexPromise: Promise<MiniSearch> | null = null;

async function loadVerseIndex(fetch: typeof globalThis.fetch): Promise<MiniSearch> {
	if (verseIndex) return verseIndex;
	if (verseIndexPromise) return verseIndexPromise;

	verseIndexPromise = fetch('/data/odr/search-index.json')
		.then((res) => {
			if (!res.ok) throw new Error(`Failed to load search index: ${res.status}`);
			return res.text();
		})
		.then((json) => {
			verseIndex = MiniSearch.loadJSON(json, MINISEARCH_OPTIONS);
			return verseIndex;
		});

	verseIndexPromise.catch(() => {
		verseIndexPromise = null;
	});

	return verseIndexPromise;
}

async function loadNotesIndex(fetch: typeof globalThis.fetch): Promise<MiniSearch> {
	if (notesIndex) return notesIndex;
	if (notesIndexPromise) return notesIndexPromise;

	notesIndexPromise = fetch('/data/odr/search-notes-index.json')
		.then((res) => {
			if (!res.ok) throw new Error(`Failed to load notes index: ${res.status}`);
			return res.text();
		})
		.then((json) => {
			notesIndex = MiniSearch.loadJSON(json, NOTES_MINISEARCH_OPTIONS);
			return notesIndex;
		});

	notesIndexPromise.catch(() => {
		notesIndexPromise = null;
	});

	return notesIndexPromise;
}

export function parseResultId(id: string): { book: string; chapter: number; verse: number } {
	const parts = id.split(':');
	return {
		book: parts[0],
		chapter: parseInt(parts[1], 10),
		verse: parseInt(parts[2], 10)
	};
}

/** Search the verse text index. Returns raw scored results. */
export async function searchVerses(
	query: string,
	fetch: typeof globalThis.fetch,
	limit = 100
): Promise<{ results: TextSearchResult[]; total: number; queryTokens: string[] }> {
	const tokens = tokenize(query);
	if (!tokens.length || isAllStopWords(tokens)) {
		return { results: [], total: 0, queryTokens: tokens };
	}

	const expanded = expandTokens(tokens);
	const index = await loadVerseIndex(fetch);

	// Build query: use expanded tokens with AND combination
	const raw = index.search(query, {
		combineWith: 'AND',
		prefix: (term) => term.length > 2,
		processTerm,
		tokenize: () => expanded
	});

	const total = raw.length;
	const results: TextSearchResult[] = raw.slice(0, limit).map((r) => ({
		id: r.id as string,
		score: r.score,
		book: r.book as string,
		chapter: r.chapter as number,
		verse: r.verse as number
	}));

	return { results, total, queryTokens: expanded };
}

/** Search the notes/annotations index. Returns raw scored results. */
export async function searchNotes(
	query: string,
	fetch: typeof globalThis.fetch,
	limit = 100
): Promise<{ results: TextSearchResult[]; total: number; queryTokens: string[] }> {
	const tokens = tokenize(query);
	if (!tokens.length || isAllStopWords(tokens)) {
		return { results: [], total: 0, queryTokens: tokens };
	}

	const expanded = expandTokens(tokens);
	const index = await loadNotesIndex(fetch);

	const raw = index.search(query, {
		combineWith: 'AND',
		prefix: (term) => term.length > 2,
		processTerm,
		tokenize: () => expanded
	});

	const total = raw.length;
	const results: TextSearchResult[] = raw.slice(0, limit).map((r) => ({
		id: r.id as string,
		score: r.score,
		book: r.book as string,
		chapter: r.chapter as number,
		verse: r.verse as number,
		type: r.type as string
	}));

	return { results, total, queryTokens: expanded };
}

/**
 * Group verse search results by chapter and fetch full verse text for rendering.
 * Results maintain relevance order (not canonical).
 */
export function buildTextResultGroups(results: TextSearchResult[]): Omit<TextResultGroup, 'verses' | 'queryTokens'>[] {
	const groups: Omit<TextResultGroup, 'verses' | 'queryTokens'>[] = [];
	const seen = new Map<string, number>(); // "book:chapter" → group index

	for (const r of results) {
		const key = `${r.book}:${r.chapter}`;
		const existing = seen.get(key);
		if (existing !== undefined) {
			groups[existing].verseNumbers.push(r.verse);
		} else {
			const meta = ALL_BOOKS.find((b) => b.slug === r.book);
			seen.set(key, groups.length);
			groups.push({
				heading: meta ? `${meta.odrName} ${r.chapter}` : `${r.book} ${r.chapter}`,
				slug: r.book,
				chapter: r.chapter,
				bookName: meta?.odrName ?? r.book,
				verseNumbers: [r.verse]
			});
		}
	}

	return groups;
}

/**
 * Fetch full verse data for result groups.
 * Loads needed book JSONs and extracts the matching verses.
 */
export async function hydrateResultGroups(
	groups: Omit<TextResultGroup, 'verses' | 'queryTokens'>[],
	queryTokens: string[],
	fetch: typeof globalThis.fetch
): Promise<TextResultGroup[]> {
	// Collect unique book slugs
	const slugs = [...new Set(groups.map((g) => g.slug))];

	// Load all needed books in parallel
	await Promise.all(slugs.map((slug) => loadBook(slug, fetch)));

	const hydrated: TextResultGroup[] = [];

	for (const group of groups) {
		const bookData = await loadBook(group.slug, fetch);
		const chapter = getChapter(bookData, group.chapter);
		if (!chapter) continue;

		const verses = group.verseNumbers
			.map((vn) => chapter.verses.find((v) => v.verse === vn))
			.filter((v): v is Verse => v !== undefined);

		if (verses.length > 0) {
			hydrated.push({ ...group, verses, queryTokens });
		}
	}

	return hydrated;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd douayrheimsbible && npx vitest run tests/unit/search/text-search.test.ts`
Expected: All 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/search/text-search.ts tests/unit/search/text-search.test.ts
git commit -m "feat(search): add text search engine with MiniSearch lazy loading and query expansion"
```

---

## Task 6: Update search page — URL params and mode state

**Files:**
- Modify: `src/routes/search/+page.ts`
- Modify: `src/routes/search/+page.svelte` (script section only)

- [ ] **Step 1: Update +page.ts to read mode and scope params**

Replace the contents of `src/routes/search/+page.ts` with:

```typescript
import type { PageLoad } from './$types';

export type SearchMode = 'verse' | 'text';
export type SearchScope = 'verses' | 'notes';

export const load: PageLoad = ({ url }) => {
	const mode = (url.searchParams.get('mode') === 'text' ? 'text' : 'verse') as SearchMode;
	const scope = (url.searchParams.get('scope') === 'notes' ? 'notes' : 'verses') as SearchScope;
	return {
		query: url.searchParams.get('q') ?? '',
		mode,
		scope,
		hasStudyMode: true
	};
};
```

- [ ] **Step 2: Add text search state and mode switching to +page.svelte**

In `src/routes/search/+page.svelte`, update the script section. Add imports at the top (after existing imports):

```typescript
import type { SearchMode, SearchScope } from './+page';
import {
	searchVerses,
	searchNotes,
	buildTextResultGroups,
	hydrateResultGroups,
	type TextResultGroup,
	type NoteResultItem
} from '$lib/search/text-search';
import { isAllStopWords } from '$lib/search/expand-query';
import { tokenize } from '$lib/search/normalize';
```

Update the `data` export and add new state variables (replace the existing `export let data` line and the lines below it up to `const EXAMPLES`):

```typescript
export let data: { query: string; mode: SearchMode; scope: SearchScope };

let reducedMotion = false;

let inputEl: HTMLInputElement;
let query = data.query;
let mode: SearchMode = data.mode;
let scope: SearchScope = data.scope;
let results: SearchResultGroup[] = [];
let textResults: TextResultGroup[] = [];
let textTotal = 0;
let textLimit = 100;
let stopWordWarning = false;
let loading = false;
let searched = false;
let debounceTimer: ReturnType<typeof setTimeout>;
let searchGeneration = 0;
let lastDataQuery = data.query;
let lastDataMode = data.mode;
let lastDataScope = data.scope;

const VERSE_EXAMPLES = ['Matthew 16:18', 'John 6:53-56', 'Luke 1:28, Revelation 12:1'];
const TEXT_VERSE_EXAMPLES = ['thou art Peter', 'full of grace', 'daily bread'];
const TEXT_NOTES_EXAMPLES = ['transubstantiation', 'original sin'];

$: currentExamples =
	mode === 'verse'
		? VERSE_EXAMPLES
		: scope === 'notes'
			? TEXT_NOTES_EXAMPLES
			: TEXT_VERSE_EXAMPLES;

$: placeholder =
	mode === 'verse'
		? 'Search for a verse — e.g. Matthew 16:18'
		: scope === 'notes'
			? 'Search notes & annotations — e.g. transubstantiation'
			: 'Search the Bible — e.g. thou art Peter';

$: heading = mode === 'verse' ? 'Verse Search' : 'Text Search';

$: noResultsMessage =
	mode === 'verse'
		? null // handled in existing template
		: scope === 'notes'
			? 'No notes found matching your search.'
			: 'No verses found matching your search.';
```

- [ ] **Step 3: Update the URL sync and search dispatch functions**

Replace the `updateUrl` function with:

```typescript
function updateUrl(q: string) {
	if (!browser) return;
	lastDataQuery = q.trim();
	lastDataMode = mode;
	lastDataScope = scope;
	const url = new URL(window.location.href);
	if (q.trim()) {
		url.searchParams.set('q', q.trim());
	} else {
		url.searchParams.delete('q');
	}
	if (mode === 'text') {
		url.searchParams.set('mode', 'text');
		if (scope === 'notes') {
			url.searchParams.set('scope', 'notes');
		} else {
			url.searchParams.delete('scope');
		}
	} else {
		url.searchParams.delete('mode');
		url.searchParams.delete('scope');
	}
	goto(url.toString(), { noScroll: true, keepFocus: true });
}
```

Replace the `search` function with:

```typescript
async function search(q: string) {
	const trimmed = q.trim();
	if (!trimmed) return;

	if (mode === 'verse') {
		await searchVerse(trimmed);
	} else {
		await searchText(trimmed);
	}
}

async function searchVerse(trimmed: string) {
	const ranges = parseAllReferences(trimmed);
	if (!ranges.length) {
		results = [];
		textResults = [];
		searched = true;
		loading = false;
		return;
	}

	const gen = ++searchGeneration;
	loading = true;
	try {
		const data = await buildResultGroups(ranges, fetch);
		if (gen !== searchGeneration) return;
		results = data;
		textResults = [];
		searched = true;
	} catch {
		if (gen !== searchGeneration) return;
		results = [];
		searched = true;
	}
	loading = false;
}

async function searchText(trimmed: string) {
	const tokens = tokenize(trimmed);
	if (isAllStopWords(tokens)) {
		stopWordWarning = true;
		textResults = [];
		results = [];
		searched = true;
		loading = false;
		return;
	}
	stopWordWarning = false;

	const gen = ++searchGeneration;
	loading = true;
	try {
		if (scope === 'verses') {
			const { results: raw, total, queryTokens } = await searchVerses(trimmed, fetch, textLimit);
			if (gen !== searchGeneration) return;
			const groups = buildTextResultGroups(raw);
			textResults = await hydrateResultGroups(groups, queryTokens, fetch);
			textTotal = total;
		} else {
			const { results: raw, total, queryTokens } = await searchNotes(trimmed, fetch, textLimit);
			if (gen !== searchGeneration) return;
			// For notes, we still group by chapter and show verse context
			const groups = buildTextResultGroups(raw);
			textResults = await hydrateResultGroups(groups, queryTokens, fetch);
			textTotal = total;
		}
		if (gen !== searchGeneration) return;
		results = [];
		searched = true;
	} catch {
		if (gen !== searchGeneration) return;
		textResults = [];
		searched = true;
	}
	loading = false;
}
```

Add mode/scope switching functions:

```typescript
function setMode(newMode: SearchMode) {
	if (newMode === mode) return;
	mode = newMode;
	results = [];
	textResults = [];
	searched = false;
	stopWordWarning = false;
	updateUrl(query);
	if (query.trim()) search(query);
}

function setScope(newScope: SearchScope) {
	if (newScope === scope) return;
	scope = newScope;
	textResults = [];
	searched = false;
	stopWordWarning = false;
	updateUrl(query);
	if (query.trim()) search(query);
}

function showMore() {
	textLimit += 100;
	if (query.trim()) searchText(query.trim());
}
```

Update the `afterNavigate` callback to handle mode/scope changes:

```typescript
afterNavigate(() => {
	if (data.query !== lastDataQuery || data.mode !== lastDataMode || data.scope !== lastDataScope) {
		lastDataQuery = data.query;
		lastDataMode = data.mode;
		lastDataScope = data.scope;
		query = data.query;
		mode = data.mode;
		scope = data.scope;
		results = [];
		textResults = [];
		searched = false;
		loading = false;
		textLimit = 100;
		stopWordWarning = false;
		if (query) search(query);
	}
	if (inputEl) inputEl.focus();
});
```

Update the `isHero` reactive declaration:

```typescript
$: isHero = !searched && !query;
```

Update `navOverride` to also consider textResults:

```typescript
$: navOverride.set(
	results.length > 0
		? { bookSlug: results[0].slug, chapter: results[0].chapter }
		: textResults.length > 0
			? { bookSlug: textResults[0].slug, chapter: textResults[0].chapter }
			: null
);
```

- [ ] **Step 4: Verify no TypeScript errors**

Run: `cd douayrheimsbible && npx svelte-check --tsconfig ./tsconfig.json 2>&1 | tail -20`
Expected: No errors related to the search page.

- [ ] **Step 5: Commit**

```bash
git add src/routes/search/+page.ts src/routes/search/+page.svelte
git commit -m "feat(search): add text search mode state, URL params, and search dispatch"
```

---

## Task 7: Update search page — template and UI

**Files:**
- Modify: `src/routes/search/+page.svelte` (template section)

- [ ] **Step 1: Add mode toggle below the search card**

In the template, after the closing `</form>` tag (line 240 area), add the mode toggle:

```svelte
<!-- Mode toggle -->
<div class="flex justify-center gap-[2px] mb-md -mt-[8px]">
	<button
		class="px-[16px] py-[7px] text-[12px] font-medium uppercase tracking-[0.08em] rounded-l-[4px] transition-colors duration-fast
			{mode === 'verse'
			? 'bg-accent text-white'
			: 'bg-transparent text-subtle hover:text-foreground border border-border'}"
		on:click={() => setMode('verse')}
	>
		Verse Search
	</button>
	<button
		class="px-[16px] py-[7px] text-[12px] font-medium uppercase tracking-[0.08em] rounded-r-[4px] transition-colors duration-fast
			{mode === 'text'
			? 'bg-accent text-white'
			: 'bg-transparent text-subtle hover:text-foreground border border-border'}"
		on:click={() => setMode('text')}
	>
		Text Search
	</button>
</div>

<!-- Scope toggle (text mode only) -->
{#if mode === 'text'}
	<div class="flex justify-center gap-[2px] mb-md -mt-[4px]">
		<button
			class="px-[12px] py-[5px] text-[11px] font-medium tracking-[0.05em] rounded-l-[3px] transition-colors duration-fast
				{scope === 'verses'
				? 'text-foreground border-b-2 border-accent'
				: 'text-subtle hover:text-foreground'}"
			on:click={() => setScope('verses')}
		>
			Verses
		</button>
		<button
			class="px-[12px] py-[5px] text-[11px] font-medium tracking-[0.05em] rounded-r-[3px] transition-colors duration-fast
				{scope === 'notes'
				? 'text-foreground border-b-2 border-accent'
				: 'text-subtle hover:text-foreground'}"
			on:click={() => setScope('notes')}
		>
			Notes & Annotations
		</button>
	</div>
{/if}
```

- [ ] **Step 2: Update the H1 heading**

Replace the existing H1 text `Verse Search` with the reactive `heading` variable:

```svelte
<h1
	class="font-reader text-[2.2rem] leading-[1.2] tracking-[-0.01em] text-foreground mb-[14px]"
>
	{heading}
</h1>
```

- [ ] **Step 3: Update the input placeholder and examples**

Replace the hardcoded placeholder on the input:

```svelte
placeholder={placeholder}
```

Replace the hardcoded `EXAMPLES` in the example buttons section:

```svelte
{#each currentExamples as example}
```

- [ ] **Step 4: Add text search results rendering**

After the existing verse search results block (`{#if results.length > 0} ... {/if}`), add the text results block:

```svelte
<!-- Text search results -->
{#if textResults.length > 0}
	<div class="space-y-[24px]" in:fade={{ duration: reducedMotion ? 0 : 260 }}>
		{#each textResults as group, groupIdx}
			{#if groupIdx > 0}
				<hr class="border-border" />
			{/if}
			<section class:pl-[2.5rem]={$prefs.showVerseNumbers}>
				<h2
					class="font-ui text-[14px] font-semibold mb-[8px]"
					style="color: var(--color-accent-text)"
				>
					<a
						href="/odr/{group.slug}/{group.chapter}"
						class="hover:text-foreground transition-colors duration-fast"
						on:click={() => prefs.update((p) => ({ ...p, readingMode: 'reading' }))}
					>
						{group.heading}
					</a>
				</h2>
				<div class="space-y-[0.7rem]">
					{#each group.verses as v}
						<div class="relative">
							{#if $prefs.showVerseNumbers}
								<span
									class="absolute right-full pr-[0.5rem] w-[2.5rem] text-right font-ui text-[13px] max-md:text-[10px] font-thin select-none tabular-nums leading-[var(--line-height-reader)] pt-[0.15em] text-subtle"
									>{v.verse}</span
								>
							{/if}
							<p
								class="font-reader text-[length:var(--font-size-reader)] leading-[var(--line-height-reader)]"
								class:text-justify={$prefs.justifiedText}
							>
								{@html highlightSearchVerse(v.text, group.queryTokens)}
							</p>
						</div>
					{/each}
				</div>
				<a
					href="/odr/{group.slug}/{group.chapter}"
					class="inline-block mt-[8px] text-[11px] uppercase tracking-[0.15em] text-subtle hover:text-foreground transition-colors duration-fast font-medium"
					on:click={() => prefs.update((p) => ({ ...p, readingMode: 'reading' }))}
				>
					Read full chapter →
				</a>
			</section>
		{/each}

		<!-- Show more / result count -->
		{#if textTotal > textResults.reduce((n, g) => n + g.verses.length, 0)}
			<div class="text-center pt-sm">
				<button
					class="px-[20px] py-[8px] rounded-[4px] border border-border text-[13px] text-subtle hover:text-foreground transition-colors duration-fast"
					on:click={showMore}
				>
					Show more results ({textTotal} total)
				</button>
			</div>
		{/if}
	</div>
{/if}

<!-- Stop word warning -->
{#if stopWordWarning}
	<p
		class="text-subtle text-[14px] text-center"
		in:fade={{ duration: reducedMotion ? 0 : 160 }}
	>
		Try a more specific search. Common words like "the" or "and" are too broad.
	</p>
{/if}
```

- [ ] **Step 5: Update the "no results" message for text mode**

After the existing no-results block, add the text search no-results:

```svelte
{#if searched && !loading && mode === 'text' && textResults.length === 0 && !stopWordWarning}
	<p
		class="text-subtle text-[14px] text-center"
		in:fade={{ duration: reducedMotion ? 0 : 160 }}
	>
		{noResultsMessage}<br />Try different words or use
		<button
			class="text-subtle hover:text-foreground hover:underline"
			on:click={() => onExampleClick(currentExamples[0])}>{currentExamples[0]}</button
		>
	</p>
{/if}
```

Update the existing verse no-results block to only show in verse mode:

```svelte
{#if searched && !loading && mode === 'verse' && results.length === 0}
```

- [ ] **Step 6: Add the highlight rendering function**

Add this function to the `<script>` section, after `renderSearchVerse`:

```typescript
/** Render verse text for text search results with query term highlighting. */
function highlightSearchVerse(text: string, queryTokens: string[]): string {
	let t = renderSearchVerse(text);
	if (!queryTokens.length) return t;

	// Build a regex that matches any of the query tokens as whole words
	const escaped = queryTokens.map((tok) => tok.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
	// Sort by length descending so longer matches take priority
	escaped.sort((a, b) => b.length - a.length);
	const pattern = new RegExp(`\\b(${escaped.join('|')})\\b`, 'gi');

	// Wrap matches in <mark> but avoid matching inside HTML tags
	t = t.replace(/(<[^>]+>)|(\b\w+\b)/g, (match, tag, word) => {
		if (tag) return tag; // pass through HTML tags
		if (word && pattern.test(word)) {
			pattern.lastIndex = 0; // reset regex state
			return `<mark class="search-highlight">${word}</mark>`;
		}
		return match;
	});

	return t;
}
```

- [ ] **Step 7: Add highlight CSS**

In `src/app.css`, add the search highlight style (check file first for where to add it):

```css
.search-highlight {
	background: var(--color-accent);
	color: var(--color-bg);
	border-radius: 2px;
	padding: 0 2px;
}
```

- [ ] **Step 8: Update the page title**

Replace the existing `<title>` tag:

```svelte
<title>{query ? `${query} | ${heading}` : heading} | ODR Bible</title>
```

- [ ] **Step 9: Verify the page renders without errors**

Run: `cd douayrheimsbible && npx svelte-check --tsconfig ./tsconfig.json 2>&1 | tail -20`
Expected: No errors.

- [ ] **Step 10: Commit**

```bash
git add src/routes/search/+page.svelte src/app.css
git commit -m "feat(search): add text search UI with mode toggle, scope toggle, and result highlighting"
```

---

## Task 8: Generate query expansions

**Files:**
- Create: `scripts/generate-expansions.ts`
- Modify: `src/lib/search/query-expansions.json` (output)

- [ ] **Step 1: Write the generation script**

Create `scripts/generate-expansions.ts`:

```typescript
import { readdir, readFile, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import spellingVariations from 'spelling-variations';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');
const DATA_DIR = join(PROJECT_ROOT, 'static', 'data', 'odr');
const OUTPUT = join(PROJECT_ROOT, 'src', 'lib', 'search', 'query-expansions.json');
const FLAGGED_OUTPUT = join(PROJECT_ROOT, 'scripts', 'flagged-words.txt');

function stripHtml(text: string): string {
	return text
		.replace(/<cr>[^<]*<\/cr>/g, '')
		.replace(/<na>[^<]*<\/na>/g, '')
		.replace(/<[^>]+>/g, '');
}

function extractWords(text: string): Set<string> {
	const words = new Set<string>();
	const cleaned = stripHtml(text).toLowerCase();
	const matches = cleaned.match(/[a-z]+(?:-[a-z]+)*/g);
	if (matches) {
		for (const w of matches) words.add(w);
	}
	return words;
}

async function main() {
	console.log('Extracting ODR vocabulary...');
	const odrWords = new Set<string>();

	const files = await readdir(DATA_DIR);
	for (const file of files.sort()) {
		if (!file.endsWith('.json') || file.startsWith('search-')) continue;
		const raw = await readFile(join(DATA_DIR, file), 'utf-8');
		const book = JSON.parse(raw);
		if (!book.chapters) continue;

		for (const ch of book.chapters) {
			for (const v of ch.verses) {
				for (const w of extractWords(v.text)) odrWords.add(w);
				if (v.notes) {
					for (const n of v.notes) {
						for (const w of extractWords(n.text)) odrWords.add(w);
					}
				}
			}
		}

		// Also check annotations
		const slug = file.replace('.json', '');
		const annotDir = join(DATA_DIR, slug, 'annotations');
		try {
			const annFiles = await readdir(annotDir);
			for (const annFile of annFiles) {
				if (!annFile.endsWith('.json')) continue;
				const annRaw = await readFile(join(annotDir, annFile), 'utf-8');
				const annData = JSON.parse(annRaw);
				if (annData.annotations) {
					for (const ann of annData.annotations) {
						if (ann.title) for (const w of extractWords(ann.title)) odrWords.add(w);
						if (ann.text) for (const w of extractWords(ann.text)) odrWords.add(w);
						if (ann.notes) {
							for (const n of ann.notes) {
								if (n.text) for (const w of extractWords(n.text)) odrWords.add(w);
							}
						}
					}
				}
			}
		} catch {
			// No annotations directory
		}
	}

	console.log(`Found ${odrWords.size} unique words in ODR`);

	// Cross-reference with spelling-variations library
	const expansions: Record<string, string[]> = {};
	let autoMatched = 0;

	for (const word of odrWords) {
		try {
			const sv = new spellingVariations(word);
			const usVersion = sv.toUS;

			// If the US spelling differs from the ODR word, create a mapping
			if (usVersion && usVersion !== word && usVersion !== '-1') {
				if (!expansions[usVersion]) {
					expansions[usVersion] = [];
				}
				if (!expansions[usVersion].includes(word)) {
					expansions[usVersion].push(word);
					autoMatched++;
				}
			}
		} catch {
			// Word not in spelling-variations database — skip
		}
	}

	// Also add hyphenated compound expansions
	for (const word of odrWords) {
		if (word.includes('-')) {
			const collapsed = word.replace(/-/g, '');
			if (collapsed !== word && !odrWords.has(collapsed)) {
				// The ODR has "to-day" but not "today" — map today → to-day
				if (!expansions[collapsed]) {
					expansions[collapsed] = [];
				}
				if (!expansions[collapsed].includes(word)) {
					expansions[collapsed].push(word);
					autoMatched++;
				}
			}
		}
	}

	// Sort expansions by key for stable output
	const sorted: Record<string, string[]> = {};
	for (const key of Object.keys(expansions).sort()) {
		sorted[key] = expansions[key].sort();
	}

	await writeFile(OUTPUT, JSON.stringify(sorted, null, '\t') + '\n');
	console.log(`✓ Generated ${Object.keys(sorted).length} expansion entries (${autoMatched} auto-matched)`);
	console.log(`  → ${OUTPUT}`);

	// Flag potentially archaic words not in a standard English word list
	// For now, output all ODR words that aren't in the expansion map for manual review
	const unmapped: string[] = [];
	const allMappedOdrWords = new Set<string>();
	for (const alts of Object.values(sorted)) {
		for (const w of alts) allMappedOdrWords.add(w);
	}

	// Simple heuristic: flag words that look archaic (end in -eth, -est, -ith, etc.)
	const archaicPatterns = /(?:eth|est|ith|oth|cion|ick|ous)$/;
	for (const word of [...odrWords].sort()) {
		if (
			word.length > 3 &&
			!allMappedOdrWords.has(word) &&
			archaicPatterns.test(word)
		) {
			unmapped.push(word);
		}
	}

	await writeFile(FLAGGED_OUTPUT, unmapped.join('\n') + '\n');
	console.log(`✓ Flagged ${unmapped.length} potentially archaic words for manual review`);
	console.log(`  → ${FLAGGED_OUTPUT}`);
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
```

- [ ] **Step 2: Run the generation script**

Note: if the `spelling-variations` import fails, check the package's actual export format. You may need `import spellingVariations from 'spelling-variations'` or `const { default: spellingVariations } = await import('spelling-variations')` or the constructor may differ. Adjust the import and `new spellingVariations(word).toUS` call to match the actual API.

Run: `cd douayrheimsbible && npx tsx scripts/generate-expansions.ts`
Expected:
```
Extracting ODR vocabulary...
Found ~14758 unique words in ODR
✓ Generated N expansion entries (N auto-matched)
  → src/lib/search/query-expansions.json
✓ Flagged N potentially archaic words for manual review
  → scripts/flagged-words.txt
```

- [ ] **Step 3: Review the generated query-expansions.json**

Skim the generated file to verify it looks reasonable. Check for false positives (words that shouldn't be mapped). The `flagged-words.txt` file is for future manual review — not needed for v1.

- [ ] **Step 4: Commit**

```bash
git add scripts/generate-expansions.ts src/lib/search/query-expansions.json scripts/flagged-words.txt
git commit -m "feat(search): add query expansion generation script and initial ODR spelling map"
```

---

## Task 9: End-to-end manual testing

**Files:** None (testing only)

- [ ] **Step 1: Build the search indexes**

Run: `cd douayrheimsbible && npx tsx scripts/build-search-index.ts`
Expected: Both indexes generated successfully.

- [ ] **Step 2: Start the dev server**

Run: `cd douayrheimsbible && npm run dev`

- [ ] **Step 3: Test verse search still works**

Navigate to `http://localhost:5173/search`. Verify:
- Default mode is "Verse Search" (H1 says "Verse Search")
- Mode toggle is visible below search bar
- Type "Matthew 16:18" → verse results appear as before
- URL shows `/search?q=Matthew+16%3A18` (no `mode` param)

- [ ] **Step 4: Test text search — verse scope**

Click "Text Search" toggle. Verify:
- H1 changes to "Text Search"
- Placeholder changes
- Example buttons change
- Scope toggle appears (Verses | Notes & Annotations)
- URL adds `?mode=text`

Type "thou art Peter". Verify:
- Results appear with Matthew 16:18 near the top
- Query words are highlighted with accent background
- Results grouped by chapter with "Read full chapter" link
- URL shows `?mode=text&q=thou+art+Peter`

- [ ] **Step 5: Test text search — notes scope**

Click "Notes & Annotations" scope toggle. Verify:
- Placeholder and examples change
- Previous results clear
- Type "transubstantiation" or "original sin" → results from annotations

- [ ] **Step 6: Test query expansion**

In text search verse mode, type "baptize". Verify results appear (the ODR uses "baptise"). Try "honor", "savior", "today".

- [ ] **Step 7: Test stop word blocking**

Type just "the" in text search mode. Verify the stop word warning appears instead of results.

- [ ] **Step 8: Test URL sharing**

Copy the URL from a text search result (e.g., `?mode=text&q=thou+art+Peter`). Open in a new tab. Verify it loads directly into text search with results.

- [ ] **Step 9: Test backward compatibility**

Navigate to `/search?q=John+3:16` (no mode param). Verify it defaults to verse search and shows results.

- [ ] **Step 10: Run all unit tests**

Run: `cd douayrheimsbible && npx vitest run`
Expected: All tests pass.

- [ ] **Step 11: Run prettier**

Run: `cd douayrheimsbible && npx prettier --write .`

- [ ] **Step 12: Commit any formatting fixes**

```bash
git add -A
git commit -m "style: prettier format"
```

---

## Task 10: Final build verification

**Files:** None (verification only)

- [ ] **Step 1: Run full build**

Run: `cd douayrheimsbible && npm run build`
Expected: Build succeeds. Search indexes generated as part of prebuild.

- [ ] **Step 2: Verify generated index sizes**

Run:
```bash
ls -lh static/data/odr/search-index.json static/data/odr/search-notes-index.json
gzip -c static/data/odr/search-index.json | wc -c
gzip -c static/data/odr/search-notes-index.json | wc -c
```
Expected: Verse index ~4-5 MB raw (~1.5-2 MB gzip), notes index smaller.

- [ ] **Step 3: Run svelte-check**

Run: `cd douayrheimsbible && npx svelte-check --tsconfig ./tsconfig.json`
Expected: No errors.

- [ ] **Step 4: Run all tests**

Run: `cd douayrheimsbible && npx vitest run`
Expected: All tests pass.

- [ ] **Step 5: Commit if any changes needed**

If the build revealed any issues and fixes were made:
```bash
git add -A
git commit -m "fix: address build issues for text search"
```
