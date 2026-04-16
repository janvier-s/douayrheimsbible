import { error } from '@sveltejs/kit';
import { findArticle, ALL_REFERENCE_ARTICLES } from '$lib/data/reference';
import type { PageLoad } from './$types';

export const prerender = true;

export const load: PageLoad = async ({ params, fetch }) => {
	const { testament, slug } = params;
	if (testament !== 'ot' && testament !== 'nt') throw error(404, 'Not found');

	const article = findArticle(testament, slug);
	if (!article) throw error(404, 'Not found');

	const res = await fetch(`/data/reference/${testament}/${slug}.json`);
	if (!res.ok) throw error(404, 'Not found');

	const data = await res.json();

	return {
		hasStudyMode: true,
		article,
		content: data
	};
};

export function entries() {
	return ALL_REFERENCE_ARTICLES.map((a) => ({
		testament: a.testament.toLowerCase(),
		slug: a.slug
	}));
}
