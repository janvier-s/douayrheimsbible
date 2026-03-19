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
		'libre-baskerville': "'Libre Baskerville', Georgia, serif",
		sentinel: "'Sentinel', Georgia, serif",
		'century-old-style': "'Century Old Style', Georgia, serif",
		verdana: 'Verdana, Geneva, sans-serif',
		'libre-franklin': "'Libre Franklin', sans-serif",
		lexend: "'Lexend', sans-serif"
	};

	const GF_URLS: Record<string, string> = {
		'libre-baskerville':
			'https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&display=swap',
		'libre-franklin':
			'https://fonts.googleapis.com/css2?family=Libre+Franklin:ital,wght@0,400;0,700;1,400&display=swap'
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
			// Inject Google Fonts link so the selector button renders in the correct font immediately
			const gfUrl = GF_URLS[p.fontFamily];
			if (gfUrl && !document.querySelector(`link[data-gf="${p.fontFamily}"]`)) {
				const link = document.createElement('link');
				link.rel = 'stylesheet';
				link.href = gfUrl;
				link.dataset.gf = p.fontFamily;
				document.head.appendChild(link);
			}
		}
		// app.html script handles pre-paint theme; sync post-hydration
		const savedTheme = localStorage.getItem('theme');
		document.documentElement.setAttribute('data-theme', savedTheme || 'auto');
	});
</script>

<div class="min-h-screen bg-background text-foreground" style="font-family: var(--font-reader)">
	<TopBar {bookSlug} {chapterNum} />
	{#key $page.url.pathname}
		<slot />
	{/key}
</div>
