<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { page } from '$app/stores';
	import { prefs } from '$lib/stores/prefs';
	import ProseReadingPrefs from '$lib/components/ProseReadingPrefs.svelte';

	export let title: string;
	export let subtitle: string = '';

	const NAV_ARTICLES = [
		{ path: '/about', label: 'About' },
		{ path: '/history/origins', label: 'Origins' },
		{ path: '/history/translation-philosophy', label: 'Translation' },
		{ path: '/history/rheims-1582', label: 'Rheims 1582' },
		{ path: '/history/annotations', label: 'Annotations' },
		{ path: '/history/forbidden-bible', label: 'Forbidden Bible' },
		{ path: '/history/influence-on-kjv', label: 'Influence on KJV' },
		{ path: '/history/challoner', label: 'Challoner Revision' },
		{ path: '/history/after-challoner', label: 'After Challoner' },
		{ path: '/history/america', label: 'America' },
		{ path: '/history/original-tongues', label: 'Original Tongues' },
		{ path: '/history/scripture-for-all', label: 'Scripture for All' }
	];

	let prefsOpen = false;
	let wrapperEl: HTMLElement;
	let articleEl: HTMLElement;

	// TOC
	type TocItem = { id: string; text: string };
	let tocItems: TocItem[] = [];
	let activeId = '';
	let scrollRaf = 0;

	function slugify(text: string): string {
		return text
			.toLowerCase()
			.replace(/[^\w\s-]/g, '')
			.replace(/\s+/g, '-')
			.replace(/-+/g, '-')
			.trim();
	}

	function buildToc() {
		if (!articleEl) return;
		const headings = Array.from(articleEl.querySelectorAll('h2'));
		const items: TocItem[] = [];
		for (const h of headings) {
			const text = (h.textContent || '').trim();
			if (!h.id) h.id = slugify(text);
			if (text === 'Sources') {
				h.classList.add('sources-heading');
				continue;
			}
			items.push({ id: h.id, text });
		}
		tocItems = items;
		if (tocItems.length > 0) activeId = tocItems[0].id;
	}

	function buildNav() {
		if (!articleEl) return;
		const navLinks = Array.from(articleEl.querySelectorAll('hr + p a')) as HTMLAnchorElement[];
		for (const link of navLinks) {
			const text = (link.textContent || '').trim();
			if (text.startsWith('←')) {
				const label = text.slice(1).trim();
				link.innerHTML = `<span class="nav-icon" aria-hidden="true">←</span><span class="nav-text">${label}</span>`;
			} else if (text.endsWith('→')) {
				const label = text.slice(0, -1).trim();
				link.innerHTML = `<span class="nav-text">${label}</span><span class="nav-icon" aria-hidden="true">→</span>`;
			}
		}
	}

	function updateActiveId() {
		if (!articleEl) return;
		const headings = articleEl.querySelectorAll('h2[id]');
		const threshold = window.innerHeight * 0.2;
		let current = '';
		for (const h of Array.from(headings)) {
			const id = (h as HTMLElement).id;
			if (id === 'sources') continue;
			if (h.getBoundingClientRect().top <= threshold) current = id;
		}
		if (current) activeId = current;
	}

	function onScroll() {
		cancelAnimationFrame(scrollRaf);
		scrollRaf = requestAnimationFrame(updateActiveId);
	}

	// Bionic reading
	let textVideFn: ((text: string, opts: object) => string) | null = null;

	function bionicAction(node: HTMLElement, enabled: boolean) {
		let original: string | null = null;

		async function apply(on: boolean) {
			if (on) {
				if (!textVideFn) {
					const m = await import('text-vide');
					textVideFn = m.textVide;
				}
				if (original === null) original = node.innerHTML;
				node.innerHTML = textVideFn(original, { fixationPoint: 4 });
			} else if (original !== null) {
				node.innerHTML = original;
				original = null;
			}
		}

		apply(enabled);
		return {
			update: (on: boolean) => apply(on),
			destroy: () => {
				if (original !== null) node.innerHTML = original;
			}
		};
	}

	function handleOutside(e: MouseEvent) {
		if (prefsOpen && wrapperEl && !wrapperEl.contains(e.target as Node)) {
			prefsOpen = false;
		}
	}

	function handleKey(e: KeyboardEvent) {
		if (e.key === 'Escape') prefsOpen = false;
	}

	onMount(() => {
		document.addEventListener('mousedown', handleOutside);
		document.addEventListener('keydown', handleKey);
		buildToc();
		buildNav();
		window.addEventListener('scroll', onScroll, { passive: true });
	});

	onDestroy(() => {
		document.removeEventListener('mousedown', handleOutside);
		document.removeEventListener('keydown', handleKey);
		window.removeEventListener('scroll', onScroll);
		cancelAnimationFrame(scrollRaf);
	});
</script>

<nav class="prose-nav">
	<a href="/" class="prose-nav-link">
		<span class="prose-nav-cross" aria-hidden="true">✠</span>
		<span>Douay-Rheims</span>
	</a>
	<div class="prose-nav-right" bind:this={wrapperEl}>
		<button
			class="prefs-btn"
			class:prefs-btn--open={prefsOpen}
			aria-label="Reading options"
			aria-expanded={prefsOpen}
			on:click={() => (prefsOpen = !prefsOpen)}
		>
			Reading options
		</button>
		<ProseReadingPrefs {prefsOpen} />
	</div>
</nav>

<main id="main-content" class="prose-page">
	<header class="prose-header">
		<a href="/" class="prose-eyebrow">
			<span aria-hidden="true">✠</span> Douay-Rheims Bible
		</a>
		<h1 class="prose-title">{title}</h1>
		{#if subtitle}
			<p class="prose-subtitle">{subtitle}</p>
		{/if}
		<div class="prose-rule"></div>
	</header>

	<article
		class="prose-body"
		class:prose-body--justified={$prefs.justifiedText}
		use:bionicAction={$prefs.bionicReading}
		bind:this={articleEl}
	>
		<slot />
	</article>
</main>

<aside class="prose-toc" aria-label="Table of contents">
	<p class="toc-label">Contents</p>
	<ul class="toc-nav">
		{#each NAV_ARTICLES as article}
			{@const isCurrent = $page.url.pathname === article.path}
			<li class="toc-nav-item" class:toc-nav-item--current={isCurrent}>
				<a href={article.path} class="toc-nav-link" class:toc-nav-link--active={isCurrent}>
					{article.label}
				</a>
				{#if isCurrent && tocItems.length > 0}
					<ul class="toc-sections">
						{#each tocItems as item}
							<li class="toc-section-item" class:toc-section-item--active={activeId === item.id}>
								<a href="#{item.id}">{item.text}</a>
							</li>
						{/each}
					</ul>
				{/if}
			</li>
		{/each}
	</ul>
</aside>

<style>
	.prose-nav {
		padding: 22px 48px;
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.prose-nav-right {
		position: relative;
	}

	.prefs-btn {
		font-family: var(--font-ui);
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.04em;
		color: var(--color-muted);
		background: transparent;
		border: 1px solid var(--color-border);
		border-radius: 4px;
		padding: 5px 12px;
		cursor: pointer;
		transition:
			color 150ms ease,
			border-color 150ms ease;
	}

	.prefs-btn:hover,
	.prefs-btn--open {
		color: var(--color-accent-text);
		border-color: var(--color-accent-text);
	}

	.prose-nav-link {
		display: flex;
		align-items: center;
		gap: 8px;
		text-decoration: none;
		font-family: var(--font-ui);
		font-size: 12px;
		text-transform: uppercase;
		letter-spacing: 0.22em;
		font-weight: 600;
		color: var(--color-text);
		transition: color 150ms ease;
	}

	.prose-nav-link:hover {
		color: var(--color-accent);
	}

	.prose-nav-cross {
		font-size: 14px;
		color: var(--color-accent);
	}

	/* Layout */
	.prose-page {
		max-width: 700px;
		margin: 0 auto;
		padding: 48px 24px 80px;
	}

	.prose-header {
		margin-bottom: 48px;
	}

	.prose-eyebrow {
		font-family: var(--font-ui);
		font-size: 10px;
		text-transform: uppercase;
		letter-spacing: 0.28em;
		color: var(--color-accent);
		font-weight: 500;
		display: flex;
		align-items: center;
		gap: 8px;
		margin: 0 0 16px;
	}

	.prose-title {
		font-family: var(--font-reader);
		font-size: clamp(2rem, 4vw, 2.8rem);
		font-weight: 700;
		color: var(--color-heading, var(--color-text));
		letter-spacing: -0.02em;
		line-height: 1.15;
		margin: 0 0 12px;
	}

	.prose-subtitle {
		font-family: var(--font-reader);
		font-size: 1.1rem;
		line-height: 1.65;
		color: var(--color-muted);
		margin: 0 0 20px;
		max-width: 560px;
	}

	.prose-rule {
		width: 40px;
		height: 1px;
		background: var(--color-accent);
		opacity: 0.7;
	}

	.prose-body {
		font-family: var(--font-reader);
		font-size: var(--font-size-reader);
		line-height: var(--line-height-reader);
		color: var(--color-text);
	}

	.prose-body--justified :global(p) {
		text-align: justify;
		hyphens: auto;
	}

	.prose-body :global(h2) {
		font-family: var(--font-reader);
		font-size: 1.6rem;
		font-weight: 700;
		color: var(--color-heading, var(--color-text));
		letter-spacing: -0.01em;
		margin: 56px 0 16px;
		line-height: 1.25;
	}

	.prose-body :global(h3) {
		font-family: var(--font-ui);
		font-size: 12px;
		text-transform: uppercase;
		letter-spacing: 0.2em;
		color: var(--color-heading, var(--color-accent-text));
		font-weight: 600;
		margin: 40px 0 12px;
	}

	.prose-body :global(p) {
		margin: 0 0 20px;
		color: var(--color-text);
	}

	.prose-body :global(blockquote) {
		border-left: 2px solid var(--color-accent);
		padding-left: 20px;
		margin: 28px 0;
		font-style: italic;
		color: var(--color-text);
	}

	.prose-body :global(blockquote strong) {
		font-style: normal;
	}

	/* Challoner comparison blockquotes */
	.prose-body :global(.comparison) {
		font-style: normal;
	}

	.prose-body :global(.comparison strong) {
		display: block;
		font-size: 10px;
		text-transform: uppercase;
		letter-spacing: 0.18em;
		color: var(--color-accent-text);
		font-weight: 600;
		margin-top: 18px;
		margin-bottom: 4px;
	}

	.prose-body :global(.comparison strong:first-child) {
		margin-top: 0;
	}

	.prose-body :global(.comparison br) {
		display: none;
	}

	.prose-body :global(a) {
		color: var(--color-accent-text);
		text-underline-offset: 3px;
		text-decoration-color: color-mix(in srgb, var(--color-accent-text) 40%, transparent);
		transition: text-decoration-color 150ms ease;
	}

	.prose-body :global(a:hover) {
		text-decoration-color: var(--color-accent-text);
	}

	.prose-body :global(ul),
	.prose-body :global(ol) {
		margin: 0 0 20px;
		padding-left: 24px;
		color: var(--color-text);
	}

	.prose-body :global(li) {
		margin-bottom: 8px;
	}

	/* Sources section */
	.prose-body :global(.sources-heading) {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.18em;
		color: var(--color-muted);
		margin-top: 56px;
		margin-bottom: 12px;
		line-height: 1.4;
	}

	.prose-body :global(.sources-heading ~ ul) {
		color: var(--color-muted);
		font-size: 0.85rem;
	}

	.prose-body :global(hr) {
		border: none;
		height: 1px;
		background: var(--color-border);
		margin: 40px 0;
	}

	.prose-body :global(q),
	.prose-body :global(cite) {
		font-style: italic;
		quotes: none;
	}

	/* Prev / next navigation */
	.prose-body :global(hr + p) {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		font-size: 0;
		margin-top: 12px;
		gap: 24px;
	}

	.prose-body :global(hr + p a) {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 1rem;
		max-width: calc(50% - 12px);
		line-height: 1.4;
		text-align: left;
	}

	.prose-body :global(hr + p a:last-of-type) {
		margin-left: auto;
		text-align: right;
		flex-direction: row-reverse;
	}

	.prose-body :global(.nav-icon) {
		flex-shrink: 0;
	}

	.prose-body :global(.cta-btn) {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 11px 20px;
		background: var(--color-accent);
		color: #fff;
		text-decoration: none;
		font-family: var(--font-ui);
		font-size: 12px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.15em;
		border-radius: 2px;
		margin-top: 40px;
		transition:
			background 150ms ease,
			opacity 150ms ease;
	}

	.prose-body :global(.cta-btn:hover) {
		background: color-mix(in srgb, var(--color-accent) 82%, black);
		color: #fff;
		text-decoration: none;
	}

	/* TOC */
	.prose-toc {
		position: fixed;
		right: 24px;
		top: 72px;
		width: 196px;
		max-height: calc(100vh - 96px);
		overflow-y: auto;
		scrollbar-width: thin;
		scrollbar-color: var(--color-border) transparent;
		padding: 0;
		opacity: 0;
		transform: translateX(8px);
		animation: toc-enter 400ms ease 300ms forwards;
	}

	@keyframes toc-enter {
		to {
			opacity: 1;
			transform: translateX(0);
		}
	}

	.toc-label {
		font-family: var(--font-ui);
		font-size: 9px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.24em;
		color: var(--color-accent-text);
		margin: 0 0 12px;
		opacity: 0.8;
	}

	.toc-nav {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
	}

	.toc-nav-item {
		display: flex;
		flex-direction: column;
	}

	.toc-nav-link {
		font-family: var(--font-ui);
		font-size: 12px;
		line-height: 1.5;
		padding: 4px 0;
		color: var(--color-muted);
		text-decoration: none;
		opacity: 0.6;
		transition:
			color 220ms ease,
			opacity 220ms ease;
	}

	.toc-nav-link:hover {
		color: var(--color-text);
		opacity: 0.9;
	}

	.toc-nav-link--active {
		color: var(--color-accent-text);
		opacity: 1;
		font-weight: 600;
	}

	.toc-sections {
		list-style: none;
		padding: 4px 0 8px 10px;
		margin: 0;
		border-left: 1px solid var(--color-border);
		display: flex;
		flex-direction: column;
	}

	.toc-section-item a {
		display: block;
		font-family: var(--font-ui);
		font-size: 11px;
		line-height: 1.55;
		padding: 3px 0;
		color: var(--color-muted);
		text-decoration: none;
		opacity: 0.55;
		transition:
			color 220ms ease,
			opacity 220ms ease;
	}

	.toc-section-item a:hover {
		color: var(--color-text);
		opacity: 0.85;
	}

	.toc-section-item--active a {
		color: var(--color-accent-text);
		opacity: 1;
	}

	@media (max-width: 1120px) {
		.prose-toc {
			display: none;
		}
	}
</style>
