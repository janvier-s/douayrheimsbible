/**
 * Facsimile availability for the 1582/1609 printings, per chapter.
 *
 * `static/data/facsimile/pages.json` maps "<book>/<chapter>" to [firstPage, lastPage]
 * (a contiguous run; some chapters start at page 2). The scans are converted by
 * scripts/build-facsimiles.ts and served from FACSIMILE_BASE.
 */

/** [firstPage, lastPage] */
export type FacsimilePages = [number, number];

let pending: Promise<Record<string, FacsimilePages>> | null = null;

export function loadFacsimilePages(
	fetchFn: typeof fetch = fetch
): Promise<Record<string, FacsimilePages>> {
	if (!pending) {
		pending = fetchFn('/data/facsimile/pages.json').then((res) => {
			if (!res.ok) throw new Error('Facsimile index not found');
			return res.json() as Promise<Record<string, FacsimilePages>>;
		});
		pending.catch(() => {
			pending = null; // allow a retry on the next call
		});
	}
	return pending;
}

export function facsimileRange(
	pages: Record<string, FacsimilePages> | null,
	bookSlug: string,
	chapter: number
): FacsimilePages | null {
	return pages?.[`${bookSlug}/${chapter}`] ?? null;
}

/**
 * Where the converted scans live. Set VITE_FACSIMILE_BASE (e.g. in .env.local) to point
 * dev at a local server.
 */
export const FACSIMILE_BASE: string = (
	import.meta.env.VITE_FACSIMILE_BASE ?? 'https://facsimile.thedouayrheims.com'
).replace(/\/$/, '');

export function facsimileImageUrl(
	bookSlug: string,
	chapter: number,
	page: number,
	thumb = false
): string {
	return `${FACSIMILE_BASE}/${bookSlug}/${chapter}/${page}${thumb ? '-t' : ''}.webp`;
}
