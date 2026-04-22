<script lang="ts">
	import { goto } from '$app/navigation';
	import { prefs } from '$lib/stores/prefs';
	import { readingPosition } from '$lib/stores/reading';
	import BrandingRow from './BrandingRow.svelte';
	import BottomTabBar from './BottomTabBar.svelte';
	import FloatingNav from './FloatingNav.svelte';
	import BookNavLink from './BookNavLink.svelte';
	import ChapterNavLink from './ChapterNavLink.svelte';
	import { ALL_BOOKS, getPrevNavBook, getNextNavBook } from '$lib/data/books';
	import type { BookMeta } from '$lib/data/types';

	export let bookMeta: BookMeta;
	export let chapterNum: number;
	export let totalChapters: number;

	$: modeItems = [
		{ key: 'reading', label: 'Read' },
		{ key: 'study', label: 'Study' },
		{ key: 'compare', label: 'Compare' },
		{ key: 'fathers', label: 'Fathers' }
	];
	$: activeModeIdx = modeItems.findIndex((m) => m.key === 'fathers');

	let pendingIdx = -1;

	$: _base = $readingPosition?.routeBase ?? '/odr';
	$: _slug = $readingPosition?.bookSlug ?? bookMeta.slug;
	$: _ch = $readingPosition?.chapter ?? chapterNum;
	$: readerHref = `${_base}/${_slug}/${_ch}`;

	async function selectMode(key: string, index: number) {
		if (key === 'fathers') return;
		pendingIdx = index;
		const delay = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 210;
		await new Promise<void>((r) => setTimeout(r, delay));
		if (key === 'compare') {
			goto(`/compare/${bookMeta.slug}/${chapterNum}`);
		} else {
			prefs.update((p) => ({ ...p, readingMode: key === 'study' ? 'study' : 'reading' }));
			goto(readerHref);
		}
	}

	async function handleModeSelect(e: CustomEvent<{ key: string; index: number }>) {
		const { key, index } = e.detail;
		await selectMode(key, index);
	}

	$: prevBook = getPrevNavBook(bookMeta.slug) ?? null;
	$: nextBook = getNextNavBook(bookMeta.slug) ?? null;
	$: prevChapterHref = chapterNum > 1 ? `/fathers/${bookMeta.slug}/${chapterNum - 1}` : null;
	$: nextChapterHref =
		chapterNum < totalChapters ? `/fathers/${bookMeta.slug}/${chapterNum + 1}` : null;

	let navOpen = false;

	function bookNavLabel(b: (typeof ALL_BOOKS)[number]): string {
		return $prefs.modernBookNames ? b.modernName : b.odrName;
	}

	$: navLabel = `${bookMeta.odrName} ${chapterNum}`;
</script>

<svelte:window
	on:keydown={(e) => {
		if (e.key === 'Escape') navOpen = false;
	}}
/>

<header class="sticky top-0 z-50 font-ui">
	<!-- Row 1: branding + mode toggle -->
	<BrandingRow
		{modeItems}
		{activeModeIdx}
		{pendingIdx}
		onModeSelect={handleModeSelect}
		onLogoClick={() => (navOpen = false)}
	/>

	<!-- Row 2: chapter navigation -->
	<div
		class="bg-glass backdrop-blur-sm border-b border-border px-lg max-md:px-[8px] flex items-center gap-[10px] relative"
		style="height: 50px;"
	>
		<!-- Center: chapter button with chevrons -->
		<div
			class="md:absolute md:left-1/2 md:-translate-x-1/2 flex-1 md:flex-none flex justify-center relative items-center"
		>
			<!-- Left chevrons -->
			<div
				class="hidden md:flex absolute right-full top-1/2 -translate-y-1/2 items-center gap-[8px] pr-[8px]"
			>
				{#if prevBook}
					<BookNavLink
						href="/fathers/{prevBook.slug}/1"
						direction="prev"
						label={bookNavLabel(prevBook)}
					/>
				{:else}
					<div class="w-[15px]" aria-hidden="true"></div>
				{/if}
				{#if prevChapterHref}
					<ChapterNavLink href={prevChapterHref} direction="prev" chapter={chapterNum - 1} />
				{:else}
					<div class="w-[15px]" aria-hidden="true"></div>
				{/if}
			</div>

			<button
				class="flex items-center gap-[5px] px-[12px] md:px-[17px] py-[8px] md:py-[10px] rounded-[3px] transition-colors duration-fast
					{navOpen ? 'bg-accent text-white' : 'text-accent hover:bg-accent hover:text-white'}"
				on:click={() => (navOpen = !navOpen)}
			>
				<span class="text-[14px] md:text-[16px] font-medium">{navLabel}</span>
				<span class="text-[10px] md:text-[11px] opacity-80 leading-none" aria-hidden="true"
					>{navOpen ? '▲' : '▼'}</span
				>
			</button>

			<!-- Right chevrons -->
			<div
				class="hidden md:flex absolute left-full top-1/2 -translate-y-1/2 items-center gap-[8px] pl-[8px]"
			>
				{#if nextChapterHref}
					<ChapterNavLink href={nextChapterHref} direction="next" chapter={chapterNum + 1} />
				{:else}
					<div class="w-[15px]" aria-hidden="true"></div>
				{/if}
				{#if nextBook}
					<BookNavLink
						href="/fathers/{nextBook.slug}/1"
						direction="next"
						label={bookNavLabel(nextBook)}
					/>
				{:else}
					<div class="w-[15px]" aria-hidden="true"></div>
				{/if}
			</div>
		</div>

		<!-- Right: "Church Fathers" label badge -->
		<div class="ml-auto shrink-0 hidden md:block">
			<span class="text-[11px] uppercase tracking-[0.15em] text-subtle font-medium"
				>Church Fathers</span
			>
		</div>
	</div>
</header>

{#if navOpen}
	<FloatingNav
		bookSlug={bookMeta.slug}
		{chapterNum}
		onClose={() => (navOpen = false)}
		routeBase="/fathers"
	/>
{/if}

{#if navOpen}
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<div class="fixed inset-0 z-[57]" role="presentation" on:click={() => (navOpen = false)}></div>
{/if}

<!-- Mobile bottom tab bar -->
<BottomTabBar {modeItems} {activeModeIdx} {pendingIdx} {selectMode} />
