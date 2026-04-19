<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import {
		ALL_BOOKS,
		getBookBySlug,
		getHebPsalmNum,
		getPrevNavBook,
		getNextNavBook
	} from '$lib/data/books';
	import { slide, fade } from 'svelte/transition';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import { get } from 'svelte/store';
	import { prefs } from '$lib/stores/prefs';
	import { readingPosition } from '$lib/stores/reading';
	import { isMobile } from '$lib/stores/mobile';
	import { TRANSLATIONS } from '$lib/stores/compare';
	import FloatingNav from './FloatingNav.svelte';
	import BrandingRow from './BrandingRow.svelte';
	import BottomTabBar from './BottomTabBar.svelte';
	import PrefsPanel from './PrefsPanel.svelte';
	import BookNavLink from './BookNavLink.svelte';
	import ChapterNavLink from './ChapterNavLink.svelte';

	export let bookSlug: string;
	export let chapterNum: string;
	export let isChapterPage = false;
	export let isHomePage = false;
	export let hasStudyMode = false;
	export let minimal = false;
	export let translationId: string = 'odr';

	$: showTabBar = true;

	$: liveTranslations = TRANSLATIONS.filter((t) => t.live && !t.hidden);
	$: currentTranslation =
		liveTranslations.find((t) => t.id === translationId) ??
		liveTranslations.find((t) => t.id === 'odr')!;

	let navOpen = false;
	let prefsOpen = false;
	let translationOpen = false;

	$: bookMeta = getBookBySlug(bookSlug);

	$: displayName = bookMeta
		? $prefs.modernBookNames
			? bookMeta.modernName
			: bookMeta.odrName
		: '';

	$: psalmSuffix = (() => {
		if (!$prefs.showPsalmNumbers || bookMeta?.slug !== 'psalms' || !chapterNum) return '';
		const prot = getHebPsalmNum(parseInt(chapterNum, 10));
		return prot ? ` (${prot})` : '';
	})();

	$: navLabel =
		bookMeta && chapterNum ? `${displayName} ${chapterNum}${psalmSuffix}` : 'Go to\u2026';

	$: prevBook = isChapterPage && bookMeta ? (getPrevNavBook(bookMeta.slug) ?? null) : null;
	$: nextBook = isChapterPage && bookMeta ? (getNextNavBook(bookMeta.slug) ?? null) : null;

	$: routeBase = translationId === 'odr' ? '/odr' : `/${translationId}`;
	$: chapterNumInt = parseInt(chapterNum, 10);
	$: prevChapterHref =
		isChapterPage && bookMeta && chapterNumInt > 1
			? `${routeBase}/${bookSlug}/${chapterNumInt - 1}`
			: null;
	$: nextChapterHref =
		isChapterPage && bookMeta && chapterNumInt < bookMeta.chapters
			? `${routeBase}/${bookSlug}/${chapterNumInt + 1}`
			: null;

	function bookNavLabel(b: (typeof ALL_BOOKS)[number]): string {
		return $prefs.modernBookNames ? b.modernName : b.odrName;
	}

	function closeAll() {
		navOpen = false;
		prefsOpen = false;
		translationOpen = false;
	}

	// ── Mode toggle ─────────────────────────────────────────────────────────────
	$: modeItems = [
		{ key: 'reading', label: 'Read' },
		...(hasStudyMode ? [{ key: 'study', label: 'Study' }] : []),
		{ key: 'compare', label: 'Compare' }
	];
	$: activeModeIdx = modeItems.findIndex((m) => m.key === $prefs.readingMode);
	// Show pill on chapter pages and home page; hide on other non-chapter pages (search, etc.)
	$: displayModeIdx = isChapterPage || isHomePage ? (activeModeIdx >= 0 ? activeModeIdx : 0) : -1;

	let pendingIdx = -1;

	async function selectMode(key: string, index: number) {
		if (!isChapterPage) {
			// Not on a chapter page — prefer navOverride context (e.g. search result),
			// then fall back to last reading position, then genesis 1.
			const pos = get(readingPosition);
			const slug = bookSlug || pos?.bookSlug || 'genesis';
			const ch = parseInt(chapterNum, 10) || pos?.chapter || 1;
			if (key === 'compare') {
				goto(`/compare/${slug}/${ch}`);
			} else {
				prefs.update((p) => ({ ...p, readingMode: key as 'reading' | 'study' }));
				goto(`${routeBase}/${slug}/${ch}`);
			}
			return;
		}
		if (key === 'compare') {
			pendingIdx = index;
			const delay = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 210;
			await new Promise<void>((r) => setTimeout(r, delay));
			goto(`/compare/${bookSlug}/${chapterNum}`);
			return;
		}
		pendingIdx = -1;
		prefs.update((p) => ({ ...p, readingMode: key as 'reading' | 'study' }));
	}

	async function handleModeSelect(e: CustomEvent<{ key: string; index: number }>) {
		const { key, index } = e.detail;
		await selectMode(key, index);
	}

	function togglePrefs() {
		prefsOpen = !prefsOpen;
		translationOpen = false;
		navOpen = false;
		if ($isMobile && prefsOpen) {
			history.pushState({ prefsOpen: true }, '');
		}
	}

	function onPopState() {
		if (prefsOpen) prefsOpen = false;
	}

	onMount(() => {
		if (browser) window.addEventListener('popstate', onPopState);
	});

	onDestroy(() => {
		if (browser) {
			window.removeEventListener('popstate', onPopState);
			document.body.style.overflow = '';
		}
	});

	$: if (browser) {
		document.body.style.overflow = $isMobile && prefsOpen ? 'hidden' : '';
	}
</script>

<svelte:window
	on:keydown={(e) => {
		if (e.key === 'Escape') closeAll();
	}}
/>

<header class="sticky top-0 z-50 font-ui">
	<!-- Row 1: branding + mode + search -->
	<BrandingRow
		{modeItems}
		activeModeIdx={displayModeIdx}
		{pendingIdx}
		onModeSelect={handleModeSelect}
		onLogoClick={closeAll}
	>
		<!-- Mobile prefs toggle (TopBar-specific) -->
		<button
			class="md:hidden ml-auto shrink-0 flex items-center justify-center w-[30px] h-[30px]
				rounded-[3px] transition-colors duration-fast
				{prefsOpen ? 'text-accent' : 'text-subtle hover:text-foreground'}"
			aria-label="Reading options"
			aria-expanded={prefsOpen}
			aria-haspopup="dialog"
			on:click={togglePrefs}
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
	</BrandingRow>

	<!-- Row 2: reading controls -->
	{#if !minimal}
		<div
			class="bg-glass backdrop-blur-sm border-b border-border px-lg flex items-center gap-[10px] relative"
			style="height: 50px;"
		>
			<!-- Left: translation selector -->
			<div class="relative shrink-0">
				<button
					class="flex items-center gap-[7px] px-[10px] py-[10px] rounded-[3px] transition-colors duration-fast
					{translationOpen ? 'bg-accent text-white' : 'text-foreground hover:text-accent'}"
					aria-expanded={translationOpen}
					aria-haspopup="listbox"
					on:click={() => {
						translationOpen = !translationOpen;
						prefsOpen = false;
						navOpen = false;
					}}
				>
					<span class="text-[11px] md:text-[14px] leading-tight font-medium"
						>{currentTranslation.abbr}</span
					>
					<span
						class="text-[12px] opacity-70 {translationOpen ? 'text-white/70' : ''} leading-none"
						aria-hidden="true"
					>
						{translationOpen ? '▲' : '▼'}
					</span>
				</button>
				{#if translationOpen}
					<div
						transition:slide={{ duration: 180 }}
						class="absolute top-[calc(100%+8px)] left-0 bg-panel border border-border rounded-sm shadow-lg p-sm z-[60] w-96 font-ui"
					>
						<p class="text-[11px] uppercase tracking-[0.15em] text-subtle mb-sm font-semibold">
							Translation
						</p>
						{#each liveTranslations as t (t.id)}
							{@const isCurrent = t.id === translationId}
							{@const href =
								t.id === 'odr'
									? `/odr/${bookSlug}/${chapterNum}`
									: `/${t.id}/${bookSlug}/${chapterNum}`}
							{#if isCurrent}
								<div
									class="flex items-center justify-between px-sm py-[8px] rounded-sm bg-accent/10 mb-[2px]"
								>
									<div class="min-w-0 leading-snug">
										<span class="text-foreground font-semibold text-[15px] block truncate"
											>{t.abbr}</span
										>
										{#if t.micro}<span class="text-[11px] text-subtle font-medium block mb-[3px]"
												>{t.micro}</span
											>{/if}
									</div>
									<span
										class="text-[11px] text-accent font-semibold tracking-[0.1em] shrink-0 ml-[8px]"
										>✓</span
									>
								</div>
							{:else}
								<a
									{href}
									on:click={() => {
										translationOpen = false;
									}}
									class="flex items-center justify-between px-sm py-[8px] rounded-sm hover:bg-accent/5 transition-colors duration-fast mb-[2px]"
								>
									<div class="min-w-0 leading-snug">
										<span class="text-foreground font-medium text-[15px] block truncate"
											>{t.label}</span
										>
										{#if t.micro}<span class="text-[11px] text-subtle font-medium block mb-[3px]"
												>{t.micro}</span
											>{/if}
									</div>
									<span class="text-[12px] text-subtle font-medium shrink-0 ml-[8px]">{t.year}</span
									>
								</a>
							{/if}
						{/each}
					</div>
				{/if}
			</div>

			<!-- Center: button is the centered anchor; chevrons float out absolutely so button never shifts -->
			<div
				class="md:absolute md:left-1/2 md:-translate-x-1/2 max-md:flex-1 max-md:flex max-md:justify-center relative flex items-center"
			>
				<!-- Left chevrons — absolutely to the left of the button; placeholders keep slots fixed -->
				<div
					class="hidden md:flex absolute right-full top-1/2 -translate-y-1/2 items-center gap-[8px] pr-[8px]"
				>
					{#if prevBook}
						<BookNavLink
							href="{routeBase}/{prevBook.slug}/1"
							direction="prev"
							label={bookNavLabel(prevBook)}
						/>
					{:else if isChapterPage}
						<div class="w-[15px]" aria-hidden="true"></div>
					{/if}
					{#if prevChapterHref}
						<ChapterNavLink href={prevChapterHref} direction="prev" chapter={chapterNumInt - 1} />
					{:else if isChapterPage}
						<div class="w-[15px]" aria-hidden="true"></div>
					{/if}
				</div>
				<button
					class="flex items-center gap-[7px] px-[17px] py-[10px] rounded-[3px] transition-colors duration-fast
					{navOpen ? 'bg-accent text-white' : 'text-accent hover:bg-accent hover:text-white'}"
					aria-expanded={navOpen}
					aria-haspopup="dialog"
					aria-label="Navigate — {navLabel}"
					on:click={() => {
						navOpen = !navOpen;
						prefsOpen = false;
						translationOpen = false;
					}}
				>
					<span class="text-[13px] md:text-[16px] leading-tight font-medium">{navLabel}</span>
					<span class="text-[12px] opacity-70 leading-none" aria-hidden="true"
						>{navOpen ? '▲' : '▼'}</span
					>
				</button>
				<!-- Right chevrons — absolutely to the right of the button; placeholders keep slots fixed -->
				<div
					class="hidden md:flex absolute left-full top-1/2 -translate-y-1/2 items-center gap-[8px] pl-[8px]"
				>
					{#if nextChapterHref}
						<ChapterNavLink href={nextChapterHref} direction="next" chapter={chapterNumInt + 1} />
					{:else if isChapterPage}
						<div class="w-[15px]" aria-hidden="true"></div>
					{/if}
					{#if nextBook}
						<BookNavLink
							href="{routeBase}/{nextBook.slug}/1"
							direction="next"
							label={bookNavLabel(nextBook)}
						/>
					{:else if isChapterPage}
						<div class="w-[15px]" aria-hidden="true"></div>
					{/if}
				</div>
			</div>

			<!-- Right: reading prefs — desktop only -->
			<div class="hidden md:flex ml-auto shrink-0">
				<button
					class="px-[8px] h-[28px] flex items-center justify-center rounded-[3px] transition-colors duration-fast text-[13px] font-medium
					{prefsOpen ? 'bg-accent text-white' : 'text-muted hover:text-accent'}"
					aria-expanded={prefsOpen}
					aria-haspopup="dialog"
					aria-label="Reading options"
					on:click={() => {
						prefsOpen = !prefsOpen;
						translationOpen = false;
						navOpen = false;
					}}
				>
					<span class="hidden sm:inline">Reading options</span>
					<span class="sm:hidden">Aa</span>
				</button>
			</div>
		</div>
	{/if}
</header>

<!-- Bottom tab bar — mobile only, reader pages only -->
{#if showTabBar}
	<div transition:fade={{ duration: 200 }}>
		<BottomTabBar {modeItems} {activeModeIdx} {pendingIdx} {selectMode} />
	</div>
{/if}

{#if navOpen}
	<FloatingNav
		{bookSlug}
		chapterNum={parseInt(chapterNum, 10) || 0}
		onClose={() => (navOpen = false)}
		{translationId}
	/>
{/if}

{#if prefsOpen}
	<PrefsPanel />
{/if}

{#if navOpen || prefsOpen || translationOpen}
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<div class="fixed inset-0 z-[49]" role="presentation" on:click={closeAll}></div>
{/if}
