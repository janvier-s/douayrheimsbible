<script lang="ts">
	import { onMount } from 'svelte';
	import '../app.css';
	import TopBar from '$lib/components/TopBar.svelte';
	import { page } from '$app/stores';
	import { prefs } from '$lib/stores/prefs';
	import { readingPosition } from '$lib/stores/reading';
	import { afterNavigate } from '$app/navigation';

	afterNavigate(({ from, to, type }) => {
		if (type === 'popstate') return;
		if (from?.url.pathname === to?.url.pathname) return;
		requestAnimationFrame(() =>
			requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'instant' }))
		);
	});

	// $page.params is the primary source on navigation.
	// readingPosition is only set by the ODR page during infinite scroll,
	// which may advance to a chapter/book not reflected in the URL params.
	$: bookSlug = $readingPosition?.bookSlug ?? $page.params.book ?? '';
	$: chapterNum = $readingPosition
		? String($readingPosition.chapter)
		: ($page.params.chapter ?? '');
	$: showTabBar = !!($page.params.book && $page.params.chapter);

	const FONT_STACKS: Record<string, string> = {
		'libre-baskerville': "'Libre Baskerville', Georgia, serif",
		sentinel: "'Sentinel', Georgia, serif",
		'source-serif-4': "'Source Serif 4', Georgia, serif",
		'noto-sans': "'Noto Sans', sans-serif",
		'libre-franklin': "'Libre Franklin', sans-serif",
		montserrat: "'Montserrat', sans-serif"
	};

	const GF_URLS: Record<string, string> = {
		'libre-baskerville':
			'https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&display=swap',
		'source-serif-4':
			'https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,wght@0,400;0,700;1,400&display=swap',
		'libre-franklin':
			'https://fonts.googleapis.com/css2?family=Libre+Franklin:ital,wght@0,400;0,700;1,400&display=swap',
		'noto-sans':
			'https://fonts.googleapis.com/css2?family=Noto+Sans:ital,wght@0,400;0,700;1,400&display=swap',
		montserrat:
			'https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,400;0,700;1,400&display=swap'
	};

	const SANS_FONTS_LAYOUT = ['noto-sans', 'libre-franklin', 'montserrat'];

	onMount(() => {
		const p = $prefs;
		document.documentElement.style.setProperty('--font-size-reader', `${p.fontSize}px`);
		document.documentElement.style.setProperty('--line-height-reader', String(p.lineHeight));
		document.documentElement.style.setProperty('--bionic-opacity', String(p.bionicOpacity ?? 1));
		const isSans = SANS_FONTS_LAYOUT.includes(p.fontFamily) || p.dyslexiaFont;
		document.documentElement.style.setProperty('--bionic-bold-weight', isSans ? '900' : '700');
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

<a href="#main-content" class="skip-link">Skip to reading</a>
<div class="min-h-screen bg-background text-foreground" style="font-family: var(--font-reader)">
	{#if $page.data.showLayoutTopBar !== false}
		<TopBar {bookSlug} {chapterNum} hasStudyMode={$page.data.hasStudyMode ?? false} {showTabBar} />
	{/if}
	<slot />
</div>
