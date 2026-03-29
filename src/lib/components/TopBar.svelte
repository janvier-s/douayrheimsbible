<script lang="ts">
	import { getBookBySlug } from '$lib/data/books';
	import { slide } from 'svelte/transition';
	import { goto } from '$app/navigation';
	import { prefs } from '$lib/stores/prefs';
	import FloatingNav from './FloatingNav.svelte';
	import SpotlightSearch from './SpotlightSearch.svelte';
	import ReadingPrefs from './ReadingPrefs.svelte';
	import ModeToggle from './ModeToggle.svelte';

	export let bookSlug: string;
	export let chapterNum: string;
	export let hasStudyMode = false;

	let navOpen = false;
	let prefsOpen = false;
	let translationOpen = false;
	let searchOpen = false;

	$: bookMeta = getBookBySlug(bookSlug);

	function getProtestantPsalmNum(n: number): string {
		if (n <= 8) return String(n);
		if (n === 9) return '9\u201310';
		if (n >= 10 && n <= 112) return String(n + 1);
		if (n === 113) return '114\u2013115';
		if (n === 114 || n === 115) return '116';
		if (n >= 116 && n <= 145) return String(n + 1);
		if (n === 146 || n === 147) return '147';
		return String(n);
	}

	$: displayName = bookMeta
		? $prefs.modernBookNames
			? bookMeta.modernName
			: bookMeta.odrName
		: '';

	$: psalmSuffix =
		$prefs.showPsalmNumbers && bookMeta?.slug === 'psalms' && chapterNum
			? ` (${getProtestantPsalmNum(parseInt(chapterNum, 10))})`
			: '';

	$: navLabel = bookMeta ? `${displayName} ${chapterNum}${psalmSuffix}` : 'Go to\u2026';

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

	let pendingIdx = -1;

	async function handleModeSelect(e: CustomEvent<{ key: string; index: number }>) {
		const { key, index } = e.detail;
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
</script>

<SpotlightSearch bind:open={searchOpen} />

<header class="sticky top-0 z-50 font-ui">
	<!-- Row 1: branding + mode + search -->
	<div
		class="bg-glass backdrop-blur-sm border-b border-border px-lg flex items-center gap-[10px] relative"
		style="height: 50px;"
	>
		<!-- Logo: absolute-centered on mobile, in-flow on desktop -->
		<a
			href="/"
			class="flex items-center gap-[6px] group shrink-0
				   max-md:absolute max-md:left-1/2 max-md:-translate-x-1/2"
			on:click={closeAll}
		>
			<span class="text-accent text-[15px] leading-none select-none" aria-hidden="true">✠</span>
			<span
				class="text-[12px] uppercase tracking-[0.2em] font-semibold text-foreground group-hover:text-accent transition-colors duration-fast"
			>
				Douay-Rheims
			</span>
		</a>

		<!-- Spacer (desktop only) -->
		<div class="hidden md:flex flex-1"></div>

		<ModeToggle
			items={modeItems}
			activeIndex={activeModeIdx}
			pendingIndex={pendingIdx}
			on:select={handleModeSelect}
		/>

		<!-- Search icon -->
		<button
			class="ml-auto md:ml-0 shrink-0 flex items-center justify-center w-[30px] h-[30px]
				rounded-[3px] text-subtle hover:text-foreground transition-colors duration-fast"
			aria-label="Search"
			on:click={() => (searchOpen = true)}
		>
			<svg
				width="15"
				height="15"
				viewBox="0 0 15 15"
				fill="none"
				stroke="currentColor"
				stroke-width="1.5"
				stroke-linecap="round"
			>
				<circle cx="6.5" cy="6.5" r="4.5" />
				<line x1="10" y1="10" x2="14" y2="14" />
			</svg>
		</button>
	</div>

	<!-- Row 2: reading controls -->
	<div
		class="bg-glass backdrop-blur-sm border-b border-border px-lg flex items-center gap-[10px] relative"
		style="height: 60px;"
	>
		<!-- Left: translation selector -->
		<div class="relative shrink-0">
			<button
				class="flex items-center gap-[8px] px-[10px] py-[4px] rounded-[3px] transition-colors duration-fast
					{translationOpen ? 'bg-accent text-white' : 'text-foreground hover:text-accent'}"
				aria-expanded={translationOpen}
				aria-haspopup="listbox"
				on:click={() => {
					translationOpen = !translationOpen;
					prefsOpen = false;
					navOpen = false;
				}}
			>
				<div class="text-left">
					<div
						class="text-[9px] uppercase tracking-[0.15em] leading-none mb-[2px]
							{translationOpen ? 'text-white/70' : 'text-subtle'}"
					>
						Translation
					</div>
					<div class="text-[13px] font-medium leading-none">ODR</div>
				</div>
				<span
					class="text-[10px] {translationOpen ? 'text-white/70' : 'text-subtle'} leading-none"
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

		<!-- Center: chapter nav — absolutely centered so unequal sides don't shift it -->
		<div class="absolute left-1/2 -translate-x-1/2">
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
				<span class="text-[16px] font-medium">{navLabel}</span>
				<span class="text-[12px] opacity-70 leading-none" aria-hidden="true"
					>{navOpen ? '▲' : '▼'}</span
				>
			</button>
		</div>

		<!-- Right: reading prefs (ml-auto pushes to right) -->
		<div class="ml-auto shrink-0">
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

{#if navOpen}
	<FloatingNav
		{bookSlug}
		chapterNum={parseInt(chapterNum, 10) || 0}
		onClose={() => (navOpen = false)}
	/>
{/if}

{#if prefsOpen}
	<div
		transition:slide={{ duration: 180 }}
		class="fixed top-[var(--header-height)] right-md bg-panel border border-border rounded-sm shadow-lg p-md z-50 w-72 font-ui"
		role="dialog"
		aria-label="Reading options"
	>
		<ReadingPrefs />
	</div>
{/if}

{#if navOpen || prefsOpen || translationOpen}
	<div
		class="fixed inset-0 z-40"
		role="presentation"
		on:click={closeAll}
		on:keydown={(e) => {
			if (e.key === 'Escape') closeAll();
		}}
	></div>
{/if}
