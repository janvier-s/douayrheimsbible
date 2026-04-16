import type { PageLoad, EntryGenerator } from './$types';
import { error } from '@sveltejs/kit';
import { ALL_BOOKS } from '$lib/data/books';

export const prerender = true;

export const entries: EntryGenerator = () => [
	{ testament: 'old-testament' },
	{ testament: 'new-testament' }
];

export const load: PageLoad = ({ params }) => {
	const isOT = params.testament === 'old-testament';
	const isNT = params.testament === 'new-testament';

	if (!isOT && !isNT) throw error(404, 'Not found');

	const testament = isOT ? 'OT' : 'NT';
	const allBooks = ALL_BOOKS.filter((b) => b.testament === testament);
	const books = allBooks.filter((b) => !b.navSkip);
	const apocrypha = isOT ? allBooks.filter((b) => b.navSkip) : [];
	const label = isOT ? 'Old Testament' : 'New Testament';

	return {
		books,
		apocrypha,
		label,
		testament
	};
};
