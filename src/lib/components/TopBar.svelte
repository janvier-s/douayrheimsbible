<script lang="ts">
	import { getBookBySlug } from '$lib/data/books';
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
</script>

<header class="sticky top-0 z-50 font-ui">
	<!-- Row 1: branding + search -->
	<div
		class="bg-glass backdrop-blur-sm border-b border-border px-lg flex items-center gap-md"
		style="height: 50px;"
	>
		<a href="/" class="flex items-center gap-[6px] group shrink-0" on:click={closeAll}>
			<span class="text-interactive text-[15px] leading-none select-none">✠</span>
			<span
				class="text-[12px] uppercase tracking-[0.2em] font-semibold text-foreground group-hover:text-interactive transition-colors duration-fast"
			>
				Douay-Rheims
			</span>
		</a>
		<div class="flex-1"></div>
		<div class="w-[280px]">
			<SearchBar />
		</div>
	</div>

	<!-- Row 2: reading controls -->
	<div
		class="bg-glass backdrop-blur-sm border-b border-border px-lg relative flex items-center"
		style="height: 40px;"
	>
		<!-- Left: translation selector -->
		<div class="relative shrink-0">
			<button
				class="flex items-center gap-[8px] px-[10px] py-[4px] rounded-[3px] border transition-colors duration-fast
					{translationOpen
					? 'bg-interactive text-white border-interactive'
					: 'border-border hover:border-interactive hover:text-interactive text-foreground'}"
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
					class="absolute top-[calc(100%+8px)] left-0 bg-panel border border-border rounded-sm shadow-lg p-sm z-50 w-56 font-ui text-sm"
				>
					<p class="text-[11px] uppercase tracking-[0.15em] text-subtle mb-sm font-medium">
						Translation
					</p>
					<div
						class="flex items-center justify-between px-sm py-[7px] rounded-sm bg-interactive/10"
					>
						<span class="text-foreground font-medium text-[13px]">Original Douay-Rheims</span>
						<span class="text-[10px] text-interactive font-semibold tracking-[0.1em]">✓</span>
					</div>
					<p class="text-[11px] text-subtle mt-sm px-sm">More translations coming soon.</p>
				</div>
			{/if}
		</div>

		<!-- Center: chapter nav — absolutely centered -->
		<div class="absolute left-1/2 -translate-x-1/2">
			<button
				class="flex items-center gap-[6px] px-[12px] py-[5px] rounded-[3px] border border-border hover:border-interactive hover:text-interactive transition-colors duration-fast text-foreground"
				on:click={() => {
					navOpen = !navOpen;
					prefsOpen = false;
					translationOpen = false;
				}}
			>
				<span class="text-[14px] font-medium">{navLabel}</span>
				<span class="text-[11px] text-subtle leading-none">{navOpen ? '▲' : '▼'}</span>
			</button>
		</div>

		<!-- Right: reading prefs -->
		<button
			class="ml-auto w-[28px] h-[28px] flex items-center justify-center rounded-[3px] text-muted hover:text-interactive transition-colors duration-fast text-[12px] font-semibold shrink-0"
			title="Reading preferences"
			on:click={() => {
				prefsOpen = !prefsOpen;
				translationOpen = false;
				navOpen = false;
			}}
		>
			Aa
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
		class="fixed top-[90px] right-md bg-panel border border-border rounded-sm shadow-lg p-md z-50 w-72 font-ui"
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
