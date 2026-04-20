import { error } from '@sveltejs/kit';
import { findArticle, getTranslationConfig, allArticleEntries } from '$lib/data/reference';
import type { PageLoad } from './$types';

export const prerender = true;

export const load: PageLoad = async ({ params, fetch }) => {
	const { translation, section, slug } = params;

	const config = getTranslationConfig(translation);
	if (!config) throw error(404, 'Not found');

	const article = findArticle(translation, section, slug);
	if (!article) throw error(404, 'Not found');

	const res = await fetch(`/data/reference/${translation}/${section}/${slug}.json`);
	if (!res.ok) throw error(404, 'Not found');

	const content = await res.json();

	return {
		hasStudyMode: true,
		topBarMinimal: true,
		translation,
		config,
		article,
		content
	};
};

export function entries() {
	return allArticleEntries();
}
