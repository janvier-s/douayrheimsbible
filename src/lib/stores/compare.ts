import { writable } from 'svelte/store';

export type TranslationId = 'odr' | 'drc' | 'knox' | 'conf' | 'cpdv' | 'kjv' | 'vul';

export interface Translation {
	id: TranslationId;
	label: string;
	abbr: string;
	year: string;
	live: boolean;
	ntOnly: boolean;
	fullHeader: boolean; // show full label in column header
}

export const TRANSLATIONS: Translation[] = [
	{
		id: 'odr',
		label: 'Original Douay-Rheims',
		abbr: 'ODR',
		year: '1609',
		live: true,
		ntOnly: false,
		fullHeader: true
	},
	{
		id: 'drc',
		label: 'Douay-Rheims Challoner',
		abbr: 'DRC',
		year: '1752',
		live: false,
		ntOnly: false,
		fullHeader: true
	},
	{
		id: 'knox',
		label: 'Knox Bible',
		abbr: 'Knox',
		year: '1955',
		live: false,
		ntOnly: false,
		fullHeader: false
	},
	{
		id: 'conf',
		label: 'Confraternity NT',
		abbr: 'Conf',
		year: '1941',
		live: false,
		ntOnly: true,
		fullHeader: false
	},
	{
		id: 'cpdv',
		label: 'Catholic Public Domain Version',
		abbr: 'CPDV',
		year: '2009',
		live: false,
		ntOnly: false,
		fullHeader: true
	},
	{
		id: 'kjv',
		label: 'King James Version',
		abbr: 'KJV',
		year: '1611',
		live: false,
		ntOnly: false,
		fullHeader: false
	},
	{
		id: 'vul',
		label: 'Vulgate',
		abbr: 'Vul',
		year: '~405',
		live: false,
		ntOnly: false,
		fullHeader: false
	}
];

export const MAX_COLS = 5;

interface CompareState {
	order: TranslationId[];
	visible: Set<TranslationId>;
	showSummary: boolean;
	columnOffset: number;
}

function createCompareStore() {
	const defaultOrder: TranslationId[] = TRANSLATIONS.map((t) => t.id);
	const { subscribe, update } = writable<CompareState>({
		order: defaultOrder,
		visible: new Set(['odr', 'drc']),
		showSummary: true,
		columnOffset: 0
	});

	return {
		subscribe,
		toggle(id: TranslationId, isOT: boolean) {
			update((s) => {
				const t = TRANSLATIONS.find((x) => x.id === id)!;
				if (t.ntOnly && isOT) return s;
				const next = new Set(s.visible);
				if (next.has(id)) {
					if (next.size > 1) next.delete(id);
				} else {
					next.add(id);
				}
				const activeCount = s.order.filter((id) => next.has(id)).length;
				const offset = Math.min(s.columnOffset, Math.max(0, activeCount - MAX_COLS));
				return { ...s, visible: next, columnOffset: offset };
			});
		},
		reorder(newOrder: TranslationId[]) {
			update((s) => ({ ...s, order: newOrder }));
		},
		scrollBy(delta: number) {
			update((s) => {
				const activeCount = s.order.filter((id) => s.visible.has(id)).length;
				const offset = Math.max(0, Math.min(activeCount - MAX_COLS, s.columnOffset + delta));
				return { ...s, columnOffset: offset };
			});
		},
		toggleSummary() {
			update((s) => ({ ...s, showSummary: !s.showSummary }));
		}
	};
}

export const compareStore = createCompareStore();
