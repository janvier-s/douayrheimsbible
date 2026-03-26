<script lang="ts">
	import { onMount, onDestroy, tick } from 'svelte';
	import { browser } from '$app/environment';
	import { replaceState } from '$app/navigation';
	import type { PageData } from './$types';
	import TopBar from '$lib/components/TopBar.svelte';
	import ChapterView from '$lib/components/ChapterView.svelte';
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
	import type { BookData, Chapter, BookMeta } from '$lib/data/types';
	import StudyPanel from '$lib/components/StudyPanel.svelte';
	import PageFooter from '$lib/components/PageFooter.svelte';

	export let data: PageData;

	interface LoadedChapter {
		bookMeta: BookMeta;
		chapter: Chapter;
		totalChapters: number;
	}

	let chapters: LoadedChapter[] = [
		{ bookMeta: data.bookMeta, chapter: data.chapter, totalChapters: data.totalChapters }
	];

	let container: HTMLElement;
	let currentBookSlug = data.bookMeta.slug;
	let currentChapterNum = data.chapter.chapter;
	let loadingNext = false;
	let loadingPrev = false;

	// Study panel resize
	let panelEl: HTMLElement;
	let isDragging = false;
	let dragStartX = 0;
	let dragStartWidth = 0;

	const savePanelWidth = debounce((w: string) => {
		prefs.update((p) => ({ ...p, studyPanelWidth: w }));
	}, 200);

	function onDividerMousedown(e: MouseEvent) {
		isDragging = true;
		dragStartX = e.clientX;
		dragStartWidth = panelEl.offsetWidth;
		e.preventDefault();
	}

	function onMousemove(e: MouseEvent) {
		if (!isDragging) return;
		const delta = dragStartX - e.clientX;
		const newWidth = Math.min(Math.max(dragStartWidth + delta, 240), window.innerWidth * 0.5);
		panelEl.style.width = `${newWidth}px`;
		savePanelWidth(`${newWidth}px`);
	}

	function onMouseup() {
		isDragging = false;
	}

	let bookDataMap: Record<string, BookData> = {};
	$: currentBookData = bookDataMap[currentBookSlug] ?? null;

	const updatePosition = debounce((slug: string, ch: number) => {
		if (slug !== currentBookSlug || ch !== currentChapterNum) {
			currentBookSlug = slug;
			currentChapterNum = ch;
		}
		replaceState(`/odr/${slug}/${ch}`, {});
		readingPosition.set({ bookSlug: slug, chapter: ch, routeBase: '/odr' });
	}, 200);

	let observer: IntersectionObserver | null = null;

	function observeHeadings() {
		if (!observer) {
			observer = createChapterObserver((slug, ch) => updatePosition(slug, ch));
		}
		if (container) observeChapterHeadings(container, observer);
	}

	function hasChapter(slug: string, ch: number): boolean {
		return chapters.some((c) => c.bookMeta.slug === slug && c.chapter.chapter === ch);
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
			bookDataMap[last.bookMeta.slug] = bookData;
			bookDataMap = { ...bookDataMap };
			const nextCh = getChapter(bookData, nextChNum);
			if (nextCh) {
				chapters = [
					...chapters,
					{ bookMeta: last.bookMeta, chapter: nextCh, totalChapters: last.totalChapters }
				];
				await tick();
				observeHeadings();
				onScroll();
			}
		} catch {
			// silently ignore
		} finally {
			loadingNext = false;
		}
	}

	async function loadPrevChapter() {
		if (loadingPrev) return;
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
			bookDataMap[targetBookMeta.slug] = bookData;
			bookDataMap = { ...bookDataMap };
			const prevCh = getChapter(bookData, prevChNum);
			const totalChs = getChapterCount(bookData);
			if (prevCh) {
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
		} catch {
			// silently ignore
		} finally {
			loadingPrev = false;
		}
	}

	$: last = chapters[chapters.length - 1];

	let scrollReady = false;

	function onScroll() {
		if (!browser || !$prefs.infiniteScroll || !scrollReady) return;
		const { scrollY, innerHeight } = window;
		const docHeight = document.documentElement.scrollHeight;
		if (shouldLoadNext(scrollY, innerHeight, docHeight)) {
			loadNextChapter();
		}
		// No loadPrevChapter on homepage — the hero sits above the reader,
		// and scrolling back before Genesis 1 is handled by returning to the hero.
	}

	onMount(async () => {
		readingPosition.set({
			bookSlug: data.bookMeta.slug,
			chapter: data.chapter.chapter,
			routeBase: '/odr'
		});
		observeHeadings();
		window.addEventListener('scroll', onScroll, { passive: true });
		try {
			const initialBook = await loadBook(data.bookMeta.slug, fetch);
			bookDataMap[data.bookMeta.slug] = initialBook;
			bookDataMap = { ...bookDataMap };
		} catch {
			/* silently ignore */
		}
		setTimeout(() => {
			scrollReady = true;
			onScroll();
		}, 600);
	});

	onDestroy(() => {
		observer?.disconnect();
		if (browser) window.removeEventListener('scroll', onScroll);
	});
</script>

<svelte:head>
	<title>The Douay-Rheims Bible — English Catholic Scripture, 1582–1610</title>
	<meta
		name="description"
		content="Read the Douay-Rheims Bible online — the first complete English Catholic translation from the Latin Vulgate, 1582–1610. Compare translations, search Scripture, and explore Challoner's annotations."
	/>
</svelte:head>

<svelte:window on:mousemove={onMousemove} on:mouseup={onMouseup} />

<!-- ═══════════ HERO ═══════════ -->
<section class="hero">
	<nav class="hero-nav">
		<a href="/" class="hero-logo">
			<span class="hero-logo-cross" aria-hidden="true">✠</span>
			<span class="hero-logo-text">Douay-Rheims</span>
		</a>
	</nav>

	<div class="hero-inner">
		<div class="hero-left">
			<p class="hero-eyebrow">
				<span aria-hidden="true">✠</span> English Catholic Scripture
			</p>

			<h1 class="hero-title">
				<span class="hero-title-the">The</span>
				<span class="hero-title-main">Douay-Rheims</span>
				<span class="hero-title-sub">Bible</span>
			</h1>

			<p class="hero-origin">Translated from the Latin Vulgate · 1582–1610</p>

			<p class="hero-desc">
				The first complete English Catholic translation of Sacred Scripture, rendered faithfully
				from the Latin Vulgate by English exiles at Douai and Rheims.
			</p>

			<button
				class="hero-cta"
				on:click={() => document.getElementById('reader')?.scrollIntoView({ behavior: 'smooth' })}
			>
				Read the Scriptures
				<span class="hero-cta-arrow" aria-hidden="true">↓</span>
			</button>
		</div>

		<div class="hero-right">
			<figure class="hero-figure">
				<img
					src="/images/dr-1582-rheims.webp"
					alt="Title page and opening of Matthew — Rheims New Testament, 1582"
					class="hero-img"
					loading="eager"
				/>
				<figcaption class="hero-caption">
					Rheims New Testament, 1582 ·<br />Title page &amp; The Holy Gospel of Iesus Christ
					According to Matthew
				</figcaption>
			</figure>
		</div>
	</div>

	<div class="hero-scroll-hint" aria-hidden="true">
		<span class="hero-scroll-line"></span>
	</div>
</section>

<!-- ═══════════ READER ═══════════ -->
<div id="reader">
	<TopBar bookSlug={currentBookSlug} chapterNum={String(currentChapterNum)} hasStudyMode={true} />

	<div class="flex items-start" data-mode={$prefs.readingMode}>
		<main bind:this={container} class="flex-1 min-w-0 px-md pt-[20px] pb-xl">
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
							targetVerse={undefined}
							totalChapters={item.totalChapters}
							showNav={true}
						/>
					</section>
				{/each}
			</div>
		</main>

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
				on:mousedown={onDividerMousedown}
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
		routeBase="/odr"
		showNav={!$prefs.infiniteScroll}
	/>
</div>

<style>
	/* ─── Hero ─── */
	.hero {
		position: relative;
		min-height: 100svh;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		background: var(--color-background);
	}

	.hero-nav {
		position: relative;
		z-index: 11;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 22px 48px;
		flex-shrink: 0;
	}

	.hero-logo {
		display: flex;
		align-items: center;
		gap: 8px;
		text-decoration: none;
	}

	.hero-logo-cross {
		font-size: 14px;
		color: var(--color-accent);
	}

	.hero-logo-text {
		font-family: var(--font-ui);
		font-size: 12px;
		text-transform: uppercase;
		letter-spacing: 0.22em;
		font-weight: 600;
		color: var(--color-foreground);
	}

	.hero-inner {
		position: relative;
		z-index: 2;
		flex: 1;
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 64px;
		align-items: center;
		max-width: 1180px;
		width: 100%;
		margin: 0 auto;
		padding: 0 48px 60px;
	}

	.hero-left {
		display: flex;
		flex-direction: column;
	}

	.hero-eyebrow {
		font-family: var(--font-ui);
		font-size: 10px;
		text-transform: uppercase;
		letter-spacing: 0.28em;
		color: var(--color-accent);
		font-weight: 500;
		display: flex;
		align-items: center;
		gap: 10px;
		margin: 0 0 18px;
	}

	.hero-title {
		display: flex;
		flex-direction: column;
		margin: 0 0 20px;
		line-height: 1;
	}

	.hero-title-the {
		font-family: var(--font-reader);
		font-size: 1.5rem;
		font-weight: 400;
		font-style: italic;
		color: var(--color-subtle);
		letter-spacing: 0.02em;
	}

	.hero-title-main {
		font-family: var(--font-reader);
		font-size: clamp(2.8rem, 5vw, 4.2rem);
		font-weight: 700;
		color: var(--color-foreground);
		letter-spacing: -0.02em;
		line-height: 0.95;
	}

	.hero-title-sub {
		font-family: var(--font-reader);
		font-size: clamp(2.2rem, 4vw, 3.4rem);
		font-weight: 400;
		color: var(--color-foreground);
		letter-spacing: -0.01em;
		line-height: 1;
		margin-top: 4px;
	}

	.hero-origin {
		font-family: var(--font-ui);
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.2em;
		color: var(--color-subtle);
		font-weight: 400;
		margin: 0 0 24px;
		padding-bottom: 24px;
		border-bottom: 1px solid var(--color-border);
	}

	.hero-desc {
		font-family: var(--font-reader);
		font-size: 1.05rem;
		line-height: 1.75;
		color: var(--color-muted);
		margin: 0 0 36px;
		max-width: 460px;
	}

	.hero-cta {
		display: inline-flex;
		align-items: center;
		gap: 10px;
		padding: 13px 28px;
		background: var(--color-accent);
		color: white;
		font-family: var(--font-ui);
		font-size: 12px;
		text-transform: uppercase;
		letter-spacing: 0.2em;
		font-weight: 600;
		text-decoration: none;
		border-radius: 2px;
		align-self: flex-start;
		transition:
			opacity 160ms ease,
			transform 160ms ease;
	}

	.hero-cta:hover {
		opacity: 0.88;
		transform: translateY(1px);
	}

	.hero-cta-arrow {
		font-size: 14px;
	}

	.hero-right {
		display: flex;
		justify-content: center;
		align-items: center;
	}

	.hero-figure {
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.hero-img {
		width: 100%;
		max-width: 520px;
		height: auto;
		display: block;
		border: 1px solid var(--color-border);
		box-shadow:
			0 2px 8px color-mix(in srgb, var(--color-foreground) 8%, transparent),
			0 20px 60px color-mix(in srgb, var(--color-foreground) 12%, transparent);
		outline: 1px solid var(--color-border);
		outline-offset: 4px;
	}

	.hero-caption {
		font-family: var(--font-ui);
		font-size: 10px;
		text-transform: uppercase;
		letter-spacing: 0.15em;
		color: var(--color-subtle);
		text-align: center;
		opacity: 0.7;
		font-weight: 300;
	}

	.hero-scroll-hint {
		position: absolute;
		bottom: 24px;
		left: 50%;
		transform: translateX(-50%);
		z-index: 2;
	}

	.hero-scroll-line {
		display: block;
		width: 1px;
		height: 48px;
		background: linear-gradient(to bottom, transparent, var(--color-border));
		margin: 0 auto;
		animation: extend 2s ease-in-out infinite;
		transform-origin: top center;
	}

	@keyframes extend {
		0%,
		100% {
			opacity: 0.3;
			transform: scaleY(0.6);
		}
		50% {
			opacity: 1;
			transform: scaleY(1);
		}
	}

	/* ─── Responsive ─── */
	@media (max-width: 900px) {
		.hero-nav {
			padding: 18px 24px;
		}

		.hero-inner {
			grid-template-columns: 1fr;
			gap: 40px;
			padding: 0 24px 48px;
		}

		.hero-right {
			order: -1;
		}

		.hero-img {
			max-width: 380px;
		}
	}

	@media (max-width: 600px) {
		.hero-inner {
			padding: 0 16px 40px;
		}

		.hero-right {
			display: none;
		}

		.hero-scroll-hint {
			display: none;
		}

		.hero-nav {
			padding: 16px;
		}
	}
</style>
