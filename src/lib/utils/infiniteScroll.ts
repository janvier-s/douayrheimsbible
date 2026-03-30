export const SCROLL_THRESHOLD = 400;

/** True when the user is within threshold of the bottom of the document. */
export function shouldLoadNext(scrollY: number, innerHeight: number, docHeight: number): boolean {
	return scrollY + innerHeight > docHeight - SCROLL_THRESHOLD;
}

/**
 * Creates an IntersectionObserver that fires `onVisible(bookSlug, chapter)`
 * whenever a `[data-chapter-heading]` element scrolls into the top 20% of
 * the viewport.
 */
export function createChapterObserver(
	onVisible: (bookSlug: string, chapter: number) => void
): IntersectionObserver {
	return new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				if (entry.isIntersecting) {
					const slug = (entry.target as HTMLElement).dataset.bookSlug ?? '';
					const ch = parseInt((entry.target as HTMLElement).dataset.chapterNum ?? '0', 10);
					if (slug && ch > 0) onVisible(slug, ch);
				}
			}
		},
		{ rootMargin: '0px 0px -80% 0px', threshold: 0 }
	);
}

/** Observes all `[data-chapter-heading]` elements inside `container`. */
export function observeAllHeadings(container: HTMLElement, observer: IntersectionObserver): void {
	container.querySelectorAll('[data-chapter-heading]').forEach((el) => observer.observe(el));
}

/** Observes a single new chapter heading by slug + chapter number. */
export function observeNewHeading(
	container: HTMLElement,
	observer: IntersectionObserver,
	bookSlug: string,
	chapterNum: number
): void {
	const el = container.querySelector(
		`[data-chapter-heading][data-book-slug="${bookSlug}"][data-chapter-num="${chapterNum}"]`
	);
	if (el) observer.observe(el);
}
