<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import type { PageData } from './$types';
	import ChapterView from '$lib/components/ChapterView.svelte';
	import { loadBook, getChapter } from '$lib/data/loader';
	import { debounce } from '$lib/utils/scroll';
	import { prefs } from '$lib/stores/prefs';
	import type { Chapter, BookMeta } from '$lib/data/types';

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
	let currentChapter = data.chapter.chapter;
	let loadingNext = false;
	let loadingPrev = false;

	const updateUrl = debounce((slug: string, ch: number) => {
		if (ch !== currentChapter) {
			currentChapter = ch;
			history.replaceState({}, '', `/odr/${slug}/${ch}`);
		}
	}, 200);

	let observer: IntersectionObserver | null = null;

	function observeHeadings() {
		observer?.disconnect();
		observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) {
						const slug = (entry.target as HTMLElement).dataset.bookSlug ?? data.bookMeta.slug;
						const ch = parseInt((entry.target as HTMLElement).dataset.chapterNum ?? '0', 10);
						if (ch > 0) updateUrl(slug, ch);
					}
				}
			},
			{ rootMargin: '0px 0px -80% 0px', threshold: 0 }
		);
		container?.querySelectorAll('[data-chapter-heading]').forEach((el) => observer!.observe(el));
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
			const nextCh = getChapter(bookData, nextChNum);
			if (nextCh) {
				chapters = [
					...chapters,
					{ bookMeta: last.bookMeta, chapter: nextCh, totalChapters: last.totalChapters }
				];
				setTimeout(observeHeadings, 100);
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
		const prevChNum = first.chapter.chapter - 1;
		if (prevChNum < 1) return;
		if (hasChapter(first.bookMeta.slug, prevChNum)) return;

		loadingPrev = true;
		const scrollY = window.scrollY;
		const oldHeight = document.documentElement.scrollHeight;
		try {
			const bookData = await loadBook(first.bookMeta.slug, fetch);
			const prevCh = getChapter(bookData, prevChNum);
			if (prevCh) {
				chapters = [
					{ bookMeta: first.bookMeta, chapter: prevCh, totalChapters: first.totalChapters },
					...chapters
				];
				setTimeout(() => {
					const newHeight = document.documentElement.scrollHeight;
					window.scrollTo(0, scrollY + (newHeight - oldHeight));
				}, 50);
				setTimeout(observeHeadings, 100);
			}
		} catch {
			// silently ignore
		} finally {
			loadingPrev = false;
		}
	}

	let scrollReady = false;

	function onScroll() {
		if (!browser || !$prefs.infiniteScroll || !scrollReady) return;
		const { scrollY, innerHeight } = window;
		const docHeight = document.documentElement.scrollHeight;
		if (scrollY < 300) loadPrevChapter();
		if (scrollY + innerHeight > docHeight - 300) loadNextChapter();
	}

	onMount(() => {
		observeHeadings();
		window.addEventListener('scroll', onScroll, { passive: true });
		setTimeout(() => {
			scrollReady = true;
		}, 600);
	});

	onDestroy(() => {
		observer?.disconnect();
		if (browser) window.removeEventListener('scroll', onScroll);
	});
</script>

<svelte:head>
	<title>{data.bookMeta.odrName} {data.chapter.chapter} — ODR Bible</title>
</svelte:head>

<main bind:this={container} class="max-w-[750px] mx-auto px-md py-xl">
	{#each chapters as item, i (item.bookMeta.slug + '-' + item.chapter.chapter)}
		<section>
			<div
				data-chapter-heading
				data-book-slug={item.bookMeta.slug}
				data-chapter-num={item.chapter.chapter}
			></div>
			<ChapterView
				bookMeta={item.bookMeta}
				chapter={item.chapter}
				targetVerse={item.chapter.chapter === data.chapter.chapter ? data.targetVerse : undefined}
				totalChapters={item.totalChapters}
				showNav={i === chapters.length - 1}
			/>
		</section>
	{/each}
</main>
