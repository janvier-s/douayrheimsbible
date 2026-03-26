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
		shouldLoadPrev,
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
	let loadingNext = false;
	let loadingPrev = false;

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
		if (loadingNext) return;
		const last = chapters[chapters.length - 1];
		const nextChNum = last.chapter.chapter + 1;
		if (nextChNum > last.totalChapters) return;
		if (hasChapter(last.bookMeta.slug, nextChNum)) return;

		loadingNext = true;
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
				onScroll();
			}
		} catch (e) {
			console.warn('Failed to load chapter:', e);
		} finally {
			loadingNext = false;
		}
	}

	async function loadPrevChapter() {
		if (loadingPrev || !enablePrevScroll) return;
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

		loadingPrev = true;
		const scrollY = window.scrollY;
		const oldHeight = document.documentElement.scrollHeight;
		try {
			const bookData = await loadBook(targetBookMeta.slug, fetch);
			bookDataMap = { ...bookDataMap, [targetBookMeta.slug]: bookData };
			const prevCh = getChapter(bookData, prevChNum);
			const totalChs = getChapterCount(bookData);
			if (prevCh) {
				loadedChapterKeys.add(`${targetBookMeta.slug}-${prevChNum}`);
				chapters = [
					{ bookMeta: targetBookMeta, chapter: prevCh, totalChapters: totalChs },
					...chapters
				];
				await tick();
				const newHeight = document.documentElement.scrollHeight;
				window.scrollTo(0, scrollY + (newHeight - oldHeight));
				observeHeadings();
				onScroll();
			}
		} catch (e) {
			console.warn('Failed to load chapter:', e);
		} finally {
			loadingPrev = false;
		}
	}

	$: last = chapters[chapters.length - 1];

	let scrollReady = false;
	let scrollRaf = 0;

	function onScrollCheck() {
		if (!browser || !$prefs.infiniteScroll || !scrollReady) return;
		const { scrollY, innerHeight } = window;
		const docHeight = document.documentElement.scrollHeight;
		if (shouldLoadNext(scrollY, innerHeight, docHeight)) {
			loadNextChapter();
		} else if (shouldLoadPrev(scrollY)) {
			loadPrevChapter();
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
		scrollReady = true;
		onScrollCheck();
	});

	onDestroy(() => {
		observer?.disconnect();
		if (browser) {
			window.removeEventListener('scroll', onScroll);
			if (scrollRaf) cancelAnimationFrame(scrollRaf);
		}
	});
</script>

<svelte:window on:mousemove={resize.onMousemove} on:mouseup={resize.onMouseup} />

<div class="flex items-start" data-mode={$prefs.readingMode}>
	<main id="main-content" bind:this={container} class="flex-1 min-w-0 px-md pt-[20px] pb-xl">
		<div class="max-w-[750px] mx-auto">
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
						showNav={true}
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
		<!-- svelte-ignore a11y-no-static-element-interactions -->
		<div
			class="w-[5px] shrink-0 cursor-col-resize hover:bg-accent/20 transition-colors duration-fast self-stretch"
			on:mousedown={resize.onDividerMousedown}
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
