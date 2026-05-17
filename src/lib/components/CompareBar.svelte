<script lang="ts">
	import { slide } from 'svelte/transition';
	import { goto } from '$app/navigation';
	import { prefs } from '$lib/stores/prefs';
	import { readingPosition } from '$lib/stores/reading';
	import FloatingNav from './FloatingNav.svelte';
	import BrandingRow from './BrandingRow.svelte';
	import BottomTabBar from './BottomTabBar.svelte';
	import PrefsPanel from './PrefsPanel.svelte';
	import BookNavLink from './BookNavLink.svelte';
	import ChapterNavLink from './ChapterNavLink.svelte';
	import { compareStore, TRANSLATIONS, konamiUnlocked } from '$lib/stores/compare';
	import { ALL_BOOKS, getPrevNavBook, getNextNavBook } from '$lib/data/books';
	import type { BookMeta } from '$lib/data/types';

	interface Props {
		bookMeta: BookMeta;
		chapterNum: number;
	}

	let { bookMeta, chapterNum }: Props = $props();

	// Return URLs derived from the last known reading position or current compare context.
	let _base = $derived($readingPosition?.routeBase ?? '/odr');
	let _slug = $derived($readingPosition?.bookSlug ?? bookMeta.slug);
	let _ch = $derived($readingPosition?.chapter ?? chapterNum);
	let readerHref = $derived(`${_base}/${_slug}/${_ch}`);

	// Build toggle items — study is always available (uses same href as reading)
	let modeItems = $derived([
		{ key: 'reading', label: 'Read' },
		{ key: 'study', label: 'Study' },
		{ key: 'compare', label: 'Compare' },
		{ key: 'fathers', label: 'Fathers' }
	]);
	let activeModeIdx = $derived(modeItems.findIndex((m) => m.key === 'compare'));

	let pendingIdx = $state(-1);

	async function selectMode(key: string, index: number) {
		if (key === 'compare') return; // already on compare
		pendingIdx = index;
		const delay = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 210;
		await new Promise<void>((r) => setTimeout(r, delay));
		if (key === 'fathers') {
			goto(`/fathers/${bookMeta.slug}/${chapterNum}`);
			return;
		}
		prefs.update((p) => ({ ...p, readingMode: key === 'study' ? 'study' : 'reading' }));
		goto(readerHref);
	}

	async function handleModeSelect(e: CustomEvent<{ key: string; index: number }>) {
		const { key, index } = e.detail;
		await selectMode(key, index);
	}

	let navOpen = $state(false);
	let prefsOpen = $state(false);
	let mobileTransOpen = $state(false);

	let visibleTranslations = $derived($konamiUnlocked ? TRANSLATIONS : TRANSLATIONS.filter((t) => !t.hidden));

	let prevBook = $derived(getPrevNavBook(bookMeta.slug) ?? null);
	let nextBook = $derived(getNextNavBook(bookMeta.slug) ?? null);
	let prevChapterHref = $derived(chapterNum > 1 ? `/compare/${bookMeta.slug}/${chapterNum - 1}` : null);
	let nextChapterHref =
		$derived(chapterNum < bookMeta.chapters ? `/compare/${bookMeta.slug}/${chapterNum + 1}` : null);

	function bookNavLabel(b: (typeof ALL_BOOKS)[number]): string {
		return $prefs.modernBookNames ? b.modernName : b.odrName;
	}

	let isOT = $derived(bookMeta.testament === 'OT');
	let navLabel = $derived(`${bookMeta.odrName} ${chapterNum}`);

	function closeAll() {
		navOpen = false;
		prefsOpen = false;
		mobileTransOpen = false;
	}
</script>

<svelte:window
	onkeydown={(e) => {
		if (e.key === 'Escape') closeAll();
	}}
/>

<header class="sticky top-0 z-50 font-ui">
	<!-- Row 1: branding + mode + search -->
	<BrandingRow
		{modeItems}
		{activeModeIdx}
		{pendingIdx}
		onModeSelect={handleModeSelect}
		onLogoClick={closeAll}
	/>

	<!-- Row 2: compare controls -->
	<div
		class="bg-glass backdrop-blur-sm border-b border-border px-lg max-md:px-[8px] flex items-center gap-[10px] md:gap-[14px] relative"
		style="height: 50px;"
	>
		<!-- Translation chips — desktop -->
		<div class="hidden md:flex flex-col justify-center gap-[5px] shrink-0">
			<span class="text-[9px] uppercase tracking-[0.15em] text-subtle leading-none font-medium"
				>Translations</span
			>
			<div class="flex items-center gap-[5px]">
				{#each visibleTranslations as t (t.id)}
					{@const disabled = t.ntOnly && isOT}
					{@const active = $compareStore.visible.has(t.id)}
					<div class="relative group/tip">
						<button
							onclick={() => compareStore.toggle(t.id, isOT)}
							{disabled}
							class="px-[9px] py-[3px] rounded-[3px] text-[11px] font-medium uppercase tracking-[0.1em] border transition-colors duration-fast
								{disabled
								? 'border-border text-border cursor-not-allowed'
								: active
									? 'bg-interactive text-white border-interactive'
									: 'border-border text-subtle hover:text-foreground hover:border-foreground/30'}"
						>
							{t.abbr}
						</button>
						{#if disabled}
							<div
								class="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-[6px] px-[8px] py-[4px] bg-foreground text-background text-[11px] rounded-[3px] whitespace-nowrap opacity-0 group-hover/tip:opacity-100 transition-opacity duration-fast z-50"
							>
								New Testament only
								<div
									class="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[4px] border-r-[4px] border-t-[4px] border-l-transparent border-r-transparent border-t-foreground"
								></div>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		</div>

		<!-- Translation dropdown — mobile -->
		<div class="md:hidden relative shrink-0">
			<button
				class="flex items-center gap-[4px] px-[8px] py-[4px] rounded-[3px] border border-border text-[11px] font-medium transition-colors duration-fast
					{mobileTransOpen
					? 'bg-interactive text-white border-interactive'
					: 'text-foreground hover:text-accent'}"
				onclick={() => {
					mobileTransOpen = !mobileTransOpen;
					navOpen = false;
					prefsOpen = false;
				}}
			>
				Trans.
				<span class="text-[9px] opacity-70" aria-hidden="true">{mobileTransOpen ? '▲' : '▼'}</span>
			</button>
			{#if mobileTransOpen}
				<div
					transition:slide={{ duration: 180 }}
					class="absolute top-[calc(100%+6px)] left-0 bg-panel border border-border rounded-sm shadow-lg p-sm z-50 w-48"
				>
					{#each visibleTranslations as t (t.id)}
						{@const disabled = t.ntOnly && isOT}
						<label
							class="flex items-center gap-sm py-[6px] cursor-pointer {disabled
								? 'opacity-40 pointer-events-none'
								: ''}"
						>
							<input
								type="checkbox"
								checked={$compareStore.visible.has(t.id)}
								{disabled}
								onchange={() => compareStore.toggle(t.id, isOT)}
								class="accent-accent"
							/>
							<span class="text-[13px] text-foreground">{t.abbr}</span>
							<span class="text-[11px] text-subtle ml-auto">{t.year}</span>
						</label>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Center: button is the centered anchor; chevrons float out absolutely so button never shifts -->
		<div
			class="md:absolute md:left-1/2 md:-translate-x-1/2 flex-1 md:flex-none flex justify-center relative items-center"
		>
			<!-- Left chevrons — placeholders keep slots fixed when chevrons are absent -->
			<div
				class="hidden md:flex absolute right-full top-1/2 -translate-y-1/2 items-center gap-[8px] pr-[8px]"
			>
				{#if prevBook}
					<BookNavLink
						href="/compare/{prevBook.slug}/1"
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
				onclick={() => {
					navOpen = !navOpen;
					prefsOpen = false;
					mobileTransOpen = false;
				}}
			>
				<span class="text-[14px] md:text-[16px] font-medium">{navLabel}</span>
				<span class="text-[10px] md:text-[11px] opacity-80 leading-none" aria-hidden="true"
					>{navOpen ? '▲' : '▼'}</span
				>
			</button>
			<!-- Right chevrons — placeholders keep slots fixed when chevrons are absent -->
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
						href="/compare/{nextBook.slug}/1"
						direction="next"
						label={bookNavLabel(nextBook)}
					/>
				{:else}
					<div class="w-[15px]" aria-hidden="true"></div>
				{/if}
			</div>
		</div>

		<!-- Right: text options -->
		<div class="shrink-0 flex items-center gap-[8px] md:gap-[20px] md:ml-auto">
			<!-- Desktop: text button -->
			<button
				class="hidden sm:flex px-[8px] h-[28px] items-center justify-center rounded-[3px] transition-colors duration-fast text-[13px] font-medium
					{prefsOpen ? 'bg-accent text-white' : 'text-muted hover:text-accent'}"
				aria-label="Reading options"
				onclick={() => {
					prefsOpen = !prefsOpen;
					navOpen = false;
					mobileTransOpen = false;
				}}
			>
				Reading options
			</button>
			<!-- Mobile: sliders icon -->
			<button
				class="sm:hidden shrink-0 flex items-center justify-center w-[30px] h-[30px]
					rounded-[3px] transition-colors duration-fast
					{prefsOpen ? 'text-accent' : 'text-subtle hover:text-foreground'}"
				aria-label="Reading options"
				onclick={() => {
					prefsOpen = !prefsOpen;
					navOpen = false;
					mobileTransOpen = false;
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
					<line x1="1" y1="2" x2="15" y2="2" />
					<line x1="1" y1="7" x2="15" y2="7" />
					<line x1="1" y1="12" x2="15" y2="12" />
					<circle cx="5" cy="2" r="2" fill="currentColor" stroke="none" />
					<circle cx="11" cy="7" r="2" fill="currentColor" stroke="none" />
					<circle cx="7" cy="12" r="2" fill="currentColor" stroke="none" />
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
		compareMode={true}
	/>
{/if}

{#if prefsOpen}
	<PrefsPanel compareMode={true} />
{/if}

{#if navOpen || prefsOpen || mobileTransOpen}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="fixed inset-0 z-[57]" role="presentation" onclick={closeAll}></div>
{/if}

<!-- Bottom tab bar — mobile only -->
<BottomTabBar {modeItems} {activeModeIdx} {pendingIdx} {selectMode} />
