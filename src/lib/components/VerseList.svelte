<script lang="ts">
	import { run } from 'svelte/legacy';

	import { afterNavigate } from '$app/navigation';
	import { onMount, onDestroy, tick } from 'svelte';
	import { browser } from '$app/environment';
	import { get } from 'svelte/store';
	import { prefs } from '$lib/stores/prefs';
	import { studyPanel, scrollTrigger, readerSyncScrolling } from '$lib/stores/studyPanel';
	import type { StudyTab } from '$lib/stores/studyPanel';
	import { readingPosition } from '$lib/stores/reading';
	import MarkerPopover from '$lib/components/MarkerPopover.svelte';
	import { allcapsToSmallcaps, toRoman } from '$lib/utils/text';
	import type { Verse, ConfChapterFootnotes, ConfChapterCommentary } from '$lib/data/types';
	import type { TranslationCrossRef, TranslationNote } from '$lib/data/translation-types';
	import {
		loadTranslationCrossRefs,
		loadHaydockCommentary,
		loadTranslationNotes,
		loadConfFootnotes,
		loadConfCommentary,
		loadTranslationFormat,
		loadGlossa
	} from '$lib/data/loader';
	import type {
		HaydockCommentaryEntry,
		BookFormat,
		ChapterFormat,
		GlossaEntry
	} from '$lib/data/loader';
	interface Props {
		verses: Verse[];
		targetVerse: number | undefined;
		bookSlug: string;
		chapterNum: number;
		translationId?: string;
	}

	let { verses, targetVerse, bookSlug, chapterNum, translationId = 'odr' }: Props = $props();
	let isVul = $derived(translationId === 'vul');
	let useRoman = $derived(isVul && $prefs.romanNumerals);
	const verseLabel = (n: number) => (useRoman ? toRoman(n) : String(n));
	/**
	 * Roman numerals run far wider than digits, and a label that outgrows its
	 * box overflows to the right, into the verse text: XXXVIII carries 48px of
	 * ink in the 24px column, and text-align has nothing left to work with.
	 * Sizing the column to the chapter's longest label keeps the numbers right
	 * aligned and every verse starting on the same edge.
	 */
	let verseNumWidth = $derived(
		useRoman
			? // Never below the 1.5rem the column has when it holds digits, so the
				// text edge does not shift about as short chapters are opened.
				`max(1.5rem, ${Math.max(...verses.map((v) => verseLabel(v.verse).length), 1)}ch)`
			: null
	);

	// ── DRC cross-refs (loaded automatically for hover popovers) ────
	// ── Paragraph data (lazy-loaded to avoid 28KB in initial bundle) ────
	type ParagraphStarts = Record<string, Record<number, number[]>>;
	let paragraphStarts: ParagraphStarts | null = $state(null);

	if (browser) {
		import('$lib/data/paragraphs').then((m) => {
			paragraphStarts = m.PARAGRAPH_STARTS;
		});
	}

	// ── Per-translation format (paragraphing + poetry from its own edition) ──
	// The shared paragraph starts above come from CPDV and stand in for every
	// translation. A translation that ships its own sidecar overrides them, so
	// its text is broken up the way its own edition breaks it up.
	let bookFormat: BookFormat | null = $state(null);
	let lastFormatKey = $state('');

	run(() => {
		const key = `${translationId}/${bookSlug}`;
		if (browser && key !== lastFormatKey) {
			lastFormatKey = key;
			bookFormat = null;
			loadTranslationFormat(translationId, bookSlug, fetch).then((f) => {
				if (lastFormatKey === key) bookFormat = f;
			});
		}
	});

	let chapterFormat = $derived(bookFormat?.[String(chapterNum)] ?? null);

	// ── DRC cross-refs (loaded automatically for hover popovers) ────
	let drcCrossRefs: TranslationCrossRef[] | null = $state(null);
	let lastDrcKey = $state('');

	run(() => {
		const key = `${bookSlug}/${chapterNum}`;
		if (browser && translationId === 'drc' && key !== lastDrcKey) {
			lastDrcKey = key;
			loadTranslationCrossRefs('drc', bookSlug, chapterNum, fetch)
				.then((data) => {
					if (`${bookSlug}/${chapterNum}` === lastDrcKey) drcCrossRefs = data;
				})
				.catch(() => {});
		} else if (translationId !== 'drc') {
			drcCrossRefs = null;
		}
	});

	// ── Haydock commentary (loaded for hover popovers) ────
	let haydockCommentary: HaydockCommentaryEntry[] | null = $state(null);
	let lastHaydockKey = $state('');
	let glossa: GlossaEntry[] | null = $state(null);
	let lastGlossaKey = '';

	run(() => {
		const key = `${bookSlug}/${chapterNum}`;
		if (browser && translationId === 'haydock' && key !== lastHaydockKey) {
			lastHaydockKey = key;
			loadHaydockCommentary(bookSlug, chapterNum, fetch)
				.then((data) => {
					if (`${bookSlug}/${chapterNum}` === lastHaydockKey) haydockCommentary = data;
				})
				.catch(() => {});
		} else if (translationId !== 'haydock') {
			haydockCommentary = null;
		}

		if (browser && translationId === 'vul' && key !== lastGlossaKey) {
			lastGlossaKey = key;
			loadGlossa(bookSlug, chapterNum, fetch).then((data) => {
				if (`${bookSlug}/${chapterNum}` === lastGlossaKey) glossa = data;
			});
		} else if (translationId !== 'vul') {
			glossa = null;
		}
	});

	// ── Translation notes (DRC / CPDV / Knox) ────────────────────────
	let translationNotes: TranslationNote[] | null = $state(null);
	let lastTranslationNotesKey = $state('');
	let hasTranslationNotes = $derived(
		translationId === 'drc' || translationId === 'cpdv' || translationId === 'knox'
	);
	run(() => {
		const key = `${translationId}/${bookSlug}/${chapterNum}`;
		if (browser && hasTranslationNotes && key !== lastTranslationNotesKey) {
			lastTranslationNotesKey = key;
			const id = translationId;
			loadTranslationNotes(id, bookSlug, chapterNum, fetch)
				.then((data) => {
					if (`${id}/${bookSlug}/${chapterNum}` === lastTranslationNotesKey)
						translationNotes = data;
				})
				.catch(() => {});
		} else if (!hasTranslationNotes) {
			translationNotes = null;
		}
	});

	// ── Confraternity footnotes + commentary ─────────────────────────
	let confFootnotes: ConfChapterFootnotes | null = $state(null);
	let confCommentary: ConfChapterCommentary | null = $state(null);
	let lastConfKey = $state('');
	run(() => {
		const key = `${bookSlug}/${chapterNum}`;
		if (browser && translationId === 'conf' && key !== lastConfKey) {
			lastConfKey = key;
			loadConfFootnotes(bookSlug, chapterNum, fetch)
				.then((data) => {
					if (`${bookSlug}/${chapterNum}` === lastConfKey) confFootnotes = data;
				})
				.catch(() => {});
			loadConfCommentary(bookSlug, chapterNum, fetch)
				.then((data) => {
					if (`${bookSlug}/${chapterNum}` === lastConfKey) confCommentary = data;
				})
				.catch(() => {});
		} else if (translationId !== 'conf') {
			confFootnotes = null;
			confCommentary = null;
		}
	});

	// ── Unified annotated-verse set ──────────────────────────────────
	// Drives the dotted underline + click handler for every translation.
	let annotatedVerseSet = $derived.by(() => {
		const set = new Set<number>();
		if (translationId === 'odr') {
			for (const v of verses) if (v.has_annotation) set.add(v.verse);
			return set;
		}
		if (translationId === 'haydock') {
			if (haydockCommentary) for (const e of haydockCommentary) set.add(e.verse);
			return set;
		}
		if (translationId === 'vul') {
			if (glossa) for (const e of glossa) set.add(e.verse);
			return set;
		}
		if (hasTranslationNotes) {
			if (translationNotes) for (const n of translationNotes) set.add(n.verse);
			if (translationId === 'drc' && drcCrossRefs) for (const c of drcCrossRefs) set.add(c.verse);
			return set;
		}
		if (translationId === 'conf') {
			if (confFootnotes) for (const fn of confFootnotes.footnotes) set.add(fn.verse);
			if (confCommentary) {
				for (const s of confCommentary.sections) {
					for (let v = s.startVerse; v <= s.endVerse; v++) set.add(v);
				}
			}
			return set;
		}
		return set;
	});

	let verseEls: Record<number, HTMLElement> = $state({});

	// Lazy-load text-vide only when bionic reading is first enabled
	let textVideFn: ((_text: string, _opts: object) => string) | null = $state(null);
	let bionicReady = $state(false);
	run(() => {
		if ($prefs.bionicReading && !textVideFn) {
			import('text-vide').then((m) => {
				textVideFn = m.textVide;
				bionicReady = true;
			});
		} else if (!$prefs.bionicReading) {
			bionicReady = false;
		}
	});

	function applyBionic(text: string): string {
		if (!textVideFn) return text;
		const fixation = $prefs.bionicFixation ?? 3;
		const saccade = $prefs.bionicSaccade ?? 0;
		const bionic = textVideFn(text, { fixationPoint: fixation });
		if (saccade === 0) return bionic;
		let n = 0;
		return bionic.replace(/<b>([^<]*)<\/b>/g, (_match, inner) => {
			n++;
			return n % (saccade + 1) === 1 ? `<b>${inner}</b>` : inner;
		});
	}

	// applySmallCaps is no longer needed — allcapsToSmallcaps handles <sc> tags directly.

	/** Strip <cr> and <na> tags+content for reading mode. Optionally strip <i> tags. */
	function stripStudyMarkers(text: string, showItalics: boolean): string {
		let t = text
			.replace(/<cr>[^<]*<\/cr>/g, '')
			.replace(/<na>[^<]*<\/na>/g, '')
			.replace(/  +/g, ' ')
			.trim();
		if (!showItalics) {
			t = t.replace(/<\/?i>/g, '');
		}
		return t;
	}

	/** Render <cr> and <na> content as clickable accent superscript for study mode.
	 *  Handles multi-marker patterns like [1][2], [1](d), (a)(a), (a)[1].
	 *  Embeds data-verse so hover can look up content without DOM traversal. */
	function renderStudyMarkers(text: string, verseNum: number): string {
		function mkCr(n: string) {
			return `<button class="study-marker" data-marker-type="cross_ref" data-marker="${n}" data-verse="${verseNum}" aria-label="Cross-reference ${n}">${n}</button>`;
		}
		function mkNote(l: string) {
			return `<button class="study-marker" data-marker-type="note" data-marker="${l}" data-verse="${verseNum}" aria-label="Note ${l}">${l}</button>`;
		}
		function mkEditorial(l: string) {
			return `<button class="study-marker editorial-marker" data-marker-type="editorial" data-marker="${l}" data-verse="${verseNum}" aria-label="Editorial note">${l}</button>`;
		}

		// <cr> may contain [N] cross-refs and (x) note refs mixed together
		text = text.replace(/<cr>(.*?)<\/cr>/g, (_, content) => {
			const buttons: string[] = [];
			for (const m of content.matchAll(/\[(\d+)\]/g)) buttons.push(mkCr(m[1]));
			for (const m of content.matchAll(/\((\w+)\)/g)) buttons.push(mkNote(m[1]));
			return buttons.length > 0 ? buttons.join('') : content;
		});

		// <na> may contain (x) note refs, [N] refs, or (†) editorial markers
		text = text.replace(/<na>(.*?)<\/na>/g, (_, content) => {
			if (content === '(†)') return mkEditorial('†');
			const buttons: string[] = [];
			for (const m of content.matchAll(/\((\w+)\)/g)) buttons.push(mkNote(m[1]));
			for (const m of content.matchAll(/\[(\d+)\]/g)) buttons.push(mkNote(m[1]));
			return buttons.length > 0 ? buttons.join('') : content;
		});

		return text;
	}

	/** Unicode superscript digits → regular digit */
	const SUPER_TO_DIGIT: Record<string, string> = {
		'\u2070': '0',
		'\u00B9': '1',
		'\u00B2': '2',
		'\u00B3': '3',
		'\u2074': '4',
		'\u2075': '5',
		'\u2076': '6',
		'\u2077': '7',
		'\u2078': '8',
		'\u2079': '9'
	};
	const SUPER_RE = /[\u2070\u00B9\u00B2\u00B3\u2074-\u2079]+/g;

	/** Convert DRC superscript markers (¹²³) to clickable buttons in study mode */
	function renderDrcMarkers(text: string, verseNum: number): string {
		return text.replace(SUPER_RE, (match) => {
			const num = match
				.split('')
				.map((c) => SUPER_TO_DIGIT[c] ?? c)
				.join('');
			return `<button class="study-marker" data-marker-type="drc-crossref" data-marker="${num}" data-verse="${verseNum}" aria-label="Cross-reference ${num}">${num}</button>`;
		});
	}

	/** Convert Haydock superscript markers (¹²³) to clickable buttons in study mode */
	function renderHaydockMarkers(text: string, verseNum: number): string {
		return text.replace(SUPER_RE, (match) => {
			const num = match
				.split('')
				.map((c) => SUPER_TO_DIGIT[c] ?? c)
				.join('');
			return `<button class="study-marker" data-marker-type="haydock-commentary" data-marker="${num}" data-verse="${verseNum}" aria-label="Commentary ${num}">${num}</button>`;
		});
	}

	/** Strip DRC superscript markers in reading mode */
	function stripDrcMarkers(text: string): string {
		return text.replace(SUPER_RE, '');
	}

	/** Wrap the first letter of rendered HTML in a dropcap span.
	 *  Handles two leading-tag cases produced by the render pipeline:
	 *  - <sc>Word</sc>...  (small-caps proper noun at verse start)
	 *  - Plain letter (most verses) */
	function injectDropcap(html: string): string {
		// <sc>Letter...</sc> → pull first letter out of the sc tag
		const sc = html.replace(
			/^<sc>([A-Za-zÀ-ÿ])([^<]*)<\/sc>/,
			'<span class="dropcap">$1</span><sc>$2</sc>'
		);
		if (sc !== html) return sc;
		// Plain first letter
		return html.replace(/^([A-Za-zÀ-ÿ])/, '<span class="dropcap">$1</span>');
	}

	/**
	 * Editorial labels the Vulgate carries inline: the speakers of the Canticle
	 * (<Sponsa>, <Chorus Adolescentularum>), the Hebrew letters heading each
	 * stanza of Lamentations (<Aleph>), and headings like <Prologus>.
	 *
	 * They are distinguished from the markup tags by their leading capital, and
	 * without this they reach the DOM as unknown empty elements and vanish.
	 */
	const SPEAKER_RE = /<([A-ZÀ-Þ][^<>]*)>/g;
	function renderSpeakerLabels(text: string): string {
		return text.replace(
			SPEAKER_RE,
			(_m, label: string) => `<span class="speaker">${label}</span> `
		);
	}

	function renderVerse(
		text: string,
		bionic: boolean,
		isStudy: boolean,
		showItalics: boolean,
		verseNum: number,
		smallCaps: boolean,
		expandAmpersand: boolean,
		isDropcap: boolean = false
	): string {
		let t = text;
		if (SPEAKER_RE.test(t)) {
			SPEAKER_RE.lastIndex = 0;
			t = renderSpeakerLabels(t);
		}
		if (expandAmpersand) t = t.replace(/&amp;/g, 'and').replace(/&/g, 'and');
		// Superscript markers (¹²³) — convert to buttons in study mode, strip in reading mode
		if (SUPER_RE.test(t)) {
			SUPER_RE.lastIndex = 0;
			if (isStudy) {
				t =
					translationId === 'haydock'
						? renderHaydockMarkers(t, verseNum)
						: renderDrcMarkers(t, verseNum);
			} else {
				t = stripDrcMarkers(t);
			}
		}
		if (isStudy) {
			t = renderStudyMarkers(t, verseNum);
		} else {
			t = stripStudyMarkers(t, showItalics);
		}
		const t2 = bionic ? applyBionic(t) : t;
		const result = smallCaps ? allcapsToSmallcaps(t2) : t2;
		// Dropcap: only when bionic is off (bionic wraps letters in <b>, complicating injection)
		return isDropcap && !bionic ? injectDropcap(result) : result;
	}

	// ── Marker click handling ────────────────────────────────────────

	function handleMarkerClick(e: MouseEvent, fallbackVerse: number) {
		const btn = (e.target as HTMLElement).closest('[data-marker-type]') as HTMLElement | null;
		if (!btn) return;
		e.stopPropagation();
		const type = btn.dataset.markerType as
			| 'cross_ref'
			| 'note'
			| 'editorial'
			| 'drc-crossref'
			| 'haydock-commentary';
		const marker = btn.dataset.marker ?? '';
		const verseNum = parseInt(btn.dataset.verse ?? String(fallbackVerse));
		if (type === 'drc-crossref') {
			// Switch to Cross-Refs tab and scroll to the marker
			studyPanel.update((s) => ({ ...s, activeTab: 'cross-refs' as StudyTab }));
			scrollTrigger.set({ verse: verseNum, type: 'cross_ref', marker });
			return;
		}
		if (type === 'haydock-commentary') {
			studyPanel.update((s) => ({
				...s,
				activeTab: 'commentary' as StudyTab,
				annotatedVerse: verseNum
			}));
			scrollTrigger.set({ verse: verseNum, type: 'annotation', marker });
			return;
		}
		if (type === 'editorial') {
			studyPanel.update((s) => ({ ...s, activeTab: 'notes' as StudyTab }));
			scrollTrigger.set({ verse: verseNum, type: 'editorial', marker });
			return;
		}
		studyPanel.update((s) => ({ ...s, annotatedVerse: verseNum }));
		scrollTrigger.set({ verse: verseNum, type, marker });
	}

	// ── Verse click (annotation) ─────────────────────────────────────

	function handleVerseClick(e: MouseEvent, v: Verse) {
		// Don't fire if a marker was clicked (handled above)
		if ((e.target as HTMLElement).closest('[data-marker-type]')) return;
		if (!annotatedVerseSet.has(v.verse)) return;
		studyPanel.update((s) => ({ ...s, annotatedVerse: v.verse }));
		scrollTrigger.set({ verse: v.verse, type: 'annotation' });
	}

	// ── Marker hover popover ─────────────────────────────────────────

	interface PopoverState {
		label: string;
		content: string;
		type: 'cross_ref' | 'note';
	}

	let openPopover: PopoverState | null = $state(null);
	let popoverAnchorEl: HTMLElement | null = $state(null);
	let hoverTimer: ReturnType<typeof setTimeout> | null = null;

	/** Split concatenated Bible references onto separate lines.
	 *  Detects new reference starts: ". " followed by a capital+lowercase word
	 *  (e.g. "Isa.", "Ezech.") or a digit-prefix book (e.g. "1. Cor.", "2. Reg."). */
	function splitCrossRefLines(text: string): string {
		return text.replace(/\.\s+(?=\d+\.\s+[A-Z]|[A-Z][a-z])/g, '.\n').trim();
	}

	function resolveMarkerContent(btn: HTMLElement): PopoverState | null {
		const type = btn.dataset.markerType as
			| 'cross_ref'
			| 'note'
			| 'drc-crossref'
			| 'haydock-commentary';
		const marker = btn.dataset.marker ?? '';
		const verseNum = parseInt(btn.dataset.verse ?? '0');

		if (type === 'drc-crossref') {
			const cr = drcCrossRefs?.find((c) => c.marker === parseInt(marker));
			if (!cr) return null;
			return { label: marker, content: cr.refs, type: 'cross_ref' };
		}

		if (type === 'haydock-commentary') {
			const entry = haydockCommentary?.find((c) => c.verse === verseNum && c.marker === marker);
			if (!entry) return null;
			// Show first 200 chars of commentary in popover
			const preview = entry.text.replace(/<hr>/g, ' — ').slice(0, 200);
			return {
				label: marker,
				content: preview + (entry.text.length > 200 ? '...' : ''),
				type: 'note'
			};
		}

		const verse = verseNum > 0 ? verses.find((v) => v.verse === verseNum) : null;
		if (!verse) return null;

		if (type === 'cross_ref') {
			const idx = parseInt(marker) - 1;
			const ref = verse.cross_refs?.[idx];
			if (!ref) return null;
			return { label: marker, content: splitCrossRefLines(ref.text), type };
		} else {
			const note = verse.notes?.find(
				(n) => n.label === marker || n.label === `(${marker})` || n.label === `[${marker}]`
			);
			if (!note) return null;
			return { label: note.label, content: note.text, type };
		}
	}

	function handleMarkerMouseover(e: Event) {
		const btn = (e.target as HTMLElement).closest('.study-marker') as HTMLElement | null;
		if (!btn) return;
		if (hoverTimer) {
			clearTimeout(hoverTimer);
			hoverTimer = null;
		}
		const data = resolveMarkerContent(btn);
		if (!data) return;
		openPopover = data;
		popoverAnchorEl = btn;
	}

	function handleMarkerMouseout(e: Event) {
		const btn = (e.target as HTMLElement).closest('.study-marker') as HTMLElement | null;
		if (!btn) return;
		schedulePopoverDismiss();
	}

	function schedulePopoverDismiss() {
		hoverTimer = setTimeout(() => {
			openPopover = null;
			popoverAnchorEl = null;
			hoverTimer = null;
		}, 120);
	}

	function cancelPopoverDismiss() {
		if (hoverTimer) {
			clearTimeout(hoverTimer);
			hoverTimer = null;
		}
	}

	function dismissPopover() {
		cancelPopoverDismiss();
		openPopover = null;
		popoverAnchorEl = null;
	}

	// ── IntersectionObserver for scroll sync ─────────────────────────

	let verseObserver: IntersectionObserver | null = $state(null);
	// Suppress activeVerse updates while programmatically scrolling the reader
	// to avoid triggering a redundant panel re-scroll.
	let programmaticReaderScroll = false;
	let programmaticReaderScrollTimer: ReturnType<typeof setTimeout> | null = null;
	// Track all currently-intersecting verses so we can always pick the topmost one.
	// This fixes scroll-up: multiple verses may intersect simultaneously and the last
	// entry in the batch is not reliably the topmost one.
	const intersectingReaderVerses = new Map<number, number>(); // verse → boundingClientRect.top

	onMount(async () => {
		mounted = true;
		// Let the reactive {#each} re-render with isStudy=true before observing.
		await tick();
		if (!browser) return;
		verseObserver = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					const vNum = parseInt((entry.target as HTMLElement).dataset.verseNum ?? '0');
					if (vNum <= 0) continue;
					if (entry.isIntersecting) {
						intersectingReaderVerses.set(vNum, entry.boundingClientRect.top);
					} else {
						intersectingReaderVerses.delete(vNum);
					}
				}
				if (programmaticReaderScroll || intersectingReaderVerses.size === 0) return;
				// Pick the topmost intersecting verse (smallest top value)
				const active = [...intersectingReaderVerses.entries()].sort((a, b) => a[1] - b[1])[0][0];
				// Clear annotatedVerse on free scroll so the underline doesn't persist on
				// the wrong verse as the user scrolls past verses they didn't select.
				studyPanel.update((s) => ({ ...s, activeVerse: active, annotatedVerse: null }));
			},
			{ rootMargin: '-0% 0px -70% 0px' } // top ~30% of viewport
		);

		// Observe existing verse elements
		for (const [, el] of Object.entries(verseEls)) {
			if (el) verseObserver.observe(el);
		}

		setupPanelSync();
	});

	// Re-observe when verses change.
	// Disconnect first so we don't double-observe if Svelte re-runs this block.
	// verseEls entries are kept — bind:this keeps them current; the loop below
	// re-registers only live elements (el is non-null for mounted nodes).
	run(() => {
		if (verseObserver && verses) {
			verseObserver.disconnect();
			intersectingReaderVerses.clear();
			for (const [, el] of Object.entries(verseEls)) {
				if (el) verseObserver.observe(el);
			}
		}
	});

	onDestroy(() => {
		verseObserver?.disconnect();
		panelSyncUnsub?.();
		if (hoverTimer) clearTimeout(hoverTimer);
		if (programmaticReaderScrollTimer) clearTimeout(programmaticReaderScrollTimer);
	});

	// Scroll to target verse after navigation
	afterNavigate(() => {
		if (targetVerse && verseEls[targetVerse]) {
			verseEls[targetVerse].scrollIntoView({ behavior: 'instant', block: 'center' });
		}
	});

	// Panel→reader sync: scroll the reader window when the panel observer moves to a verse.
	// Uses a direct store subscription instead of $: reactives to avoid Svelte's reactive
	// batching potentially running the scroll check with stale verseEls.
	// Guard with chapterNum/bookSlug so only the active chapter's VerseList scrolls
	// (with infinite scroll, multiple VerseList instances can be in the DOM at once).
	let panelSyncUnsub: (() => void) | null = null;
	let lastSyncedVerse: number | null = null;

	function setupPanelSync() {
		panelSyncUnsub?.();
		// Pre-seed with current value so the immediate subscribe fire on mount doesn't
		// treat a stale panelScrollVerse as a new event and jump the reader to that verse.
		lastSyncedVerse = get(studyPanel).panelScrollVerse;
		panelSyncUnsub = studyPanel.subscribe((state) => {
			if (state.panelScrollVerse === lastSyncedVerse) return;
			lastSyncedVerse = state.panelScrollVerse;
			if (state.panelScrollVerse == null) return;
			if (!get(prefs).annotationSync) return;
			const pos = get(readingPosition);
			if (!pos || bookSlug !== pos.bookSlug || chapterNum !== pos.chapter) return;
			const el = verseEls[state.panelScrollVerse];
			if (el) {
				programmaticReaderScroll = true;
				readerSyncScrolling.set(true);
				if (programmaticReaderScrollTimer) clearTimeout(programmaticReaderScrollTimer);
				el.scrollIntoView({ behavior: 'smooth', block: 'center' });
				programmaticReaderScrollTimer = setTimeout(() => {
					programmaticReaderScroll = false;
					readerSyncScrolling.set(false);
				}, 800);
			}
		});
	}

	// mounted gate: keeps isStudy false during SSR/pre-render (where readingMode
	// defaults to 'reading'), so the hydrated HTML matches the pre-rendered HTML.
	// After onMount fires, isStudy flips to the real value → triggers {#each}
	// re-render → renderStudyMarkers runs and injects the marker buttons.
	let mounted = $state(false);
	let isStudy = $derived(mounted && $prefs.readingMode === 'study');
	let activeAnnotatedVerse = $derived($studyPanel.annotatedVerse);
	let showItalics = $derived($prefs.showItalics);
	let showSmallCaps = $derived($prefs.showSmallCaps ?? true);
	let bionic = $derived($prefs.bionicReading && bionicReady);
	let expandAmpersand = $derived($prefs.expandAmpersand ?? false);

	// Group verses into paragraphs using the paragraph reference data
	function groupIntoParagraphs(
		vv: Verse[],
		slug: string,
		ch: number,
		starts: ParagraphStarts | null
	): Verse[][] {
		const chStarts = starts?.[slug]?.[ch];
		if (!chStarts || chStarts.length === 0) return [vv];
		const startSet = new Set(chStarts);
		const groups: Verse[][] = [];
		let current: Verse[] = [];
		for (const v of vv) {
			if (startSet.has(v.verse) && current.length > 0) {
				groups.push(current);
				current = [];
			}
			current.push(v);
		}
		if (current.length > 0) groups.push(current);
		return groups;
	}
	// ── Reading blocks ──────────────────────────────────────────────────
	//
	// A block is one paragraph of prose or one stanza of poetry. Where the
	// translation ships its own format sidecar the blocks come from its own
	// edition, poetry included; otherwise they are the shared CPDV paragraphs,
	// which is what every translation used before the sidecars existed.

	type Part = { verse: number; text: string; verseStart: boolean };
	type ReadingBlock = { poetry: boolean; lines: Part[][] };

	function buildBlocks(
		vv: Verse[],
		fmt: ChapterFormat | null,
		slug: string,
		ch: number,
		starts: ParagraphStarts | null
	): ReadingBlock[] {
		if (!fmt) {
			return groupIntoParagraphs(vv, slug, ch, starts).map((group) => ({
				poetry: false,
				lines: [group.map((v) => ({ verse: v.verse, text: v.text, verseStart: true }))]
			}));
		}

		const startsBy = new Map<number, { off: number; poetry: boolean }[]>();
		for (const [v, off, kind] of fmt.b) {
			startsBy.set(v, [...(startsBy.get(v) ?? []), { off, poetry: kind === 1 }]);
		}

		const blocks: ReadingBlock[] = [];
		const openBlock = (poetry: boolean) => {
			blocks.push({ poetry, lines: [[]] });
		};
		const newLine = () => {
			blocks[blocks.length - 1]?.lines.push([]);
		};
		const currentLine = (): Part[] => {
			const b = blocks[blocks.length - 1];
			return b.lines[b.lines.length - 1];
		};

		for (const verse of vv) {
			const bs = [...(startsBy.get(verse.verse) ?? [])].sort((a, b) => a.off - b.off);
			const breaks = [...(fmt.l[String(verse.verse)] ?? [])].sort((a, b) => a - b);

			// Inside a stanza every verse opens its own line, which is how the
			// source lays out poetry and why those breaks are not stored.
			const open = blocks[blocks.length - 1];
			if (open?.poetry && !bs.some((b) => b.off === 0)) newLine();
			if (!open) openBlock(false);

			const events = [
				...bs.map((b) => ({ off: b.off, block: true, poetry: b.poetry })),
				...breaks.map((o) => ({ off: o, block: false, poetry: false }))
			].sort((a, b) => a.off - b.off || (a.block ? -1 : 1));

			let pos = 0;
			let started = false;
			const emit = (text: string) => {
				if (!text.trim()) return;
				currentLine().push({ verse: verse.verse, text, verseStart: !started });
				started = true;
			};

			for (const e of events) {
				if (e.off > pos) {
					emit(verse.text.slice(pos, e.off));
					pos = e.off;
				}
				if (e.block) openBlock(e.poetry);
				else newLine();
			}
			emit(verse.text.slice(pos));
		}

		return blocks.filter((b) => b.lines.some((l) => l.length > 0));
	}

	let blocks = $derived(buildBlocks(verses, chapterFormat, bookSlug, chapterNum, paragraphStarts));

	// Two ways to show where a paragraph begins: hang its opening verse number
	// out in the margin, or indent its first line the way a book does. Doing
	// both would say the same thing twice, so the indent takes over whenever
	// the hanging numbers are turned off.
	let hangingNumbers = $derived($prefs.hangingVerseNumbers ?? false);
	let indentParagraphs = $derived($prefs.showVerseNumbers ? !hangingNumbers : true);
	/**
	 * A gutter is only worth reserving if a number is going to hang in it.
	 * Genesis opens its first paragraph on a dropcap and the next one in the
	 * middle of a verse, so nothing ever fills the indent and the chapter reads
	 * as pushed off its own left edge. Settled for the chapter rather than the
	 * paragraph: were each paragraph to decide for itself, the ones opening
	 * mid-verse would start a gutter's width left of the ones that do not.
	 */
	let proseHangs = $derived(
		$prefs.showVerseNumbers &&
			hangingNumbers &&
			blocks.some(
				(blk, bi) =>
					!blk.poetry && blk.lines[0][0]?.verseStart && !(bi === 0 && ($prefs.showDropcap ?? true))
			)
	);
</script>

{#if $prefs.paragraphView}
	{#each blocks as blk, bi (blk.lines[0][0].verse + (blk.poetry ? 'y' : 'p') + bi)}
		<!-- svelte-ignore a11y_no_static_element_interactions, a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
		<p
			class="font-reader leading-[var(--line-height-reader)] text-[length:var(--font-size-reader)]"
			class:text-justify={$prefs.justifiedText && !blk.poetry}
			class:poetry-block={blk.poetry}
			class:bionic-fade={bionic}
			class:para-hanging={$prefs.showVerseNumbers && (blk.poetry || proseHangs) && !useRoman}
			class:para-hanging-roman={$prefs.showVerseNumbers && (blk.poetry || proseHangs) && useRoman}
			class:para-dropcap={bi === 0 && !blk.poetry && ($prefs.showDropcap ?? true)}
			class:para-indent={indentParagraphs && bi > 0 && !blk.poetry}
			style={bi > 0 && !indentParagraphs ? 'margin-top: 1em' : ''}
			onmouseover={isStudy ? handleMarkerMouseover : undefined}
			onfocus={isStudy ? handleMarkerMouseover : undefined}
			onmouseout={isStudy ? handleMarkerMouseout : undefined}
			onblur={isStudy ? handleMarkerMouseout : undefined}
			onclick={(e) => isStudy && handleMarkerClick(e, 0)}
		>
			{#each blk.lines as ln, li}
				{#if li > 0 && !blk.poetry}<br />{/if}
				<!-- Stanza lines are block-level so a verse number can hang in the
				     gutter and every line of the stanza starts on one edge. Prose
				     keeps its inline flow. -->
				<span class={blk.poetry ? 'poetry-line' : 'contents'}>
					{#each ln as part, pi (part.verse + ':' + part.text.slice(0, 12))}
						{@const opensBlock = li === 0 && pi === 0}
						{@const hangs = blk.poetry ? pi === 0 : opensBlock}
						{@const hanging = hangs && (blk.poetry || proseHangs)}
						{@const isDropcap =
							bi === 0 && opensBlock && !blk.poetry && ($prefs.showDropcap ?? true)}
						{#if part.verseStart}
							<!-- inline anchor for intersection observer + scroll target -->
							<span
								bind:this={verseEls[part.verse]}
								id="v{part.verse}"
								data-verse-num={part.verse}
								class:verse-active-annotation={isStudy &&
									annotatedVerseSet.has(part.verse) &&
									activeAnnotatedVerse === part.verse}
							>
								{#if $prefs.showVerseNumbers && !isDropcap}<sup
										class="font-ui text-[10px] select-none mr-[3px] tabular-nums"
										class:verse-num-roman={useRoman}
										class:verse-num-hang={hanging}
										class:verse-num-hang-roman={useRoman && hanging}
										class:verse-num-inline={!hanging}
										style="color: var(--color-verse-num); font-weight: {isStudy &&
										annotatedVerseSet.has(part.verse)
											? 600
											: 300}">{verseLabel(part.verse)}</sup
									>{hanging ? ' ' : '\u00a0'}{/if}{@html renderVerse(
									part.text,
									bionic,
									isStudy,
									showItalics,
									part.verse,
									showSmallCaps,
									expandAmpersand,
									isDropcap
								)}{' '}
							</span>
						{:else}
							{@html renderVerse(
								part.text,
								bionic,
								isStudy,
								showItalics,
								part.verse,
								showSmallCaps,
								expandAmpersand,
								false
							)}{' '}
						{/if}
					{/each}
				</span>
			{/each}
		</p>
	{/each}
{:else}
	<ol class="list-none space-y-[0.7rem]">
		{#each verses as v (v.verse)}
			<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
			<li
				bind:this={verseEls[v.verse]}
				id="v{v.verse}"
				data-verse-num={v.verse}
				class="flex gap-sm max-md:gap-0"
				class:verse-target={targetVerse === v.verse}
				class:verse-annotated={isStudy && annotatedVerseSet.has(v.verse)}
				class:verse-active-annotation={isStudy &&
					annotatedVerseSet.has(v.verse) &&
					activeAnnotatedVerse === v.verse}
				onclick={(e) => isStudy && handleVerseClick(e, v)}
				data-pagefind-meta="verse:{bookSlug} {chapterNum}:{v.verse}"
			>
				{#if $prefs.showVerseNumbers}
					<span
						class="font-ui text-[13px] max-md:text-[10px] select-none w-6 max-md:w-fit max-md:mr-[5px] shrink-0 text-right tabular-nums leading-[var(--line-height-reader)] pt-[0.15em] max-md:pt-[0.25em]"
						style="color: var(--color-verse-num); font-weight: {isStudy &&
						annotatedVerseSet.has(v.verse)
							? 600
							: 300}{verseNumWidth ? `; width: ${verseNumWidth}` : ''}"
					>
						{verseLabel(v.verse)}
					</span>
				{/if}
				<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions, a11y_no_noninteractive_element_interactions -->
				<p
					class="font-reader leading-[var(--line-height-reader)] text-[length:var(--font-size-reader)]"
					class:text-justify={$prefs.justifiedText}
					class:bionic-fade={bionic}
					onclick={(e) => isStudy && handleMarkerClick(e, v.verse)}
					onmouseover={isStudy ? handleMarkerMouseover : undefined}
					onfocus={isStudy ? handleMarkerMouseover : undefined}
					onmouseout={isStudy ? handleMarkerMouseout : undefined}
					onblur={isStudy ? handleMarkerMouseout : undefined}
				>
					{@html renderVerse(
						v.text,
						bionic,
						isStudy,
						showItalics,
						v.verse,
						showSmallCaps,
						expandAmpersand
					)}
				</p>
			</li>
		{/each}
	</ol>
{/if}

<MarkerPopover
	anchorEl={popoverAnchorEl}
	visible={!!openPopover}
	on:dismiss={() => dismissPopover()}
	on:mouseenter={cancelPopoverDismiss}
	on:mouseleave={schedulePopoverDismiss}
>
	{#if openPopover}
		<span class="marker-popover-content">{@html allcapsToSmallcaps(openPopover.content)}</span>
	{/if}
</MarkerPopover>

<style>
	/* Poetry, as the Clementine edition sets it: italic and indented from the
	   prose around it. */
	.poetry-block {
		font-style: italic;
	}

	/* Each stanza line is its own block, so a line too long for the measure
	   wraps under itself rather than back to the margin and a wrap never reads
	   as a new line of verse. Every line starts on the same edge, which leaves
	   the verse numbers hanging in the gutter beside them. */
	.poetry-line {
		display: block;
		padding-left: 1.2em;
		text-indent: -1.2em;
		position: relative;
	}

	/* Lifting the number out of the inline flow is what keeps a numbered line
	   starting on exactly the same edge as an unnumbered one: in flow it eats
	   part of the line's negative indent and drags the verse left. */
	.poetry-line :global(sup.verse-num-hang) {
		position: absolute;
		/* Anchored by its right edge rather than given a box to sit in: the
		   right edge of the line's padding box is where the line's own first
		   character starts, so every number ends the same short step before
		   the verse whatever its length, and a numeral wider than any box we
		   could guess at (CXXXVIII) grows leftward into the gutter instead of
		   overflowing into the text. */
		right: calc(100% + 0.5rem);
		top: 0;
		width: auto;
		/* The in-flow gutter below sets its trailing margin with !important, to
		   get past the utility class on the element; out of flow that margin
		   would land on top of the offset above and double the gap. */
		margin: 0 !important;
		padding-right: 0;
		text-indent: 0;
		/* Out of flow, vertical-align no longer applies, so the number has to
		   take the line's own height to sit beside the line it numbers. */
		line-height: inherit;
		vertical-align: baseline;
	}

	/* Verse numbers stay upright inside a stanza. */
	.poetry-block :global(sup) {
		font-style: normal;
	}

	/* Speakers of the Canticle, the Hebrew letters over each stanza of
	   Lamentations, and headings like Prologus. */
	:global(.speaker) {
		font-style: normal;
		font-weight: 600;
		font-size: 0.88em;
		letter-spacing: 0.02em;
		color: var(--color-verse-num);
	}

	.para-hanging {
		padding-left: 2rem;
	}

	.para-hanging-roman {
		padding-left: 3rem;
	}

	/* Paragraphs run on with an indented first line, as a book sets them, so
	   there is no band of space between them to break the column. */
	.para-indent {
		text-indent: 1em;
	}

	.para-dropcap {
		display: flow-root;
	}

	/* In flow the number cannot be anchored to the text edge, so the box has to
	   span the gutter exactly: width, trailing margin and the word space the
	   markup collapses in after it add up to the paragraph's own indent, which
	   is what puts the first line on the same edge as the ones that follow it.
	   The margin carries !important past the utility class on the element. */
	:global(.verse-num-hang) {
		display: inline-block;
		width: 1.5rem;
		margin-left: -2rem;
		margin-right: 0.25rem !important;
		text-align: right;
		padding-right: 0;
		box-sizing: border-box;
	}

	:global(.verse-num-hang-roman) {
		width: 2.5rem;
		margin-left: -3rem;
	}

	:global(.verse-num-roman) {
		display: inline-block;
		padding-right: 0.9em;
		margin-right: 0 !important;
	}

	:global(.verse-num-roman.verse-num-hang-roman) {
		padding-right: 0;
		margin-right: 0.25rem !important;
	}

	/* A verse number set in the run of text opens the verse that follows it, so
	   the space belongs in front of it. With the gap trailing instead, the
	   number drifts toward the verse it has just ended and reads as part of it.
	   Both gaps also carry a collapsed word space from the markup, so what is
	   set here is only the part on top of that, and em resolves against the
	   number's own small size rather than the reader's. */
	:global(sup.verse-num-inline) {
		margin-left: 0.2em;
		margin-right: -0.1em !important;
	}

	:global(sup.verse-num-roman.verse-num-inline) {
		/* Set inline rather than inline-block: an inline-block is an atomic box,
		   and a browser will break the line at its edge whatever follows it, so
		   the hard space that keeps the number with the word it opens only holds
		   once the number is text like the rest of the line. */
		display: inline;
		padding-right: 0;
		margin-left: 0.25em;
		margin-right: -0.1em !important;
	}

	:global(.dropcap) {
		font-size: 3.4em;
		line-height: 0.62;
		float: left;
		margin-right: 0.06em;
		margin-top: 0.24em;
		color: var(--color-subtle);
	}

	.verse-target {
		box-shadow: inset 3px 0 0 var(--color-accent);
	}

	.verse-annotated {
		cursor: pointer;
	}

	.verse-annotated p {
		text-decoration: underline;
		text-decoration-style: dotted;
		text-underline-offset: 3px;
		text-decoration-color: color-mix(in srgb, var(--color-accent-text) 60%, transparent);
	}

	.verse-annotated:hover p {
		text-decoration-style: solid;
		text-decoration-color: var(--color-accent-text);
	}

	.verse-annotated:hover {
		background: color-mix(in srgb, var(--color-accent) 4%, transparent);
		border-radius: 2px;
	}

	/* List view active annotation underline */
	.verse-active-annotation p,
	.verse-active-annotation.verse-annotated p {
		text-decoration: underline;
		text-decoration-style: solid;
		text-underline-offset: 3px;
		text-decoration-color: var(--color-accent-text);
	}

	/* List view active annotation background */
	.verse-active-annotation {
		background: color-mix(in srgb, var(--color-accent) 6%, transparent);
		border-radius: 2px;
	}

	/* Paragraph view - target the inline span directly */
	p .verse-active-annotation {
		text-decoration: underline;
		text-decoration-style: solid;
		text-underline-offset: 3px;
		text-decoration-color: var(--color-accent-text);
	}

	:global(.bionic-fade) {
		color: color-mix(
			in srgb,
			var(--color-text) calc(var(--bionic-opacity, 0.4) * 100%),
			transparent
		);
	}

	:global(.bionic-fade b) {
		font-weight: var(--bionic-bold-weight, 700);
		color: var(--color-text);
	}

	/* Study marker superscript — colored badge so they're visible even when
	   the parent <p> has text-decoration which bleeds through child elements */
	:global(.study-marker) {
		position: relative;
		font-size: 10px;
		font-family: var(--font-ui);
		font-weight: 600;
		vertical-align: super;
		line-height: 1;
		cursor: pointer;
		border: none;
		padding: 2px 4px;
		margin: 0 1px;
		border-radius: 2px;
		color: var(--color-accent-text);
		background: color-mix(in srgb, var(--color-accent-text) 14%, transparent);
	}

	@media (pointer: coarse) {
		:global(.study-marker::before) {
			content: '';
			position: absolute;
			top: 50%;
			left: 50%;
			transform: translate(-50%, -50%);
			min-width: 44px;
			min-height: 44px;
		}
	}

	:global(.study-marker:hover) {
		opacity: 0.75;
	}

	:global(.editorial-marker) {
		font-size: 15px;
		color: var(--color-subtle);
		background: color-mix(in srgb, var(--color-subtle) 12%, transparent);
		cursor: pointer;
	}

	:global(.marker-popover-content) {
		opacity: 0.9;
		white-space: pre-line;
	}
</style>
