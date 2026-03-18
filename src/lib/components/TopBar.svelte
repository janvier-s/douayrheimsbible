<script lang="ts">
	import { getBookBySlug } from '$lib/data/books';
	import FloatingNav from './FloatingNav.svelte';
	import SearchBar from './SearchBar.svelte';

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

<header
	class="sticky top-0 z-50 bg-background border-b border-border px-md py-sm flex items-center gap-md font-ui"
>
	<a href="/" class="font-ui font-medium text-foreground hover:text-interactive text-sm shrink-0">
		ODR Bible
	</a>

	<button
		class="text-sm text-interactive hover:underline shrink-0"
		on:click={() => (navOpen = !navOpen)}
	>
		{navLabel}
	</button>

	<div class="flex-1 max-w-md">
		<SearchBar />
	</div>

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
		class="fixed top-14 right-md bg-panel border border-border rounded-md shadow-md p-md z-50 w-72"
	>
		<p class="text-sm text-muted">Reading preferences (coming soon)</p>
	</div>
{/if}
