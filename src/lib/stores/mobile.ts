import { readable } from 'svelte/store';
import { browser } from '$app/environment';

export const isMobile = readable(false, (set) => {
	if (!browser) return;
	const mq = window.matchMedia('(max-width: 767px)');
	set(mq.matches);
	const handler = (e: MediaQueryListEvent) => set(e.matches);
	mq.addEventListener('change', handler);
	return () => mq.removeEventListener('change', handler);
});

/**
 * True only on devices whose primary input can hover (desktop mice/trackpads).
 * Touch screens synthesise mouseover on tap, so a tap fires the hover popover
 * at the same moment it opens the study panel. Hover UI is gated on this.
 * Initial value is `true` so SSR/first paint assumes desktop; the browser
 * subscription corrects it synchronously on mount.
 */
export const supportsHover = readable(true, (set) => {
	if (!browser) return;
	const mq = window.matchMedia('(hover: hover) and (pointer: fine)');
	set(mq.matches);
	const handler = (e: MediaQueryListEvent) => set(e.matches);
	mq.addEventListener('change', handler);
	return () => mq.removeEventListener('change', handler);
});
