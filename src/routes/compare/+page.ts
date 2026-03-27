import type { PageLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const prerender = true;

export const load: PageLoad = () => {
	redirect(301, '/compare/genesis/1');
};
