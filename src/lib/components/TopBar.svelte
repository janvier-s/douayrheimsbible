<script lang="ts">
	import { getBookBySlug } from '$lib/data/books';
	import FloatingNav from './FloatingNav.svelte';
	import SearchBar from './SearchBar.svelte';
	import ReadingPrefs from './ReadingPrefs.svelte';

	export let bookSlug: string;
	export let chapterNum: string;

	let navOpen = false;
	let prefsOpen = false;
	let searchOpen = false;
	let translationOpen = false;

	$: bookMeta = getBookBySlug(bookSlug);
	$: navLabel = bookMeta ? `${bookMeta.odrName} ${chapterNum}` : 'Go to…';

	function closeAll() {
		navOpen = false;
		prefsOpen = false;
		searchOpen = false;
		translationOpen = false;
	}
</script>

<header
	class="sticky top-0 z-50 bg-glass backdrop-blur-sm border-b border-border px-lg font-ui"
	style="height: 53px;"
>
	<div class="flex items-center h-full gap-md">
		<!-- Left: logo -->
		<div class="shrink-0 w-[160px]">
			<a href="/" class="flex items-center gap-[6px] group" on:click={closeAll}>
				<span class="text-interactive text-[15px] leading-none select-none">✠</span>
				<span
					class="font-ui text-[12px] uppercase tracking-[0.2em] font-semibold text-foreground group-hover:text-interactive transition-colors duration-fast"
				>
					Douay-Rheims
				</span>
			</a>
		</div>

		<!-- Center: nav trigger -->
		<div class="flex-1 flex justify-center">
			<button
				class="flex items-center gap-[6px] px-[14px] py-[6px] rounded-[3px] border border-border hover:border-interactive hover:text-interactive transition-colors duration-fast text-foreground"
				on:click={() => {
					navOpen = !navOpen;
					prefsOpen = false;
					searchOpen = false;
					translationOpen = false;
				}}
			>
				<span class="text-[15px] font-medium">{navLabel}</span>
				<span class="text-[11px] text-subtle">{navOpen ? '▴' : '▾'}</span>
			</button>
		</div>

		<!-- Right: translation + search + prefs -->
		<div class="shrink-0 w-[160px] flex items-center justify-end gap-[2px]">
			<!-- Translation badge -->
			<div class="relative">
				<button
					class="text-[11px] font-semibold tracking-[0.1em] uppercase px-[8px] py-[5px] rounded-[3px] border transition-colors duration-fast
						{translationOpen
						? 'bg-interactive text-white border-interactive'
						: 'border-border text-muted hover:border-interactive hover:text-interactive'}"
					title="Translation"
					on:click={() => {
						translationOpen = !translationOpen;
						prefsOpen = false;
						searchOpen = false;
						navOpen = false;
					}}
				>
					ODR
				</button>
				{#if translationOpen}
					<div
						class="absolute top-[calc(100%+8px)] right-0 bg-panel border border-border rounded-sm shadow-lg p-sm z-50 w-56 font-ui text-sm"
					>
						<p class="text-[11px] uppercase tracking-[0.15em] text-subtle mb-sm font-medium">
							Translation
						</p>
						<div
							class="flex items-center justify-between px-sm py-[7px] rounded-sm bg-interactive bg-opacity-8"
						>
							<span class="text-foreground font-medium text-[13px]">Original Douay-Rheims</span>
							<span class="text-[10px] text-interactive font-semibold tracking-[0.1em]">✓</span>
						</div>
						<p class="text-[11px] text-subtle mt-sm px-sm">More translations coming soon.</p>
					</div>
				{/if}
			</div>

			<!-- Search toggle -->
			<button
				class="w-[32px] h-[32px] flex items-center justify-center rounded-[3px] text-muted hover:text-interactive transition-colors duration-fast text-[16px]"
				title="Search"
				on:click={() => {
					searchOpen = !searchOpen;
					prefsOpen = false;
					translationOpen = false;
					navOpen = false;
				}}
			>
				⌕
			</button>

			<!-- Reading prefs -->
			<button
				class="w-[32px] h-[32px] flex items-center justify-center rounded-[3px] text-muted hover:text-interactive transition-colors duration-fast text-[13px] font-semibold"
				title="Reading preferences"
				on:click={() => {
					prefsOpen = !prefsOpen;
					searchOpen = false;
					translationOpen = false;
					navOpen = false;
				}}
			>
				Aa
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

{#if searchOpen}
	<div
		class="fixed top-[53px] right-md bg-panel border border-border rounded-sm shadow-lg p-md z-50 w-80 font-ui"
	>
		<SearchBar />
	</div>
{/if}

{#if prefsOpen}
	<div
		class="fixed top-[53px] right-md bg-panel border border-border rounded-sm shadow-lg p-md z-50 w-72 font-ui"
	>
		<ReadingPrefs />
	</div>
{/if}

<!-- Backdrop to close dropdowns -->
{#if navOpen || prefsOpen || searchOpen || translationOpen}
	<div
		class="fixed inset-0 z-40"
		role="presentation"
		on:click={closeAll}
		on:keydown={() => {}}
	></div>
{/if}
