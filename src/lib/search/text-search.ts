import MiniSearch from 'minisearch';
import { searchTokenizer, processTerm, stripHtml, foldLigatures } from './normalize';
import { expandTokens, expandTokenGroups, isAllStopWords } from './expand-query';
import { tokenize } from './normalize';
import { loadBook, getChapter, loadAnnotations } from '$lib/data/loader';
import { ALL_BOOKS } from '$lib/data/books';
import type { Verse } from '$lib/data/types';

export interface TextSearchResult {
	id: string;
	score: number;
	book: string;
	chapter: number;
	verse: number;
	type?: string;
}

export interface TextResultGroup {
	heading: string;
	slug: string;
	chapter: number;
	bookName: string;
	verseNumbers: number[];
	verses: Verse[];
	queryTokens: string[];
}

export interface NoteSubNote {
	marker: string | number;
	text: string;
}

export interface NoteResult {
	/** e.g. "Matthew 1:3" */
	reference: string;
	slug: string;
	chapter: number;
	verse: number;
	/** 'note' (inline verse note) or 'annotation' */
	type: string;
	/** Annotation title if applicable */
	title?: string;
	/** The note/annotation text that matched the search */
	noteText: string;
	/** Sub-notes with markers (for annotations) */
	subNotes?: NoteSubNote[];
	/** The parent verse text (shown for inline notes) */
	verseText?: string;
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

/**
 * Build a MiniSearch query expression tree from tokens.
 * Each token is expanded to its alternatives (OR within group),
 * and groups are combined with AND between them.
 * e.g. ["baptize", "peter"] → AND(OR("baptize","baptise"), "peter")
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildSearchQuery(tokens: string[]): any {
	const groups = expandTokenGroups(tokens);
	const hasExpansions = groups.some((g) => g.length > 1);

	if (!hasExpansions) {
		// No expansions — simple AND query with prefix
		return {
			combineWith: 'AND',
			prefix: (term: string) => term.length > 2,
			queries: tokens
		};
	}

	// Build nested query: AND between groups, OR within groups that have expansions
	return {
		combineWith: 'AND',
		queries: groups.map((group) => {
			if (group.length === 1) {
				return {
					queries: [group[0]],
					prefix: (term: string) => term.length > 2
				};
			}
			return {
				combineWith: 'OR',
				prefix: (term: string) => term.length > 2,
				queries: group
			};
		})
	};
}

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

	const raw = index.search(buildSearchQuery(tokens), {
		processTerm
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

	const raw = index.search(buildSearchQuery(tokens), {
		processTerm
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

export function buildTextResultGroups(
	results: TextSearchResult[]
): Omit<TextResultGroup, 'verses' | 'queryTokens'>[] {
	const groups: Omit<TextResultGroup, 'verses' | 'queryTokens'>[] = [];
	const seen = new Map<string, number>();

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
 * Check if query tokens appear consecutively in text (phrase match).
 * Returns a proximity score: lower = better (0 = exact phrase match).
 * Returns Infinity if tokens don't all appear.
 */
export function phraseProximity(text: string, queryTokens: string[]): number {
	if (queryTokens.length <= 1) return 0;

	const stripped = foldLigatures(stripHtml(text).toLowerCase());
	const words = stripped.match(/[a-z]+(?:-[a-z]+)*/g);
	if (!words) return Infinity;

	// Normalize words the same way as tokenizer (strip hyphens)
	const normalized = words.map((w) => w.replace(/-/g, ''));

	// Find all positions of each query token
	const positions: number[][] = queryTokens.map((token) => {
		const pos: number[] = [];
		for (let i = 0; i < normalized.length; i++) {
			if (normalized[i] === token) pos.push(i);
		}
		return pos;
	});

	// If any token is missing, no proximity
	if (positions.some((p) => p.length === 0)) return Infinity;

	// Find the minimum span covering all query tokens in order
	let bestSpan = Infinity;
	for (const startPos of positions[0]) {
		let pos = startPos;
		let valid = true;
		for (let t = 1; t < positions.length; t++) {
			// Find the next occurrence of token t after current position
			const nextPos = positions[t].find((p) => p > pos);
			if (nextPos === undefined) {
				valid = false;
				break;
			}
			pos = nextPos;
		}
		if (valid) {
			const span = pos - startPos;
			if (span < bestSpan) bestSpan = span;
		}
	}

	return bestSpan;
}

export async function hydrateResultGroups(
	groups: Omit<TextResultGroup, 'verses' | 'queryTokens'>[],
	queryTokens: string[],
	fetch: typeof globalThis.fetch
): Promise<TextResultGroup[]> {
	const slugs = [...new Set(groups.map((g) => g.slug))];
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
			// Re-rank verses within group by phrase proximity
			// Verses where query tokens appear closer together rank higher
			verses.sort((a, b) => {
				const proxA = phraseProximity(a.text, queryTokens);
				const proxB = phraseProximity(b.text, queryTokens);
				return proxA - proxB; // lower proximity = better match
			});

			hydrated.push({ ...group, verses, queryTokens });
		}
	}

	// Also re-rank groups: groups containing a phrase match should come first
	hydrated.sort((a, b) => {
		const bestA = Math.min(...a.verses.map((v) => phraseProximity(v.text, queryTokens)));
		const bestB = Math.min(...b.verses.map((v) => phraseProximity(v.text, queryTokens)));
		return bestA - bestB;
	});

	return hydrated;
}

/**
 * Parse a note index ID like "matthew:1:3:n0" or "matthew:26:8:a0"
 * into its components.
 */
function parseNoteId(id: string): {
	book: string;
	chapter: number;
	verse: number;
	type: 'note' | 'annotation';
	index: number;
} {
	const parts = id.split(':');
	const book = parts[0];
	const chapter = parseInt(parts[1], 10);
	const verse = parseInt(parts[2], 10);
	const marker = parts[3] ?? 'n0';
	const type = marker.startsWith('a') ? 'annotation' : 'note';
	const index = parseInt(marker.slice(1), 10);
	return { book, chapter, verse, type, index };
}

/**
 * Hydrate note search results into individual NoteResult objects.
 * Each result is standalone (not grouped by chapter).
 */
export async function hydrateNoteResults(
	results: TextSearchResult[],
	queryTokens: string[],
	fetch: typeof globalThis.fetch
): Promise<NoteResult[]> {
	// Pre-load all needed books and annotation files
	const bookSlugs = [...new Set(results.map((r) => r.book))];
	await Promise.all(bookSlugs.map((slug) => loadBook(slug, fetch)));

	const annotationKeys = new Set<string>();
	for (const r of results) {
		const parsed = parseNoteId(r.id);
		if (parsed.type === 'annotation') {
			annotationKeys.add(`${parsed.book}:${parsed.chapter}`);
		}
	}
	await Promise.all(
		[...annotationKeys].map((key) => {
			const [slug, ch] = key.split(':');
			return loadAnnotations(slug, parseInt(ch, 10), fetch);
		})
	);

	const hydrated: NoteResult[] = [];

	for (const r of results) {
		const parsed = parseNoteId(r.id);
		const meta = ALL_BOOKS.find((b) => b.slug === parsed.book);
		const bookName = meta?.odrName ?? parsed.book;
		const reference = `${bookName} ${parsed.chapter}:${parsed.verse}`;

		if (parsed.type === 'note') {
			// Inline verse note
			const bookData = await loadBook(parsed.book, fetch);
			const chapter = getChapter(bookData, parsed.chapter);
			if (!chapter) continue;

			const verse = chapter.verses.find((v) => v.verse === parsed.verse);
			if (!verse?.notes?.[parsed.index]) continue;

			hydrated.push({
				reference,
				slug: parsed.book,
				chapter: parsed.chapter,
				verse: parsed.verse,
				type: 'note',
				noteText: verse.notes[parsed.index].text,
				verseText: verse.text,
				queryTokens
			});
		} else {
			// Annotation from sidecar
			const annData = await loadAnnotations(parsed.book, parsed.chapter, fetch);
			if (!annData?.annotations) continue;

			const ann = annData.annotations[parsed.index];
			if (!ann) continue;

			const subNotes: NoteSubNote[] = [];
			if (ann.notes) {
				for (const n of ann.notes) {
					if (n.text) subNotes.push({ marker: n.marker, text: n.text });
				}
			}

			hydrated.push({
				reference,
				slug: parsed.book,
				chapter: parsed.chapter,
				verse: parsed.verse || ann.verse,
				type: 'annotation',
				title: ann.title,
				noteText: ann.text ?? '',
				subNotes: subNotes.length > 0 ? subNotes : undefined,
				queryTokens
			});
		}
	}

	// Re-rank by phrase proximity. Title matches are prioritised over body
	// matches — any title hit beats any body-only hit.
	function noteScore(note: NoteResult): number {
		const titleProx = phraseProximity(note.title ?? '', queryTokens);
		if (titleProx < Infinity) return titleProx;
		const body = [note.noteText, ...(note.subNotes?.map((n) => n.text) ?? [])].join(' ');
		return phraseProximity(body, queryTokens) + 10000;
	}
	hydrated.sort((a, b) => noteScore(a) - noteScore(b));

	return hydrated;
}
