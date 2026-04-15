<script lang="ts">
	import { tokenizeCrossRef } from '$lib/search/crossRefParser';
	import VerseTooltip from '$lib/components/VerseTooltip.svelte';
	import type { OsisRange } from '$lib/search/reference';
	import { parseAllReferences } from '$lib/search/reference';

	export let text: string;

	$: tokens = tokenizeCrossRef(text);

	let hoveredOsis: OsisRange[] = [];
	let anchorEl: HTMLElement | null = null;
	let tooltipVisible = false;
	let hoverTimer: ReturnType<typeof setTimeout> | null = null;

	function handleMouseenter(e: MouseEvent, osis: string, isVerse: boolean) {
		if (hoverTimer) clearTimeout(hoverTimer);
		if (!isVerse) return;
		const ranges = parseAllReferences(osis);
		if (ranges.length === 0 || ranges[0].startVerse === undefined) return;
		hoveredOsis = ranges;
		anchorEl = e.currentTarget as HTMLElement;
		tooltipVisible = true;
	}

	function handleMouseleave() {
		hoverTimer = setTimeout(() => {
			tooltipVisible = false;
			anchorEl = null;
		}, 120);
	}

	function handleTooltipMouseenter() {
		if (hoverTimer) clearTimeout(hoverTimer);
	}

	function handleTooltipMouseleave() {
		tooltipVisible = false;
		anchorEl = null;
	}
</script>

<span class="cr-text">
	{#each tokens as token}
		{#if token.type === 'text'}
			{token.content}
		{:else}
			<a
				href="/search?q={encodeURIComponent(token.osis)}&mode=verse"
				class="verse-ref-link"
				target="_blank"
				rel="noopener"
				on:mouseenter={(e) => handleMouseenter(e, token.osis, token.isVerse)}
				on:mouseleave={handleMouseleave}>{token.display || token.osis}</a
			>
		{/if}
	{/each}
</span>

<VerseTooltip
	osisRanges={hoveredOsis}
	{anchorEl}
	visible={tooltipVisible}
	on:mouseover={handleTooltipMouseenter}
	on:mouseout={handleTooltipMouseleave}
/>

<style>
	.cr-text {
		font-family: var(--font-ui);
		font-size: 13px;
		color: var(--color-text);
	}

	.verse-ref-link {
		color: var(--color-accent-text);
		text-decoration: none;
		border-bottom: 1px solid color-mix(in srgb, var(--color-accent-text) 40%, transparent);
		cursor: pointer;
	}

	.verse-ref-link:hover {
		color: var(--color-accent);
		border-bottom-color: var(--color-accent);
	}
</style>
