import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { loadBook, getChapter } from '$lib/data/loader';
import { ALL_BOOKS } from '$lib/data/books';

const CACHE = { 'Cache-Control': 'public, max-age=86400, s-maxage=86400' };

export const GET: RequestHandler = async ({ params, fetch }) => {
	const { book, chapter: chapterParam } = params;

	const bookMeta = ALL_BOOKS.find((b) => b.slug === book);
	if (!bookMeta) {
		return json({ error: `Unknown book: "${book}"` }, { status: 404 });
	}

	const chapterNum = parseInt(chapterParam, 10);
	if (!Number.isInteger(chapterNum) || chapterNum < 1) {
		return json({ error: 'Invalid chapter number' }, { status: 400 });
	}

	const bookData = await loadBook(book, fetch);
	const chapter = getChapter(bookData, chapterNum);

	if (!chapter) {
		return json({ error: `${bookMeta.odrName} has no chapter ${chapterNum}` }, { status: 404 });
	}

	return json(
		{
			book,
			book_title: bookData.book_title,
			chapter: chapterNum,
			verse_count: chapter.verses.length,
			verses: chapter.verses
		},
		{ headers: CACHE }
	);
};
