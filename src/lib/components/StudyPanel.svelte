<script lang="ts">
	import { tick, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { studyPanel, scrollTrigger } from '$lib/stores/studyPanel';
	import type { StudyTab } from '$lib/stores/studyPanel';
	import { readingPosition } from '$lib/stores/reading';
	import { prefs } from '$lib/stores/prefs';
	import {
		loadAnnotations,
		loadTranslationNotes,
		loadConfIntro,
		loadConfFootnotes,
		loadConfCommentary
	} from '$lib/data/loader';
	import type {
		BookData,
		ChapterAnnotations,
		AnnotationEntry,
		Verse,
		ConfChapterFootnotes,
		ConfChapterCommentary,
		ConfIntro
	} from '$lib/data/types';
	import type { TranslationNote } from '$lib/data/translation-types';
	import AnnotationProse from './AnnotationProse.svelte';
	import { allcapsToSmallcaps } from '$lib/utils/text';
	import CrossRefText from './CrossRefText.svelte';
	import VerseTooltip from './VerseTooltip.svelte';
	import { linkifyConfRefs, linkifyKnoxRefs, linkifyDrcRefs } from '$lib/search/crossRefParser';
	import { parseOsis } from '$lib/search/reference';
	import type { OsisRange } from '$lib/search/reference';
	import { getBookBySlug } from '$lib/data/books';
	import { TRANSLATIONS } from '$lib/stores/compare';

	export let bookData: BookData | null = null;
	export let translationId: string = 'odr';

	$: isOdr = translationId === 'odr';
	$: hasTranslationNotes =
		translationId === 'drc' || translationId === 'cpdv' || translationId === 'knox';
	$: isDrc = translationId === 'drc';
	$: isKnox = translationId === 'knox';
	$: hasLinkifiedNotes = isDrc || isKnox;
	$: hasTranslationIntro = translationId === 'conf';
	$: isConf = translationId === 'conf';
	$: translationMeta = TRANSLATIONS.find((t) => t.id === translationId);

	// ── Translation notes (DRC/CPDV) ────────────────────────────────
	// Follows the same pattern as the ODR annotation loader below.
	let translationNotes: TranslationNote[] | null = null;
	let translationNotesLoading = false;
	let lastTranslationNotesKey = '';

	$: {
		const key = `${translationId}/${currentBookSlug}/${currentChapterNum}`;
		if (!isOdr && hasTranslationNotes && currentBookSlug && key !== lastTranslationNotesKey) {
			lastTranslationNotesKey = key;
			const id = translationId;
			const slug = currentBookSlug;
			const chNum = currentChapterNum;
			translationNotesLoading = true;
			translationNotes = null;
			loadTranslationNotes(id, slug, chNum, fetch)
				.then((data) => {
					if (`${id}/${slug}/${chNum}` === lastTranslationNotesKey) {
						translationNotes = data;
						translationNotesLoading = false;
					}
				})
				.catch(() => {
					if (`${id}/${slug}/${chNum}` === lastTranslationNotesKey) {
						translationNotesLoading = false;
					}
				});
		}
	}

	// ── Confraternity intro ─────────────────────────────────────────
	let confIntro: ConfIntro | null = null;
	let lastConfIntroSlug = '';

	$: {
		if (!isOdr && hasTranslationIntro && currentBookSlug && currentBookSlug !== lastConfIntroSlug) {
			lastConfIntroSlug = currentBookSlug;
			const slug = currentBookSlug;
			confIntro = null;
			loadConfIntro(slug, fetch).then((data) => {
				if (slug === lastConfIntroSlug) {
					confIntro = data;
				}
			});
		}
	}

	// ── Confraternity footnotes ───────────────────────────────────
	let confFootnotes: ConfChapterFootnotes | null = null;
	let confFootnotesLoading = false;
	let lastConfFootnotesKey = '';

	$: if (isConf && currentBookSlug && currentChapterNum) {
		const key = `${currentBookSlug}/${currentChapterNum}`;
		if (key !== lastConfFootnotesKey) {
			lastConfFootnotesKey = key;
			confFootnotesLoading = true;
			confFootnotes = null;
			loadConfFootnotes(currentBookSlug, currentChapterNum, fetch).then((data) => {
				if (key === lastConfFootnotesKey) {
					confFootnotes = data;
					confFootnotesLoading = false;
				}
			});
		}
	}

	// ── Confraternity commentary ──────────────────────────────────
	let confCommentary: ConfChapterCommentary | null = null;
	let confCommentaryLoading = false;
	let lastConfCommentaryKey = '';

	$: if (isConf && currentBookSlug && currentChapterNum) {
		const key = `${currentBookSlug}/${currentChapterNum}`;
		if (key !== lastConfCommentaryKey) {
			lastConfCommentaryKey = key;
			confCommentaryLoading = true;
			confCommentary = null;
			loadConfCommentary(currentBookSlug, currentChapterNum, fetch).then((data) => {
				if (key === lastConfCommentaryKey) {
					confCommentary = data;
					confCommentaryLoading = false;
				}
			});
		}
	}

	function tabLabel(title: string): string {
		if (/argument.*in general/i.test(title)) return 'General';
		if (/argument/i.test(title)) return 'Argument';
		if (/sum.*old/i.test(title)) return 'Sum (OT)';
		if (/sum.*new/i.test(title)) return 'Sum (NT)';
		if (/sum/i.test(title)) return 'Sum';
		if (/moyses|moses/i.test(title)) return 'Of Moyses';
		if (/recapitulation/i.test(title)) return 'Recapitulation';
		if (/continuance.*church/i.test(title)) return 'Continuance';
		if (/augustin/i.test(title)) return 'S. Augustin';
		if (/end of the acts/i.test(title)) return 'End of Acts';
		if (/other apostles/i.test(title)) return 'The Other Apostles';
		if (/proemial/i.test(title)) return 'Proemial';
		if (/interpretation.*scripture/i.test(title)) return 'Interpretation';
		if (/annotations.*concerning/i.test(title)) return 'Annotations';
		if (/prologue/i.test(title)) return 'Prologue';
		if (/sapiential/i.test(title)) return 'Sapiential Books';
		if (/prophetical/i.test(title)) return 'Prophetical Books';
		if (/twelve less/i.test(title)) return 'Twelve Prophets';
		if (/machabees.*historical/i.test(title)) return 'Machabees';
		if (/epistle.*hebrews/i.test(title)) return 'Epistle';
		if (/third book.*esdras/i.test(title)) return '3 Esdras';
		if (/prophecy of/i.test(title)) return 'Prophecy';
		if (/remonstrance/i.test(title)) return 'Remonstrance';
		if (/general annotations/i.test(title)) return 'Annotations';
		if (/brief note/i.test(title)) return 'Note';
		if (/parables/i.test(title)) return 'Parables';
		if (/declaration/i.test(title)) return 'Declaration';
		if (/annotations upon/i.test(title)) return 'Annotations';
		if (/catholic epistle/i.test(title)) return 'Catholic Epistles';
		if (/sum.*gospels/i.test(title)) return 'Sum (Gospels)';
		return title
			.replace(/^the\s+/i, '')
			.split(/\s+/)
			.slice(0, 2)
			.join(' ');
	}

	$: intros = bookData?.intros ?? [];
	$: hasIntros = intros.length > 0;
	$: endMatters = bookData?.endMatters ?? [];
	$: hasEndMatters = endMatters.length > 0;

	type TabDef = { id: StudyTab; label: string };

	$: visibleTabs = buildVisibleTabs(translationId, hasIntros, hasArticles, hasEndMatters, confIntro);
	$: showTabBar = visibleTabs.length > 1;
	$: sliderIndex = Math.max(0, visibleTabs.findIndex((t) => t.id === $studyPanel.activeTab));

	function buildVisibleTabs(
		tid: string,
		hasIntros: boolean,
		hasArticles: boolean,
		hasEndMatters: boolean,
		confIntro: ConfIntro | null
	): TabDef[] {
		if (tid === 'odr') {
			return [
				...(hasIntros ? [{ id: 'intro' as StudyTab, label: 'Intro' }] : []),
				{ id: 'annotations' as StudyTab, label: 'Annotations' },
				{ id: 'notes' as StudyTab, label: 'Notes' },
				{ id: 'cross-refs' as StudyTab, label: 'Cross-Refs' },
				...(hasArticles ? [{ id: 'article' as StudyTab, label: 'Article' }] : []),
				...(hasEndMatters ? [{ id: 'end' as StudyTab, label: 'End' }] : []),
			];
		}
		if (tid === 'conf') {
			const tabs: TabDef[] = [];
			if (confIntro && (confIntro.bibleIntro.length > 0 || confIntro.commentaryIntro.length > 0)) {
				tabs.push({ id: 'intro', label: 'Intro' });
			}
			tabs.push({ id: 'footnotes', label: 'Footnotes' });
			tabs.push({ id: 'commentary', label: 'Commentary' });
			return tabs;
		}
		if (tid === 'drc' || tid === 'cpdv' || tid === 'knox') {
			return [{ id: 'notes', label: 'Notes' }];
		}
		return [];
	}

	// When book changes, set the active tab based on user preference and intro availability
	// Track bookData identity so this only fires on book navigation, not on sub-tab clicks
	let prevBook: string | null = null;
	$: if (bookData && bookData.book !== prevBook) {
		prevBook = bookData.book; // eslint-disable-line no-useless-assignment
		const preferred = $prefs.studyDefaultTab;

		let defaultTab: StudyTab;
		if (translationId === 'odr') {
			defaultTab = 'annotations';
			if (preferred === 'annotations' || preferred === 'notes' || preferred === 'cross-refs') {
				defaultTab = preferred;
			}
			if (preferred === 'intro' && hasIntros) defaultTab = 'intro';
			if (preferred === 'article' && hasArticles) defaultTab = 'article';
			if (preferred === 'end' && hasEndMatters) defaultTab = 'end';
		} else if (translationId === 'conf') {
			defaultTab = 'footnotes';
			if (preferred === 'footnotes' || preferred === 'commentary') {
				defaultTab = preferred;
			}
			if (
				preferred === 'intro' &&
				confIntro &&
				(confIntro.bibleIntro.length > 0 || confIntro.commentaryIntro.length > 0)
			) {
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

	// If on the article tab but current chapter has no articles, fall back to annotations/commentary
	$: if ($studyPanel.activeTab === 'article' && !hasArticles) {
		studyPanel.update((s) => ({ ...s, activeTab: isOdr ? 'annotations' : 'commentary' }));
	}

	function switchTab(tab: StudyTab) {
		studyPanel.update((s) => ({ ...s, activeTab: tab }));
		prefs.update((p) => ({ ...p, studyDefaultTab: tab }));
	}

	// ── Current chapter data ─────────────────────────────────────────

	$: currentChapterNum = $readingPosition?.chapter ?? 1;
	$: currentBookSlug = $readingPosition?.bookSlug ?? '';
	$: currentChapterData = bookData?.chapters.find((c) => c.chapter === currentChapterNum);
	$: articles = currentChapterData?.articles ?? [];
	$: hasArticles = articles.length > 0; // eslint-disable-line no-useless-assignment

	// ── Annotation sidecar loading ───────────────────────────────────

	let annotations: ChapterAnnotations | null = null;
	let annotationsLoading = false;
	let lastAnnotationKey = '';

	$: {
		const key = `${currentBookSlug}/${currentChapterNum}`;
		if (key !== lastAnnotationKey && currentBookSlug) {
			lastAnnotationKey = key;
			// Capture these NOW, before any async gap
			const slug = currentBookSlug;
			const chNum = currentChapterNum;
			// Reset scroll instantly; the CSS slide-up animation handles the smooth transition
			if (browser && panelScroll) panelScroll.scrollTop = 0;
			sectionEls = {};
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
	}

	// ── Build verse sections for the commentary tab ──────────────────

	interface VerseSection {
		verse: number;
		label: string;
		verseData: Verse | null;
		annotationEntries: AnnotationEntry[];
	}

	$: verseSections = buildVerseSections(currentChapterData, annotations);

	function buildVerseSections(
		chapter: typeof currentChapterData,
		anns: ChapterAnnotations | null
	): VerseSection[] {
		if (!chapter) return [];
		// Guard against stale annotations from a previously-visited chapter
		const safeAnns = anns?.chapter === chapter.chapter ? anns : null;
		const sections: VerseSection[] = [];

		// Verse 0 is a summary continuation — merge its notes into the Summary section
		const verse0 = chapter.verses.find((v) => v.verse === 0);
		const hasSummaryNotes = chapter.summary_notes && chapter.summary_notes.length > 0;
		const hasVerse0Content =
			verse0 &&
			((verse0.notes && verse0.notes.length > 0) ||
				(verse0.cross_refs && verse0.cross_refs.length > 0));

		if (hasSummaryNotes || hasVerse0Content) {
			sections.push({
				verse: 0,
				label: 'Summary',
				verseData: verse0 ?? null,
				annotationEntries: []
			});
		}

		// Verse sections (skip verse 0 — handled above)
		for (const v of chapter.verses) {
			if (v.verse === 0) continue;
			const hasCrossRefs = v.cross_refs && v.cross_refs.length > 0;
			const hasNotes = v.notes && v.notes.length > 0;
			const annEntries = safeAnns?.annotations.filter((a) => a.verse === v.verse) ?? [];
			const hasAnnotations = v.has_annotation && annEntries.length > 0;

			if (hasCrossRefs || hasNotes || hasAnnotations) {
				sections.push({
					verse: v.verse,
					label: `Verse ${v.verse}`,
					verseData: v,
					annotationEntries: annEntries
				});
			}
		}

		return sections;
	}

	// ── Synced scroll ────────────────────────────────────────────────

	let panelScroll: HTMLElement;
	let sectionEls: Record<number, HTMLElement> = {};
	let programmaticScroll = false;
	let programmaticScrollTimer: ReturnType<typeof setTimeout> | null = null;
	let panelSectionObserver: IntersectionObserver | null = null;
	const intersectingVerses = new Map<number, number>();
	// Debounce timer for annotatedVerse: we update panelScrollVerse immediately
	// (so the reader follows while you scroll), but only commit annotatedVerse
	// (which shows the verse underline) after the user has settled for 400ms.
	let annotatedVerseTimer: ReturnType<typeof setTimeout> | null = null;

	// (chapter-change scroll + sectionEls reset handled inside annotation loading reactive)

	// Reader→panel auto-scroll disabled (too many edge cases with infinite scroll).
	// Explicit clicks (scrollTrigger) still scroll the panel.

	// Clear sectionEls on tab switch
	let lastActiveTab: StudyTab | null = null;
	$: if ($studyPanel.activeTab !== lastActiveTab) {
		lastActiveTab = $studyPanel.activeTab;
		sectionEls = {};
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

	function setupPanelObserver() {
		panelSectionObserver?.disconnect();
		panelSectionObserver = null;
		intersectingVerses.clear();
		if (annotatedVerseTimer) {
			clearTimeout(annotatedVerseTimer);
			annotatedVerseTimer = null;
		}
		if (!browser || !panelScroll || !$prefs.annotationSync || $prefs.readingMode !== 'study')
			return;
		panelSectionObserver = new IntersectionObserver(
			(entries) => {
				if (programmaticScroll) return;
				for (const entry of entries) {
					const verse = parseInt((entry.target as HTMLElement).dataset.sectionVerse ?? '-1');
					if (verse < 0) continue;
					if (entry.isIntersecting) {
						intersectingVerses.set(verse, entry.boundingClientRect.top);
					} else {
						intersectingVerses.delete(verse);
					}
				}
				if (intersectingVerses.size > 0) {
					// Filter out verse 0 (Summary) — it has no reader element so syncing to it skips verse 1
					const candidates = [...intersectingVerses.entries()].filter(([v]) => v > 0);
					if (candidates.length === 0) return;
					const active = candidates.sort((a, b) => a[1] - b[1])[0][0];
					// Immediate: drive reader scroll to follow the panel
					studyPanel.update((s) => ({ ...s, panelScrollVerse: active }));
					// Debounced: only underline the verse after the user has settled (400ms).
					// This prevents the underline jumping to verses you scroll past.
					if (annotatedVerseTimer) clearTimeout(annotatedVerseTimer);
					annotatedVerseTimer = setTimeout(() => {
						studyPanel.update((s) => ({ ...s, annotatedVerse: active }));
					}, 400);
				}
			},
			{ root: panelScroll, rootMargin: '0px 0px -55% 0px', threshold: 0 }
		);
		for (const key of Object.keys(sectionEls)) {
			const el = sectionEls[parseInt(key)];
			if (el) panelSectionObserver.observe(el);
		}
	}

	$: if (verseSections && browser) {
		tick().then(setupPanelObserver);
	}
	$: if ($studyPanel.activeTab && browser) {
		tick().then(setupPanelObserver);
	}
	$: if (browser && !$prefs.annotationSync) {
		panelSectionObserver?.disconnect();
		panelSectionObserver = null;
	}
	$: if (browser && $prefs.readingMode !== 'study') {
		panelSectionObserver?.disconnect();
		panelSectionObserver = null;
	}

	// ── ScrollTrigger consumption ────────────────────────────────────

	$: if ($scrollTrigger && panelScroll) {
		handleScrollTrigger($scrollTrigger);
	}

	async function handleScrollTrigger(
		trigger: NonNullable<import('$lib/stores/studyPanel').ScrollTrigger>
	) {
		// Determine which tab the trigger should route to
		let targetTab: StudyTab;
		if (!isOdr) {
			// Non-ODR translations don't have separate tabs for these
			targetTab = $studyPanel.activeTab;
		} else if (trigger.type === 'cross_ref') {
			targetTab = 'cross-refs';
		} else if (trigger.type === 'note') {
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
	$: if (panelScroll && browser) attachWheelHandler(panelScroll);

	// ── Conf verse-ref tooltip state ────────────────────────────────
	let confVerseRefs: OsisRange[] = [];
	let confVerseRefAnchor: HTMLElement | null = null;
	let confVerseRefVisible = false;
	let confVerseRefTimer: ReturnType<typeof setTimeout> | null = null;

	function handleConfRefOver(e: Event) {
		const vref = (e.target as HTMLElement).closest('.verse-ref') as HTMLElement | null;
		if (!vref) return;
		if (confVerseRefTimer) clearTimeout(confVerseRefTimer);
		const osis = vref.dataset.osis ?? '';
		const refs = osis.split(',').flatMap((s) => {
			const r = parseOsis(s.trim());
			return r ? [r] : [];
		});
		if (refs.length > 0) {
			confVerseRefs = refs;
			confVerseRefAnchor = vref;
			confVerseRefVisible = true;
		}
	}

	function handleConfRefOut(e: Event) {
		const vref = (e.target as HTMLElement).closest('.verse-ref') as HTMLElement | null;
		if (vref) {
			confVerseRefTimer = setTimeout(() => {
				confVerseRefVisible = false;
				confVerseRefAnchor = null;
			}, 120);
		}
	}

	onDestroy(() => {
		panelSectionObserver?.disconnect();
		if (programmaticScrollTimer) clearTimeout(programmaticScrollTimer);
		if (annotatedVerseTimer) clearTimeout(annotatedVerseTimer);
		if (confVerseRefTimer) clearTimeout(confVerseRefTimer);
		wheelCleanup?.();
	});
</script>

<aside
	class="panel-root h-full overflow-hidden border-l border-border bg-panel flex flex-col font-ui"
	aria-label="Study panel"
>
	<!-- Panel identity bar -->
	<div class="panel-header shrink-0 flex flex-col">
		<div class="flex items-center justify-center px-[14px] pt-[11px] pb-[10px]">
			<span class="panel-title">Study Notes</span>
		</div>

		<!-- Tabs with sliding underline -->
		{#if showTabBar}
			<div
				class="tab-row relative flex px-[4px] gap-[2px]"
				role="tablist"
				aria-label="Study panel sections"
			>
				{#each visibleTabs as tab}
					<button
						role="tab"
						aria-selected={$studyPanel.activeTab === tab.id}
						class="tab-btn flex-1 pb-[9px] pt-[2px]"
						class:tab-active={$studyPanel.activeTab === tab.id}
						on:click={() => switchTab(tab.id)}
					>
						{tab.label}
					</button>
				{/each}
				<!-- Single sliding underline -->
				<div
					class="tab-slider"
					style="width: calc({100 /
						visibleTabs.length}% - 4px); transform: translateX({sliderIndex * 100}%)"
					aria-hidden="true"
				></div>
			</div>
		{/if}

		<div class="border-b border-border"></div>
	</div>

	<!-- Sub-tab segmented controls (outside scroll — applies to any translation) -->
	{#if $studyPanel.activeTab === 'intro' && isOdr && intros.length > 1}
		<div class="subtab-bar shrink-0">
			<div class="segmented-control" style="grid-template-columns: repeat({intros.length}, 1fr)">
				{#each intros as intro, i}
					<button
						class="seg-btn"
						class:seg-active={$studyPanel.activeIntroIndex === i}
						on:click={() => studyPanel.update((s) => ({ ...s, activeIntroIndex: i }))}
					>
						{tabLabel(intro.title)}
					</button>
				{/each}
				<div
					class="seg-slider"
					style="width: {100 / intros.length}%; transform: translateX({$studyPanel.activeIntroIndex * 100}%)"
					aria-hidden="true"
				></div>
			</div>
		</div>
	{:else if $studyPanel.activeTab === 'intro' && isConf && confIntro}
		<div class="subtab-bar shrink-0">
			<div class="segmented-control" style="grid-template-columns: repeat(2, 1fr)">
				<button
					class="seg-btn"
					class:seg-active={$studyPanel.activeConfIntroTab === 'bible'}
					on:click={() => studyPanel.update((s) => ({ ...s, activeConfIntroTab: 'bible' }))}
				>
					Confraternity Bible
				</button>
				<button
					class="seg-btn"
					class:seg-active={$studyPanel.activeConfIntroTab === 'commentary'}
					on:click={() => studyPanel.update((s) => ({ ...s, activeConfIntroTab: 'commentary' }))}
				>
					Supplemental Commentary
				</button>
				<div
					class="seg-slider"
					style="width: 50%; transform: translateX({$studyPanel.activeConfIntroTab === 'bible' ? 0 : 100}%)"
					aria-hidden="true"
				></div>
			</div>
		</div>
	{:else if $studyPanel.activeTab === 'article' && isOdr && articles.length > 1}
		<div class="subtab-bar shrink-0">
			<div class="segmented-control" style="grid-template-columns: repeat({articles.length}, 1fr)">
				{#each articles as art, i}
					<button
						class="seg-btn"
						class:seg-active={$studyPanel.activeArticleIndex === i}
						on:click={() => studyPanel.update((s) => ({ ...s, activeArticleIndex: i }))}
					>
						{tabLabel(art.title)}
					</button>
				{/each}
				<div
					class="seg-slider"
					style="width: {100 / articles.length}%; transform: translateX({$studyPanel.activeArticleIndex * 100}%)"
					aria-hidden="true"
				></div>
			</div>
		</div>
	{:else if $studyPanel.activeTab === 'end' && isOdr && endMatters.length > 1}
		<div class="subtab-bar shrink-0">
			<div class="segmented-control" style="grid-template-columns: repeat({endMatters.length}, 1fr)">
				{#each endMatters as em, i}
					<button
						class="seg-btn"
						class:seg-active={$studyPanel.activeEndIndex === i}
						on:click={() => studyPanel.update((s) => ({ ...s, activeEndIndex: i }))}
					>
						{tabLabel(em.title)}
					</button>
				{/each}
				<div
					class="seg-slider"
					style="width: {100 / endMatters.length}%; transform: translateX({$studyPanel.activeEndIndex * 100}%)"
					aria-hidden="true"
				></div>
			</div>
		</div>
	{/if}

	<!-- Scrollable content area -->
	<!-- svelte-ignore a11y-no-static-element-interactions a11y-mouse-events-have-key-events -->
	<div
		class="panel-scroll flex-1 overflow-y-scroll"
		bind:this={panelScroll}
		on:mouseover={hasLinkifiedNotes || isConf ? handleConfRefOver : undefined}
		on:mouseout={hasLinkifiedNotes || isConf ? handleConfRefOut : undefined}
	>
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
							href="/reference/{bookMeta?.testament === 'NT' ? 'nt' : 'ot'}/title-page"
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
					<AnnotationProse text={intro.text} notes={intro.notes ?? []} />
				</div>
			{/if}

		<!-- ═══ ODR: Annotations tab ═══ -->
		{:else if $studyPanel.activeTab === 'annotations' && isOdr}
			{#if annotationsLoading}
				<div class="empty-state"><p>Loading annotations...</p></div>
			{:else}
				{@const annotationSections = verseSections.filter((s) => s.annotationEntries.length > 0)}
				{#if annotationSections.length === 0}
					<div class="empty-state">
						<span class="empty-icon" aria-hidden="true">✦</span>
						<p>No annotations for this chapter yet.</p>
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
								<div
									class="verse-section-header"
									class:verse-section-header-sticky={section.verse !== 0}
								>
									{section.label}
								</div>
								{#each section.annotationEntries as ann}
									<div
										class="annotation-block"
										data-panel-id="panel-{section.verse}-annotation-{ann.part}"
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
				{#if noteSections.length === 0}
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
								<div
									class="verse-section-header"
									class:verse-section-header-sticky={section.verse !== 0}
								>
									{section.label}
								</div>

								{#if section.verse === 0 && currentChapterData?.summary_notes}
									{#each currentChapterData.summary_notes as sn}
										<div class="note-row sub-section-inline" data-panel-id="panel-0-note-{sn.marker}">
											<span class="note-marker">{sn.marker}</span>
											<span class="note-text">{@html allcapsToSmallcaps(sn.text)}</span>
										</div>
									{/each}
								{/if}

								{#if section.verseData?.notes && section.verseData.notes.length > 0}
									{#each section.verseData.notes as note}
										<div class="note-row sub-section-inline" data-panel-id="panel-{section.verse}-note-{note.label}">
											<span class="note-marker">{note.label}</span>
											<span class="note-text">{@html allcapsToSmallcaps(note.text)}</span>
										</div>
									{/each}
								{/if}
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
								<div class="verse-section-header verse-section-header-sticky">
									{section.label}
								</div>
								{#each (section.verseData?.cross_refs ?? []) as cr, ci}
									<div class="cr-row sub-section-inline" data-panel-id="panel-{section.verse}-cross_ref-{ci + 1}">
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
					<AnnotationProse text={art.text} notes={art.notes ?? []} />
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
					<AnnotationProse text={em.text} notes={em.notes ?? []} />
				</div>
			{/if}

		<!-- ═══ Confraternity: Intro tab ═══ -->
		{:else if $studyPanel.activeTab === 'intro' && isConf && confIntro}
			<div class="content-block">
				{#if $studyPanel.activeConfIntroTab === 'bible'}
					<p class="content-eyebrow">Introduction · Confraternity Bible</p>
					{#each confIntro.bibleIntro as para}
						<p class="prose-para">{@html linkifyConfRefs(para)}</p>
					{/each}
				{:else}
					<p class="content-eyebrow">Introduction · Supplemental Commentary</p>
					{#each confIntro.commentaryIntro as para}
						<p class="prose-para">{@html linkifyConfRefs(para)}</p>
					{/each}
				{/if}
			</div>

		<!-- ═══ Confraternity: Footnotes tab ═══ -->
		{:else if $studyPanel.activeTab === 'footnotes' && isConf}
			<div class="content-block">
				{#if confFootnotesLoading}
					<div class="empty-state"><p>Loading footnotes...</p></div>
				{:else if confFootnotes && confFootnotes.footnotes.length > 0}
					<p class="content-eyebrow">Bible Footnotes</p>
					{#each confFootnotes.footnotes as fn}
						<div class="conf-note-entry">
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
						<div class="conf-commentary-section">
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
						{@const linkify = isKnox ? linkifyKnoxRefs : isDrc ? linkifyDrcRefs : null}
						<div class="translation-note-entry">
							<span class="cr-marker">{note.verse}</span>
							<div class="note-body">
								{#if headingMatch}
									<p class="annotation-title">{headingMatch[1].replace(/^"|"$/g, '')}</p>
									{#if linkify}
										<span class="note-text">{@html linkify(note.text.slice(headingMatch[0].length))}</span>
									{:else}
										<span class="note-text">{note.text.slice(headingMatch[0].length)}</span>
									{/if}
								{:else if linkify}
									<span class="note-text">{@html linkify(note.text)}</span>
								{:else}
									<span class="note-text">{note.text}</span>
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

		<!-- ═══ Fallback: No study content ═══ -->
		{:else}
			<div class="empty-state">
				<span class="empty-icon" aria-hidden="true">✦</span>
				<p>
					No study notes available for {translationMeta?.abbr ?? translationId.toUpperCase()}.
				</p>
			</div>
		{/if}

		<!-- Verse-ref tooltip (for linkified notes) -->
		{#if hasLinkifiedNotes || isConf}
			<VerseTooltip
				{translationId}
				osisRanges={confVerseRefs}
				anchorEl={confVerseRefAnchor}
				visible={confVerseRefVisible}
				on:mouseenter={() => {
					if (confVerseRefTimer) clearTimeout(confVerseRefTimer);
				}}
				on:mouseleave={() => {
					confVerseRefTimer = setTimeout(() => {
						confVerseRefVisible = false;
						confVerseRefAnchor = null;
					}, 120);
				}}
			/>
		{/if}
	</div>
</aside>

<style>
	/* Gotham only has italic at 400/600 — use 500 (Medium) so
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

	/* ─── Tabs ──────────────────────────────────────── */
	.tab-row {
		position: relative;
	}

	.tab-btn {
		font-size: 12px;
		font-weight: 400;
		color: var(--color-subtle);
		background: none;
		border: none;
		cursor: pointer;
		letter-spacing: 0.02em;
		transition: color var(--duration-fast);
		font-family: var(--font-ui);
	}

	.tab-btn:hover {
		color: var(--color-text);
	}

	.tab-active {
		color: var(--color-accent);
	}

	.tab-slider {
		position: absolute;
		bottom: 0;
		left: 4px;
		height: 2px;
		border-radius: 1px 1px 0 0;
		background: var(--color-accent);
		transition: transform 200ms cubic-bezier(0.4, 0, 0.2, 1);
	}

	/* ─── Segmented control (sub-tabs) ─────────────── */
	.subtab-bar {
		display: flex;
		justify-content: center;
		padding: 8px 16px;
	}

	.segmented-control {
		display: inline-grid;
		border: 1px solid var(--color-border);
		border-radius: 6px;
		overflow: hidden;
		background: color-mix(in srgb, var(--color-foreground) 5%, var(--color-background));
		position: relative;
	}

	.seg-btn {
		grid-row: 1;
		font-size: 11px;
		font-weight: 500;
		color: var(--color-subtle);
		background: none;
		border: none;
		cursor: pointer;
		font-family: var(--font-ui);
		padding: 5px 16px;
		position: relative;
		z-index: 1;
		text-align: center;
		transition: color var(--duration-fast);
	}

	.seg-btn:hover {
		color: var(--color-text);
	}

	.seg-active {
		color: var(--color-accent);
	}

	.seg-slider {
		position: absolute;
		top: 0;
		bottom: 0;
		left: 0;
		background: color-mix(in srgb, var(--color-accent) 15%, transparent);
		transition: transform 200ms cubic-bezier(0.4, 0, 0.2, 1);
		pointer-events: none;
		grid-column: 1 / -1;
		grid-row: 1;
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
		animation: panelContentIn 400ms ease-out;
	}

	@keyframes panelContentIn {
		from {
			opacity: 0;
			transform: translateY(24px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.verse-section {
		border-bottom: 1px solid var(--color-border);
		padding: 0;
		transition: box-shadow 200ms ease;
	}

	.verse-section-active {
		box-shadow: inset 3px 0 0 var(--color-accent);
	}

	.verse-section-header {
		font-size: 10px;
		text-transform: uppercase;
		letter-spacing: 0.15em;
		color: var(--color-subtle);
		font-weight: 500;
		padding: 12px 52px 6px;
		user-select: none;
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

	.sub-section {
		padding: 4px 52px 12px;
	}

	.sub-section:last-child {
		padding-bottom: 17px;
	}

	.sub-section-inline {
		padding: 2px 52px;
	}

	.sub-section-header {
		font-size: 10px;
		text-transform: uppercase;
		letter-spacing: 0.15em;
		color: var(--color-subtle);
		margin-bottom: 6px;
	}

	/* Cross-references & Notes (shared layout) */
	.cr-row,
	.note-row {
		display: flex;
		gap: 7px;
		align-items: baseline;
		line-height: 1.45;
		padding: 2px 0;
	}

	.cr-marker,
	.note-marker {
		font-family: var(--font-ui);
		font-size: 10px;
		font-weight: 600;
		color: var(--color-accent-text);
		flex-shrink: 0;
		min-width: 18px;
	}

	.note-text {
		font-family: var(--font-reader);
		font-size: 15px;
	}

	/* Gotham Italic only exists at weight 400/600 — inherit panel weight (500)
	   so the browser selects the closest italic face (400) without synthesis. */
	.panel-root :global(i) {
		font-style: italic;
	}

	/* Annotations */
	.annotation-block {
		padding: 4px 0 8px;
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
		color: var(--color-accent-text);
		text-decoration: none;
		border-bottom: 1px solid color-mix(in srgb, var(--color-accent-text) 40%, transparent);
		cursor: pointer;
	}

	.panel-root :global(.verse-ref:hover) {
		color: var(--color-accent);
		border-bottom-color: var(--color-accent);
	}

	/* ─── Reduced motion ───────────────────────────────────────── */
	@media (prefers-reduced-motion: reduce) {
		.tab-slider {
			transition: none;
		}

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

		.sub-section {
			padding: 4px 12px 10px;
		}

		.sub-section:last-child {
			padding-bottom: 14px;
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

		.note-text {
			font-size: 13px;
		}

		.annotation-title {
			font-size: 12px;
			margin: 6px 0 5px;
		}
	}
</style>
