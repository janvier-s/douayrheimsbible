<script lang="ts">
	import { goto } from '$app/navigation';
	import { prefs } from '$lib/stores/prefs';
	import { readingPosition } from '$lib/stores/reading';
	import BrandingRow from './BrandingRow.svelte';
	import BottomTabBar from './BottomTabBar.svelte';
	import FloatingNav from './FloatingNav.svelte';
	import PrefsPanel from './PrefsPanel.svelte';
	import BookNavLink from './BookNavLink.svelte';
	import ChapterNavLink from './ChapterNavLink.svelte';
	import { ALL_BOOKS, getPrevNavBook, getNextNavBook } from '$lib/data/books';
	import type { BookMeta } from '$lib/data/types';
	import manifest from '../../../static/data/fathers/manifest.json';

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

	const fathersManifest = manifest as Record<string, number[]>;

	// Chapter nav: skip to nearest chapter that actually has fathers data
	$: bookChapters = fathersManifest[bookMeta.slug] ?? [];
	$: prevChapterHref = (() => {
		for (let ch = chapterNum - 1; ch >= 1; ch--) {
			if (bookChapters.includes(ch)) return `/fathers/${bookMeta.slug}/${ch}`;
		}
		return null;
	})();
	$: nextChapterHref = (() => {
		for (let ch = chapterNum + 1; ch <= totalChapters; ch++) {
			if (bookChapters.includes(ch)) return `/fathers/${bookMeta.slug}/${ch}`;
		}
		return null;
	})();

	// Book nav: skip books that have no fathers data at all
	function findPrevFathersBook(slug: string): (typeof ALL_BOOKS)[number] | null {
		let b = getPrevNavBook(slug);
		while (b && !fathersManifest[b.slug]?.length) b = getPrevNavBook(b.slug);
		return b ?? null;
	}
	function findNextFathersBook(slug: string): (typeof ALL_BOOKS)[number] | null {
		let b = getNextNavBook(slug);
		while (b && !fathersManifest[b.slug]?.length) b = getNextNavBook(b.slug);
		return b ?? null;
	}
	$: prevBook = findPrevFathersBook(bookMeta.slug);
	$: nextBook = findNextFathersBook(bookMeta.slug);

	let navOpen = false;
	let prefsOpen = false;

	function closeAll() {
		navOpen = false;
		prefsOpen = false;
	}

	function bookNavLabel(b: (typeof ALL_BOOKS)[number]): string {
		return $prefs.modernBookNames ? b.modernName : b.odrName;
	}

	$: navLabel = `${bookMeta.odrName} ${chapterNum}`;
</script>

<svelte:window
	on:keydown={(e) => {
		if (e.key === 'Escape') closeAll();
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
						href="/fathers/{prevBook.slug}/{fathersManifest[prevBook.slug]?.[0] ?? 1}"
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
				on:click={() => {
					navOpen = !navOpen;
					prefsOpen = false;
				}}
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
						href="/fathers/{nextBook.slug}/{fathersManifest[nextBook.slug]?.[0] ?? 1}"
						direction="next"
						label={bookNavLabel(nextBook)}
					/>
				{:else}
					<div class="w-[15px]" aria-hidden="true"></div>
				{/if}
			</div>
		</div>

		<!-- Right: reading options -->
		<div class="shrink-0 flex items-center gap-[8px] ml-auto">
			<button
				class="hidden sm:flex px-[8px] h-[28px] items-center justify-center rounded-[3px] transition-colors duration-fast text-[13px] font-medium
					{prefsOpen ? 'bg-accent text-white' : 'text-muted hover:text-accent'}"
				aria-label="Reading options"
				on:click={() => {
					prefsOpen = !prefsOpen;
					navOpen = false;
				}}
			>
				Reading options
			</button>
			<button
				class="sm:hidden shrink-0 flex items-center justify-center w-[30px] h-[30px]
					rounded-[3px] transition-colors duration-fast
					{prefsOpen ? 'text-accent' : 'text-subtle hover:text-foreground'}"
				aria-label="Reading options"
				on:click={() => {
					prefsOpen = !prefsOpen;
					navOpen = false;
				}}
			>
				<svg
					width="16"
					height="14"
					viewBox="0 0 16 14"
					fill="none"
					stroke="currentColor"
					stroke-width="1.5"
					stroke-linecap="round"
					aria-hidden="true"
				>
					<line x1="1" y1="2" x2="15" y2="2" /><line x1="1" y1="7" x2="15" y2="7" /><line
						x1="1"
						y1="12"
						x2="15"
						y2="12"
					/>
					<circle cx="5" cy="2" r="2" fill="currentColor" stroke="none" /><circle
						cx="11"
						cy="7"
						r="2"
						fill="currentColor"
						stroke="none"
					/><circle cx="7" cy="12" r="2" fill="currentColor" stroke="none" />
				</svg>
			</button>
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

{#if prefsOpen}
	<PrefsPanel />
{/if}

{#if navOpen || prefsOpen}
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<div class="fixed inset-0 z-[57]" role="presentation" on:click={closeAll}></div>
{/if}

<!-- Mobile bottom tab bar -->
<BottomTabBar {modeItems} {activeModeIdx} {pendingIdx} {selectMode} />
