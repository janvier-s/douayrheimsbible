import { writable } from 'svelte/store';

export interface ReadingPosition {
	bookSlug: string;
	chapter: number;
	/** Route base for this translation, e.g. '/odr'. Used to reconstruct navigation URLs. */
	routeBase: string;
}

export const readingPosition = writable<ReadingPosition | null>(null);
