<script lang="ts">
	import '../app.css';
	import TopBar from '$lib/components/TopBar.svelte';
	import { page } from '$app/stores';

	$: bookSlug = $page.params.book ?? '';
	$: chapterNum = $page.params.chapter ?? '';
</script>

<div class="min-h-screen bg-background text-foreground" style="font-family: var(--font-reader)">
	<TopBar {bookSlug} {chapterNum} />
	<slot />
</div>
