<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { getBookBySlug, getHebPsalmNum } from '$lib/data/books';
	import { slide, fade } from 'svelte/transition';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import { get } from 'svelte/store';
	import { prefs } from '$lib/stores/prefs';
	import { readingPosition } from '$lib/stores/reading';
	import { isMobile } from '$lib/stores/mobile';
	import FloatingNav from './FloatingNav.svelte';
	import BrandingRow from './BrandingRow.svelte';
	import BottomTabBar from './BottomTabBar.svelte';
	import PrefsPanel from './PrefsPanel.svelte';

	export let bookSlug: string;
	export let chapterNum: string;
	export let isChapterPage = false;
	export let hasStudyMode = false;

	$: showTabBar = true;

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
	// No active mode when not on a chapter page (search, home, etc.)
	$: displayModeIdx = isChapterPage ? activeModeIdx : -1;

	let pendingIdx = -1;

	async function selectMode(key: string, index: number) {
		if (!isChapterPage) {
			// Not on a chapter page — navigate to the last reading position (or genesis 1).
			const pos = get(readingPosition);
			const slug = pos?.bookSlug || bookSlug || 'genesis';
			const ch = pos?.chapter || 1;
			if (key === 'compare') {
				goto(`/compare/${slug}/${ch}`);
			} else {
				prefs.update((p) => ({ ...p, readingMode: key as 'reading' | 'study' }));
				goto(`/odr/${slug}/${ch}`);
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
		showModeToggle={isChapterPage}
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
				<span class="text-[11px] md:text-[14px] leading-tight font-medium">ODR</span>
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
					class="absolute top-[calc(100%+8px)] left-0 bg-panel border border-border rounded-sm shadow-lg p-sm z-50 w-56 font-ui text-sm"
				>
					<p class="text-[11px] uppercase tracking-[0.15em] text-subtle mb-sm font-medium">
						Translation
					</p>
					<div class="flex items-center justify-between px-sm py-[7px] rounded-sm bg-accent/10">
						<span class="text-foreground font-medium text-[13px]">Original Douay-Rheims</span>
						<span class="text-[10px] text-accent font-semibold tracking-[0.1em]">✓</span>
					</div>
					<p class="text-[11px] text-subtle mt-sm px-sm">More translations coming soon.</p>
				</div>
			{/if}
		</div>

		<!-- Center: chapter nav -->
		<div
			class="md:absolute md:left-1/2 md:-translate-x-1/2 max-md:flex-1 max-md:flex max-md:justify-center"
		>
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
	/>
{/if}

{#if prefsOpen}
	<PrefsPanel />
{/if}

{#if navOpen || prefsOpen || translationOpen}
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<div class="fixed inset-0 z-[57]" role="presentation" on:click={closeAll}></div>
{/if}
