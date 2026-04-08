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

	function getHebPsalmNum(n: number): string | null {
		if (n <= 8) return null;
		if (n === 9) return '9\u201310';
		if (n >= 10 && n <= 112) return String(n + 1);
		if (n === 113) return '114\u2013115';
		if (n === 114 || n === 115) return '116';
		if (n >= 116 && n <= 145) return String(n + 1);
		if (n === 146 || n === 147) return '147';
		return null;
	}

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

	async function selectMode(key: string, index: number) {
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
</script>

<SpotlightSearch bind:open={searchOpen} />

<header class="sticky top-0 z-50 font-ui">
	<!-- Row 1: branding + mode + search -->
	<div
		class="bg-glass backdrop-blur-sm border-b border-border px-lg flex items-center gap-[10px] relative"
		style="height: 50px;"
	>
		<!-- Logo: in-flow on both mobile and desktop -->
		<a
			href="/"
			aria-label="Douay-Rheims"
			class="flex items-center gap-[6px] group shrink-0"
			on:click={closeAll}
		>
			<span class="text-accent text-[15px] leading-none select-none" aria-hidden="true">✠</span>
			<!-- Desktop: single line -->
			<span
				class="hidden md:block text-[12px] uppercase tracking-[0.2em] font-semibold text-foreground group-hover:text-accent transition-colors duration-fast"
			>
				Douay-Rheims
			</span>
			<!-- Mobile: two lines stacked -->
			<span class="md:hidden flex flex-col gap-[1px] leading-[1.2]" aria-hidden="true">
				<span
					class="text-[7px] uppercase tracking-[0.18em] font-bold text-foreground group-hover:text-accent transition-colors duration-fast"
					>Douay</span
				>
				<span
					class="text-[7px] uppercase tracking-[0.18em] font-bold text-foreground group-hover:text-accent transition-colors duration-fast"
					>Rheims</span
				>
			</span>
		</a>

		<!-- Spacer (desktop only) -->
		<div class="hidden md:flex flex-1"></div>

		<div class="hidden md:flex">
			<ModeToggle
				items={modeItems}
				activeIndex={activeModeIdx}
				pendingIndex={pendingIdx}
				on:select={handleModeSelect}
			/>
		</div>

		<!-- Search icon — desktop only -->
		<button
			class="hidden md:flex ml-0 shrink-0 items-center justify-center w-[30px] h-[30px]
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

		<!-- Reading options sliders icon — mobile only, Row 1 -->
		<button
			class="md:hidden ml-auto shrink-0 flex items-center justify-center w-[30px] h-[30px]
				rounded-[3px] transition-colors duration-fast
				{prefsOpen ? 'text-accent' : 'text-subtle hover:text-foreground'}"
			aria-label="Reading options"
			aria-expanded={prefsOpen}
			aria-haspopup="dialog"
			on:click={() => {
				prefsOpen = !prefsOpen;
				translationOpen = false;
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

		<!-- Center: chapter nav — absolute on desktop, flex-1 centered on mobile -->
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
				<span class="text-[16px] font-medium">{navLabel}</span>
				<span class="text-[12px] opacity-70 leading-none" aria-hidden="true"
					>{navOpen ? '▲' : '▼'}</span
				>
			</button>
		</div>

		<!-- Right: reading prefs — desktop only (mobile uses sliders icon in Row 1) -->
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

<!-- Bottom tab bar — mobile only -->
<nav
	class="md:hidden fixed bottom-0 inset-x-0 z-50 bg-glass backdrop-blur-sm border-t border-border font-ui"
	style="padding-bottom: env(safe-area-inset-bottom);"
	aria-label="Main navigation"
>
	<div class="flex" style="height: 56px;">
		{#each modeItems as item, i}
			<button
				class="flex-1 flex flex-col items-center justify-center gap-[3px] transition-colors duration-fast
                    {pendingIdx === i || (pendingIdx === -1 && activeModeIdx === i)
					? 'text-accent'
					: 'text-subtle hover:text-foreground'}"
				aria-label={item.label}
				aria-pressed={activeModeIdx === i}
				on:click={() => selectMode(item.key, i)}
			>
				{#if item.key === 'reading'}
					<svg
						width="18"
						height="18"
						viewBox="0 0 18 18"
						fill="none"
						stroke="currentColor"
						stroke-width="1.5"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<rect x="3" y="2" width="12" height="14" rx="1.5" />
						<line x1="6" y1="6" x2="12" y2="6" />
						<line x1="6" y1="9" x2="12" y2="9" />
						<line x1="6" y1="12" x2="9" y2="12" />
					</svg>
				{:else if item.key === 'study'}
					<svg
						width="18"
						height="18"
						viewBox="0 0 18 18"
						fill="none"
						stroke="currentColor"
						stroke-width="1.5"
						stroke-linecap="round"
					>
						<circle cx="9" cy="9" r="7" />
						<line x1="9" y1="6" x2="9" y2="9.5" />
						<circle cx="9" cy="12" r="0.8" fill="currentColor" stroke="none" />
					</svg>
				{:else if item.key === 'compare'}
					<svg
						width="18"
						height="18"
						viewBox="0 0 18 18"
						fill="none"
						stroke="currentColor"
						stroke-width="1.5"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<line x1="3" y1="9" x2="15" y2="9" />
						<polyline points="11,5 15,9 11,13" />
						<polyline points="7,5 3,9 7,13" />
					</svg>
				{/if}
				<span class="text-[8px] uppercase tracking-[0.1em] font-medium">{item.label}</span>
			</button>
		{/each}
		<!-- Search tab -->
		<button
			class="flex-1 flex flex-col items-center justify-center gap-[3px] transition-colors duration-fast
                    {searchOpen ? 'text-accent' : 'text-subtle hover:text-foreground'}"
			aria-label="Search"
			on:click={() => (searchOpen = true)}
		>
			<svg
				width="18"
				height="18"
				viewBox="0 0 18 18"
				fill="none"
				stroke="currentColor"
				stroke-width="1.5"
				stroke-linecap="round"
			>
				<circle cx="8" cy="8" r="5.5" />
				<line x1="12" y1="12" x2="16" y2="16" />
			</svg>
			<span class="text-[8px] uppercase tracking-[0.1em] font-medium">Search</span>
		</button>
	</div>
</nav>

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
		class="fixed inset-0 z-[55]"
		role="presentation"
		on:click={closeAll}
		on:keydown={(e) => {
			if (e.key === 'Escape') closeAll();
		}}
	></div>
{/if}
