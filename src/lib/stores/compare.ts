import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export type TranslationId =
	| 'odr'
	| 'drc'
	| 'haydock'
	| 'conf'
	| 'knox'
	| 'cpdv'
	| 'kjv'
	| 'vul'
	| 'rsv';

export interface Translation {
	id: TranslationId;
	label: string;
	abbr: string;
	year: string;
	live: boolean;
	ntOnly: boolean;
	fullHeader: boolean;
	/** Short contextual label shown below the title in column headers */
	micro?: string;
	/** Hidden from the UI unless the Konami code has been entered */
	hidden?: boolean;
	/** SEO: human-readable name for page titles, e.g. "Douay-Rheims Challoner Bible" */
	seoName?: string;
	/** SEO: template for meta description. Use {book} and {chapter} as placeholders. */
	seoDesc?: string;
}

// Historical order
export const TRANSLATIONS: Translation[] = [
	{
		id: 'vul',
		label: 'Clementine Vulgate',
		abbr: 'Vul',
		year: '1592',
		live: true,
		ntOnly: false,
		fullHeader: false,
		micro: 'Source Text',
		seoName: 'Clementine Vulgate (Latin)',
		seoDesc:
			'Read {book} Chapter {chapter} in the Clementine Vulgate, the official Latin Bible of the Catholic Church (1592).'
	},
	{
		id: 'odr',
		label: 'Original Douay-Rheims',
		abbr: 'ODR',
		year: '1582–1610',
		live: true,
		ntOnly: false,
		fullHeader: true,
		micro: 'First English Vulgate Translation',
		seoName: 'Original Douay-Rheims Bible',
		seoDesc:
			'Read {book} Chapter {chapter} in the original Douay-Rheims Bible (1582-1610), the first complete English Catholic translation from the Latin Vulgate.'
	},
	{
		id: 'kjv',
		label: 'King James Version',
		abbr: 'KJV',
		year: '1611',
		live: true,
		ntOnly: false,
		fullHeader: false,
		micro: 'Influenced Challoner Revision',
		seoName: 'King James Version',
		seoDesc:
			'Read {book} Chapter {chapter} in the King James Version (1611). Compare with the Douay-Rheims and other Catholic Bible translations.'
	},
	{
		id: 'drc',
		label: 'Douay-Rheims Challoner',
		abbr: 'DRC',
		year: '1752',
		live: true,
		ntOnly: false,
		fullHeader: true,
		micro: 'Douay-Rheims Revision',
		seoName: 'Douay-Rheims Bible (Challoner Revision)',
		seoDesc:
			'Read {book} Chapter {chapter} in the Douay-Rheims Challoner Bible (1752), the standard English Catholic Bible for over two centuries.'
	},
	{
		id: 'haydock',
		label: 'DRC Haydock',
		abbr: 'DRC-Haydock',
		year: '1883',
		live: true,
		ntOnly: false,
		fullHeader: true,
		micro: 'DRC with Haydock Commentary',
		seoName: 'Haydock Catholic Bible Commentary',
		seoDesc:
			'Read {book} Chapter {chapter} with the Haydock Catholic Bible Commentary (1883). Verse-by-verse commentary from the Church Fathers and Catholic theologians.'
	},
	{
		id: 'conf',
		label: 'Confraternity NT',
		abbr: 'Conf',
		year: '1941',
		live: true,
		ntOnly: true,
		fullHeader: false,
		micro: 'Modest Revision of Douay NT',
		seoName: 'Confraternity New Testament',
		seoDesc:
			'Read {book} Chapter {chapter} in the Confraternity New Testament (1941), the Catholic revision of the Douay-Rheims New Testament.'
	},
	{
		id: 'knox',
		label: 'Knox Bible',
		abbr: 'Knox',
		year: '1955',
		live: true,
		ntOnly: false,
		fullHeader: false,
		micro: 'Literary Vulgate Translation',
		seoName: 'Knox Bible',
		seoDesc:
			"Read {book} Chapter {chapter} in the Knox Bible (1955), Ronald Knox's acclaimed literary Catholic translation from the Latin Vulgate."
	},
	{
		id: 'cpdv',
		label: 'Catholic Public Domain Version',
		abbr: 'CPDV',
		year: '2009',
		live: true,
		ntOnly: false,
		fullHeader: true,
		micro: 'Modern Vulgate Translation',
		seoName: 'Catholic Public Domain Version',
		seoDesc:
			'Read {book} Chapter {chapter} in the Catholic Public Domain Version (2009), a modern English translation from the Latin Vulgate.'
	},
	{
		id: 'rsv',
		label: 'Revised Standard Version, Second Catholic Edition',
		abbr: 'RSV-2CE',
		year: '2006',
		live: false,
		ntOnly: false,
		fullHeader: false,
		micro: 'Ecumenical Catholic Translation',
		hidden: true,
		seoName: 'Revised Standard Version, Second Catholic Edition',
		seoDesc: 'Read {book} Chapter {chapter} in the RSV Second Catholic Edition (2006).'
	}
];

export const MAX_COLS = 5;

// ── Konami unlock ─────────────────────────────────────────────────────────────

const KONAMI_KEY = 'konami_rsv';

export const konamiUnlocked = writable<boolean>(
	browser ? localStorage.getItem(KONAMI_KEY) === '1' : false
);

if (browser) {
	konamiUnlocked.subscribe((v) => {
		if (v) localStorage.setItem(KONAMI_KEY, '1');
		else localStorage.removeItem(KONAMI_KEY);
	});
}

// ── Compare store ─────────────────────────────────────────────────────────────

interface CompareState {
	order: TranslationId[];
	visible: Set<TranslationId>;
	showSummary: boolean;
	columnOffset: number;
}

// Bump version to reset cached order after adding/reordering translations
const STORAGE_KEY = 'compareStore_v5';

function loadFromStorage(): Partial<Pick<CompareState, 'order' | 'visible'>> {
	if (!browser) return {};
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return {};
		const parsed = JSON.parse(raw) as { order?: string[]; visible?: string[] };
		const validIds = new Set(TRANSLATIONS.map((t) => t.id));
		const order = (parsed.order ?? []).filter((id): id is TranslationId =>
			validIds.has(id as TranslationId)
		);
		const visible = new Set(
			(parsed.visible ?? []).filter((id): id is TranslationId => validIds.has(id as TranslationId))
		);
		if (order.length === TRANSLATIONS.length && visible.size > 0) {
			return { order, visible };
		}
	} catch {
		// ignore malformed data
	}
	return {};
}

function saveToStorage(state: CompareState) {
	if (!browser) return;
	try {
		localStorage.setItem(
			STORAGE_KEY,
			JSON.stringify({ order: state.order, visible: [...state.visible] })
		);
	} catch {
		// ignore quota errors
	}
}

function createCompareStore() {
	const defaultOrder: TranslationId[] = TRANSLATIONS.map((t) => t.id);
	const saved = loadFromStorage();
	const { subscribe, update } = writable<CompareState>({
		order: saved.order ?? defaultOrder,
		visible: saved.visible ?? new Set(['odr', 'drc']),
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
				const activeCount = s.order.filter((tid) => next.has(tid)).length;
				const offset = Math.min(s.columnOffset, Math.max(0, activeCount - MAX_COLS));
				const nextState = { ...s, visible: next, columnOffset: offset };
				saveToStorage(nextState);
				return nextState;
			});
		},
		reorder(newOrder: TranslationId[]) {
			update((s) => {
				const nextState = { ...s, order: newOrder };
				saveToStorage(nextState);
				return nextState;
			});
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
