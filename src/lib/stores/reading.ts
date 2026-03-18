import { writable } from 'svelte/store';

export interface ReadingPosition {
	bookSlug: string;
	chapter: number;
}

export const readingPosition = writable<ReadingPosition | null>(null);
