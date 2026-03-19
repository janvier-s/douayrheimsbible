<script lang="ts">
	import type { PageData } from './$types';

	export let data: PageData;
</script>

<svelte:head>
	<title>Search — ODR Bible</title>
</svelte:head>

<main class="max-w-[750px] mx-auto px-md py-xl font-ui">
	{#if data.query}
		<p class="text-muted">
			No passage found for <em class="text-foreground">"{data.query}"</em>. Try a reference like
			<em class="text-interactive">Genesis 1</em> or <em class="text-interactive">John 3:16</em>.
		</p>
	{:else}
		<p class="text-muted">
			Enter a passage reference in the search bar above, e.g.
			<em class="text-interactive">Romans 8</em> or <em class="text-interactive">Ps 23:1</em>.
		</p>
	{/if}
</main>
