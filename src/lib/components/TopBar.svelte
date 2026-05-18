<script lang="ts">
	import { run } from 'svelte/legacy';

	import { onMount, onDestroy } from 'svelte';
	import {
		ALL_BOOKS,
		getBookBySlug,
		getHebPsalmNum,
		getPrevNavBook,
		getNextNavBook
	} from '$lib/data/books';
	import { fade, fly } from 'svelte/transition';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import { get } from 'svelte/store';
	import { prefs } from '$lib/stores/prefs';
	import { readingPosition } from '$lib/stores/reading';
	import { isMobile } from '$lib/stores/mobile';
	import { TRANSLATIONS } from '$lib/stores/compare';
	import { toRoman } from '$lib/utils/text';
	import FloatingNav from './FloatingNav.svelte';
	import BrandingRow from './BrandingRow.svelte';
	import BottomTabBar from './BottomTabBar.svelte';
	import PrefsPanel from './PrefsPanel.svelte';
	import BookNavLink from './BookNavLink.svelte';
	import ChapterNavLink from './ChapterNavLink.svelte';

	interface Props {
		bookSlug: string;
		chapterNum: string;
		isChapterPage?: boolean;
		isHomePage?: boolean;
		hasStudyMode?: boolean;
		minimal?: boolean;
		translationId?: string;
	}

	let {
		bookSlug,
		chapterNum,
		isChapterPage = false,
		isHomePage = false,
		hasStudyMode = false,
		minimal = false,
		translationId = 'odr'
	}: Props = $props();

	let liveTranslations = $derived(TRANSLATIONS.filter((t) => t.live && !t.hidden));
	let currentTranslation = $derived(
		liveTranslations.find((t) => t.id === translationId) ??
			liveTranslations.find((t) => t.id === 'odr')!
	);

	let navOpen = $state(false);
	let prefsOpen = $state(false);
	let translationOpen = $state(false);

	let bookMeta = $derived(getBookBySlug(bookSlug));
	let isVul = $derived(translationId === 'vul');

	let displayName = $derived(
		bookMeta
			? isVul && bookMeta.latinName
				? bookMeta.latinName
				: $prefs.modernBookNames
					? bookMeta.modernName
					: bookMeta.odrName
			: ''
	);

	let psalmSuffix = $derived(
		(() => {
			if (!$prefs.showPsalmNumbers || bookMeta?.slug !== 'psalms' || !chapterNum) return '';
			const prot = getHebPsalmNum(parseInt(chapterNum, 10));
			return prot ? ` (${prot})` : '';
		})()
	);

	let chapterDisplay = $derived(
		isVul && $prefs.romanNumerals && chapterNum ? toRoman(parseInt(chapterNum, 10)) : chapterNum
	);
	let navLabel = $derived(
		bookMeta && chapterNum ? `${displayName} ${chapterDisplay}${psalmSuffix}` : 'Go to\u2026'
	);

	let prevBook = $derived(
		isChapterPage && bookMeta ? (getPrevNavBook(bookMeta.slug) ?? null) : null
	);
	let nextBook = $derived(
		isChapterPage && bookMeta ? (getNextNavBook(bookMeta.slug) ?? null) : null
	);

	let routeBase = $derived(translationId === 'odr' ? '/odr' : `/${translationId}`);
	let chapterNumInt = $derived(parseInt(chapterNum, 10));
	let prevChapterHref = $derived(
		isChapterPage && bookMeta && chapterNumInt > 1
			? `${routeBase}/${bookSlug}/${chapterNumInt - 1}`
			: null
	);
	let nextChapterHref = $derived(
		isChapterPage && bookMeta && chapterNumInt < bookMeta.chapters
			? `${routeBase}/${bookSlug}/${chapterNumInt + 1}`
			: null
	);

	function bookNavLabel(b: (typeof ALL_BOOKS)[number]): string {
		if (isVul && b.latinName) return b.latinName;
		return $prefs.modernBookNames ? b.modernName : b.odrName;
	}

	function closeAll() {
		navOpen = false;
		prefsOpen = false;
		translationOpen = false;
	}

	// ── Mode toggle ─────────────────────────────────────────────────────────────
	let modeItems = $derived([
		{ key: 'reading', label: 'Read' },
		...(hasStudyMode ? [{ key: 'study', label: 'Study' }] : []),
		{ key: 'compare', label: 'Compare' },
		{ key: 'fathers', label: 'Fathers' }
	]);
	let activeModeIdx = $derived(modeItems.findIndex((m) => m.key === $prefs.readingMode));
	// Show pill on chapter pages and home page; hide on other non-chapter pages (search, etc.)
	let displayModeIdx = $derived(
		isChapterPage || isHomePage ? (activeModeIdx >= 0 ? activeModeIdx : 0) : -1
	);

	let showTabBar = $state(true);
	let pendingIdx = $state(-1);

	async function selectMode(key: string, index: number) {
		if (!isChapterPage) {
			// Not on a chapter page — prefer navOverride context (e.g. search result),
			// then fall back to last reading position, then genesis 1.
			const pos = get(readingPosition);
			const slug = bookSlug || pos?.bookSlug || 'genesis';
			const ch = parseInt(chapterNum, 10) || pos?.chapter || 1;
			if (key === 'fathers') {
				goto(`/fathers/${slug}/${ch}`);
			} else if (key === 'compare') {
				goto(`/compare/${slug}/${ch}`);
			} else {
				prefs.update((p) => ({ ...p, readingMode: key as 'reading' | 'study' }));
				goto(`${routeBase}/${slug}/${ch}`);
			}
			return;
		}
		if (key === 'fathers') {
			pendingIdx = index;
			const delay = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 210;
			await new Promise<void>((r) => setTimeout(r, delay));
			goto(`/fathers/${bookSlug}/${chapterNum}`);
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

	run(() => {
		if (browser) {
			document.body.style.overflow = '';
		}
	});
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
		activeModeIdx={displayModeIdx}
		{pendingIdx}
		onModeSelect={handleModeSelect}
		onLogoClick={closeAll}
		logoHref={isChapterPage ? `${routeBase}/genesis/1` : '/'}
	>
		<!-- Mobile prefs toggle (TopBar-specific) -->
		<button
			class="md:hidden ml-auto shrink-0 flex items-center justify-center w-[30px] h-[30px]
				rounded-[3px] transition-colors duration-fast
				{prefsOpen ? 'text-accent' : 'text-subtle hover:text-foreground'}"
			aria-label="Reading options"
			aria-expanded={prefsOpen}
			aria-haspopup="dialog"
			onclick={togglePrefs}
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				fill="none"
				viewBox="0 0 24 24"
				stroke-width="1.5"
				stroke="currentColor"
				width="20"
				height="20"
				aria-hidden="true"
				style="transition: transform 250ms ease; transform: rotate({prefsOpen ? 30 : 0}deg)"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z"
				/>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
				/>
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
					onclick={() => {
						translationOpen = !translationOpen;
						prefsOpen = false;
						navOpen = false;
					}}
				>
					<span class="text-[11px] md:text-[14px] leading-tight font-medium"
						>{currentTranslation.abbr}</span
					>
					<svg
						width="9"
						height="6"
						viewBox="0 0 9 6"
						fill="none"
						stroke="currentColor"
						stroke-width="1.8"
						stroke-linecap="round"
						stroke-linejoin="round"
						aria-hidden="true"
						class="trans-chevron"
						class:trans-chevron--open={translationOpen}><path d="M1 1l3.5 3.5L8 1" /></svg
					>
				</button>
				{#if translationOpen}
					<div
						in:fly={{ y: -6, duration: 160 }}
						out:fade={{ duration: 100 }}
						class="trans-panel absolute top-[calc(100%+6px)] left-0 z-[60] font-ui"
					>
						{#each liveTranslations as t (t.id)}
							{@const isCurrent = t.id === translationId}
							{@const href =
								t.id === 'odr'
									? `/odr/${bookSlug}/${chapterNum}`
									: `/${t.id}/${bookSlug}/${chapterNum}`}
							{#if isCurrent}
								<div class="trans-item trans-item--active">
									<div class="trans-bar"></div>
									<div class="trans-body">
										<div class="trans-texts">
											<span class="trans-label">{t.label}</span>
											{#if t.micro}<span class="trans-micro">{t.micro}</span>{/if}
										</div>
										<span class="trans-year">{t.year}</span>
									</div>
								</div>
							{:else}
								<a
									{href}
									onclick={() => {
										translationOpen = false;
									}}
									class="trans-item trans-item--link"
								>
									<div class="trans-bar"></div>
									<div class="trans-body">
										<div class="trans-texts">
											<span class="trans-label">{t.label}</span>
											{#if t.micro}<span class="trans-micro">{t.micro}</span>{/if}
										</div>
										<span class="trans-year">{t.year}</span>
									</div>
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
						<ChapterNavLink
							href={prevChapterHref}
							direction="prev"
							chapter={chapterNumInt - 1}
							isPsalms={bookSlug === 'psalms'}
						/>
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
					onclick={() => {
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
						<ChapterNavLink
							href={nextChapterHref}
							direction="next"
							chapter={chapterNumInt + 1}
							isPsalms={bookSlug === 'psalms'}
						/>
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
					onclick={() => {
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
	<PrefsPanel {translationId} />
{/if}

{#if navOpen || prefsOpen || translationOpen}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="fixed inset-0 z-[49]" role="presentation" onclick={closeAll}></div>
{/if}

<style>
	/* ── Translation selector chevron ───────────────────── */
	.trans-chevron {
		opacity: 0.6;
		flex-shrink: 0;
		transition: transform 200ms ease;
	}
	.trans-chevron--open {
		transform: rotate(180deg);
	}

	/* ── Translation dropdown panel ─────────────────────── */
	.trans-panel {
		width: 330px;
		background: var(--color-panel);
		border: 1px solid var(--color-border);
		border-radius: 5px;
		box-shadow:
			0 4px 8px rgba(0, 0, 0, 0.07),
			0 12px 28px rgba(0, 0, 0, 0.1);
		overflow: hidden;
	}

	.trans-item {
		display: flex;
		align-items: stretch;
		min-height: 52px;
		border-bottom: 1px solid color-mix(in srgb, var(--color-border) 60%, transparent);
	}
	.trans-item:last-child {
		border-bottom: none;
	}

	.trans-bar {
		width: 2px;
		flex-shrink: 0;
		background: transparent;
		transition: background 130ms ease;
	}

	.trans-body {
		flex: 1;
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px 16px 12px 14px;
		min-width: 0;
	}

	.trans-texts {
		flex: 1;
		min-width: 0;
	}

	.trans-label {
		font-size: 14px;
		font-weight: 500;
		color: var(--color-text);
		display: block;
		line-height: 1.35;
	}

	.trans-micro {
		font-size: 11px;
		color: var(--color-subtle);
		display: block;
		margin-top: 2px;
		line-height: 1.3;
	}

	.trans-year {
		font-size: 12px;
		color: var(--color-subtle);
		white-space: nowrap;
		flex-shrink: 0;
		letter-spacing: 0.02em;
	}

	/* Active row */
	.trans-item--active {
		background: color-mix(in srgb, var(--color-accent) 7%, var(--color-panel));
	}
	.trans-item--active .trans-bar {
		background: var(--color-accent);
	}
	.trans-item--active .trans-label {
		font-weight: 600;
	}
	.trans-item--active .trans-year {
		color: var(--color-accent);
		font-weight: 600;
	}

	/* Hover row */
	.trans-item--link {
		cursor: pointer;
		text-decoration: none;
		transition: background 130ms ease;
	}
	.trans-item--link:hover {
		background: color-mix(in srgb, var(--color-foreground) 4%, var(--color-panel));
	}
	.trans-item--link:hover .trans-bar {
		background: color-mix(in srgb, var(--color-accent) 40%, transparent);
	}
	.trans-item--link:hover .trans-label,
	.trans-item--link:hover .trans-year {
		color: var(--color-accent);
	}
</style>
