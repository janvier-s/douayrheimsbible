<script lang="ts">
	import { onMount } from 'svelte';
	import type { PageData } from './$types';

	export let data: PageData;

	let results: Array<{ url: string; meta: Record<string, string>; excerpt: string }> = [];
	let loading = true;

	onMount(async () => {
		if (!data.query) {
			loading = false;
			return;
		}
		try {
			// @ts-ignore — pagefind loaded at build time, not available in dev
			const pagefind = await import('/pagefind/pagefind.js');
			const search = await pagefind.search(data.query);
			results = await Promise.all(
				search.results.map((r: { data: () => Promise<unknown> }) => r.data())
			);
		} catch {
			// Pagefind not available in dev mode — only after npm run build
		} finally {
			loading = false;
		}
	});
</script>

<svelte:head>
	<title>Search: {data.query} — ODR Bible</title>
</svelte:head>

<main class="max-w-[750px] mx-auto px-md py-xl font-ui">
	<h1 class="text-2xl font-reader mb-lg">
		Search results for <em class="text-interactive">"{data.query}"</em>
	</h1>

	{#if loading}
		<p class="text-muted">Searching…</p>
	{:else if results.length === 0}
		<p class="text-muted">No results found.</p>
	{:else}
		<ul class="space-y-md">
			{#each results as r}
				<li>
					<a
						href={r.url}
						class="block hover:bg-interactive hover:bg-opacity-5 rounded-sm p-sm -mx-sm transition-colors duration-fast"
					>
						<p class="text-interactive font-medium text-sm mb-xs">{r.meta?.title ?? r.url}</p>
						<p class="text-foreground text-sm leading-relaxed">{@html r.excerpt}</p>
					</a>
				</li>
			{/each}
		</ul>
	{/if}
</main>
