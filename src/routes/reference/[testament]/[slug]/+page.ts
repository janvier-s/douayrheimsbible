import { redirect } from '@sveltejs/kit';
import { OT_ARTICLES, NT_ARTICLES } from '$lib/data/reference';
import type { PageLoad } from './$types';

export const prerender = true;

/** Redirect old /reference/ot|nt/slug → /reference/odr/ot|nt/slug */
export const load: PageLoad = ({ params }) => {
	const { testament, slug } = params;
	throw redirect(301, `/reference/odr/${testament}/${slug}`);
};

export function entries() {
	return [...OT_ARTICLES, ...NT_ARTICLES].map((a) => ({
		testament: a.section,
		slug: a.slug
	}));
}
