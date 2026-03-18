<script lang="ts">
	import { onMount } from 'svelte';
	import '../app.css';
	import TopBar from '$lib/components/TopBar.svelte';
	import { page } from '$app/stores';
	import { prefs } from '$lib/stores/prefs';

	$: bookSlug = $page.params.book ?? '';
	$: chapterNum = $page.params.chapter ?? '';

	const FONT_STACKS: Record<string, string> = {
		'fs-brabo-pro': "'FS Brabo Pro', Georgia, serif",
		'libre-baskerville': "'Libre Baskerville', Georgia, serif",
		'atkinson-hyperlegible': "'Atkinson Hyperlegible', sans-serif",
		'linux-libertine': "'Linux Libertine', 'Linux Libertine O', Georgia, serif",
		inter: "'Inter', sans-serif",
		lexend: "'Lexend', sans-serif"
	};

	onMount(() => {
		const p = $prefs;
		document.documentElement.style.setProperty('--font-size-reader', `${p.fontSize}px`);
		document.documentElement.style.setProperty('--line-height-reader', String(p.lineHeight));
		if (p.dyslexiaFont) {
			document.documentElement.style.setProperty(
				'--font-reader',
				"'Grace Dyslexic MD', sans-serif"
			);
			document.documentElement.style.setProperty('--font-ui', "'Grace Dyslexic MD', sans-serif");
		} else {
			const stack = FONT_STACKS[p.fontFamily];
			if (stack) document.documentElement.style.setProperty('--font-reader', stack);
		}
	});
</script>

<div class="min-h-screen bg-background text-foreground" style="font-family: var(--font-reader)">
	<TopBar {bookSlug} {chapterNum} />
	{#key $page.url.pathname}
		<slot />
	{/key}
</div>
