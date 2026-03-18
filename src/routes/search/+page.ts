import type { PageLoad } from './$types';

export const ssr = false;
export const prerender = true;

export const load: PageLoad = async ({ url }) => {
	return { query: url.searchParams.get('q') ?? '' };
};
