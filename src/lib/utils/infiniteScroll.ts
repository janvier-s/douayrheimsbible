export const SCROLL_THRESHOLD = 400;

/** True when the user is within threshold of the bottom of the document. */
export function shouldLoadNext(scrollY: number, innerHeight: number, docHeight: number): boolean {
	return scrollY + innerHeight > docHeight - SCROLL_THRESHOLD;
}

/**
 * Creates an IntersectionObserver that fires callbacks whenever a
 * `[data-chapter-heading]` element crosses the top-30% viewport boundary.
 *
 * - `onEnter(slug, ch)` — heading scrolled INTO the top-30% zone (scrolling down)
 * - `onExitScrollUp(slug, ch)` — heading dropped BELOW the 30% mark (scrolling up);
 *   the caller should activate the chapter that precedes (slug, ch).
 */
export function createChapterObserver(
	onEnter: (bookSlug: string, chapter: number) => void,
	onExitScrollUp?: (bookSlug: string, chapter: number) => void
): IntersectionObserver {
	return new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				const el = entry.target as HTMLElement;
				const slug = el.dataset.bookSlug ?? '';
				const ch = parseInt(el.dataset.chapterNum ?? '0', 10);
				if (!slug || ch <= 0) continue;

				if (entry.isIntersecting) {
					onEnter(slug, ch);
				} else if (onExitScrollUp) {
					const top = entry.boundingClientRect.top;
					// Only fire when the heading is inside the viewport but below the
					// 30% zone (scrolling up). Ignore top < 0 (scrolled above viewport)
					// and top > innerHeight (element below fold — e.g. freshly appended
					// chapter heading firing its initial observation callback).
					if (top > 0 && top < window.innerHeight) {
						onExitScrollUp(slug, ch);
					}
				}
			}
		},
		{ rootMargin: '0px 0px -70% 0px', threshold: 0 }
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
