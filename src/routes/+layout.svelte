<script lang="ts">
	import { onMount } from 'svelte';
	import '../app.css';
	import TopBar from '$lib/components/TopBar.svelte';
	import SiteFooter from '$lib/components/SiteFooter.svelte';
	import { page } from '$app/stores';
	import { prefs } from '$lib/stores/prefs';
	import { readingPosition } from '$lib/stores/reading';
	import { afterNavigate, goto } from '$app/navigation';
	import { getFontById, isSansFont } from '$lib/data/fonts';
	import { navOverride } from '$lib/stores/navOverride';

	afterNavigate(({ from, to, type }) => {
		if (type === 'popstate') return;
		if (from?.url.pathname === to?.url.pathname) return;
		requestAnimationFrame(() =>
			requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'instant' }))
		);
	});

	// isChapterPage: true only when we are actually on a chapter route (ODR or compare).
	// readingPosition tracks infinite-scroll advances within a chapter page.
	// navOverride lets non-chapter pages (search) show a contextual reference.
	$: isChapterPage = !!$page.params.book && !!$page.params.chapter;
	$: isHomePage = $page.url.pathname === '/';
	$: bookSlug = isChapterPage
		? ($readingPosition?.bookSlug ?? $page.params.book ?? '')
		: ($navOverride?.bookSlug ?? $page.params.book ?? '');
	$: chapterNum = isChapterPage
		? $readingPosition
			? String($readingPosition.chapter)
			: ($page.params.chapter ?? '')
		: $navOverride
			? String($navOverride.chapter)
			: '';

	onMount(() => {
		const p = $prefs;
		// Default to 15px on mobile for first-time visitors
		const mobileFontApplied = localStorage.getItem('mobile-font-default');
		if (
			!mobileFontApplied &&
			p.fontSize === 16 &&
			window.matchMedia('(max-width: 767px)').matches
		) {
			localStorage.setItem('mobile-font-default', '1');
			prefs.update((pr) => ({ ...pr, fontSize: 15 }));
			document.documentElement.style.setProperty('--font-size-reader', '15px');
		} else {
			document.documentElement.style.setProperty('--font-size-reader', `${p.fontSize}px`);
		}
		document.documentElement.style.setProperty('--line-height-reader', String(p.lineHeight));
		document.documentElement.style.setProperty('--bionic-opacity', String(p.bionicOpacity ?? 1));
		const isSans = isSansFont(p.fontFamily) || p.dyslexiaFont;
		document.documentElement.style.setProperty('--bionic-bold-weight', isSans ? '900' : '700');
		if (p.dyslexiaFont) {
			document.documentElement.style.setProperty(
				'--font-reader',
				"'Grace Dyslexic MD', sans-serif"
			);
			document.documentElement.style.setProperty('--font-ui', "'Grace Dyslexic MD', sans-serif");
		} else {
			const font = getFontById(p.fontFamily);
			if (font) document.documentElement.style.setProperty('--font-reader', font.stack);
			// Inject Google Fonts link so the selector button renders in the correct font immediately
			if (font?.gfUrl && !document.querySelector(`link[data-gf="${p.fontFamily}"]`)) {
				const link = document.createElement('link');
				link.rel = 'stylesheet';
				link.href = font.gfUrl;
				link.dataset.gf = p.fontFamily;
				document.head.appendChild(link);
			}
		}
		// app.html script handles pre-paint theme; sync post-hydration
		const savedTheme = localStorage.getItem('theme');
		document.documentElement.setAttribute('data-theme', savedTheme || 'auto');
	});

	function handleGlobalKeydown(e: KeyboardEvent) {
		// Don't trigger if user is typing in an input/textarea
		const tag = (e.target as HTMLElement)?.tagName;
		if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

		if (e.key === '/' || ((e.metaKey || e.ctrlKey) && e.key === 'k')) {
			e.preventDefault();
			if ($page.url.pathname !== '/search') {
				goto('/search');
			}
		}
	}
</script>

<svelte:window on:keydown={handleGlobalKeydown} />
<a href="#main-content" class="skip-link">Skip to reading</a>
<div class="min-h-screen bg-background text-foreground" style="font-family: var(--font-reader)">
	{#if $page.data.showLayoutTopBar !== false}
		<TopBar
			{bookSlug}
			{chapterNum}
			{isChapterPage}
			{isHomePage}
			hasStudyMode={$page.data.hasStudyMode !== false}
		/>
	{/if}
	<slot />
	<SiteFooter />
</div>
