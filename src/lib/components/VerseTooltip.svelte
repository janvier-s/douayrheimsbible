<script lang="ts">
	import { fade } from 'svelte/transition';
	import { loadBook } from '$lib/data/loader';
	import { OSIS_TO_SLUG } from '$lib/search/resolve';
	import { ALL_BOOKS } from '$lib/data/books';
	import { stripTags } from '$lib/utils/text';
	import type { OsisRange } from '$lib/search/reference';

	/** Map OSIS book code → friendly display name via slug lookup */
	const SLUG_TO_NAME: Record<string, string> = {};
	for (const b of ALL_BOOKS) SLUG_TO_NAME[b.slug] = b.odrName;
	function bookDisplayName(osisBook: string): string {
		const slug = OSIS_TO_SLUG[osisBook];
		return (slug && SLUG_TO_NAME[slug]) || osisBook;
	}

	export let osisRanges: OsisRange[] = [];
	export let anchorEl: HTMLElement | null = null;
	export let visible: boolean = false;

	interface VerseEntry {
		ref: string;
		text: string;
		href?: string;
		isChapter?: boolean;
	}

	let x = 0;
	let y = 0;
	let windowWidth = 1024;
	let windowHeight = 768;
	let loading = false;
	let entries: VerseEntry[] = [];
	let flipBelow = false;
	let maxH = '60vh';
	let tooltipEl: HTMLElement;
	let needsScroll = false;

	$: if (entries.length > 0 && tooltipEl) {
		// Check after render if content overflows
		requestAnimationFrame(() => {
			needsScroll = tooltipEl.scrollHeight > tooltipEl.clientHeight + 20;
		});
	}

	const TOOLTIP_WIDTH = 320;
	const CLAMP_EDGE = TOOLTIP_WIDTH / 2 + 20;
	$: left = Math.min(Math.max(x, CLAMP_EDGE), windowWidth - CLAMP_EDGE);

	$: if (visible && anchorEl) {
		const rect = anchorEl.getBoundingClientRect();
		x = rect.left + rect.width / 2; // eslint-disable-line no-useless-assignment
		// Measure topbar height as ceiling
		const topbar = document.querySelector('header.sticky');
		const ceiling = topbar ? topbar.getBoundingClientRect().bottom : 0;
		const spaceAbove = rect.top - ceiling - 8;
		const spaceBelow = windowHeight - rect.bottom - 16;
		// Estimate tooltip height: ~80px per verse entry, ~40px per chapter entry + 30px for chrome
		const verseCount = osisRanges.filter((r) => r.startVerse !== undefined).length;
		const chapterCount = osisRanges.filter((r) => r.startVerse === undefined).length;
		const estimatedH = Math.min(verseCount * 80 + chapterCount * 40 + 30, windowHeight * 0.6);
		// Prefer above, but flip below if content won't fit above
		flipBelow = spaceAbove < estimatedH && spaceBelow > spaceAbove;
		y = flipBelow ? rect.bottom : rect.top;
		maxH = `${Math.min(Math.max(flipBelow ? spaceBelow : spaceAbove, 120), windowHeight * 0.6)}px`;
		loadEntries(osisRanges);
	} else if (!visible) {
		entries = [];
		loading = false;
	}

	async function loadEntries(ranges: OsisRange[]) {
		if (ranges.length === 0) return;

		loading = true;
		const result: VerseEntry[] = [];

		for (const range of ranges) {
			const slug = OSIS_TO_SLUG[range.book];
			if (!slug) continue;

			// Chapter-only ref: show as "Read [Book Chapter]" link
			if (range.startVerse === undefined) {
				result.push({
					ref: `${bookDisplayName(range.book)} ${range.startChapter}`,
					text: '',
					href: `/odr/${slug}/${range.startChapter}`,
					isChapter: true
				});
				continue;
			}

			try {
				const bookData = await loadBook(slug, fetch);
				const chapter = bookData.chapters.find((c) => c.chapter === range.startChapter);
				const verse = chapter?.verses.find((v) => v.verse === range.startVerse);
				if (verse) {
					result.push({
						ref: `${bookDisplayName(range.book)} ${range.startChapter}:${range.startVerse}`,
						text: stripTags(verse.text)
					});
				}
			} catch {
				// silently skip on fetch error
			}
		}

		entries = result;
		loading = false;
	}
</script>

<svelte:window bind:innerWidth={windowWidth} bind:innerHeight={windowHeight} />

{#if visible && (loading || entries.length > 0)}
	<!-- svelte-ignore a11y_mouse_events_have_key_events -->
	<div
		class="tooltip"
		class:flip-below={flipBelow}
		class:scrollable={needsScroll}
		bind:this={tooltipEl}
		style="left: {left}px; top: {y}px; max-height: {maxH};"
		transition:fade={{ duration: 120 }}
		role="tooltip"
		on:mouseenter
		on:mouseleave
		on:focusin
		on:focusout
		on:wheel|stopPropagation
	>
		<div class="rule"></div>

		{#if loading}
			<div class="loading">
				<div class="shimmer"></div>
				<div class="shimmer shimmer-short"></div>
			</div>
		{:else}
			{#each entries as entry, i}
				{#if i > 0}<div class="entry-sep"></div>{/if}
				<div class="entry">
					{#if entry.isChapter}
						<div class="header">
							<a class="chapter-link" href={entry.href}>Read {entry.ref}</a>
						</div>
					{:else}
						<div class="header">
							<span class="tt-ref">{entry.ref}</span>
						</div>
						<p class="verse-text">{@html entry.text}</p>
					{/if}
				</div>
			{/each}
		{/if}

		<div class="nib" aria-hidden="true"></div>
	</div>
{/if}

<style>
	.tooltip {
		position: fixed;
		z-index: 9999;
		transform: translateX(-50%) translateY(-100%);
		width: 320px;
		overflow-y: hidden;
		scrollbar-width: thin;
		background: var(--color-panel);
		border: 1px solid color-mix(in srgb, var(--color-text) 25%, transparent);
		border-radius: 8px;
		padding: 0 0 14px;
		pointer-events: auto;
	}

	.tooltip.scrollable {
		overflow-y: auto;
	}

	/* Invisible hover bridge so mouse can travel from anchor to tooltip */
	.tooltip::before {
		content: '';
		position: absolute;
		bottom: -16px;
		left: 0;
		right: 0;
		height: 16px;
	}

	/* Flip below the anchor when not enough room above */
	.tooltip.flip-below {
		transform: translateX(-50%) translateY(0);
	}

	.tooltip.flip-below::before {
		bottom: auto;
		top: -16px;
	}

	.rule {
		height: 2px;
		background: var(--color-accent);
		margin-bottom: 8px;
		border-radius: 8px 8px 0 0;
	}

	.entry-sep {
		height: 1px;
		background: var(--color-border);
		margin: 10px 14px;
	}

	.header {
		display: flex;
		align-items: baseline;
		gap: 5px;
		padding: 0 14px;
		margin-bottom: 4px;
	}

	.tt-ref {
		font-family: var(--font-ui);
		font-size: 10px;
		letter-spacing: 0.05em;
		color: var(--color-accent);
		font-weight: 600;
	}

	.chapter-link {
		font-family: var(--font-ui);
		font-size: 12px;
		color: var(--color-accent-text);
		text-decoration: none;
		font-weight: 500;
	}

	.chapter-link:hover {
		color: var(--color-accent);
	}

	.verse-text {
		font-family: var(--font-reader);
		font-size: 13.5px;
		font-style: italic;
		line-height: 1.65;
		color: var(--color-text);
		padding: 0 14px;
		margin: 0;
	}

	.loading {
		padding: 4px 14px 2px;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.shimmer {
		height: 12px;
		border-radius: 2px;
		background: linear-gradient(
			90deg,
			color-mix(in srgb, var(--color-text) 8%, transparent) 0%,
			color-mix(in srgb, var(--color-text) 14%, transparent) 50%,
			color-mix(in srgb, var(--color-text) 8%, transparent) 100%
		);
		background-size: 200% 100%;
		animation: shimmer 1.2s infinite;
	}

	.shimmer-short {
		width: 60%;
	}

	@keyframes shimmer {
		0% {
			background-position: 200% 0;
		}
		100% {
			background-position: -200% 0;
		}
	}

	.nib {
		position: absolute;
		bottom: -6px;
		left: 50%;
		transform: translateX(-50%);
		width: 10px;
		height: 6px;
		background: var(--color-panel);
		clip-path: polygon(0 0, 100% 0, 50% 100%);
		z-index: 1;
	}

	.flip-below .nib {
		bottom: auto;
		top: -6px;
		clip-path: polygon(50% 0, 0 100%, 100% 100%);
	}

	.tooltip::after {
		content: '';
		position: absolute;
		bottom: -7px;
		left: 50%;
		transform: translateX(-50%);
		width: 12px;
		height: 7px;
		background: var(--color-border);
		clip-path: polygon(0 0, 100% 0, 50% 100%);
	}

	.flip-below::after {
		bottom: auto;
		top: -7px;
		clip-path: polygon(50% 0, 0 100%, 100% 100%);
	}
</style>
