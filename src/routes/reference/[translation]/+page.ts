import { error } from '@sveltejs/kit';
import { getTranslationConfig, TRANSLATION_CONFIGS } from '$lib/data/reference';
import type { PageLoad } from './$types';

export const prerender = true;

export const load: PageLoad = ({ params }) => {
	const config = getTranslationConfig(params.translation);
	if (!config) throw error(404, 'Not found');

	return {
		hasStudyMode: true,
		topBarMinimal: true,
		config
	};
};

export function entries() {
	return TRANSLATION_CONFIGS.map((c) => ({ translation: c.id }));
}
