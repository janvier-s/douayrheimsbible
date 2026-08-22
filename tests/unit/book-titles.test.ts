import { describe, it, expect } from 'vitest';
import { chapterTitles, type InitialTitles } from '$lib/utils/book-titles';
import type { BookData } from '$lib/data/types';

const genesis: BookData = {
	book: 'Genesis',
	book_title: 'The Book of Genesis,\nin Hebrew Beresith. בראשית',
	short_title: 'Genesis',
	chapters: []
};

const exodus: BookData = {
	book: 'Exodus',
	book_title: 'The Book of Exodus,\nin Hebrew Veelle Semoth. ואלה שמות',
	short_title: 'Exodus',
	chapters: []
};

/** The reader was opened on Exodus 1. */
const initial: InitialTitles = {
	slug: 'exodus',
	bookTitle: exodus.book_title!,
	shortTitle: exodus.short_title!
};

describe('chapterTitles', () => {
	it('titles a chapter from its own book, not the reading position', () => {
		// Scrolling up from Exodus 1 prepends Genesis 50, moving the reading
		// position into Genesis. Exodus 1 stays mounted and must keep its title.
		const titles = chapterTitles({ slug: 'exodus', chapter: 1 }, exodus, initial);

		expect(titles.bookTitle).toBe(exodus.book_title);
		expect(titles.shortTitle).toBe('Exodus');
	});

	it('titles the prepended chapter from its own book', () => {
		const titles = chapterTitles({ slug: 'genesis', chapter: 50 }, genesis, initial);

		// Only chapter 1 gets the full book title header.
		expect(titles.bookTitle).toBeUndefined();
		expect(titles.shortTitle).toBe('Genesis');
	});

	it('shows the book title header on chapter 1 of a prepended book', () => {
		const titles = chapterTitles({ slug: 'genesis', chapter: 1 }, genesis, initial);

		expect(titles.bookTitle).toBe(genesis.book_title);
	});

	it('falls back to the initial titles before that book data has loaded', () => {
		const titles = chapterTitles({ slug: 'exodus', chapter: 1 }, null, initial);

		expect(titles.bookTitle).toBe(exodus.book_title);
		expect(titles.shortTitle).toBe('Exodus');
	});

	it('yields no titles for an unloaded book that is not the initial one', () => {
		const titles = chapterTitles({ slug: 'genesis', chapter: 1 }, null, initial);

		expect(titles.bookTitle).toBeUndefined();
		expect(titles.shortTitle).toBeUndefined();
	});
});
