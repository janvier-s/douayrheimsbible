import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	searchVerses,
	searchNotes,
	buildTextResultGroups,
	hydrateResultGroups,
	hydrateNoteResults
} from '$lib/search/text-search';

const CACHE_HEADERS = {
	'Cache-Control': 'public, max-age=3600, s-maxage=86400'
};

export const GET: RequestHandler = async ({ url, fetch, platform }) => {
	const q = url.searchParams.get('q')?.trim();
	if (!q) return json({ error: 'Missing query' }, { status: 400 });

	const scope = url.searchParams.get('scope') === 'notes' ? 'notes' : 'verses';
	const limit = Math.min(parseInt(url.searchParams.get('limit') || '100', 10) || 100, 500);
	const countsOnly = url.searchParams.get('counts') === '1';
	const kv = platform?.env?.SEARCH_INDEX;

	try {
		if (countsOnly) {
			// Return just totals for both scopes (used for cross-scope suggestions)
			const [vs, ns] = await Promise.all([
				searchVerses(q, fetch, 1, kv),
				searchNotes(q, fetch, 1, kv)
			]);
			return json(
				{ versesTotal: vs.total, notesTotal: ns.total, queryTokens: vs.queryTokens },
				{ headers: CACHE_HEADERS }
			);
		}

		if (scope === 'verses') {
			const { results: raw, total, queryTokens } = await searchVerses(q, fetch, limit, kv);
			const groups = buildTextResultGroups(raw);
			const hydrated = await hydrateResultGroups(groups, queryTokens, fetch);
			return json({ scope, total, queryTokens, results: hydrated }, { headers: CACHE_HEADERS });
		} else {
			const { results: raw, total, queryTokens } = await searchNotes(q, fetch, limit, kv);
			const hydrated = await hydrateNoteResults(raw, queryTokens, fetch);
			return json({ scope, total, queryTokens, results: hydrated }, { headers: CACHE_HEADERS });
		}
	} catch (e) {
		console.error('Search API error:', e);
		return json({ error: 'Search failed' }, { status: 500 });
	}
};
