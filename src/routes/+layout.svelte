<script lang="ts">
	import { onMount } from 'svelte';
	import '../app.css';
	import TopBar from '$lib/components/TopBar.svelte';
	import { page } from '$app/stores';
	import { prefs } from '$lib/stores/prefs';
	import { readingPosition } from '$lib/stores/reading';

	// Reset store on every SvelteKit navigation so the label stays in sync.
	// The chapter page's onMount then immediately sets the correct value.
	$: if ($page.params.book) {
		readingPosition.set({
			bookSlug: $page.params.book,
			chapter: parseInt($page.params.chapter ?? '1', 10)
		});
	}

	// Driven by the store — updates both on navigation and during infinite scroll.
	$: bookSlug = $readingPosition?.bookSlug ?? $page.params.book ?? '';
	$: chapterNum = $readingPosition
		? String($readingPosition.chapter)
		: ($page.params.chapter ?? '');

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
		// Restore theme (app.html script handles pre-paint; this syncs data-theme attr post-hydration)
		const savedTheme = localStorage.getItem('theme');
		if (savedTheme && savedTheme !== 'light') {
			document.documentElement.setAttribute('data-theme', savedTheme);
		}
	});
</script>

<div class="min-h-screen bg-background text-foreground" style="font-family: var(--font-reader)">
	<TopBar {bookSlug} {chapterNum} />
	{#key $page.url.pathname}
		<slot />
	{/key}
</div>
