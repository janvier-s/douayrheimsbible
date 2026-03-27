<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { prefs } from '$lib/stores/prefs';
	import ProseReadingPrefs from '$lib/components/ProseReadingPrefs.svelte';

	export let title: string;
	export let subtitle: string = '';

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

<div class="prose-outer">
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

	{#if tocItems.length > 1}
		<aside class="prose-toc" aria-label="Table of contents">
			<p class="toc-label">Contents</p>
			<ul class="toc-list">
				{#each tocItems as item}
					<li class="toc-item" class:toc-item--active={activeId === item.id}>
						<a href="#{item.id}">{item.text}</a>
					</li>
				{/each}
			</ul>
		</aside>
	{/if}
</div>

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
	.prose-outer {
		display: flex;
		align-items: flex-start;
		justify-content: center;
	}

	.prose-page {
		flex: 1;
		min-width: 0;
		max-width: 700px;
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
		font-size: 11px;
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
		font-size: 9px;
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

	.prose-body :global(hr + p) {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		font-size: 0;
		margin-top: 12px;
		gap: 24px;
	}

	.prose-body :global(hr + p a) {
		display: block;
		font-size: 1rem;
		max-width: calc(50% - 12px);
		line-height: 1.4;
		text-align: left;
	}

	.prose-body :global(hr + p a:last-of-type) {
		text-align: right;
		margin-left: auto;
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
		flex-shrink: 0;
		width: 188px;
		position: sticky;
		top: 48px;
		align-self: flex-start;
		padding: 56px 0 80px 40px;
		border-left: 1px solid var(--color-border);
		opacity: 0;
		transform: translateX(8px);
		animation: toc-enter 400ms ease 200ms forwards;
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
		margin: 0 0 14px;
		opacity: 0.8;
	}

	.toc-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
	}

	.toc-item a {
		display: block;
		font-family: var(--font-ui);
		font-size: 11px;
		line-height: 1.55;
		padding: 5px 0;
		color: var(--color-muted);
		text-decoration: none;
		opacity: 0.55;
		transition:
			color 220ms ease,
			opacity 220ms ease;
	}

	.toc-item a:hover {
		color: var(--color-text);
		opacity: 0.85;
	}

	.toc-item--active a {
		color: var(--color-accent-text);
		opacity: 1;
	}

	@media (max-width: 1080px) {
		.prose-toc {
			display: none;
		}
	}
</style>
