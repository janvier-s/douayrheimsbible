import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	searchVerses,
	searchNotes,
	buildTextResultGroups,
	hydrateResultGroups,
	hydrateNoteResults
} from '$lib/search/text-search';

export const GET: RequestHandler = async ({ url, fetch }) => {
	const q = url.searchParams.get('q')?.trim();
	if (!q) return json({ error: 'Missing query' }, { status: 400 });

	const scope = url.searchParams.get('scope') === 'notes' ? 'notes' : 'verses';
	const limit = Math.min(parseInt(url.searchParams.get('limit') || '100', 10) || 100, 500);
	const countsOnly = url.searchParams.get('counts') === '1';

	try {
		if (countsOnly) {
			// Return just totals for both scopes (used for cross-scope suggestions)
			const [vs, ns] = await Promise.all([searchVerses(q, fetch, 1), searchNotes(q, fetch, 1)]);
			return json({
				versesTotal: vs.total,
				notesTotal: ns.total,
				queryTokens: vs.queryTokens
			});
		}

		if (scope === 'verses') {
			const { results: raw, total, queryTokens } = await searchVerses(q, fetch, limit);
			const groups = buildTextResultGroups(raw);
			const hydrated = await hydrateResultGroups(groups, queryTokens, fetch);
			return json({ scope, total, queryTokens, results: hydrated });
		} else {
			const { results: raw, total, queryTokens } = await searchNotes(q, fetch, limit);
			const hydrated = await hydrateNoteResults(raw, queryTokens, fetch);
			return json({ scope, total, queryTokens, results: hydrated });
		}
	} catch (e) {
		console.error('Search API error:', e);
		return json({ error: 'Search failed' }, { status: 500 });
	}
};
