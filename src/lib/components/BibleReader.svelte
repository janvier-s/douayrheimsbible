<script lang="ts">
	import { onMount, onDestroy, tick } from 'svelte';
	import { browser } from '$app/environment';
	import { replaceState } from '$app/navigation';
	import ChapterView from './ChapterView.svelte';
	import { loadBook, getChapter, getChapterCount } from '$lib/data/loader';
	import { ALL_BOOKS } from '$lib/data/books';
	import { debounce } from '$lib/utils/debounce';
	import {
		shouldLoadNext,
		createChapterObserver,
		observeChapterHeadings
	} from '$lib/utils/infiniteScroll';
	import { prefs } from '$lib/stores/prefs';
	import { readingPosition } from '$lib/stores/reading';
	import { createPanelResize } from '$lib/utils/panelResize';
	import type { BookData, Chapter, BookMeta } from '$lib/data/types';
	import StudyPanel from './StudyPanel.svelte';
	import PageFooter from './PageFooter.svelte';

	export let initialBookMeta: BookMeta;
	export let initialChapter: Chapter;
	export let initialTotalChapters: number;
	export let targetVerse: number | undefined = undefined;
	export let enablePrevScroll: boolean = true;
	export let routeBase: string = '/odr';

	interface LoadedChapter {
		bookMeta: BookMeta;
		chapter: Chapter;
		totalChapters: number;
	}

	let chapters: LoadedChapter[] = [
		{
			bookMeta: initialBookMeta,
			chapter: initialChapter,
			totalChapters: initialTotalChapters
		}
	];

	let container: HTMLElement;
	// Single mutex — next and prev never run concurrently.
	// loadPrevChapter measures scrollHeight for compensation; a concurrent
	// loadNextChapter's tick() may not have flushed yet, leaving oldHeight stale
	// and causing scroll overshoot. Serializing all loads avoids this entirely.
	let loadingAny = false;

	// Study panel resize
	const resize = createPanelResize();
	let panelEl: HTMLElement;
	$: if (panelEl) resize.bindPanel(panelEl);

	let bookDataMap: Record<string, BookData> = {};
	$: currentBookData = bookDataMap[$readingPosition?.bookSlug ?? initialBookMeta.slug] ?? null;

	const updatePosition = debounce((slug: string, ch: number) => {
		replaceState(`${routeBase}/${slug}/${ch}`, {});
		readingPosition.set({ bookSlug: slug, chapter: ch, routeBase });
	}, 200);

	let observer: IntersectionObserver | null = null;

	function observeHeadings() {
		if (!observer) {
			observer = createChapterObserver((slug, ch) => updatePosition(slug, ch));
		}
		if (container) observeChapterHeadings(container, observer);
	}

	let loadedChapterKeys = new Set([`${initialBookMeta.slug}-${initialChapter.chapter}`]);

	function hasChapter(slug: string, ch: number): boolean {
		return loadedChapterKeys.has(`${slug}-${ch}`);
	}

	async function loadNextChapter() {
		if (loadingAny) return;
		const last = chapters[chapters.length - 1];
		const nextChNum = last.chapter.chapter + 1;
		if (nextChNum > last.totalChapters) return;
		if (hasChapter(last.bookMeta.slug, nextChNum)) return;

		loadingAny = true;
		try {
			const bookData = await loadBook(last.bookMeta.slug, fetch);
			bookDataMap = { ...bookDataMap, [last.bookMeta.slug]: bookData };
			const nextCh = getChapter(bookData, nextChNum);
			if (nextCh) {
				loadedChapterKeys.add(`${last.bookMeta.slug}-${nextChNum}`);
				chapters = [
					...chapters,
					{ bookMeta: last.bookMeta, chapter: nextCh, totalChapters: last.totalChapters }
				];
				await tick();
				observeHeadings();
			}
		} catch (e) {
			console.warn('Failed to load chapter:', e);
		} finally {
			loadingAny = false;
		}
		// Chain: after releasing the mutex, check if another load is needed.
		// The reactive alone can't do this — it fires mid-async (before tick),
		// sees loadingAny=true and bails. Explicit call here ensures the cascade
		// continues once the DOM is fully settled.
		checkRollingPreload();
	}

	async function loadPrevChapter() {
		if (loadingAny || !enablePrevScroll) return;
		const first = chapters[0];

		let targetBookMeta = first.bookMeta;
		let prevChNum = first.chapter.chapter - 1;

		if (prevChNum < 1) {
			const bookIndex = ALL_BOOKS.findIndex((b) => b.slug === first.bookMeta.slug);
			if (bookIndex <= 0) return;
			targetBookMeta = ALL_BOOKS[bookIndex - 1];
			prevChNum = targetBookMeta.chapters;
		}

		if (hasChapter(targetBookMeta.slug, prevChNum)) return;

		loadingAny = true;
		try {
			const bookData = await loadBook(targetBookMeta.slug, fetch);
			bookDataMap = { ...bookDataMap, [targetBookMeta.slug]: bookData };
			const prevCh = getChapter(bookData, prevChNum);
			const totalChs = getChapterCount(bookData);
			if (prevCh) {
				loadedChapterKeys.add(`${targetBookMeta.slug}-${prevChNum}`);
				// Measure immediately before DOM mutation — after tick() below,
				// newHeight - oldHeight equals exactly the prepended chapter's height.
				const scrollY = window.scrollY;
				const oldHeight = document.documentElement.scrollHeight;
				chapters = [
					{ bookMeta: targetBookMeta, chapter: prevCh, totalChapters: totalChs },
					...chapters
				];
				await tick();
				const newHeight = document.documentElement.scrollHeight;
				window.scrollTo({ top: scrollY + (newHeight - oldHeight), behavior: 'instant' });
				observeHeadings();
			}
		} catch (e) {
			console.warn('Failed to load chapter:', e);
		} finally {
			loadingAny = false;
		}
		// Chain: same reason as loadNextChapter above.
		checkRollingPreload();
	}

	$: last = chapters[chapters.length - 1];

	const COLUMN_WIDTHS = { narrow: 600, default: 750, wide: 920 };
	$: columnMaxWidth = COLUMN_WIDTHS[$prefs.columnWidth] ?? 750;

	let scrollReady = false;
	let scrollRaf = 0;
	let preloadTimer = 0;
	// Prevents checkRollingPreload from firing immediately after navigation.
	// Time-based (300ms) to outlast the layout's afterNavigate double-rAF (~33ms).
	let navCooldownUntil = 0;

	// Rolling pre-load: keep 2 chapters loaded ahead and 2 behind the current reading
	// position. Re-runs whenever readingPosition advances or a new chapter loads.
	// loadingNext / loadingPrev flags and hasChapter guard prevent duplicate fetches.
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
	$: ($readingPosition, chapters, checkRollingPreload());

	function onScrollCheck() {
		if (!browser || !$prefs.infiniteScroll || !scrollReady) return;
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
		readingPosition.set({
			bookSlug: initialBookMeta.slug,
			chapter: initialChapter.chapter,
			routeBase
		});
		observeHeadings();
		window.addEventListener('scroll', onScroll, { passive: true });
		try {
			const initialBook = await loadBook(initialBookMeta.slug, fetch);
			bookDataMap = { ...bookDataMap, [initialBookMeta.slug]: initialBook };
		} catch (e) {
			console.warn('Failed to preload book data:', e);
		}
		await tick();
		// Scroll to top before setting scrollReady so the layout's afterNavigate
		// double-rAF scrollTo(0) becomes a no-op (position unchanged → no scroll event).
		if (browser) window.scrollTo({ top: 0, behavior: 'instant' });
		// Block loadPrevChapter for 300ms — covers the ~33ms afterNavigate double-rAF
		// and any microtask/rAF jitter, while still allowing free infinite scroll up
		// once the page has settled.
		navCooldownUntil = Date.now() + 300;
		scrollReady = true;
		onScrollCheck(); // scroll-based check (mostly for shouldLoadNext near bottom)
		preloadTimer = setTimeout(() => checkRollingPreload(), 310); // kick off pre-load after cooldown expires
	});

	onDestroy(() => {
		observer?.disconnect();
		updatePosition.cancel();
		if (browser) {
			window.removeEventListener('scroll', onScroll);
			if (scrollRaf) cancelAnimationFrame(scrollRaf);
			if (preloadTimer) clearTimeout(preloadTimer);
		}
	});
</script>

<svelte:window on:mousemove={resize.onMousemove} on:mouseup={resize.onMouseup} />

<div class="flex items-start" data-mode={$prefs.readingMode}>
	<main id="main-content" bind:this={container} class="flex-1 min-w-0 px-md pt-[20px] pb-xl">
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
						headingLevel={i === 0 ? 'h1' : 'h2'}
					/>
				</section>
			{/each}
		</div>
	</main>

	<!-- Sticky panel container — overflow:clip on the sticky el itself, not an ancestor -->
	<div
		class="shrink-0 sticky flex [overflow:clip]"
		style="top: var(--header-height); height: calc(100vh - var(--header-height)); max-width: {$prefs.readingMode ===
		'study'
			? $prefs.studyPanelWidth
			: '0'}; opacity: {$prefs.readingMode === 'study'
			? '1'
			: '0'}; transition: max-width 250ms ease, opacity 250ms ease;"
	>
		<!-- svelte-ignore a11y_no_noninteractive_tabindex a11y_no_noninteractive_element_interactions -->
		<div
			role="separator"
			aria-orientation="vertical"
			aria-label="Resize study panel"
			tabindex="0"
			class="w-[5px] shrink-0 cursor-col-resize hover:bg-accent/20 focus:bg-accent/30 transition-colors duration-fast self-stretch outline-none"
			on:mousedown={resize.onDividerMousedown}
			on:touchstart={resize.onTouchStart}
			on:touchmove={resize.onTouchMove}
			on:touchend={resize.onTouchEnd}
			on:keydown={resize.onKeydown}
		></div>
		<div bind:this={panelEl} style="width: {$prefs.studyPanelWidth};" class="shrink-0 h-full">
			<StudyPanel bookData={currentBookData} />
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
