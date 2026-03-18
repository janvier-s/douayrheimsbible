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
	$: navLabel = bookMeta ? `${bookMeta.odrName} ${chapterNum} ▾` : 'Go to…';

	function toggleTheme() {
		const current = document.documentElement.getAttribute('data-theme');
		const next = current === 'dark' ? 'light' : 'dark';
		document.documentElement.setAttribute('data-theme', next);
		localStorage.setItem('theme', next);
	}
</script>

<header class="sticky top-0 z-50 bg-background border-b border-border px-md py-sm font-ui">
	<div class="flex items-center">
		<!-- Left: logo + nav trigger -->
		<div class="flex items-center gap-md shrink-0">
			<a href="/" class="font-ui font-medium text-foreground hover:text-interactive text-sm">
				ODR Bible
			</a>
			<button
				class="text-sm text-interactive hover:underline"
				on:click={() => (navOpen = !navOpen)}
			>
				{navLabel}
			</button>
		</div>

		<!-- Center: search -->
		<div class="flex-1 flex justify-center px-md">
			<div class="w-full max-w-sm">
				<SearchBar />
			</div>
		</div>

		<!-- Right: prefs + theme -->
		<div class="flex items-center gap-xs shrink-0">
			<button
				class="text-muted hover:text-foreground text-sm px-sm"
				title="Reading preferences"
				on:click={() => (prefsOpen = !prefsOpen)}
			>
				Aa
			</button>
			<button
				class="text-muted hover:text-foreground text-sm"
				title="Toggle dark mode"
				on:click={toggleTheme}
			>
				◑
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
		class="fixed top-14 right-md bg-panel border border-border rounded-md shadow-md p-md z-50 w-72 font-ui"
	>
		<ReadingPrefs />
	</div>
{/if}
