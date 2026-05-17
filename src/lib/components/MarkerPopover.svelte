<script lang="ts">
	import { run, createBubbler } from 'svelte/legacy';

	const bubble = createBubbler();
	import { createEventDispatcher, onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';

	interface Props {
		anchorEl?: HTMLElement | null;
		visible?: boolean;
		children?: import('svelte').Snippet;
	}

	let { anchorEl = null, visible = false, children }: Props = $props();

	const dispatch = createEventDispatcher<{ dismiss: void }>();

	const POPOVER_WIDTH = 300;
	const GAP = 10;

	let popoverStyle = $state('');
	let above = $state(false);

	function computePosition(anchor: HTMLElement) {
		const rect = anchor.getBoundingClientRect();
		const markerCX = rect.left + rect.width / 2;
		const spaceBelow = window.innerHeight - rect.bottom;
		above = spaceBelow < 130;

		const idealLeft = markerCX - POPOVER_WIDTH / 2;
		const left = Math.min(Math.max(idealLeft, 12), window.innerWidth - POPOVER_WIDTH - 12);

		popoverStyle = above
			? `left:${left}px; bottom:${window.innerHeight - rect.top + GAP}px; width:${POPOVER_WIDTH}px;`
			: `left:${left}px; top:${rect.bottom + GAP}px; width:${POPOVER_WIDTH}px;`;
	}

	run(() => {
		if (visible && anchorEl) {
			computePosition(anchorEl);
		}
	});
	run(() => {
		if (!visible) {
			popoverStyle = '';
		}
	});

	function onScroll() {
		dispatch('dismiss');
	}

	onMount(() => {
		document.addEventListener('scroll', onScroll, { capture: true, passive: true });
	});

	onDestroy(() => {
		if (browser) document.removeEventListener('scroll', onScroll, true);
	});
</script>

{#if visible && popoverStyle}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="marker-popover"
		class:marker-popover-above={above}
		role="tooltip"
		aria-live="polite"
		style="position:fixed; {popoverStyle}"
		onmouseenter={bubble('mouseenter')}
		onmouseleave={bubble('mouseleave')}
	>
		{@render children?.()}
	</div>
{/if}

<style>
	.marker-popover {
		background: var(--color-text);
		color: var(--color-bg);
		font-size: 13px;
		font-weight: 300;
		font-family: var(--font-ui);
		line-height: 1.5;
		border-radius: 6px;
		padding: 9px 12px;
		box-shadow:
			0 8px 24px rgba(0, 0, 0, 0.25),
			0 2px 6px rgba(0, 0, 0, 0.15);
		max-height: 200px;
		overflow-y: auto;
		z-index: 100;
		animation: marker-tooltip-in 120ms ease-out both;
	}

	.marker-popover-above {
		animation-name: marker-tooltip-in-above;
	}

	@keyframes marker-tooltip-in {
		from {
			opacity: 0;
			transform: translateY(-3px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@keyframes marker-tooltip-in-above {
		from {
			opacity: 0;
			transform: translateY(3px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.marker-popover :global(i) {
		font-style: italic;
		font-weight: 300;
	}
</style>
