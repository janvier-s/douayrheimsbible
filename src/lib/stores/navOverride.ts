import { writable } from 'svelte/store';

/**
 * Set by non-chapter pages (e.g. search) to display a contextual reference
 * in the TopBar nav button instead of "Go to…".
 */
export const navOverride = writable<{ bookSlug: string; chapter: number } | null>(null);
