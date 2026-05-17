<script lang="ts">
	import { tokenizeCrossRef } from '$lib/search/crossRefParser';
	import VerseTooltip from '$lib/components/VerseTooltip.svelte';
	import { parseOsis } from '$lib/search/reference';

	interface Props {
		text: string;
	}

	let { text }: Props = $props();

	let tokens = $derived(tokenizeCrossRef(text));

	/** All OSIS ranges from the entire cross-ref string, grouped for one tooltip.
	 *  Parse OSIS strings directly (not through bcv_parser) so DR/LXX Psalm
	 *  numbers are preserved exactly as tokenized from the annotation text. */
	let allRanges = $derived(tokens
		.filter((t): t is Extract<typeof t, { type: 'ref' }> => t.type === 'ref')
		.flatMap((t) => {
			const r = parseOsis(t.osis);
			return r ? [r] : [];
		}));

	let anchorEl: HTMLElement | null = $state(null);
	let tooltipVisible = $state(false);
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
<span class="cr-text" onmouseenter={handleMouseenter} onmouseleave={handleMouseleave}
	>{#each tokens as token, i}{#if token.type === 'text'}{token.content}{:else}{#if i > 0 && tokens[i - 1].type === 'ref'}{' '}{/if}{token.display ||
				token.osis}{/if}{/each}</span
>

<VerseTooltip
	osisRanges={allRanges}
	{anchorEl}
	visible={tooltipVisible}
	onmouseenter={handleTooltipMouseenter}
	onmouseleave={handleMouseleave}
/>

<style>
	.cr-text {
		font-family: var(--font-ui);
		font-size: 15px;
		color: var(--color-text);
		text-decoration: underline;
		cursor: pointer;
	}

	.cr-text:hover {
		color: var(--color-accent);
	}
</style>
