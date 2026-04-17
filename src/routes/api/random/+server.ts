import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { loadBook } from '$lib/data/loader';
import { ALL_BOOKS } from '$lib/data/books';

// No cache — each request should return a different verse
const NO_CACHE = { 'Cache-Control': 'no-store' };

export const GET: RequestHandler = async ({ url, fetch }) => {
	// Optional ?testament=OT|NT filter
	const testament = url.searchParams.get('testament')?.toUpperCase();
	const pool =
		testament === 'OT' || testament === 'NT'
			? ALL_BOOKS.filter((b) => b.testament === testament)
			: ALL_BOOKS;

	const bookMeta = pool[Math.floor(Math.random() * pool.length)];
	const bookData = await loadBook(bookMeta.slug, fetch);

	const chapter = bookData.chapters[Math.floor(Math.random() * bookData.chapters.length)];
	const verse = chapter.verses[Math.floor(Math.random() * chapter.verses.length)];

	return json(
		{
			book: bookMeta.slug,
			book_title: bookData.book_title,
			chapter: chapter.chapter,
			verse: verse.verse,
			text: verse.text,
			notes: verse.notes ?? [],
			cross_refs: verse.cross_refs ?? []
		},
		{ headers: NO_CACHE }
	);
};
