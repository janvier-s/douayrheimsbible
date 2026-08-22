import type { BookData } from '$lib/data/types';

export interface ChapterTitleRef {
	slug: string;
	chapter: number;
}

/** Titles handed down by the page load function, for the book the reader opened on. */
export interface InitialTitles {
	slug: string;
	bookTitle?: string | null;
	shortTitle?: string | null;
}

export interface ChapterTitles {
	/** Full book-title header — chapter 1 only. */
	bookTitle: string | undefined;
	/** Short title for the chapter eyebrow. */
	shortTitle: string | undefined;
}

/**
 * Resolves the title props for one rendered chapter.
 *
 * `bookData` must be the data for `item.slug` itself. Resolving it from a single
 * "current book" value breaks infinite scroll: once the reading position moves
 * into another book, every already-rendered header re-renders with that book's
 * title (scrolling up from Exodus 1 relabelled it "The Book of Genesis").
 */
export function chapterTitles(
	item: ChapterTitleRef,
	bookData: BookData | null,
	initial: InitialTitles
): ChapterTitles {
	const isInitialBook = item.slug === initial.slug;
	const bookTitle = bookData?.book_title ?? (isInitialBook ? initial.bookTitle : undefined);
	const shortTitle = bookData?.short_title ?? (isInitialBook ? initial.shortTitle : undefined);

	return {
		bookTitle: item.chapter === 1 ? (bookTitle ?? undefined) : undefined,
		shortTitle: shortTitle ?? undefined
	};
}
