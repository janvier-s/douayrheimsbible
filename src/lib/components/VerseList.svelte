<script lang="ts">
	import { run } from 'svelte/legacy';

	import { afterNavigate } from '$app/navigation';
	import { onMount, onDestroy, tick } from 'svelte';
	import { browser } from '$app/environment';
	import { get } from 'svelte/store';
	import { prefs } from '$lib/stores/prefs';
	import { studyPanel, scrollTrigger } from '$lib/stores/studyPanel';
	import type { StudyTab } from '$lib/stores/studyPanel';
	import { readingPosition } from '$lib/stores/reading';
	import MarkerPopover from '$lib/components/MarkerPopover.svelte';
	import { allcapsToSmallcaps } from '$lib/utils/text';
	import type { Verse, ConfChapterFootnotes, ConfChapterCommentary } from '$lib/data/types';
	import type { TranslationCrossRef, TranslationNote } from '$lib/data/translation-types';
	import {
		loadTranslationCrossRefs,
		loadHaydockCommentary,
		loadTranslationNotes,
		loadConfFootnotes,
		loadConfCommentary
	} from '$lib/data/loader';
	import type { HaydockCommentaryEntry } from '$lib/data/loader';
	interface Props {
		verses: Verse[];
		targetVerse: number | undefined;
		bookSlug: string;
		chapterNum: number;
		translationId?: string;
	}

	let {
		verses,
		targetVerse,
		bookSlug,
		chapterNum,
		translationId = 'odr'
	}: Props = $props();

	// ── DRC cross-refs (loaded automatically for hover popovers) ────
	// ── Paragraph data (lazy-loaded to avoid 28KB in initial bundle) ────
	type ParagraphStarts = Record<string, Record<number, number[]>>;
	let paragraphStarts: ParagraphStarts | null = $state(null);

	if (browser) {
		import('$lib/data/paragraphs').then((m) => {
			paragraphStarts = m.PARAGRAPH_STARTS;
		});
	}

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
	});

	// ── Translation notes (DRC / CPDV / Knox) ────────────────────────
	let translationNotes: TranslationNote[] | null = $state(null);
	let lastTranslationNotesKey = $state('');
	let hasTranslationNotes =
		$derived(translationId === 'drc' || translationId === 'cpdv' || translationId === 'knox');
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

		// <cr> may contain [N] cross-refs and (x) note refs mixed together
		text = text.replace(/<cr>(.*?)<\/cr>/g, (_, content) => {
			const buttons: string[] = [];
			for (const m of content.matchAll(/\[(\d+)\]/g)) buttons.push(mkCr(m[1]));
			for (const m of content.matchAll(/\((\w+)\)/g)) buttons.push(mkNote(m[1]));
			return buttons.length > 0 ? buttons.join('') : content;
		});

		// <na> may contain (x) note refs and [N] refs mixed together
		text = text.replace(/<na>(.*?)<\/na>/g, (_, content) => {
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
				if (programmaticReaderScrollTimer) clearTimeout(programmaticReaderScrollTimer);
				el.scrollIntoView({ behavior: 'smooth', block: 'center' });
				programmaticReaderScrollTimer = setTimeout(() => {
					programmaticReaderScroll = false;
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
	let paragraphs = $derived(groupIntoParagraphs(verses, bookSlug, chapterNum, paragraphStarts));
</script>

{#if $prefs.paragraphView}
	{#each paragraphs as group, gi (group[0].verse)}
		<!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events a11y_no_noninteractive_element_interactions -->
		<p
			class="font-reader leading-[var(--line-height-reader)] text-[length:var(--font-size-reader)]"
			class:text-justify={$prefs.justifiedText}
			class:bionic-fade={bionic}
			class:para-hanging={$prefs.showVerseNumbers && ($prefs.hangingVerseNumbers ?? true)}
			class:para-dropcap={gi === 0 && ($prefs.showDropcap ?? true)}
			style={gi > 0 ? 'margin-top: 1em' : ''}
			onmouseover={isStudy ? handleMarkerMouseover : undefined}
			onfocus={isStudy ? handleMarkerMouseover : undefined}
			onmouseout={isStudy ? handleMarkerMouseout : undefined}
			onblur={isStudy ? handleMarkerMouseout : undefined}
			onclick={(e) => isStudy && handleMarkerClick(e, 0)}
		>
			{#each group as v, vi (v.verse)}
				{@const isDropcap = gi === 0 && vi === 0 && ($prefs.showDropcap ?? true)}
				<!-- inline anchor for intersection observer + scroll target -->
				<span
					bind:this={verseEls[v.verse]}
					id="v{v.verse}"
					data-verse-num={v.verse}
					class:verse-active-annotation={isStudy &&
						annotatedVerseSet.has(v.verse) &&
						activeAnnotatedVerse === v.verse}
				>
					{#if $prefs.showVerseNumbers && !isDropcap}
						<sup
							class="font-ui text-[10px] font-thin select-none mr-[3px] tabular-nums"
							class:verse-num-hang={vi === 0 && ($prefs.hangingVerseNumbers ?? true)}
							class:text-subtle={!isStudy || !annotatedVerseSet.has(v.verse)}
							style={isStudy && annotatedVerseSet.has(v.verse)
								? 'color: var(--color-accent-text)'
								: ''}>{v.verse}</sup
						>
					{/if}
					{@html renderVerse(
						v.text,
						bionic,
						isStudy,
						showItalics,
						v.verse,
						showSmallCaps,
						expandAmpersand,
						isDropcap
					)}{' '}
				</span>
			{/each}
		</p>
	{/each}
{:else}
	<ol class="list-none space-y-[0.7rem]">
		{#each verses as v (v.verse)}
			<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_noninteractive_element_interactions -->
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
						class="font-ui text-[13px] max-md:text-[10px] font-thin select-none w-6 max-md:w-fit max-md:mr-[5px] shrink-0 text-right tabular-nums leading-[var(--line-height-reader)] pt-[0.15em] max-md:pt-[0.25em]"
						class:text-subtle={!isStudy || !annotatedVerseSet.has(v.verse)}
						style={isStudy && annotatedVerseSet.has(v.verse)
							? 'color: var(--color-accent-text)'
							: ''}
					>
						{v.verse}
					</span>
				{/if}
				<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
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
	.para-hanging {
		padding-left: 2rem;
	}

	.para-dropcap {
		display: flow-root;
	}

	:global(.verse-num-hang) {
		display: inline-block;
		width: 1.6rem;
		margin-left: -2rem;
		text-align: right;
		padding-right: 0.3em;
		box-sizing: border-box;
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
		font-size: 8px;
		font-family: var(--font-ui);
		font-weight: 600;
		vertical-align: super;
		line-height: 1;
		cursor: pointer;
		border: none;
		padding: 1px 3px;
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

	:global(.marker-popover-content) {
		opacity: 0.9;
		white-space: pre-line;
	}
</style>
