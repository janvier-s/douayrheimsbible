import MiniSearch from 'minisearch';

/** Minimal KV interface — avoids importing @cloudflare/workers-types directly */
interface KVStore {
	get(key: string): Promise<string | null>;
}
import { searchTokenizer, processTerm } from './normalize';
import { expandTokens, expandTokenGroups, isAllStopWords } from './expand-query';
import { tokenize } from './normalize';
import { loadBook, getChapter, loadAnnotations } from '$lib/data/loader';
import { ALL_BOOKS } from '$lib/data/books';
import { phraseProximity } from './proximity';
import type { Verse } from '$lib/data/types';

export { phraseProximity } from './proximity';

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
	/** e.g. "Matthew 1:3" or "NT Preface" */
	reference: string;
	slug: string;
	chapter: number;
	verse: number;
	/** 'note' | 'annotation' | 'reference' */
	type: string;
	/** Annotation title if applicable */
	title?: string;
	/** The note/annotation text that matched the search */
	noteText: string;
	/** Sub-notes with markers (for annotations) */
	subNotes?: NoteSubNote[];
	/** The parent verse text (shown for inline notes) */
	verseText?: string;
	/** For reference type: path like 'nt/preface' used to build /reference/{refPath} URL */
	refPath?: string;
	queryTokens: string[];
}

const MINISEARCH_OPTIONS = {
	fields: ['text'] as string[],
	storeFields: [] as string[],
	tokenize: searchTokenizer,
	processTerm
};

const NOTES_MINISEARCH_OPTIONS = {
	...MINISEARCH_OPTIONS
};

let verseIndex: MiniSearch | null = null;
let notesIndex: MiniSearch | null = null;
let verseIndexPromise: Promise<MiniSearch> | null = null;
let notesIndexPromise: Promise<MiniSearch> | null = null;

async function fetchIndexJson(
	key: string,
	url: string,
	kv: KVStore | undefined,
	fetch: typeof globalThis.fetch
): Promise<string> {
	if (kv) {
		const cached = await kv.get(key);
		if (cached) return cached;
	}
	const res = await fetch(url);
	if (!res.ok) throw new Error(`Failed to load ${key}: ${res.status}`);
	return res.text();
}

async function loadVerseIndex(fetch: typeof globalThis.fetch, kv?: KVStore): Promise<MiniSearch> {
	if (verseIndex) return verseIndex;
	if (verseIndexPromise) return verseIndexPromise;

	verseIndexPromise = fetchIndexJson('search-index', '/data/odr/search-index.json', kv, fetch).then(
		(json) => {
			verseIndex = MiniSearch.loadJSON(json, MINISEARCH_OPTIONS);
			return verseIndex;
		}
	);

	verseIndexPromise.catch(() => {
		verseIndexPromise = null;
	});

	return verseIndexPromise;
}

async function loadNotesIndex(fetch: typeof globalThis.fetch, kv?: KVStore): Promise<MiniSearch> {
	if (notesIndex) return notesIndex;
	if (notesIndexPromise) return notesIndexPromise;

	notesIndexPromise = fetchIndexJson(
		'search-notes-index',
		'/data/odr/search-notes-index.json',
		kv,
		fetch
	).then((json) => {
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
	limit = 100,
	kv?: KVStore
): Promise<{ results: TextSearchResult[]; total: number; queryTokens: string[] }> {
	const tokens = tokenize(query);
	if (!tokens.length || isAllStopWords(tokens)) {
		return { results: [], total: 0, queryTokens: tokens };
	}

	const expanded = expandTokens(tokens);
	const index = await loadVerseIndex(fetch, kv);

	const raw = index.search(buildSearchQuery(tokens), {
		processTerm
	});

	const total = raw.length;
	const results: TextSearchResult[] = raw.slice(0, limit).map((r) => {
		const parsed = parseResultId(r.id as string);
		return {
			id: r.id as string,
			score: r.score,
			book: parsed.book,
			chapter: parsed.chapter,
			verse: parsed.verse
		};
	});

	return { results, total, queryTokens: expanded };
}

export async function searchNotes(
	query: string,
	fetch: typeof globalThis.fetch,
	limit = 100,
	kv?: KVStore
): Promise<{ results: TextSearchResult[]; total: number; queryTokens: string[] }> {
	const tokens = tokenize(query);
	if (!tokens.length || isAllStopWords(tokens)) {
		return { results: [], total: 0, queryTokens: tokens };
	}

	const expanded = expandTokens(tokens);
	const index = await loadNotesIndex(fetch, kv);

	const raw = index.search(buildSearchQuery(tokens), {
		processTerm
	});

	const total = raw.length;
	const results: TextSearchResult[] = raw.slice(0, limit).map((r) => {
		const parsed = parseNoteId(r.id as string);
		return {
			id: r.id as string,
			score: r.score,
			book: parsed.book,
			chapter: parsed.chapter,
			verse: parsed.verse,
			type: parsed.type
		};
	});

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
	type: 'note' | 'annotation' | 'reference';
	index: number;
	testament?: string;
	refSlug?: string;
} {
	if (id.startsWith('ref:')) {
		// Format: ref:nt:preface:p0
		const parts = id.split(':');
		const testament = parts[1];
		const refSlug = parts[2];
		const marker = parts[3] ?? 'p0';
		const index = parseInt(marker.slice(1), 10);
		return { book: id, chapter: 0, verse: 0, type: 'reference', index, testament, refSlug };
	}
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
	// Pre-load all needed books and annotation files (skip reference docs)
	const bookSlugs = [...new Set(results.map((r) => r.book).filter((b) => !b.startsWith('ref:')))];
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
		} else if (parsed.type === 'reference') {
			const testament = parsed.testament!;
			const refSlug = parsed.refSlug!;
			const refData = await fetch(`/data/reference/${testament}/${refSlug}.json`).then((res) =>
				res.json()
			);

			// Collect paragraphs in the same order as the build script
			const allParagraphs: string[] = [];
			if (refData.paragraphs) {
				for (const p of refData.paragraphs) {
					if (p.text) allParagraphs.push(p.text);
				}
			}
			if (refData.subsections) {
				for (const sub of refData.subsections) {
					if (sub.paragraphs) {
						for (const p of sub.paragraphs) {
							if (p.text) allParagraphs.push(p.text);
						}
					}
				}
			}

			const paraText = allParagraphs[parsed.index] ?? '';
			if (!paraText) continue;

			const refTitle = (refData.title as string | undefined) ?? refSlug;

			hydrated.push({
				reference: refTitle
					.replace(/<[^>]+>/g, '')
					.replace(/\s+/g, ' ')
					.trim(),
				slug: `ref:${testament}:${refSlug}`,
				chapter: 0,
				verse: 0,
				type: 'reference',
				noteText: paraText,
				refPath: `${testament}/${refSlug}`,
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
