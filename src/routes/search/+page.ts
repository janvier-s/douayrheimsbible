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
