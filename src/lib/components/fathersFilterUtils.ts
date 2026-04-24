import type { FathersEntry } from '$lib/data/fathers-types';
import type { AuthorEra, AuthorTradition } from '$lib/data/fathers-authors';
import { getAuthorMeta } from '$lib/data/fathers-authors';

export const CENTURIES = [1, 2, 3, 4, 5, 6, 7, 8] as const;

export const ERAS = [
	{ key: 'ante-nicene' as const, label: 'Ante-Nicene' },
	{ key: 'nicene' as const, label: 'Nicene' },
	{ key: 'post-nicene' as const, label: 'Post-Nicene' }
];

export const TRADITIONS = [
	{ key: 'eastern' as const, label: 'Eastern' },
	{ key: 'western' as const, label: 'Western' },
	{ key: 'syriac' as const, label: 'Syriac' }
];

export type FilterCentury = number | 'all' | 'other';
export type FilterEra = 'all' | AuthorEra;
export type FilterTradition = 'all' | AuthorTradition;

export interface FathersFilterState {
	century: FilterCentury;
	era: FilterEra;
	tradition: FilterTradition;
	authors: Set<string>;
}

export function createEmptyFilter(): FathersFilterState {
	return { century: 'all', era: 'all', tradition: 'all', authors: new Set() };
}

export function hasActiveFilter(f: FathersFilterState): boolean {
	return f.century !== 'all' || f.era !== 'all' || f.tradition !== 'all' || f.authors.size > 0;
}

export function filterCount(f: FathersFilterState): number {
	return (
		(f.century !== 'all' ? 1 : 0) +
		(f.era !== 'all' ? 1 : 0) +
		(f.tradition !== 'all' ? 1 : 0) +
		(f.authors.size > 0 ? 1 : 0)
	);
}

export function entryMatches(e: FathersEntry, f: FathersFilterState): boolean {
	const meta = getAuthorMeta(e.author);
	if (f.century !== 'all') {
		if (f.century === 'other') {
			if (!meta.century || meta.century < 9) return false;
		} else {
			if (meta.century !== f.century) return false;
		}
	}
	if (f.era !== 'all' && meta.era !== f.era) return false;
	if (f.tradition !== 'all' && meta.tradition !== f.tradition) return false;
	if (f.authors.size > 0 && !f.authors.has(e.author)) return false;
	return true;
}

/** Strip honorific prefixes for sorting: St., Bl., Ven., Pope, etc. */
export function sortKey(name: string): string {
	return name.replace(/^(St\.|Bl\.|Ven\.|Pope|Abp\.|Bp\.)\s+/i, '').toLowerCase();
}

const CHIP_BASE =
	'px-[8px] py-[3px] rounded-[3px] text-[11px] font-medium border transition-colors duration-fast';

export function chipClass(active: boolean, available: boolean = true): string {
	if (!available && !active) {
		return `${CHIP_BASE} border-border text-border cursor-not-allowed opacity-40`;
	}
	return `${CHIP_BASE} cursor-pointer ${active ? 'bg-interactive text-white border-interactive' : 'border-border text-subtle hover:text-foreground hover:border-foreground/30'}`;
}
