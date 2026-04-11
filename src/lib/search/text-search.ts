import MiniSearch from 'minisearch';
import { searchTokenizer, processTerm } from './normalize';
import { expandTokens, expandTokenGroups, isAllStopWords } from './expand-query';
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
function buildSearchQuery(tokens: string[]): string | Record<string, unknown> {
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
			hydrated.push({ ...group, verses, queryTokens });
		}
	}

	return hydrated;
}
