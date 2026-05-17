<script lang="ts">
	import { run, passive } from 'svelte/legacy';
	import { get } from 'svelte/store';

	import { onMount, onDestroy, tick } from 'svelte';
	import { browser } from '$app/environment';
	import { replaceState } from '$app/navigation';
	import ChapterView from './ChapterView.svelte';
	import { loadBook, getChapter, getCachedBook, loadTranslationBook } from '$lib/data/loader';
	import { getPrevNavBook } from '$lib/data/books';
	import type { Chapter as ChapterType } from '$lib/data/types';
	import { debounce } from '$lib/utils/debounce';
	import {
		shouldLoadNext,
		createChapterObserver,
		observeAllHeadings,
		observeNewHeading
	} from '$lib/utils/infiniteScroll';
	import { prefs } from '$lib/stores/prefs';
	import { readingPosition } from '$lib/stores/reading';
	import { studyPanel, scrollTrigger, readerSyncScrolling } from '$lib/stores/studyPanel';
	import type { StudyTab } from '$lib/stores/studyPanel';
	import { createPanelResize } from '$lib/utils/panelResize';
	import type { BookData, Chapter, BookMeta } from '$lib/data/types';
	import StudyPanel from './StudyPanel.svelte';
	import PageFooter from './PageFooter.svelte';
	import { isMobile } from '$lib/stores/mobile';

	interface Props {
		initialBookMeta: BookMeta;
		initialChapter: Chapter;
		initialTotalChapters: number;
		targetVerse?: number | undefined;
		enablePrevScroll?: boolean;
		routeBase?: string;
		translationId?: string;
		/** SSR-available book title for chapter 1 (e.g. "The Holy Gospel of Jesus Christ\naccording to John.").
		 *  Passed from the page load function to avoid a post-mount CLS when currentBookData resolves. */
		initialBookTitle?: string | null;
		/** SSR-available short title (e.g. "John"). Same rationale as initialBookTitle. */
		initialShortTitle?: string | null;
	}

	let {
		initialBookMeta,
		initialChapter,
		initialTotalChapters,
		targetVerse = undefined,
		enablePrevScroll = true,
		routeBase = '/odr',
		translationId = 'odr',
		initialBookTitle = null,
		initialShortTitle = null
	}: Props = $props();

	/** Load a chapter from the correct data source based on translationId */
	async function fetchChapter(
		slug: string,
		chapterNum: number
	): Promise<{ chapter: ChapterType | undefined; totalChapters: number }> {
		if (translationId === 'odr') {
			const bookData = await loadBook(slug, fetch);
			return {
				chapter: getChapter(bookData, chapterNum),
				totalChapters: bookData.chapters[bookData.chapters.length - 1].chapter
			};
		} else {
			const bookData = await loadTranslationBook(translationId, slug, fetch);
			const ch = bookData.chapters.find((c) => c.chapter === chapterNum);
			// TranslationChapter is structurally compatible with Chapter
			return {
				chapter: ch as ChapterType | undefined,
				totalChapters: bookData.chapters[bookData.chapters.length - 1].chapter
			};
		}
	}

	interface LoadedChapter {
		bookMeta: BookMeta;
		chapter: Chapter;
		totalChapters: number;
	}

	let chapters: LoadedChapter[] = $state([
		{
			bookMeta: initialBookMeta,
			chapter: initialChapter,
			totalChapters: initialTotalChapters
		}
	]);

	let container: HTMLElement | undefined = $state();
	// Single mutex — next and prev never run concurrently.
	// loadPrevChapter measures scrollHeight for compensation; a concurrent
	// loadNextChapter's tick() may not have flushed yet, leaving oldHeight stale
	// and causing scroll overshoot. Serializing all loads avoids this entirely.
	let loadingAny = false;

	// Study panel resize
	// liveWidth drives the outer container's max-width in real time.
	// panelDragging disables the max-width transition so the container
	// tracks the cursor with zero lag instead of chasing it with a 250ms ease.
	// The inner panel width is managed exclusively via direct DOM (resize utility)
	// to avoid Svelte's style binding overwriting the drag position on each
	// debounce tick ($prefs.studyPanelWidth updates every 200ms during drag).
	let liveWidth = $state('');
	let panelDragging = $state(false);
	let reducedMotion = $state(false);
	const resize = createPanelResize(
		(w) => (liveWidth = w),
		(d) => (panelDragging = d)
	);
	run(() => {
		if (!panelDragging) liveWidth = $prefs.studyPanelWidth;
	});
	let mobileStudyMode = $derived($isMobile && $prefs.readingMode === 'study');
	let mobilePanelOpen = $state(false);
	run(() => {
		if (!mobileStudyMode) mobilePanelOpen = false;
	});
	run(() => {
		if ($scrollTrigger !== null && mobileStudyMode) mobilePanelOpen = true;
	});
	let panelMaxWidth = $derived(
		$prefs.readingMode === 'study' ? ($isMobile ? '100%' : `calc(${liveWidth} + 16px)`) : '0'
	);
	let panelWidth = $derived(mobileStudyMode ? '100%' : '');
	let panelHeight = $derived(
		$isMobile
			? 'calc(100lvh - var(--header-height) - 56px - env(safe-area-inset-bottom, 0px))'
			: 'calc(100vh - var(--header-height))'
	);
	let panelTransition = $derived(
		reducedMotion
			? 'none'
			: panelDragging
				? 'opacity 250ms ease'
				: mobileStudyMode
					? 'transform 320ms cubic-bezier(0.32, 0.72, 0, 1), opacity 200ms ease'
					: $isMobile
						? 'opacity 150ms ease'
						: 'max-width 250ms ease, opacity 250ms ease'
	);
	let panelEl: HTMLElement | undefined = $state();
	run(() => {
		if (panelEl) resize.bindPanel(panelEl);
	});
	// Sync inner panel width when not dragging (initial render + settings changes).
	// During drag, the resize utility sets panelEl.style.width directly.
	run(() => {
		if (panelEl && !panelDragging && !$isMobile) panelEl.style.width = $prefs.studyPanelWidth;
	});
	run(() => {
		if (panelEl && $isMobile && $prefs.readingMode === 'study') panelEl.style.width = '100%';
	});

	// Re-evaluated whenever readingPosition changes (slug or chapter switch).
	// After the initial loadBook in onMount, we assign directly to pick up the data.
	let currentBookData: BookData | null = $state(null);
	run(() => {
		const slug = $readingPosition?.bookSlug ?? initialBookMeta.slug;
		currentBookData = getCachedBook(slug);
	});

	const updatePosition = debounce((slug: string, ch: number) => {
		replaceState(`${routeBase}/${slug}/${ch}`, {});
		readingPosition.set({ bookSlug: slug, chapter: ch, routeBase });
	}, 200);

	let observer: IntersectionObserver | null = null;

	function ensureObserver(): IntersectionObserver {
		if (!observer) {
			observer = createChapterObserver(
				(slug, ch) => updatePosition(slug, ch),
				(slug, ch) => {
					// A chapter heading dropped below the 30% mark (scrolling up).
					// Activate the chapter that was loaded just before this one.
					const idx = chapters.findIndex(
						(c) => c.bookMeta.slug === slug && c.chapter.chapter === ch
					);
					if (idx > 0) {
						const prev = chapters[idx - 1];
						updatePosition(prev.bookMeta.slug, prev.chapter.chapter);
					}
				}
			);
		}
		return observer;
	}

	const MAX_CHAPTERS = 5;

	function hasChapter(slug: string, ch: number): boolean {
		return chapters.some((c) => c.bookMeta.slug === slug && c.chapter.chapter === ch);
	}

	/** Drop chapters from the front (above viewport). Compensate scroll. */
	async function pruneFront(count: number) {
		if (count <= 0 || !container) return;
		const sections = container.querySelectorAll(':scope > div > section');
		let removedHeight = 0;
		for (let i = 0; i < count && i < sections.length; i++) {
			removedHeight += sections[i].getBoundingClientRect().height;
		}
		// The new first section loses its pt-[49px] when it becomes index 0.
		if (count < sections.length) removedHeight += 49;

		const scrollY = window.scrollY;
		chapters = chapters.slice(count);
		await tick();
		if (!destroyed)
			window.scrollTo({ top: Math.max(0, scrollY - removedHeight), behavior: 'instant' });
	}

	/** Drop chapters from the back (oldest-loaded above viewport). No scroll compensation. */
	function pruneBack(count: number) {
		if (count <= 0) return;
		chapters = chapters.slice(0, chapters.length - count);
	}

	async function loadNextChapter() {
		if (loadingAny) return;
		const last = chapters[chapters.length - 1];
		const nextChNum = last.chapter.chapter + 1;
		if (nextChNum > last.totalChapters) return;
		if (hasChapter(last.bookMeta.slug, nextChNum)) return;

		loadingAny = true;
		try {
			const result = await fetchChapter(last.bookMeta.slug, nextChNum);
			if (result.chapter) {
				chapters = [
					...chapters,
					{ bookMeta: last.bookMeta, chapter: result.chapter, totalChapters: last.totalChapters }
				];
				await tick();
				observeNewHeading(container!, ensureObserver(), last.bookMeta.slug, nextChNum);
				// Prune chapters far above the viewport to cap DOM size.
				const excess = chapters.length - MAX_CHAPTERS;
				if (excess > 0) await pruneFront(excess);
			}
		} catch (e) {
			console.warn('Failed to load chapter:', e);
		} finally {
			loadingAny = false;
		}
		// Chain: after releasing the mutex, check if another load is needed.
		checkRollingPreload();
	}

	async function loadPrevChapter() {
		if (loadingAny || !enablePrevScroll) return;
		const first = chapters[0];

		let targetBookMeta = first.bookMeta;
		let prevChNum = first.chapter.chapter - 1;

		if (prevChNum < 1) {
			const prevBook = getPrevNavBook(first.bookMeta.slug);
			if (!prevBook) return;
			targetBookMeta = prevBook;
			prevChNum = targetBookMeta.chapters;
		}

		if (hasChapter(targetBookMeta.slug, prevChNum)) return;

		loadingAny = true;
		try {
			const result = await fetchChapter(targetBookMeta.slug, prevChNum);
			if (result.chapter) {
				// Measure immediately before DOM mutation — after tick() below,
				// newHeight - oldHeight equals exactly the prepended chapter's height.
				const scrollY = window.scrollY;
				const oldHeight = document.documentElement.scrollHeight;
				chapters = [
					{
						bookMeta: targetBookMeta,
						chapter: result.chapter,
						totalChapters: result.totalChapters
					},
					...chapters
				];
				await tick();
				const newHeight = document.documentElement.scrollHeight;
				if (!destroyed)
					window.scrollTo({ top: scrollY + (newHeight - oldHeight), behavior: 'instant' });
				observeNewHeading(container!, ensureObserver(), targetBookMeta.slug, prevChNum);
				// Prune chapters far below the viewport to cap DOM size.
				const excess = chapters.length - MAX_CHAPTERS;
				if (excess > 0) pruneBack(excess);
			}
		} catch (e) {
			console.warn('Failed to load chapter:', e);
		} finally {
			loadingAny = false;
		}
		// Chain: same reason as loadNextChapter above.
		checkRollingPreload();
	}

	let last = $derived(chapters[chapters.length - 1]);

	const COLUMN_WIDTHS = { narrow: 600, default: 750, wide: 920 };
	let columnMaxWidth = $derived(COLUMN_WIDTHS[$prefs.columnWidth] ?? 750);

	let destroyed = false;
	let scrollReady = false;
	let scrollRaf = 0;
	let preloadTimer: ReturnType<typeof setTimeout> | null = null;
	// Prevents checkRollingPreload from firing immediately after navigation.
	// Time-based (300ms) to outlast the layout's afterNavigate double-rAF (~33ms).
	let navCooldownUntil = 0;

	// Rolling pre-load: keep 2 chapters ahead and 2 behind the current reading
	// position. Reacts to readingPosition changes only — NOT chapters. The chain
	// call after each load's finally{} handles the "keep loading" cascade.
	function checkRollingPreload() {
		if (!browser || !$prefs.infiniteScroll || !scrollReady || !$readingPosition) return;
		if (Date.now() <= navCooldownUntil) return;
		const pos = $readingPosition;
		const idx = chapters.findIndex(
			(c) => c.bookMeta.slug === pos.bookSlug && c.chapter.chapter === pos.chapter
		);
		if (idx === -1) return;
		// Prioritise next; loadingAny mutex ensures only one runs at a time.
		// After each finishes it calls checkRollingPreload() to pick up the other.
		if (chapters.length - 1 - idx < 2) {
			loadNextChapter();
			return;
		}
		if (idx < 2) loadPrevChapter();
	}
	run(() => {
		$readingPosition;
		checkRollingPreload();
	});

	function onScrollCheck() {
		if (!browser || !$prefs.infiniteScroll || !scrollReady) return;
		if (get(readerSyncScrolling)) return;
		const { scrollY, innerHeight } = window;
		const docHeight = document.documentElement.scrollHeight;
		// Prev loading is handled entirely by checkRollingPreload (reactive on
		// readingPosition + chapters). Calling loadPrevChapter here too caused a
		// cascade: each prepend + scroll compensation triggers a new scroll event,
		// onScrollCheck sees scrollY < 400 again, and fires another loadPrevChapter.
		if (shouldLoadNext(scrollY, innerHeight, docHeight)) {
			loadNextChapter();
		}
	}

	function onScroll() {
		if (scrollRaf) return;
		scrollRaf = requestAnimationFrame(() => {
			scrollRaf = 0;
			onScrollCheck();
		});
	}

	onMount(async () => {
		const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
		reducedMotion = mq.matches;
		mq.addEventListener('change', (e) => (reducedMotion = e.matches));

		// ?mode=read or ?mode=study in the URL overrides the stored preference
		// ?tab=notes&v=5 opens a specific study panel tab and scrolls to a verse
		if (browser) {
			const params = new URLSearchParams(window.location.search);
			const urlMode = params.get('mode');
			if (urlMode === 'read') {
				prefs.update((p) => ({ ...p, readingMode: 'reading' }));
			} else if (urlMode === 'study') {
				prefs.update((p) => ({ ...p, readingMode: 'study' }));
			}
			const urlTab = params.get('tab');
			const urlVerse = params.get('v');
			if (urlTab || urlVerse !== null) {
				// tab/v params imply study mode
				prefs.update((p) => ({ ...p, readingMode: 'study' }));
			}
			if (urlTab) {
				const validTabs = [
					'intro',
					'commentary',
					'article',
					'end',
					'footnotes',
					'annotations',
					'notes',
					'cross-refs'
				];
				if (validTabs.includes(urlTab)) {
					studyPanel.update((s) => ({
						...s,
						activeTab: urlTab as StudyTab,
						tabSetByUrl: true
					}));
				}
			}
			if (urlVerse !== null) {
				const v = parseInt(urlVerse, 10);
				if (!isNaN(v) && v >= 0) {
					// Map the URL tab to a scroll trigger type so handleScrollTrigger
					// routes to the correct tab instead of defaulting to 'annotations'
					const triggerType =
						urlTab === 'cross-refs'
							? ('cross_ref' as const)
							: urlTab === 'notes'
								? ('note' as const)
								: urlTab === 'annotations'
									? ('annotation' as const)
									: undefined;
					// Delay slightly so the panel has time to render sections
					setTimeout(() => {
						studyPanel.update((s) => ({ ...s, annotatedVerse: v }));
						scrollTrigger.set({ verse: v, type: triggerType });
					}, 300);
				}
			}
		}

		// Keep study mode if explicitly selected (e.g. navigating from compare → study).
		// Only reset from compare, since BibleReader doesn't support compare mode.
		if ($prefs.readingMode !== 'study') {
			prefs.update((p) => ({ ...p, readingMode: 'reading' }));
		}
		readingPosition.set({
			bookSlug: initialBookMeta.slug,
			chapter: initialChapter.chapter,
			routeBase
		});
		observeAllHeadings(container!, ensureObserver());
		window.addEventListener('scroll', onScroll, { passive: true });
		if (translationId === 'odr') {
			try {
				await loadBook(initialBookMeta.slug, fetch);
				currentBookData = getCachedBook(initialBookMeta.slug);
			} catch (e) {
				console.warn('Failed to preload book data:', e);
			}
		}
		await tick();
		// Scroll to top before setting scrollReady so the layout's afterNavigate
		// double-rAF scrollTo(0) becomes a no-op (position unchanged → no scroll event).
		// Guard: skip if user has already scrolled (e.g. via homepage CTA) so we
		// don't cancel an in-flight smooth scroll.
		if (browser && window.scrollY === 0) window.scrollTo({ top: 0, behavior: 'instant' });
		// Block loadPrevChapter for 300ms — covers the ~33ms afterNavigate double-rAF
		// and any microtask/rAF jitter, while still allowing free infinite scroll up
		// once the page has settled.
		navCooldownUntil = Date.now() + 2000;
		scrollReady = true;
		// Delay preloading next chapters to avoid CLS. Only call onScrollCheck
		// (appends below viewport — no CLS). Skip checkRollingPreload here because
		// it would prepend previous chapters, causing a layout shift the browser
		// reports before our scroll compensation runs. Previous-chapter preload
		// kicks in naturally once the user scrolls and readingPosition changes.
		preloadTimer = setTimeout(() => {
			onScrollCheck();
		}, 2000);
	});

	onDestroy(() => {
		destroyed = true;
		observer?.disconnect();
		updatePosition.cancel();
		if (browser) {
			window.removeEventListener('scroll', onScroll);
			if (scrollRaf) cancelAnimationFrame(scrollRaf);
			if (preloadTimer) clearTimeout(preloadTimer);
		}
	});
</script>

<svelte:window onmousemove={resize.onMousemove} onmouseup={resize.onMouseup} />

<div class="flex items-start" data-mode={$prefs.readingMode}>
	<main
		id="main-content"
		bind:this={container}
		class="flex-1 min-w-0 px-md max-md:px-[8px] pt-[20px] pb-xl max-md:pb-[80px]"
	>
		<div style="max-width: {columnMaxWidth}px;" class="mx-auto">
			{#each chapters as item, i (item.bookMeta.slug + '-' + item.chapter.chapter)}
				<section class={i > 0 ? 'pt-[49px]' : ''}>
					<div
						data-chapter-heading
						data-book-slug={item.bookMeta.slug}
						data-chapter-num={item.chapter.chapter}
					></div>
					<ChapterView
						bookMeta={item.bookMeta}
						chapter={item.chapter}
						targetVerse={item.chapter.chapter === initialChapter.chapter ? targetVerse : undefined}
						totalChapters={item.totalChapters}
						showNav={$prefs.showChapterNav}
						{translationId}
						headingLevel={i === 0 ? 'h1' : 'h2'}
						bookTitle={item.chapter.chapter === 1
							? (currentBookData?.book_title ??
								(item.bookMeta.slug === initialBookMeta.slug ? initialBookTitle : undefined))
							: undefined}
						shortTitle={currentBookData?.short_title ??
							(item.bookMeta.slug === initialBookMeta.slug ? initialShortTitle : undefined)}
					/>
				</section>
			{/each}
		</div>
	</main>

	<!-- Sticky panel on desktop; fixed full-screen slide-up overlay on mobile -->
	<div
		class="shrink-0 flex [overflow:clip]"
		class:sticky={!mobileStudyMode}
		style:position={mobileStudyMode ? 'fixed' : undefined}
		style:top="var(--header-height)"
		style:bottom={mobileStudyMode ? 'calc(56px + env(safe-area-inset-bottom, 0px))' : undefined}
		style:left={mobileStudyMode ? '0' : undefined}
		style:right={mobileStudyMode ? '0' : undefined}
		style:z-index={mobileStudyMode ? '40' : undefined}
		style:pointer-events={mobileStudyMode && !mobilePanelOpen ? 'none' : undefined}
		style:transform={mobileStudyMode
			? mobilePanelOpen
				? 'translateY(0)'
				: 'translateY(100%)'
			: undefined}
		style:height={panelHeight}
		style:max-width={panelMaxWidth}
		style:width={panelWidth}
		style:opacity={$prefs.readingMode === 'study' ? '1' : '0'}
		style:transition={panelTransition}
	>
		<!-- svelte-ignore a11y_no_noninteractive_tabindex a11y_no_noninteractive_element_interactions -->
		<div
			role="separator"
			aria-orientation="vertical"
			aria-label="Resize study panel"
			aria-valuenow={parseInt($prefs.studyPanelWidth ?? '320')}
			aria-valuemin={240}
			aria-valuemax={640}
			tabindex="0"
			class="panel-resize-zone shrink-0 cursor-col-resize self-stretch outline-none max-md:hidden"
			onmousedown={resize.onDividerMousedown}
			use:passive={['touchstart', () => resize.onTouchStart as EventListener]}
			use:passive={['touchmove', () => resize.onTouchMove as EventListener]}
			use:passive={['touchend', () => resize.onTouchEnd]}
			onkeydown={resize.onKeydown}
		>
			<div class="panel-resize-bar">
				<div class="panel-resize-grip" aria-hidden="true">
					<span></span>
					<span></span>
				</div>
			</div>
		</div>
		<div bind:this={panelEl} class="shrink-0 h-full">
			<StudyPanel
				bookData={currentBookData}
				{translationId}
				onClose={mobileStudyMode ? () => (mobilePanelOpen = false) : null}
			/>
		</div>
	</div>
</div>

<PageFooter
	bookMeta={last.bookMeta}
	chapterNum={last.chapter.chapter}
	totalChapters={last.totalChapters}
	{routeBase}
	showNav={!$prefs.infiniteScroll}
/>

<style>
	/* Wide invisible hover zone for easy targeting */
	.panel-resize-zone {
		width: 16px;
		position: relative;
		z-index: 2;
	}

	/* The visible 1px bar, flush against the panel edge */
	.panel-resize-bar {
		position: absolute;
		top: 0;
		bottom: 0;
		right: 0;
		width: 1px;
		background: var(--color-border);
		display: flex;
		align-items: center;
		justify-content: center;
		transition:
			width 150ms ease,
			background-color 150ms ease;
	}

	/* On hover: widen bar toward the left */
	.panel-resize-zone:hover .panel-resize-bar,
	.panel-resize-zone:focus-visible .panel-resize-bar {
		width: 5px;
		background: color-mix(in srgb, var(--color-muted) 30%, transparent);
	}

	/* On drag: accent color */
	.panel-resize-zone:active .panel-resize-bar {
		width: 5px;
		background: color-mix(in srgb, var(--color-accent) 25%, transparent);
	}

	/* Grip indicator: two thin lines */
	.panel-resize-grip {
		display: flex;
		gap: 3px;
		opacity: 0;
		transition: opacity 150ms ease;
	}

	.panel-resize-grip span {
		display: block;
		width: 1.5px;
		height: 24px;
		border-radius: 1px;
		background: var(--color-muted);
	}

	.panel-resize-zone:hover .panel-resize-grip,
	.panel-resize-zone:focus-visible .panel-resize-grip {
		opacity: 1;
	}

	.panel-resize-zone:active .panel-resize-grip span {
		background: var(--color-accent);
	}
</style>
