<script lang="ts">
	import { tokenizeCrossRef } from '$lib/search/crossRefParser';
	import VerseTooltip from '$lib/components/VerseTooltip.svelte';
	import { parseOsis } from '$lib/search/reference';

	export let text: string;

	$: tokens = tokenizeCrossRef(text);

	/** All OSIS ranges from the entire cross-ref string, grouped for one tooltip.
	 *  Parse OSIS strings directly (not through bcv_parser) so DR/LXX Psalm
	 *  numbers are preserved exactly as tokenized from the annotation text. */
	$: allRanges = tokens
		.filter((t): t is Extract<typeof t, { type: 'ref' }> => t.type === 'ref')
		.flatMap((t) => {
			const r = parseOsis(t.osis);
			return r ? [r] : [];
		});

	let anchorEl: HTMLElement | null = null;
	let tooltipVisible = false;
	let hoverTimer: ReturnType<typeof setTimeout> | null = null;

	function handleMouseenter(e: MouseEvent) {
		if (hoverTimer) clearTimeout(hoverTimer);
		if (allRanges.length === 0) return;
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
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<span class="cr-text" on:mouseenter={handleMouseenter} on:mouseleave={handleMouseleave}
	>{#each tokens as token, i}{#if token.type === 'text'}{token.content}{:else}{#if i > 0 && tokens[i - 1].type === 'ref'}{' '}{/if}{token.display ||
				token.osis}{/if}{/each}</span
>

<VerseTooltip
	osisRanges={allRanges}
	{anchorEl}
	visible={tooltipVisible}
	on:mouseenter={handleTooltipMouseenter}
	on:mouseleave={handleMouseleave}
/>

<style>
	.cr-text {
		font-family: var(--font-ui);
		font-size: 13px;
		color: var(--color-accent-text);
		border-bottom: 1px solid color-mix(in srgb, var(--color-accent-text) 40%, transparent);
		cursor: pointer;
	}

	.cr-text:hover {
		color: var(--color-accent);
		border-bottom-color: var(--color-accent);
	}
</style>
