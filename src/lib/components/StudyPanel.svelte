<script lang="ts">
	import { tick, onDestroy } from 'svelte';
	import { fade } from 'svelte/transition';
	import { browser } from '$app/environment';
	import { studyPanel, scrollTrigger } from '$lib/stores/studyPanel';
	import type { StudyTab } from '$lib/stores/studyPanel';
	import { readingPosition } from '$lib/stores/reading';
	import { prefs } from '$lib/stores/prefs';
	import {
		loadAnnotations,
		loadTranslationNotes,
		loadTranslationCrossRefs,
		loadConfIntro,
		loadConfFootnotes,
		loadConfCommentary,
		loadHaydockCommentary,
		loadHaydockIntro,
		loadGlossa,
		hasSidecar
	} from '$lib/data/loader';
	import fathersManifest from '../../../static/data/fathers/manifest.json';
	import type { BookData, ChapterAnnotations } from '$lib/data/types';
	import AnnotationProse from './AnnotationProse.svelte';
	import { allcapsToSmallcaps } from '$lib/utils/text';
	import CrossRefText from './CrossRefText.svelte';
	import StudyTabBar from './StudyTabBar.svelte';
	import SegmentedControl from './SegmentedControl.svelte';
	import VerseTooltip from './VerseTooltip.svelte';
	import { linkifyConfRefs, linkifyKnoxRefs, linkifyDrcRefs } from '$lib/search/crossRefParser';
	import { createVerseRefTooltip } from '$lib/utils/verseRefTooltip.svelte';
	import {
		tabLabel,
		buildVisibleTabs,
		buildVerseSections,
		formatHaydockAttribution,
		formatTrailingCitation,
		groupByVerse,
		activeTabIndex,
		studyTabId
	} from './studyPanelUtils';
	import { createChapterResource } from '$lib/utils/chapterResource.svelte';
	import { getBookBySlug } from '$lib/data/books';
	import { TRANSLATIONS } from '$lib/stores/compare';

	interface Props {
		bookData?: BookData | null;
		translationId?: string;
		onClose?: (() => void) | null;
	}

	let { bookData = null, translationId = 'odr', onClose = null }: Props = $props();

	// ── Translation notes (DRC/CPDV) ────────────────────────────────
	// Follows the same pattern as the ODR annotation loader below.

	// ── Translation cross-refs (DRC) ────────────────────────────────

	// ── Haydock commentary ──────────────────────────────────────────

	// ── Glossa Ordinaria (Vulgate) ──────────────────────────────────

	// ── Haydock intro ───────────────────────────────────────────────

	// ── Confraternity intro ─────────────────────────────────────────

	// ── Confraternity footnotes ───────────────────────────────────

	// ── Confraternity commentary ──────────────────────────────────

	// When book changes, set the active tab based on user preference and intro availability
	// Track bookData identity so this only fires on book navigation, not on sub-tab clicks
	let prevBook: string | null = null;

	function switchTab(tab: StudyTab) {
		studyPanel.update((s) => ({ ...s, activeTab: tab }));
		prefs.update((p) => ({ ...p, studyDefaultTab: tab }));
	}

	// ── Annotation sidecar loading ───────────────────────────────────

	let annotations: ChapterAnnotations | null = $state(null);
	let annotationsLoading = $state(false);
	let lastAnnotationKey = '';

	// ── Build verse sections for the commentary tab ──────────────────

	// ── Shareable anchor links ───────────────────────────────────────

	let copiedVerse: number | null = $state(null);
	let copiedTimer: ReturnType<typeof setTimeout> | null = null;

	function copyVerseLink(verse: number) {
		if (!browser) return;
		const base = $readingPosition?.routeBase ?? '/odr';
		const slug = currentBookSlug;
		const ch = currentChapterNum;
		const tab = $studyPanel.activeTab;
		const url = `${window.location.origin}${base}/${slug}/${ch}?mode=study&tab=${tab}&v=${verse}`;
		navigator.clipboard.writeText(url);
		copiedVerse = verse;
		if (copiedTimer) clearTimeout(copiedTimer);
		copiedTimer = setTimeout(() => {
			copiedVerse = null;
		}, 1500);
	}

	// ── Synced scroll ────────────────────────────────────────────────

	let panelScroll: HTMLElement | undefined = $state();
	let sectionEls: Record<number, HTMLElement> = $state({});
	let programmaticScroll = false;
	let programmaticScrollTimer: ReturnType<typeof setTimeout> | null = null;
	// Set true inside setupPanelObserver for two rAFs after every fresh build, so the
	// initial IO fires (sections entering view when content renders) don't push
	// panelScrollVerse and pull the reader to a verse the user didn't navigate to.
	let freshObserver = false;
	let panelSectionObserver: IntersectionObserver | null = $state(null);
	const intersectingVerses = new Set<number>();
	let annotatedVerseTimer: ReturnType<typeof setTimeout> | null = null;
	// (chapter-change scroll + sectionEls reset handled inside annotation loading reactive)

	// Reader→panel auto-scroll: follows the reader's free scroll by scrolling the
	// panel to the matching section.
	//
	// syncVerse is a $derived, not a direct $studyPanel.activeVerse read inside the
	// effect below — scrollToSection writes studyPanel.annotatedVerse, and any store
	// update re-emits the whole object. An effect reading the store directly would
	// re-run on that unrelated write and call scrollToSection again, looping forever
	// (effect_update_depth_exceeded). $derived only propagates when the extracted
	// value actually changes, so a same-verse annotatedVerse-only update is inert.
	//
	// scrollToSection also sets programmaticScroll, which suppresses the panel's own
	// IntersectionObserver (above) from writing panelScrollVerse in response —
	// otherwise that would pull the reader again and close a feedback loop the other
	// way. VerseList only writes activeVerse for the chapter matching the current
	// reading position, so a preloaded neighboring chapter (infinite scroll) can't
	// steer the panel to the wrong section either.
	let syncVerse = $derived($studyPanel.activeVerse);
	$effect(() => {
		if (
			browser &&
			$prefs.syncStudyScroll &&
			$prefs.readingMode === 'study' &&
			syncVerse != null &&
			panelScroll
		) {
			scrollToSection(syncVerse);
		}
	});

	// Clear sectionEls on tab switch
	let lastActiveTab: StudyTab | null = null;

	// Register one DOM element for every verse in a [start, end] range.
	// Used by Conf commentary sections that span multiple verses.
	function registerSectionRange(node: HTMLElement, range: { start: number; end: number }) {
		const apply = (r: { start: number; end: number }) => {
			const next = { ...sectionEls };
			for (let v = r.start; v <= r.end; v++) next[v] = node;
			sectionEls = next;
		};
		const clear = (r: { start: number; end: number }) => {
			for (let v = r.start; v <= r.end; v++) {
				if (sectionEls[v] === node) delete sectionEls[v];
			}
		};
		apply(range);
		return {
			update(next: { start: number; end: number }) {
				clear(range);
				range = next;
				apply(range);
			},
			destroy() {
				clear(range);
			}
		};
	}

	function scrollToSection(verse: number) {
		const el = sectionEls[verse];
		if (!el || !panelScroll) return;
		// Sync the verse underline in the reader
		studyPanel.update((s) => (s.annotatedVerse !== verse ? { ...s, annotatedVerse: verse } : s));
		programmaticScroll = true;
		if (programmaticScrollTimer) clearTimeout(programmaticScrollTimer);
		const panelTop = panelScroll.getBoundingClientRect().top;
		const elTop = el.getBoundingClientRect().top;
		const offset = elTop - panelTop + panelScroll.scrollTop;
		panelScroll.scrollTo({ top: offset, behavior: 'smooth' });
		programmaticScrollTimer = setTimeout(() => {
			programmaticScroll = false;
		}, 600);
	}

	let lastObservedKeys = '';

	function setupPanelObserver() {
		if (!browser || !panelScroll || !$prefs.annotationSync || $prefs.readingMode !== 'study') {
			panelSectionObserver?.disconnect();
			panelSectionObserver = null;
			intersectingVerses.clear();
			lastObservedKeys = '';
			if (annotatedVerseTimer) {
				clearTimeout(annotatedVerseTimer);
				annotatedVerseTimer = null;
			}
			return;
		}
		// Skip teardown/rebuild if already observing the same set of section elements
		const currentKeys = Object.keys(sectionEls).sort().join(',');
		if (panelSectionObserver && currentKeys === lastObservedKeys && currentKeys !== '') return;
		lastObservedKeys = currentKeys;

		panelSectionObserver?.disconnect();
		panelSectionObserver = null;
		intersectingVerses.clear();
		if (annotatedVerseTimer) {
			clearTimeout(annotatedVerseTimer);
			annotatedVerseTimer = null;
		}
		if (currentKeys === '') return;
		freshObserver = true;
		panelSectionObserver = new IntersectionObserver(
			(entries) => {
				if (programmaticScroll || freshObserver) return;
				for (const entry of entries) {
					const verse = parseInt((entry.target as HTMLElement).dataset.sectionVerse ?? '-1');
					if (verse < 0) continue;
					if (entry.isIntersecting) {
						intersectingVerses.add(verse);
					} else {
						intersectingVerses.delete(verse);
					}
				}
				if (intersectingVerses.size > 0) {
					// Pick the topmost visible section by reading current positions
					const candidates = [...intersectingVerses].filter((v) => v > 0);
					if (candidates.length === 0) return;
					let active = candidates[0];
					let activeTop = sectionEls[active]?.getBoundingClientRect().top ?? Infinity;
					for (let i = 1; i < candidates.length; i++) {
						const top = sectionEls[candidates[i]]?.getBoundingClientRect().top ?? Infinity;
						if (top < activeTop) {
							active = candidates[i];
							activeTop = top;
						}
					}
					// Immediate: drive reader scroll to follow the panel
					studyPanel.update((s) => ({ ...s, panelScrollVerse: active }));
					// Debounced: commit annotatedVerse (verse highlight) after settling
					if (annotatedVerseTimer) clearTimeout(annotatedVerseTimer);
					annotatedVerseTimer = setTimeout(() => {
						studyPanel.update((s) => ({ ...s, annotatedVerse: active }));
					}, 80);
				}
			},
			{ root: panelScroll, rootMargin: '0px 0px -30% 0px', threshold: 0 }
		);
		for (const key of Object.keys(sectionEls)) {
			const el = sectionEls[parseInt(key)];
			if (el) panelSectionObserver.observe(el);
		}
		// Let the initial IO fires (sections entering view as content renders) be
		// processed and suppressed, then open the observer to user-driven scrolls.
		requestAnimationFrame(() =>
			requestAnimationFrame(() => {
				freshObserver = false;
			})
		);
	}

	async function handleScrollTrigger(
		trigger: NonNullable<import('$lib/stores/studyPanel').ScrollTrigger>
	) {
		// Determine which tab the trigger should route to
		let targetTab: StudyTab;
		if (!isOdr) {
			if (isHaydock) {
				if (trigger.type === 'annotation' || trigger.type === 'note') {
					targetTab = 'commentary';
				} else if (trigger.type === 'cross_ref') {
					targetTab = 'cross-refs';
				} else {
					targetTab = 'commentary';
				}
			} else if (isConf) {
				if (trigger.type === 'cross_ref') {
					targetTab = $studyPanel.activeTab;
				} else if (
					$studyPanel.activeTab === 'footnotes' ||
					$studyPanel.activeTab === 'commentary'
				) {
					targetTab = $studyPanel.activeTab;
				} else {
					targetTab = 'footnotes';
				}
			} else if (hasTranslationNotes) {
				if (trigger.type === 'cross_ref' && isDrc) {
					targetTab = 'cross-refs';
				} else {
					targetTab = 'notes';
				}
			} else {
				targetTab = $studyPanel.activeTab;
			}
		} else if (trigger.type === 'cross_ref') {
			targetTab = 'cross-refs';
		} else if (trigger.type === 'note' || trigger.type === 'editorial') {
			targetTab = 'notes';
		} else if (trigger.type === 'annotation') {
			targetTab = 'annotations';
		} else {
			targetTab = 'annotations'; // default for verse clicks
		}

		if ($studyPanel.activeTab !== targetTab) {
			studyPanel.update((s) => ({ ...s, activeTab: targetTab }));
			await tick();
		}

		// Scroll to the section
		scrollToSection(trigger.verse);

		// Flash highlight on the specific sub-entry if marker is specified
		await tick();
		if (trigger.marker) {
			const targetId = `panel-${trigger.verse}-${trigger.type}-${trigger.marker}`;
			const targetEl = panelScroll?.querySelector(
				`[data-panel-id="${targetId}"]`
			) as HTMLElement | null;
			if (targetEl) {
				targetEl.classList.add('flash-highlight');
				setTimeout(() => targetEl.classList.remove('flash-highlight'), 1500);
			}
		}

		// Consume the trigger; also sync activeVerse so the observer reactive
		// doesn't re-run with a stale verse and clobber our scroll position.
		scrollTrigger.set(null);
		studyPanel.update((s) => ({ ...s, activeVerse: trigger.verse }));
	}

	// Wheel handler: capture scroll when panel has room to scroll; bleed through to
	// the window at boundaries so infinite-scroll chapter loading still works.
	let wheelCleanup: (() => void) | null = null;
	function attachWheelHandler(el: HTMLElement) {
		wheelCleanup?.();
		function handleWheel(e: WheelEvent) {
			const { scrollTop, scrollHeight, clientHeight } = el;
			const canScrollDown = Math.round(scrollTop + clientHeight) < scrollHeight;
			const canScrollUp = scrollTop > 0;
			if ((e.deltaY > 0 && canScrollDown) || (e.deltaY < 0 && canScrollUp)) {
				e.preventDefault();
				el.scrollBy({ top: e.deltaY });
			}
			// At top/bottom boundary: don't prevent — scroll bleeds to window so the
			// reader's infinite scroll can load the next/previous chapter.
		}
		el.addEventListener('wheel', handleWheel, { passive: false });
		wheelCleanup = () => el.removeEventListener('wheel', handleWheel);
	}

	// ── Conf verse-ref tooltip state ────────────────────────────────
	const confTip = createVerseRefTooltip();

	onDestroy(() => {
		panelSectionObserver?.disconnect();
		if (programmaticScrollTimer) clearTimeout(programmaticScrollTimer);
		if (annotatedVerseTimer) clearTimeout(annotatedVerseTimer);
		confTip.destroy();
		wheelCleanup?.();
	});
	let isOdr = $derived(translationId === 'odr');
	let hasTranslationNotes = $derived(
		translationId === 'drc' ||
			translationId === 'cpdv' ||
			translationId === 'knox' ||
			translationId === 'kjv' ||
			translationId === 'odr'
	);
	let isDrc = $derived(translationId === 'drc');
	let isKnox = $derived(translationId === 'knox');
	let isHaydock = $derived(translationId === 'haydock');
	let isVul = $derived(translationId === 'vul');
	let hasLinkifiedNotes = $derived(isOdr || isDrc || isKnox || isHaydock);
	let hasTranslationIntro = $derived(translationId === 'conf');
	let isConf = $derived(translationId === 'conf');
	let translationMeta = $derived(TRANSLATIONS.find((t) => t.id === translationId));
	let currentBookSlug = $derived($readingPosition?.bookSlug ?? '');
	// ── Current chapter data ─────────────────────────────────────────

	let currentChapterNum = $derived($readingPosition?.chapter ?? 1);
	// ── Sidecar resources ────────────────────────────────────────────
	// Each is keyed on the current translation/book/chapter; returning null from
	// key() disables that resource and clears it. See chapterResource.svelte.ts.
	const chapterKey = () => (currentBookSlug ? `${currentBookSlug}/${currentChapterNum}` : null);
	const reobserve = () =>
		tick()
			.then(() => tick())
			.then(setupPanelObserver);

	const notesRes = createChapterResource({
		key: () =>
			hasTranslationNotes && currentBookSlug
				? `${translationId}/${currentBookSlug}/${currentChapterNum}`
				: null,
		load: () => loadTranslationNotes(translationId, currentBookSlug, currentChapterNum, fetch)
	});

	const crossRefsRes = createChapterResource({
		key: () => ((isDrc || isHaydock) && currentBookSlug ? chapterKey() : null),
		load: () =>
			loadTranslationCrossRefs(isDrc ? 'drc' : 'haydock', currentBookSlug, currentChapterNum, fetch)
	});

	const haydockCommentaryRes = createChapterResource({
		key: () => (isHaydock && currentBookSlug ? chapterKey() : null),
		load: () => loadHaydockCommentary(currentBookSlug, currentChapterNum, fetch),
		onLoaded: reobserve
	});

	const glossaRes = createChapterResource({
		key: () => (isVul && currentBookSlug ? chapterKey() : null),
		load: () => loadGlossa(currentBookSlug, currentChapterNum, fetch),
		onLoaded: reobserve
	});

	const haydockIntroRes = createChapterResource({
		key: () => (isHaydock && currentBookSlug ? currentBookSlug : null),
		load: (slug) => loadHaydockIntro(slug, fetch)
	});

	const confIntroRes = createChapterResource({
		key: () => (!isOdr && hasTranslationIntro && currentBookSlug ? currentBookSlug : null),
		load: (slug) => loadConfIntro(slug, fetch)
	});

	const confFootnotesRes = createChapterResource({
		key: () => (isConf && currentBookSlug ? chapterKey() : null),
		load: () => loadConfFootnotes(currentBookSlug, currentChapterNum, fetch)
	});

	const confCommentaryRes = createChapterResource({
		key: () => (isConf && currentBookSlug ? chapterKey() : null),
		load: () => loadConfCommentary(currentBookSlug, currentChapterNum, fetch)
	});

	// Aliases so the markup below reads the same as before the extraction.
	let translationNotes = $derived(notesRes.data);
	let translationNotesLoading = $derived(notesRes.loading);
	let translationCrossRefs = $derived(crossRefsRes.data);
	let translationCrossRefsLoading = $derived(crossRefsRes.loading);
	let haydockCommentary = $derived(haydockCommentaryRes.data);
	let haydockCommentaryLoading = $derived(haydockCommentaryRes.loading);
	let glossa = $derived(glossaRes.data);
	let glossaLoading = $derived(glossaRes.loading);
	let haydockIntro = $derived(haydockIntroRes.data);
	let confIntro = $derived(confIntroRes.data);
	let confFootnotes = $derived(confFootnotesRes.data);
	let confFootnotesLoading = $derived(confFootnotesRes.loading);
	let confCommentary = $derived(confCommentaryRes.data);
	let confCommentaryLoading = $derived(confCommentaryRes.loading);

	let intros = $derived(bookData?.intros ?? []);
	let hasIntros = $derived(intros.length > 0);
	let endMatters = $derived(bookData?.endMatters ?? []);
	let hasEndMatters = $derived(endMatters.length > 0);
	let currentChapterData = $derived(
		bookData?.chapters.find((c) => c.chapter === currentChapterNum)
	);
	let articles = $derived(currentChapterData?.articles ?? []);
	let hasArticles = $derived(articles.length > 0);
	let visibleTabs = $derived(
		buildVisibleTabs(translationId, hasIntros, hasArticles, hasEndMatters, confIntro, haydockIntro)
	);

	// The scroll area is only a tabpanel when there is a tablist to belong to.
	// Vulgate has a single tab, so the bar is absent and the role would dangle.
	const PANEL_ID = 'study-panel-content';
	let hasTabBar = $derived(visibleTabs.length > 1);
	let panelLabelledBy = $derived(
		hasTabBar
			? studyTabId(visibleTabs[activeTabIndex(visibleTabs, $studyPanel.activeTab)].id)
			: undefined
	);
	// Snap to first visible tab if the active tab isn't available for this translation
	$effect.pre(() => {
		if (visibleTabs.length > 0 && !visibleTabs.some((t) => t.id === $studyPanel.activeTab)) {
			studyPanel.update((s) => ({ ...s, activeTab: visibleTabs[0].id }));
		}
	});
	$effect.pre(() => {
		if (bookData && bookData.book !== prevBook) {
			prevBook = bookData.book;

			// If the tab was set from a URL ?tab= param, respect it on first load
			if ($studyPanel.tabSetByUrl) {
				const idx = intros.findIndex((i) => i.default);
				studyPanel.update((s) => ({
					...s,
					tabSetByUrl: false,
					activeIntroIndex: idx >= 0 ? idx : 0,
					activeEndIndex: 0,
					activeArticleIndex: 0
				}));
			} else {
				const preferred = $prefs.studyDefaultTab;

				let defaultTab: StudyTab;
				if (translationId === 'odr') {
					// Always annotations on ODR — the studyDefaultTab preference (set by
					// tab clicks in other translations) shouldn't steer this one.
					defaultTab = 'annotations';
				} else if (translationId === 'conf') {
					defaultTab = 'footnotes';
					if (preferred === 'footnotes' || preferred === 'commentary') {
						defaultTab = preferred;
					}
					if (preferred === 'intro' && confIntro && confIntro.length > 0) {
						defaultTab = 'intro';
					}
				} else if (isHaydock) {
					defaultTab = 'commentary';
					if (preferred === 'commentary' || preferred === 'cross-refs') {
						defaultTab = preferred;
					}
					if (preferred === 'intro' && haydockIntro && haydockIntro.paragraphs.length > 0) {
						defaultTab = 'intro';
					}
				} else if (hasTranslationNotes) {
					defaultTab = 'notes';
				} else {
					defaultTab = 'annotations';
				}

				const idx = intros.findIndex((i) => i.default);
				studyPanel.update((s) => ({
					...s,
					activeTab: defaultTab,
					activeIntroIndex: idx >= 0 ? idx : 0,
					activeEndIndex: 0,
					activeArticleIndex: 0
				}));
			}
		}
	});
	// If on the article tab but current chapter has no articles, fall back to annotations/commentary
	$effect.pre(() => {
		if ($studyPanel.activeTab === 'article' && !hasArticles) {
			studyPanel.update((s) => ({ ...s, activeTab: isOdr ? 'annotations' : 'commentary' }));
		}
	});
	$effect.pre(() => {
		const key = `${currentBookSlug}/${currentChapterNum}`;
		if (key !== lastAnnotationKey && currentBookSlug) {
			lastAnnotationKey = key;
			// Capture these NOW, before any async gap
			const slug = currentBookSlug;
			const chNum = currentChapterNum;
			// Reset scroll instantly; the CSS slide-up animation handles the smooth transition
			if (browser && panelScroll) panelScroll.scrollTop = 0;
			sectionEls = {};
			lastObservedKeys = '';
			annotationsLoading = true;
			annotations = null;
			studyPanel.update((s) => ({ ...s, annotatedVerse: null, panelScrollVerse: null }));
			loadAnnotations(slug, chNum, fetch)
				.then((data) => {
					if (`${slug}/${chNum}` === lastAnnotationKey) {
						annotations = data;
						annotationsLoading = false;
					}
				})
				.catch(() => {
					if (`${slug}/${chNum}` === lastAnnotationKey) {
						annotationsLoading = false;
					}
				});
		}
	});
	let verseSections = $derived(buildVerseSections(currentChapterData, annotations));

	// ── Cross-content availability (for annotations empty state CTAs) ─
	// ODR notes live inline in the chapter JSON (verse.notes, summary_notes),
	// NOT in the odr-notes sidecar manifest — so we check chapter data directly.
	let hasOdrNotes = $derived(
		isOdr &&
			!!currentChapterData &&
			((currentChapterData.summary_notes?.length ?? 0) > 0 ||
				currentChapterData.verses.some((v) => (v.notes?.length ?? 0) > 0))
	);
	let hasHaydock = $derived(
		isOdr &&
			!!currentBookSlug &&
			hasSidecar('haydock-commentary', currentBookSlug, currentChapterNum)
	);
	let hasFathers = $derived(
		isOdr &&
			!!currentBookSlug &&
			!!(fathersManifest as Record<string, number[]>)[currentBookSlug]?.includes(currentChapterNum)
	);
	$effect.pre(() => {
		if (
			isOdr &&
			!annotationsLoading &&
			annotations !== null &&
			$studyPanel.activeTab === 'annotations' &&
			hasTranslationNotes &&
			verseSections.filter((s) => s.annotationEntries.length > 0).length === 0
		) {
			studyPanel.update((s) => ({ ...s, activeTab: 'notes' }));
		}
	});
	$effect.pre(() => {
		if ($studyPanel.activeTab !== lastActiveTab) {
			lastActiveTab = $studyPanel.activeTab;
			sectionEls = {};
			lastObservedKeys = '';
		}
	});
	$effect.pre(() => {
		if (verseSections && browser) {
			tick().then(setupPanelObserver);
		}
	});
	$effect.pre(() => {
		if ($studyPanel.activeTab && browser) {
			tick().then(setupPanelObserver);
		}
	});
	$effect.pre(() => {
		if (browser && !$prefs.annotationSync) {
			panelSectionObserver?.disconnect();
			panelSectionObserver = null;
		}
	});
	$effect.pre(() => {
		if (browser && $prefs.readingMode !== 'study') {
			panelSectionObserver?.disconnect();
			panelSectionObserver = null;
		}
	});
	// ── ScrollTrigger consumption ────────────────────────────────────

	$effect.pre(() => {
		const trigger = $scrollTrigger;
		if (trigger && panelScroll) {
			// Defer to next frame so the browser can paint the click response before
			// doing the forced-layout work in scrollToSection (reduces INP).
			requestAnimationFrame(() => handleScrollTrigger(trigger));
		}
	});
	$effect.pre(() => {
		if (panelScroll && browser) attachWheelHandler(panelScroll);
	});
</script>

<aside
	class="panel-root h-full overflow-hidden bg-panel flex flex-col font-ui"
	aria-label="Study panel"
>
	<!-- Panel identity bar -->
	<div class="panel-header shrink-0 flex flex-col">
		<div class="flex items-center px-[14px] pt-[11px] pb-[10px]">
			{#if onClose}<div class="w-6 shrink-0"></div>{/if}
			<span class="panel-title flex-1 text-center">Study Notes</span>
			{#if onClose}
				<button
					class="w-6 h-6 shrink-0 flex items-center justify-center rounded text-subtle hover:text-foreground transition-colors"
					aria-label="Close study panel"
					onclick={onClose}
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						stroke-width="2.5"
						stroke="currentColor"
						width="14"
						height="14"
						aria-hidden="true"
					>
						<path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
					</svg>
				</button>
			{/if}
		</div>

		<StudyTabBar
			tabs={visibleTabs}
			activeTab={$studyPanel.activeTab}
			onSelect={switchTab}
			panelId={PANEL_ID}
		/>

		<div class="border-b border-border"></div>
	</div>

	<!-- Sub-tab segmented controls (outside scroll — applies to any translation) -->
	{#if $studyPanel.activeTab === 'intro' && isOdr}
		<SegmentedControl
			items={intros}
			activeIndex={$studyPanel.activeIntroIndex}
			onSelect={(i) => studyPanel.update((s) => ({ ...s, activeIntroIndex: i }))}
		/>
	{:else if $studyPanel.activeTab === 'article' && isOdr}
		<SegmentedControl
			items={articles}
			activeIndex={$studyPanel.activeArticleIndex}
			onSelect={(i) => studyPanel.update((s) => ({ ...s, activeArticleIndex: i }))}
		/>
	{:else if $studyPanel.activeTab === 'end' && isOdr}
		<SegmentedControl
			items={endMatters}
			activeIndex={$studyPanel.activeEndIndex}
			onSelect={(i) => studyPanel.update((s) => ({ ...s, activeEndIndex: i }))}
		/>
	{/if}

	<!-- Scrollable content area -->
	<!-- The tab stop is for the scroll region itself: a tab whose content is all
	     prose (a long intro, say) has nothing else focusable, so without it the
	     body cannot be scrolled from the keyboard. svelte-check cannot see that
	     the role is set, hence the third ignore. -->
	<!-- svelte-ignore a11y_no_static_element_interactions, a11y_mouse_events_have_key_events, a11y_no_noninteractive_tabindex -->
	<div
		class="panel-scroll flex-1 overflow-y-scroll"
		id={PANEL_ID}
		role={hasTabBar ? 'tabpanel' : undefined}
		aria-labelledby={panelLabelledBy}
		tabindex="0"
		bind:this={panelScroll}
		onmouseover={hasLinkifiedNotes || isConf ? confTip.handleOver : undefined}
		onmouseout={hasLinkifiedNotes || isConf ? confTip.handleOut : undefined}
	>
		{#key `${currentBookSlug}/${currentChapterNum}/${$studyPanel.activeTab}`}
			<div in:fade={{ duration: 150 }}>
				<!-- ═══ ODR: Intro tab ═══ -->
				{#if $studyPanel.activeTab === 'intro' && isOdr}
					{#if intros.length === 0}
						<div class="empty-state">
							<span class="empty-icon" aria-hidden="true">✦</span>
							<p>No introduction for this book yet.</p>
						</div>
					{:else if intros[$studyPanel.activeIntroIndex]}
						{@const intro = intros[$studyPanel.activeIntroIndex]}
						<div class="content-block">
							{#if currentBookSlug === 'genesis' || currentBookSlug === 'matthew'}
								{@const bookMeta = getBookBySlug(currentBookSlug)}
								<a
									href="/reference/odr/{bookMeta?.testament === 'NT' ? 'nt' : 'ot'}/title-page"
									target="_blank"
									rel="noopener"
									class="ref-gateway"
								>
									<span class="ref-gateway-label">
										{bookMeta?.testament === 'NT' ? 'New' : 'Old'} Testament Reference
									</span>
									<span class="ref-gateway-desc">
										{bookMeta?.testament === 'NT'
											? 'Preface, annotations, evangelical history & more'
											: 'Preface, historical tables, glossary & more'}
									</span>
									<span class="ref-gateway-arrow" aria-hidden="true">↗</span>
								</a>
							{/if}
							<p class="content-eyebrow">{tabLabel(intro.title)}</p>
							<AnnotationProse
								text={intro.text}
								notes={intro.notes ?? []}
								linkifyBare
								translationPrefix={translationId}
							/>
						</div>
					{/if}

					<!-- ═══ ODR: Annotations tab ═══ -->
				{:else if $studyPanel.activeTab === 'annotations' && isOdr}
					{#if annotationsLoading}
						<div class="empty-state"><p>Loading annotations...</p></div>
					{:else}
						{@const annotationSections = verseSections.filter(
							(s) => s.annotationEntries.length > 0
						)}
						{#if annotationSections.length === 0}
							<div class="empty-state">
								<span class="empty-icon" aria-hidden="true">✦</span>
								<p>No annotations for this chapter.</p>
								{#if hasOdrNotes || hasHaydock || hasFathers}
									<div class="ann-cta-wrap">
										{#if hasOdrNotes}
											<p class="ann-cta-header">
												Brief notes on individual verses are available in the &ldquo;Notes&rdquo;
												tab.
											</p>
											<div class="ann-cta-bar">
												<button class="ann-cta ann-cta-primary" onclick={() => switchTab('notes')}
													>Open Notes <span class="ann-cta-arrow" aria-hidden="true">&rarr;</span
													></button
												>
											</div>
										{/if}
										{#if hasHaydock || hasFathers}
											<p class="ann-cta-header" class:ann-cta-header-secondary={hasOdrNotes}>
												{#if hasOdrNotes}
													For fuller verse-by-verse commentary on this chapter, see:
												{:else}
													Verse-by-verse commentary on this chapter is available from:
												{/if}
											</p>
											<div class="ann-cta-bar ann-cta-bar-row">
												{#if hasHaydock}
													<a
														class="ann-cta ann-cta-muted"
														href="/haydock/{currentBookSlug}/{currentChapterNum}"
														>Haydock Commentary</a
													>
												{/if}
												{#if hasFathers}
													<a
														class="ann-cta ann-cta-ghost"
														href="/fathers/{currentBookSlug}/{currentChapterNum}">Church Fathers</a
													>
												{/if}
											</div>
										{/if}
									</div>
								{/if}
							</div>
						{:else}
							<div class="commentary-list">
								{#each annotationSections as section (section.verse)}
									<div
										class="verse-section"
										class:verse-section-active={$studyPanel.annotatedVerse === section.verse}
										bind:this={sectionEls[section.verse]}
										data-section-verse={section.verse}
									>
										<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
										<div
											class="verse-section-header"
											class:verse-section-header-sticky={section.verse !== 0}
											onclick={() => copyVerseLink(section.verse)}
										>
											{section.label}
											<button
												class="verse-link-btn"
												class:copied={copiedVerse === section.verse}
												aria-label="Copy link to {section.label}"
											>
												{#if copiedVerse === section.verse}
													<svg
														width="14"
														height="14"
														viewBox="0 0 256 256"
														fill="currentColor"
														aria-hidden="true"
														><path
															d="M229.66,77.66l-128,128a8,8,0,0,1-11.32,0l-56-56a8,8,0,0,1,11.32-11.32L96,188.69,218.34,66.34a8,8,0,0,1,11.32,11.32Z"
														/></svg
													>
												{:else}
													<svg
														width="14"
														height="14"
														viewBox="0 0 256 256"
														fill="currentColor"
														aria-hidden="true"
														><path
															d="M240,88.23a54.43,54.43,0,0,1-16,37L189.25,160a54.27,54.27,0,0,1-38.63,16h-.05A54.63,54.63,0,0,1,96,119.84a8,8,0,0,1,16,.45A38.62,38.62,0,0,0,150.58,160h0a38.39,38.39,0,0,0,27.31-11.31l34.75-34.75a38.63,38.63,0,0,0-54.63-54.63l-11,11A8,8,0,0,1,135.7,59l11-11A54.65,54.65,0,0,1,224,48,54.86,54.86,0,0,1,240,88.23ZM109,185.66l-11,11A38.41,38.41,0,0,1,70.6,208h0a38.63,38.63,0,0,1-27.29-65.94L78,107.31A38.63,38.63,0,0,1,144,135.71a8,8,0,0,0,16,.45A54.86,54.86,0,0,0,144,96a54.65,54.65,0,0,0-77.27,0L32,130.75A54.62,54.62,0,0,0,70.56,224h0a54.28,54.28,0,0,0,38.64-16l11-11A8,8,0,0,0,109,185.66Z"
														/></svg
													>
												{/if}
											</button>
										</div>
										{#each section.annotationEntries as ann}
											<div
												class="annotation-block"
												data-panel-id="panel-{section.verse}-annotation-{ann.part ?? 1}"
											>
												{#if ann.title}<p class="annotation-title">
														{@html allcapsToSmallcaps(ann.title)}
													</p>{/if}
												<AnnotationProse text={ann.text} notes={ann.notes} />
											</div>
										{/each}
									</div>
								{/each}
							</div>
						{/if}
					{/if}

					<!-- ═══ ODR: Notes tab ═══ -->
				{:else if $studyPanel.activeTab === 'notes' && isOdr}
					{#if annotationsLoading}
						<div class="empty-state"><p>Loading notes...</p></div>
					{:else}
						{@const noteSections = verseSections.filter(
							(s) =>
								(s.verse === 0 && currentChapterData?.summary_notes?.length) ||
								(s.verseData?.notes && s.verseData.notes.length > 0)
						)}
						{#if noteSections.length === 0 && !translationNotes?.length}
							<div class="empty-state">
								<span class="empty-icon" aria-hidden="true">✦</span>
								<p>No notes for this chapter.</p>
							</div>
						{:else}
							<div class="commentary-list">
								{#each noteSections as section (section.verse)}
									<div
										class="verse-section"
										class:verse-section-active={$studyPanel.annotatedVerse === section.verse}
										bind:this={sectionEls[section.verse]}
										data-section-verse={section.verse}
									>
										<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
										<div
											class="verse-section-header"
											class:verse-section-header-sticky={section.verse !== 0}
											onclick={() => copyVerseLink(section.verse)}
										>
											{section.label}
											<button
												class="verse-link-btn"
												class:copied={copiedVerse === section.verse}
												aria-label="Copy link to {section.label}"
											>
												{#if copiedVerse === section.verse}
													<svg
														width="14"
														height="14"
														viewBox="0 0 256 256"
														fill="currentColor"
														aria-hidden="true"
														><path
															d="M229.66,77.66l-128,128a8,8,0,0,1-11.32,0l-56-56a8,8,0,0,1,11.32-11.32L96,188.69,218.34,66.34a8,8,0,0,1,11.32,11.32Z"
														/></svg
													>
												{:else}
													<svg
														width="14"
														height="14"
														viewBox="0 0 256 256"
														fill="currentColor"
														aria-hidden="true"
														><path
															d="M240,88.23a54.43,54.43,0,0,1-16,37L189.25,160a54.27,54.27,0,0,1-38.63,16h-.05A54.63,54.63,0,0,1,96,119.84a8,8,0,0,1,16,.45A38.62,38.62,0,0,0,150.58,160h0a38.39,38.39,0,0,0,27.31-11.31l34.75-34.75a38.63,38.63,0,0,0-54.63-54.63l-11,11A8,8,0,0,1,135.7,59l11-11A54.65,54.65,0,0,1,224,48,54.86,54.86,0,0,1,240,88.23ZM109,185.66l-11,11A38.41,38.41,0,0,1,70.6,208h0a38.63,38.63,0,0,1-27.29-65.94L78,107.31A38.63,38.63,0,0,1,144,135.71a8,8,0,0,0,16,.45A54.86,54.86,0,0,0,144,96a54.65,54.65,0,0,0-77.27,0L32,130.75A54.62,54.62,0,0,0,70.56,224h0a54.28,54.28,0,0,0,38.64-16l11-11A8,8,0,0,0,109,185.66Z"
														/></svg
													>
												{/if}
											</button>
										</div>

										{#if section.verse === 0 && currentChapterData?.summary_notes}
											{#each currentChapterData.summary_notes as sn}
												<div
													class="note-row sub-section-inline"
													data-panel-id="panel-0-note-{sn.marker}"
												>
													<span class="note-marker">{sn.marker}</span>
													<span class="note-text"
														>{@html formatTrailingCitation(
															allcapsToSmallcaps(linkifyDrcRefs(sn.text, translationId))
														)}</span
													>
												</div>
											{/each}
										{/if}

										{#if section.verseData?.notes && section.verseData.notes.length > 0}
											{#each section.verseData.notes as note}
												<div
													class="note-row sub-section-inline"
													data-panel-id="panel-{section.verse}-note-{note.label}"
												>
													<span class="note-marker">{note.label}</span>
													<span class="note-text"
														>{@html formatTrailingCitation(
															allcapsToSmallcaps(linkifyDrcRefs(note.text, translationId))
														)}</span
													>
												</div>
											{/each}
										{/if}
									</div>
								{/each}
							</div>
						{/if}
						{#if translationNotes && translationNotes.length > 0}
							<div class="commentary-list odr-editorial-notes">
								{#each translationNotes as note (note.verse)}
									<div class="verse-section editorial-note">
										<div class="verse-section-header verse-section-header-sticky">
											Verse {note.verse}{#if note.editorial}
												· editorial{/if}
										</div>
										<div class="note-row sub-section-inline">
											<span class="note-marker editorial-panel-marker">†</span>
											<span class="note-text"
												>{@html allcapsToSmallcaps(linkifyDrcRefs(note.text, translationId))}</span
											>
										</div>
									</div>
								{/each}
							</div>
						{/if}
					{/if}

					<!-- ═══ ODR: Cross-Refs tab ═══ -->
				{:else if $studyPanel.activeTab === 'cross-refs' && isOdr}
					{#if annotationsLoading}
						<div class="empty-state"><p>Loading cross-references...</p></div>
					{:else}
						{@const crossRefSections = verseSections.filter(
							(s) => s.verseData?.cross_refs && s.verseData.cross_refs.length > 0
						)}
						{#if crossRefSections.length === 0}
							<div class="empty-state">
								<span class="empty-icon" aria-hidden="true">✦</span>
								<p>No cross-references for this chapter.</p>
							</div>
						{:else}
							<div class="commentary-list">
								{#each crossRefSections as section (section.verse)}
									<div
										class="verse-section"
										class:verse-section-active={$studyPanel.annotatedVerse === section.verse}
										bind:this={sectionEls[section.verse]}
										data-section-verse={section.verse}
									>
										<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
										<div
											class="verse-section-header verse-section-header-sticky"
											onclick={() => copyVerseLink(section.verse)}
										>
											{section.label}
											<button
												class="verse-link-btn"
												class:copied={copiedVerse === section.verse}
												aria-label="Copy link to {section.label}"
											>
												{#if copiedVerse === section.verse}
													<svg
														width="14"
														height="14"
														viewBox="0 0 256 256"
														fill="currentColor"
														aria-hidden="true"
														><path
															d="M229.66,77.66l-128,128a8,8,0,0,1-11.32,0l-56-56a8,8,0,0,1,11.32-11.32L96,188.69,218.34,66.34a8,8,0,0,1,11.32,11.32Z"
														/></svg
													>
												{:else}
													<svg
														width="14"
														height="14"
														viewBox="0 0 256 256"
														fill="currentColor"
														aria-hidden="true"
														><path
															d="M240,88.23a54.43,54.43,0,0,1-16,37L189.25,160a54.27,54.27,0,0,1-38.63,16h-.05A54.63,54.63,0,0,1,96,119.84a8,8,0,0,1,16,.45A38.62,38.62,0,0,0,150.58,160h0a38.39,38.39,0,0,0,27.31-11.31l34.75-34.75a38.63,38.63,0,0,0-54.63-54.63l-11,11A8,8,0,0,1,135.7,59l11-11A54.65,54.65,0,0,1,224,48,54.86,54.86,0,0,1,240,88.23ZM109,185.66l-11,11A38.41,38.41,0,0,1,70.6,208h0a38.63,38.63,0,0,1-27.29-65.94L78,107.31A38.63,38.63,0,0,1,144,135.71a8,8,0,0,0,16,.45A54.86,54.86,0,0,0,144,96a54.65,54.65,0,0,0-77.27,0L32,130.75A54.62,54.62,0,0,0,70.56,224h0a54.28,54.28,0,0,0,38.64-16l11-11A8,8,0,0,0,109,185.66Z"
														/></svg
													>
												{/if}
											</button>
										</div>
										{#each section.verseData?.cross_refs ?? [] as cr, ci}
											<div
												class="cr-row sub-section-inline"
												data-panel-id="panel-{section.verse}-cross_ref-{ci + 1}"
											>
												<span class="cr-marker">{ci + 1}</span>
												<CrossRefText text={cr.text} />
											</div>
										{/each}
									</div>
								{/each}
							</div>
						{/if}
					{/if}

					<!-- ═══ ODR: Article tab ═══ -->
				{:else if $studyPanel.activeTab === 'article' && isOdr}
					{#if articles.length === 0}
						<div class="empty-state">
							<span class="empty-icon" aria-hidden="true">✦</span>
							<p>No article for this chapter.</p>
						</div>
					{:else if articles[$studyPanel.activeArticleIndex]}
						{@const art = articles[$studyPanel.activeArticleIndex]}
						<div class="content-block">
							<p class="content-eyebrow">{tabLabel(art.title)}</p>
							<AnnotationProse
								text={art.text}
								notes={art.notes ?? []}
								linkifyBare
								translationPrefix={translationId}
							/>
						</div>
					{/if}

					<!-- ═══ ODR: End matter tab ═══ -->
				{:else if $studyPanel.activeTab === 'end' && isOdr}
					{#if endMatters.length === 0}
						<div class="empty-state">
							<span class="empty-icon" aria-hidden="true">✦</span>
							<p>No end matter for this book yet.</p>
						</div>
					{:else if endMatters[$studyPanel.activeEndIndex]}
						{@const em = endMatters[$studyPanel.activeEndIndex]}
						<div class="content-block">
							<p class="content-eyebrow">{tabLabel(em.title)}</p>
							<AnnotationProse
								text={em.text}
								notes={em.notes ?? []}
								linkifyBare
								translationPrefix={translationId}
							/>
						</div>
					{/if}

					<!-- ═══ Confraternity: Intro tab ═══ -->
				{:else if $studyPanel.activeTab === 'intro' && isConf && confIntro}
					<div class="content-block">
						<p class="content-eyebrow">Introduction · Confraternity Bible</p>
						{#each confIntro as para}
							<p class="prose-para">{@html linkifyConfRefs(para)}</p>
						{/each}
					</div>

					<!-- ═══ Confraternity: Footnotes tab ═══ -->
				{:else if $studyPanel.activeTab === 'footnotes' && isConf}
					<div class="content-block">
						{#if confFootnotesLoading}
							<div class="empty-state"><p>Loading footnotes...</p></div>
						{:else if confFootnotes && confFootnotes.footnotes.length > 0}
							<p class="content-eyebrow">Bible Footnotes</p>
							{#each confFootnotes.footnotes as fn}
								<div
									class="conf-note-entry"
									class:verse-section-active={$studyPanel.annotatedVerse === fn.verse}
									bind:this={sectionEls[fn.verse]}
									data-section-verse={fn.verse}
								>
									<span class="cr-marker">{fn.verse}</span>
									<div class="note-body">
										<span class="note-text">{@html linkifyConfRefs(fn.text)}</span>
									</div>
								</div>
							{/each}
						{:else}
							<div class="empty-state">
								<span class="empty-icon" aria-hidden="true">✦</span>
								<p>No footnotes for this chapter.</p>
							</div>
						{/if}
					</div>

					<!-- ═══ Confraternity: Commentary tab ═══ -->
				{:else if $studyPanel.activeTab === 'commentary' && isConf}
					<div class="content-block">
						{#if confCommentaryLoading}
							<div class="empty-state"><p>Loading commentary...</p></div>
						{:else if confCommentary && confCommentary.sections.length > 0}
							<p class="content-eyebrow">Supplemental Commentary</p>
							{#each confCommentary.sections as section}
								<div
									class="conf-commentary-section"
									class:verse-section-active={$studyPanel.annotatedVerse !== null &&
										$studyPanel.annotatedVerse >= section.startVerse &&
										$studyPanel.annotatedVerse <= section.endVerse}
									use:registerSectionRange={{
										start: section.startVerse,
										end: section.endVerse
									}}
									data-section-verse={section.startVerse}
								>
									{#if section.heading}
										<p class="conf-section-heading">{section.heading}</p>
									{/if}
									{#each section.paragraphs as para}
										<p class="prose-para">{@html linkifyConfRefs(para)}</p>
									{/each}
								</div>
							{/each}
						{:else}
							<div class="empty-state">
								<span class="empty-icon" aria-hidden="true">✦</span>
								<p>No commentary for this chapter.</p>
							</div>
						{/if}
					</div>

					<!-- ═══ Haydock: Intro tab ═══ -->
				{:else if $studyPanel.activeTab === 'intro' && isHaydock && haydockIntro}
					<div class="content-block">
						<p class="content-eyebrow">Introduction · Haydock</p>
						{#each haydockIntro.paragraphs as para}
							<p class="prose-para">{@html linkifyDrcRefs(para, translationId)}</p>
						{/each}
					</div>

					<!-- ═══ Haydock: Commentary tab ═══ -->
				{:else if $studyPanel.activeTab === 'commentary' && isHaydock}
					{#if haydockCommentaryLoading}
						<div class="empty-state"><p>Loading commentary...</p></div>
					{:else if haydockCommentary && haydockCommentary.length > 0}
						{@const grouped = groupByVerse(haydockCommentary)}
						<div class="content-block haydock-commentary-block">
							<p class="content-eyebrow">Haydock Commentary</p>
							{#each grouped as group (group.verse)}
								<div
									class="verse-section"
									class:verse-section-active={$studyPanel.annotatedVerse === group.verse}
									bind:this={sectionEls[group.verse]}
									data-section-verse={group.verse}
								>
									<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
									<div
										class="verse-section-header verse-section-header-sticky"
										onclick={() => copyVerseLink(group.verse)}
									>
										{group.verse === 0 ? 'Chapter' : `Verse ${group.verse}`}
										<button
											class="verse-link-btn"
											class:copied={copiedVerse === group.verse}
											aria-label="Copy link to verse {group.verse}"
										>
											{#if copiedVerse === group.verse}
												<svg
													width="14"
													height="14"
													viewBox="0 0 256 256"
													fill="currentColor"
													aria-hidden="true"
													><path
														d="M229.66,77.66l-128,128a8,8,0,0,1-11.32,0l-56-56a8,8,0,0,1,11.32-11.32L96,188.69,218.34,66.34a8,8,0,0,1,11.32,11.32Z"
													/></svg
												>
											{:else}
												<svg
													width="14"
													height="14"
													viewBox="0 0 256 256"
													fill="currentColor"
													aria-hidden="true"
													><path
														d="M240,88.23a54.43,54.43,0,0,1-16,37L189.25,160a54.27,54.27,0,0,1-38.63,16h-.05A54.63,54.63,0,0,1,96,119.84a8,8,0,0,1,16,.45A38.62,38.62,0,0,0,150.58,160h0a38.39,38.39,0,0,0,27.31-11.31l34.75-34.75a38.63,38.63,0,0,0-54.63-54.63l-11,11A8,8,0,0,1,135.7,59l11-11A54.65,54.65,0,0,1,224,48,54.86,54.86,0,0,1,240,88.23ZM109,185.66l-11,11A38.41,38.41,0,0,1,70.6,208h0a38.63,38.63,0,0,1-27.29-65.94L78,107.31A38.63,38.63,0,0,1,144,135.71a8,8,0,0,0,16,.45A54.86,54.86,0,0,0,144,96a54.65,54.65,0,0,0-77.27,0L32,130.75A54.62,54.62,0,0,0,70.56,224h0a54.28,54.28,0,0,0,38.64-16l11-11A8,8,0,0,0,109,185.66Z"
													/></svg
												>
											{/if}
										</button>
									</div>
									{#each group.entries as entry}
										<div
											class="haydock-entry"
											data-panel-id="panel-{group.verse}-commentary-{entry.marker}"
										>
											<span class="cr-marker">{entry.marker}</span>
											<span class="note-text"
												>{@html formatHaydockAttribution(
													linkifyDrcRefs(entry.text, translationId)
												)}</span
											>
										</div>
									{/each}
								</div>
							{/each}
						</div>
					{:else}
						<div class="empty-state">
							<span class="empty-icon" aria-hidden="true">✦</span>
							<p>No commentary for this chapter.</p>
						</div>
					{/if}

					<!-- ═══ Haydock: Cross-Refs tab ═══ -->
				{:else if $studyPanel.activeTab === 'cross-refs' && isHaydock}
					{#if translationCrossRefsLoading}
						<div class="empty-state"><p>Loading cross-references...</p></div>
					{:else if translationCrossRefs && translationCrossRefs.length > 0}
						<div class="content-block">
							<p class="content-eyebrow">Cross-References · Haydock</p>
							{#each translationCrossRefs as cr (cr.marker)}
								<div class="cr-row">
									<span class="cr-marker">{cr.marker}</span>
									<span class="cr-verse-tag">v.{cr.verse}</span>
									<CrossRefText text={cr.refs} />
								</div>
							{/each}
						</div>
					{:else}
						<div class="empty-state">
							<span class="empty-icon" aria-hidden="true">✦</span>
							<p>No cross-references for this chapter.</p>
						</div>
					{/if}

					<!-- ═══ Vulgate: Glossa Ordinaria tab ═══ -->
				{:else if $studyPanel.activeTab === 'glossa' && isVul}
					{#if glossaLoading}
						<div class="empty-state"><p>Loading commentary...</p></div>
					{:else if glossa && glossa.length > 0}
						{@const grouped = groupByVerse(glossa)}
						<div class="content-block glossa-block">
							<p class="content-eyebrow">Glossa Ordinaria</p>
							{#each grouped as group (group.verse)}
								<div
									class="verse-section"
									class:verse-section-active={$studyPanel.annotatedVerse === group.verse}
									bind:this={sectionEls[group.verse]}
									data-section-verse={group.verse}
								>
									<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
									<div
										class="verse-section-header verse-section-header-sticky"
										onclick={() => copyVerseLink(group.verse)}
									>
										{group.verse === 0 ? 'Chapter' : `Verse ${group.verse}`}
									</div>
									{#each group.entries as entry, i}
										<div class="glossa-entry" data-panel-id="panel-{group.verse}-glossa-{i}">
											<p class="glossa-text">
												<!-- {' '} is explicit: Svelte trims the whitespace around a block
												     tag, which would run the lemma into the gloss body. -->
												{#if entry.lemma}<em class="glossa-lemma">{entry.lemma}</em
													>{' '}{/if}{entry.text}
											</p>
											<p class="glossa-author">{entry.author ?? 'Glossa'}</p>
										</div>
									{/each}
								</div>
							{/each}
						</div>
					{:else}
						<div class="empty-state">
							<span class="empty-icon" aria-hidden="true">✦</span>
							<p>Nulla glossa.</p>
						</div>
					{/if}

					<!-- ═══ DRC/Knox/CPDV: Translation Notes tab ═══ -->
				{:else if $studyPanel.activeTab === 'notes' && hasTranslationNotes}
					{#if translationNotesLoading}
						<div class="empty-state"><p>Loading notes...</p></div>
					{:else if translationNotes && translationNotes.length > 0}
						<div class="content-block">
							<p class="content-eyebrow">
								Notes · {translationMeta?.abbr ?? translationId.toUpperCase()}
							</p>
							{#each translationNotes as note (note.verse)}
								{@const headingMatch = note.text.match(/^(".*?")\s*\.{3}\s*/)}
								{@const linkify = isKnox
									? (t: string) => linkifyKnoxRefs(t)
									: isDrc
										? (t: string) => linkifyDrcRefs(t, translationId)
										: null}
								<div
									class="translation-note-entry"
									class:verse-section-active={$studyPanel.annotatedVerse === note.verse}
									class:editorial-note={note.editorial}
									bind:this={sectionEls[note.verse]}
									data-section-verse={note.verse}
								>
									<span class="cr-marker">{note.verse}</span>
									<div class="note-body">
										{#if headingMatch}
											<p class="annotation-title">{headingMatch[1].replace(/^"|"$/g, '')}</p>
											{#if linkify}
												<span class="note-text"
													>{@html linkify(note.text.slice(headingMatch[0].length))}</span
												>
											{:else}
												<span class="note-text">{note.text.slice(headingMatch[0].length)}</span>
											{/if}
										{:else if linkify}
											<span class="note-text">{@html linkify(note.text)}</span>
										{:else}
											<span class="note-text">{note.text}</span>
										{/if}
										{#if note.editorial}
											<span class="editorial-tag">editorial</span>
										{/if}
									</div>
								</div>
							{/each}
						</div>
					{:else}
						<div class="empty-state">
							<span class="empty-icon" aria-hidden="true">✦</span>
							<p>No notes for this chapter.</p>
						</div>
					{/if}

					<!-- ═══ DRC: Cross-Refs tab ═══ -->
				{:else if $studyPanel.activeTab === 'cross-refs' && isDrc}
					{#if translationCrossRefsLoading}
						<div class="empty-state"><p>Loading cross-references...</p></div>
					{:else if translationCrossRefs && translationCrossRefs.length > 0}
						<div class="content-block">
							<p class="content-eyebrow">Cross-References · DRC</p>
							{#each translationCrossRefs as cr (cr.marker)}
								<div class="cr-row">
									<span class="cr-marker">{cr.marker}</span>
									<span class="cr-verse-tag">v.{cr.verse}</span>
									<CrossRefText text={cr.refs} />
								</div>
							{/each}
						</div>
					{:else}
						<div class="empty-state">
							<span class="empty-icon" aria-hidden="true">✦</span>
							<p>No cross-references for this chapter.</p>
						</div>
					{/if}

					<!-- ═══ Fallback: No study content ═══ -->
				{:else}
					<div class="empty-state">
						<span class="empty-icon" aria-hidden="true">✦</span>
						<p>
							No study notes available for the {translationMeta?.label ??
								translationId.toUpperCase()}.
						</p>
					</div>
				{/if}

				<!-- Verse-ref tooltip (for linkified notes) -->
				{#if hasLinkifiedNotes || isConf}
					<VerseTooltip
						{translationId}
						osisRanges={confTip.refs}
						anchorEl={confTip.anchor}
						visible={confTip.visible}
						onmouseenter={confTip.cancelDismiss}
						onmouseleave={confTip.scheduleDismiss}
					/>
				{/if}
			</div>
		{/key}
	</div>
</aside>

<style>
	/* Metropolis only has italic at 400/600 — use 500 (Medium) so
	   italic text (400) doesn't look heavier than surrounding text. */
	.panel-root {
		font-weight: 500;
	}

	/* ─── Reference gateway ─────────────────────────── */
	.ref-gateway {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 10px 12px;
		margin-bottom: 16px;
		border: 1px solid var(--color-border);
		border-radius: 3px;
		text-decoration: none;
		background: color-mix(in srgb, var(--color-accent) 5%, transparent);
		transition:
			border-color 150ms ease,
			background 150ms ease;
	}

	.ref-gateway:hover {
		border-color: color-mix(in srgb, var(--color-accent) 50%, transparent);
		background: color-mix(in srgb, var(--color-accent) 9%, transparent);
	}

	.ref-gateway-label {
		font-size: 11px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: var(--color-accent);
		flex-shrink: 0;
	}

	.ref-gateway-desc {
		font-size: 11px;
		color: var(--color-muted);
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.ref-gateway-arrow {
		font-size: 13px;
		color: var(--color-subtle);
		flex-shrink: 0;
	}

	/* ─── Identity bar ──────────────────────────────── */
	.panel-title {
		font-size: 10px;
		text-transform: uppercase;
		letter-spacing: 0.25em;
		color: var(--color-subtle);
		font-weight: 500;
		user-select: none;
	}

	/* ─── Scrollable pane ───────────────────────────── */
	/* Force classic (always-visible) scrollbar on macOS WebKit */
	.panel-scroll {
		scrollbar-width: auto;
		scrollbar-color: color-mix(in srgb, var(--color-accent) 50%, transparent)
			color-mix(in srgb, var(--color-border) 40%, transparent);
	}

	.panel-scroll::-webkit-scrollbar {
		width: 10px;
		-webkit-appearance: none;
	}

	.panel-scroll::-webkit-scrollbar-track {
		background: color-mix(in srgb, var(--color-border) 40%, transparent);
	}

	.panel-scroll::-webkit-scrollbar-thumb {
		background: color-mix(in srgb, var(--color-accent) 50%, transparent);
		border-radius: 5px;
		border: 2px solid transparent;
		background-clip: padding-box;
		min-height: 40px;
	}

	.panel-scroll::-webkit-scrollbar-thumb:hover {
		background: color-mix(in srgb, var(--color-accent) 70%, transparent);
		background-clip: padding-box;
	}

	/* ─── Content ───────────────────────────────────── */
	.content-block {
		padding: 16px 52px;
	}

	.content-eyebrow {
		font-size: 10px;
		text-transform: uppercase;
		letter-spacing: 0.22em;
		color: var(--color-accent);
		font-weight: 500;
		margin-bottom: 12px;
	}

	/* ─── Commentary ────────────────────────────────── */
	.commentary-list {
		display: flex;
		flex-direction: column;
	}

	.verse-section {
		border-bottom: 1px solid var(--color-border);
		padding: 0;
		transition: box-shadow 200ms ease;
	}

	.verse-section-active > .verse-section-header {
		background: color-mix(in srgb, var(--color-accent) 6%, var(--color-panel));
		box-shadow:
			-52px 0 0 color-mix(in srgb, var(--color-accent) 6%, var(--color-panel)),
			52px 0 0 color-mix(in srgb, var(--color-accent) 6%, var(--color-panel));
		color: var(--color-accent);
	}

	.verse-section-header {
		font-size: 10px;
		text-transform: uppercase;
		letter-spacing: 0.15em;
		color: var(--color-subtle);
		font-weight: 500;
		padding: 12px 52px 6px;
		user-select: none;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 5px;
	}

	.verse-link-btn {
		opacity: 0;
		color: inherit;
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
		transition: opacity 150ms ease;
		line-height: 0;
	}

	.verse-link-btn.copied {
		opacity: 1;
		color: var(--color-accent);
	}

	.verse-section-header:hover .verse-link-btn {
		opacity: 1;
	}

	.verse-link-btn:hover {
		color: var(--color-accent);
	}

	.verse-section-header-sticky {
		position: sticky;
		top: 0;
		background: var(--color-panel);
		z-index: 1;
		text-align: center;
		padding-top: 15px;
		padding-bottom: 15px;
		border-bottom: 1px solid var(--color-border);
		font-weight: 400;
		color: var(--color-accent);
		margin-bottom: 20px;
	}

	@supports (backdrop-filter: blur(1px)) {
		@media screen and (-webkit-min-device-pixel-ratio: 0) {
			.verse-section-header-sticky {
				background: color-mix(in srgb, var(--color-panel) 80%, transparent);
				backdrop-filter: blur(10px);
				-webkit-backdrop-filter: blur(10px);
			}
		}
	}

	.sub-section-inline {
		padding: 2px 52px;
	}

	/* Cross-references & Notes (shared layout) */
	.cr-row,
	.note-row {
		display: flex;
		gap: 7px;
		align-items: baseline;
		line-height: 1.45;
		padding-block: 2px;
		margin-bottom: 20px;
	}

	.cr-marker,
	.note-marker {
		font-family: var(--font-ui);
		letter-spacing: 0.4px;
		font-size: 12px;
		font-weight: 600;
		color: var(--color-accent-text);
		flex-shrink: 0;
		min-width: 20px;
	}

	.cr-verse-tag {
		font-family: var(--font-ui);
		letter-spacing: 0.4px;
		font-size: 11px;
		color: var(--color-muted);
		margin-right: 6px;
		white-space: nowrap;
	}

	.note-text {
		font-family: var(--font-reader);
		font-size: 15px;
	}

	/* Metropolis Italic only exists at weight 400/600 — inherit panel weight (500)
	   so the browser selects the closest italic face (400) without synthesis. */
	.panel-root :global(i) {
		font-style: italic;
	}

	/* Annotations */
	.annotation-block {
		padding: 4px 52px 8px;
	}

	.annotation-block + .annotation-block {
		border-top: 1px solid var(--color-border);
		margin-top: 4px;
		padding-top: 8px;
	}

	.annotation-title {
		font-size: 16px;
		font-weight: 600;
		color: var(--color-accent-text);
		margin: 10px 0 8px;
		font-family: var(--font-reader);
		font-style: italic;
	}

	/* Flash highlight for scroll-triggered entries */
	:global(.flash-highlight) {
		animation: flash 1.5s ease-out;
	}

	@keyframes flash {
		0% {
			background: color-mix(in srgb, var(--color-accent) 15%, transparent);
		}
		100% {
			background: transparent;
		}
	}

	/* ─── Empty state ───────────────────────────────── */
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 10px;
		padding: 48px 20px;
		text-align: center;
	}

	.empty-icon {
		font-size: 18px;
		color: color-mix(in srgb, var(--color-accent) 35%, transparent);
		display: block;
	}

	.empty-state p {
		font-size: 13px;
		color: var(--color-subtle);
		font-style: italic;
		line-height: 1.5;
	}

	.ann-cta-wrap {
		display: flex;
		flex-direction: column;
		gap: 9px;
		width: 100%;
		/* Headers get the full width here; button bars are narrower (see .ann-cta-bar). */
		max-width: 460px;
		margin-top: 14px;
	}

	.empty-state .ann-cta-header {
		font-size: 13px;
		color: var(--color-muted);
		font-style: normal;
		font-weight: 500;
		margin: 0;
		line-height: 1.45;
		text-align: center;
	}

	.empty-state .ann-cta-header-secondary {
		margin-top: 10px;
	}

	.ann-cta-bar {
		display: flex;
		gap: 8px;
		width: 100%;
		max-width: 380px;
		margin: 0 auto;
		justify-content: center;
	}

	.ann-cta-bar-row .ann-cta {
		flex: 1;
		min-width: 0;
	}

	.ann-cta {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		padding: 11px 18px;
		border-radius: 5px;
		font-size: 13px;
		font-weight: 600;
		font-style: normal;
		text-decoration: none;
		text-align: center;
		cursor: pointer;
		transition:
			background-color 150ms ease,
			color 150ms ease,
			border-color 150ms ease;
		border: 1px solid transparent;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		line-height: 1.2;
	}

	.ann-cta-arrow {
		font-size: 15px;
		line-height: 1;
		font-weight: 500;
	}

	.ann-cta-primary {
		background: var(--color-accent);
		color: white;
		/* Match the width of one button in the side-by-side row below
		   (row max-width 380px, gap 8px → each row button is calc(50% - 4px)). */
		width: calc(50% - 4px);
		margin-bottom: 4px;
	}

	.ann-cta-primary:hover {
		background: color-mix(in srgb, var(--color-accent) 85%, black);
	}

	.ann-cta-muted {
		background: color-mix(in srgb, var(--color-text) 12%, transparent);
		color: var(--color-text);
		border-color: color-mix(in srgb, var(--color-text) 18%, transparent);
	}

	.ann-cta-muted:hover {
		background: color-mix(in srgb, var(--color-text) 18%, transparent);
		border-color: color-mix(in srgb, var(--color-text) 26%, transparent);
	}

	.ann-cta-ghost {
		background: transparent;
		color: var(--color-text);
		border-color: color-mix(in srgb, var(--color-text) 22%, transparent);
	}

	.ann-cta-ghost:hover {
		background: color-mix(in srgb, var(--color-text) 6%, transparent);
		border-color: color-mix(in srgb, var(--color-text) 32%, transparent);
	}

	.haydock-commentary-block {
		padding-left: 20px;
		padding-right: 28px;
	}

	/* ─── Haydock commentary entries ─────────────────────────── */
	.haydock-entry {
		display: flex;
		gap: 10px;
		align-items: baseline;
		line-height: 1.7;
		padding: 8px 0;
		border-bottom: 1px solid color-mix(in srgb, var(--color-border) 50%, transparent);
	}

	.haydock-entry:last-child {
		border-bottom: none;
	}

	.haydock-entry :global(.haydock-attribution) {
		font-style: italic;
		color: var(--color-subtle);
		font-size: 0.9em;
	}

	.note-text :global(.note-citation) {
		display: inline-block;
		margin-top: 4px;
	}

	/* Haydock commentary <hr> tags from --- separators */
	.haydock-entry :global(hr) {
		border: none;
		border-top: 1px solid var(--color-border);
		margin: 8px 0;
	}

	/* ─── Glossa Ordinaria entries ───────────────────────────── */
	.glossa-entry {
		/* Gloss prose is reading matter, so it takes the reader face like
		   .note-text and .prose-para do, rather than the panel's UI face. */
		font-family: var(--font-reader);
		margin-bottom: 1.1rem;
	}

	.glossa-entry:last-child {
		margin-bottom: 0;
	}

	/* The lemma is the catchword the gloss quotes from the verse. It leads the
	   sentence inline, the way a glossed page reads, rather than sitting above
	   it as a heading. font-synthesis is off so a family without a true italic
	   falls back to upright instead of being mechanically slanted. */
	.glossa-lemma {
		font-style: italic;
		font-synthesis: none;
	}

	.glossa-text {
		line-height: 1.6;
	}

	.glossa-author {
		margin-top: 0.2rem;
		text-align: right;
		font-style: italic;
		font-synthesis: none;
		opacity: 0.7;
		font-size: 0.85em;
	}

	/* ─── Translation notes ────────────────────────────────────── */
	.translation-note-entry {
		display: flex;
		gap: 10px;
		align-items: baseline;
		line-height: 1.7;
		padding: 10px 0;
		border-bottom: 1px solid color-mix(in srgb, var(--color-border) 50%, transparent);
	}

	.translation-note-entry:last-child {
		border-bottom: none;
	}

	.odr-editorial-notes {
		margin-top: 4px;
	}

	.editorial-note {
		opacity: 0.78;
	}

	.editorial-note .verse-section-header-sticky {
		color: var(--color-subtle);
	}

	.editorial-panel-marker {
		color: var(--color-subtle);
		font-size: 16px;
	}

	.editorial-tag {
		display: inline-block;
		font-size: 10px;
		letter-spacing: 0.07em;
		text-transform: uppercase;
		color: var(--color-muted, #888);
		border: 1px solid color-mix(in srgb, var(--color-border) 70%, transparent);
		border-radius: 3px;
		padding: 1px 5px;
		margin-left: 6px;
		vertical-align: middle;
	}

	.note-body {
		min-width: 0;
	}

	/* ─── Translation prose ────────────────────────────────────── */
	.prose-para {
		font-family: var(--font-reader);
		font-size: 16px;
		line-height: 1.83;
		color: var(--color-foreground);
		margin-bottom: 0.6em;
	}

	/* ─── Confraternity commentary sections ──────── */
	.conf-commentary-section .prose-para :global(b:first-child) {
		color: var(--color-accent-text);
		font-style: italic;
		display: block;
	}

	.conf-note-entry {
		display: flex;
		gap: 10px;
		padding: 10px 0;
		border-bottom: 1px solid var(--color-border);
	}

	.conf-note-entry:last-child {
		border-bottom: none;
	}

	.conf-commentary-section {
		padding: 12px 0;
		border-bottom: 1px solid var(--color-border);
	}

	.conf-commentary-section:last-child {
		border-bottom: none;
	}

	.conf-section-heading {
		font-size: 11px;
		font-weight: 600;
		color: var(--color-accent);
		margin: 0 0 8px;
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}

	/* ─── Verse-ref links (linkified references) ───── */
	.panel-root :global(.verse-ref) {
		color: var(--color-subtle);
		text-decoration: none;
		border-bottom: 1px solid color-mix(in srgb, var(--color-subtle) 40%, transparent);
		cursor: pointer;
	}

	.panel-root :global(.verse-ref:hover) {
		color: var(--color-accent);
		border-bottom-color: var(--color-accent);
	}

	/* ─── Reduced motion ───────────────────────────────────────── */
	@media (prefers-reduced-motion: reduce) {
		.verse-section {
			transition: none;
		}

		:global(.flash-highlight) {
			animation: none;
			background: color-mix(in srgb, var(--color-accent) 15%, transparent);
		}
	}

	/* ─── Mobile density overrides ─────────────────────────────── */
	@media (max-width: 767px) {
		.content-block {
			padding: 12px 16px;
		}

		.sub-section-inline {
			padding: 2px 12px;
		}

		.verse-section-header {
			padding: 8px 12px 4px;
		}

		.verse-section-header-sticky {
			padding-top: 10px;
			padding-bottom: 10px;
		}

		.annotation-block {
			padding: 4px 12px 8px;
		}

		.haydock-entry {
			padding: 6px 0;
		}

		.note-text {
			font-size: 13px;
		}

		.annotation-title {
			font-size: 12px;
			margin: 6px 0 5px;
		}
	}
</style>
