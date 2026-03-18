<script lang="ts">
	import { getBookBySlug } from '$lib/data/books';
	import FloatingNav from './FloatingNav.svelte';
	import SearchBar from './SearchBar.svelte';
	import ReadingPrefs from './ReadingPrefs.svelte';

	export let bookSlug: string;
	export let chapterNum: string;

	let navOpen = false;
	let prefsOpen = false;

	$: bookMeta = getBookBySlug(bookSlug);
	$: navLabel = bookMeta ? `${bookMeta.odrName} ${chapterNum}` : 'Go to…';
</script>

<header
	class="sticky top-0 z-50 bg-glass backdrop-blur-sm border-b border-border px-lg py-sm font-ui"
>
	<div class="flex items-center">
		<!-- Left: logo + nav trigger -->
		<div class="flex items-center gap-md shrink-0">
			<a
				href="/"
				class="font-ui text-[11px] uppercase tracking-[0.2em] font-medium text-foreground hover:text-interactive transition-colors duration-fast"
			>
				ODR Bible
			</a>
			<button
				class="text-[13px] text-subtle hover:text-interactive transition-colors duration-fast flex items-center gap-[5px]"
				on:click={() => (navOpen = !navOpen)}
			>
				{navLabel}
				<span class="text-[10px] opacity-60">{navOpen ? '▴' : '▾'}</span>
			</button>
		</div>

		<!-- Center: search -->
		<div class="flex-1 flex justify-center px-md">
			<div class="w-full max-w-sm">
				<SearchBar />
			</div>
		</div>

		<!-- Right: prefs -->
		<div class="flex items-center shrink-0">
			<button
				class="text-subtle hover:text-foreground text-[13px] transition-colors duration-fast px-xs"
				title="Reading preferences"
				on:click={() => (prefsOpen = !prefsOpen)}
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

{#if prefsOpen}
	<div
		class="fixed top-[53px] right-md bg-panel border border-border rounded-sm shadow-lg p-md z-50 w-72 font-ui"
	>
		<ReadingPrefs />
	</div>
{/if}
