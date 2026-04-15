<script lang="ts">
	import { fade } from 'svelte/transition';
	import { loadBook } from '$lib/data/loader';
	import { OSIS_TO_SLUG } from '$lib/search/resolve';
	import { stripTags } from '$lib/utils/text';
	import type { OsisRange } from '$lib/search/reference';

	export let osisRanges: OsisRange[] = [];
	export let anchorEl: HTMLElement | null = null;
	export let visible: boolean = false;

	interface VerseEntry {
		ref: string;
		text: string;
	}

	let x = 0;
	let y = 0;
	let windowWidth = 1024;
	let windowHeight = 768;
	let loading = false;
	let entries: VerseEntry[] = [];
	let flipBelow = false;

	const TOOLTIP_WIDTH = 320;
	const CLAMP_EDGE = TOOLTIP_WIDTH / 2 + 20;
	$: left = Math.min(Math.max(x, CLAMP_EDGE), windowWidth - CLAMP_EDGE);

	$: if (visible && anchorEl) {
		const rect = anchorEl.getBoundingClientRect();
		x = rect.left + rect.width / 2; // eslint-disable-line no-useless-assignment
		// Flip below if not enough room above (less than 200px)
		flipBelow = rect.top < 200;
		y = flipBelow ? rect.bottom + 8 : rect.top - 8; // eslint-disable-line no-useless-assignment
		loadEntries(osisRanges);
	} else if (!visible) {
		entries = [];
		loading = false;
	}

	async function loadEntries(ranges: OsisRange[]) {
		const verseRanges = ranges.filter((r) => r.startVerse !== undefined);
		if (verseRanges.length === 0) return;

		loading = true;
		const result: VerseEntry[] = [];

		for (const range of verseRanges) {
			const slug = OSIS_TO_SLUG[range.book];
			if (!slug) continue;
			try {
				const bookData = await loadBook(slug, fetch);
				const chapter = bookData.chapters.find((c) => c.chapter === range.startChapter);
				const verse = chapter?.verses.find((v) => v.verse === range.startVerse);
				if (verse) {
					result.push({
						ref: `${range.book} ${range.startChapter}:${range.startVerse}`,
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
		style="left: {left}px; top: {y}px;"
		transition:fade={{ duration: 120 }}
		role="tooltip"
		on:mouseover
		on:mouseout
		on:focusin
		on:focusout
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
					<div class="header">
						<span class="sigil">verse</span>
						<span class="verse-ref">{entry.ref}</span>
					</div>
					<div class="sep"></div>
					<p class="verse-text">{entry.text}</p>
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
		transform: translateX(-50%) translateY(calc(-100% - 14px));
		width: 320px;
		max-height: 60vh;
		overflow-y: auto;
		background: var(--color-panel);
		border: 1px solid var(--color-border);
		padding: 0 0 14px;
		pointer-events: auto;
		box-shadow:
			0 2px 0 color-mix(in srgb, var(--color-accent) 20%, transparent),
			0 8px 24px color-mix(in srgb, var(--color-text) 18%, transparent),
			0 2px 6px color-mix(in srgb, var(--color-text) 10%, transparent);
	}

	/* Flip below the anchor when not enough room above */
	.tooltip.flip-below {
		transform: translateX(-50%) translateY(0);
	}

	.rule {
		height: 2px;
		background: var(--color-accent);
		margin-bottom: 10px;
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
		margin-bottom: 8px;
	}

	.sigil {
		font-family: var(--font-ui);
		font-size: 9px;
		letter-spacing: 0.22em;
		color: var(--color-accent);
		font-weight: 600;
	}

	.verse-ref {
		font-family: var(--font-reader);
		font-size: 12px;
		color: var(--color-accent);
		font-weight: 700;
	}

	.sep {
		height: 1px;
		background: var(--color-border);
		margin: 0 14px 12px;
		opacity: 0.6;
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
		z-index: -1;
	}

	.flip-below::after {
		bottom: auto;
		top: -7px;
		clip-path: polygon(50% 0, 0 100%, 100% 100%);
	}
</style>
