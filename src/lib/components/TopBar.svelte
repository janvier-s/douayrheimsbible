<script lang="ts">
	import { getBookBySlug } from '$lib/data/books';
	import { slide } from 'svelte/transition';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { prefs } from '$lib/stores/prefs';
	import FloatingNav from './FloatingNav.svelte';
	import SearchBar from './SearchBar.svelte';
	import ReadingPrefs from './ReadingPrefs.svelte';

	export let bookSlug: string;
	export let chapterNum: string;

	let navOpen = false;
	let prefsOpen = false;
	let translationOpen = false;

	$: bookMeta = getBookBySlug(bookSlug);
	$: navLabel = bookMeta ? `${bookMeta.odrName} ${chapterNum}` : 'Go to…';

	function closeAll() {
		navOpen = false;
		prefsOpen = false;
		translationOpen = false;
	}

	function setMode(mode: 'reading' | 'study' | 'compare') {
		if (mode === 'compare') {
			goto(`/compare/${bookSlug}/${chapterNum}`);
			return;
		}
		prefs.update((p) => ({ ...p, readingMode: mode }));
		if ($page.url.pathname.startsWith('/compare')) {
			goto(`/odr/${bookSlug}/${chapterNum}`);
		}
	}

	$: isCompare = $page.url.pathname.startsWith('/compare');
	$: activeMode = isCompare ? 'compare' : $prefs.readingMode;
</script>

<header class="sticky top-0 z-50 font-ui">
	<!-- Row 1: branding + search -->
	<div
		class="bg-glass backdrop-blur-sm border-b border-border px-lg flex items-center gap-[10px]"
		style="height: 50px;"
	>
		<a href="/" class="flex items-center gap-[6px] group shrink-0" on:click={closeAll}>
			<span class="text-accent text-[15px] leading-none select-none" aria-hidden="true">✠</span>
			<span
				class="text-[12px] uppercase tracking-[0.2em] font-semibold text-foreground group-hover:text-accent transition-colors duration-fast"
			>
				Douay-Rheims
			</span>
		</a>
		<div class="flex-1"></div>
		<!-- Mode toggle -->
		<div
			class="flex items-center text-[11px] font-medium uppercase tracking-[0.1em] rounded-[3px] border border-border overflow-hidden shrink-0"
		>
			{#each [['reading', 'Reading'], ['study', 'Study'], ['compare', 'Compare']] as [mode, label]}
				<button
					class="px-[9px] py-[5px] transition-colors duration-fast
						{activeMode === mode ? 'bg-interactive text-white' : 'text-subtle hover:text-foreground'}
						{mode !== 'compare' ? 'border-r border-border' : ''}"
					on:click={() => setMode(mode as 'reading' | 'study' | 'compare')}
				>
					{label}
				</button>
			{/each}
		</div>
		<div class="w-[380px]">
			<SearchBar />
		</div>
	</div>

	<!-- Row 2: reading controls -->
	<div
		class="bg-glass backdrop-blur-sm border-b border-border px-lg flex items-center gap-[10px]"
		style="height: 60px;"
	>
		<!-- Left: translation selector -->
		<div class="relative shrink-0">
			<button
				class="flex items-center gap-[8px] px-[10px] py-[4px] rounded-[3px] transition-colors duration-fast
					{translationOpen ? 'bg-accent text-white' : 'text-foreground hover:text-accent'}"
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
				<span class="text-[10px] {translationOpen ? 'text-white/70' : 'text-subtle'} leading-none">
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

		<!-- Center: chapter nav — flex-1 centered (avoids absolute overlay click issues) -->
		<div class="flex-1 flex justify-center">
			<button
				class="flex items-center gap-[7px] px-[17px] py-[10px] rounded-[3px] transition-colors duration-fast
					{navOpen ? 'bg-accent text-white' : 'text-accent hover:bg-accent hover:text-white'}"
				on:click={() => {
					navOpen = !navOpen;
					prefsOpen = false;
					translationOpen = false;
				}}
			>
				<span class="text-[16px] font-medium">{navLabel}</span>
				<span class="text-[12px] opacity-70 leading-none">{navOpen ? '▲' : '▼'}</span>
			</button>
		</div>

		<!-- Right: reading prefs -->
		<button
			class="px-[8px] h-[28px] flex items-center justify-center rounded-[3px] transition-colors duration-fast text-[13px] font-medium shrink-0
				{prefsOpen ? 'bg-accent text-white' : 'text-muted hover:text-accent'}"
			title="Text options"
			on:click={() => {
				prefsOpen = !prefsOpen;
				translationOpen = false;
				navOpen = false;
			}}
		>
			Text options
		</button>
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
	>
		<ReadingPrefs />
	</div>
{/if}

<!-- Backdrop -->
{#if navOpen || prefsOpen || translationOpen}
	<div
		class="fixed inset-0 z-40"
		role="presentation"
		on:click={closeAll}
		on:keydown={() => {}}
	></div>
{/if}
