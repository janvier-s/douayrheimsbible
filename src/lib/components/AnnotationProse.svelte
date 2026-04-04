<!-- src/lib/components/AnnotationProse.svelte -->
<script lang="ts">
	import type { AnnotationNote } from '$lib/data/types';

	export let text: string;
	export let notes: AnnotationNote[] = [];

	function renderParagraphs(raw: string): string[] {
		return raw
			.split('\n\n')
			.map((p) =>
				p
					.trim()
					.replace(
						/<mn>\[(\d+)\]<\/mn>/g,
						(_, n) =>
							`<button class="mn-marker" data-mn="${n}" aria-label="Marginal note ${n}">${n}</button>`
					)
			);
	}

	const POPOVER_WIDTH = 300;
	const GAP = 10;

	let openMn: string | null = null;

	interface PopoverState {
		style: string;
		arrowLeft: number;
		above: boolean;
	}
	let popover: PopoverState | null = null;

	function calcPopover(btn: HTMLElement): PopoverState {
		const rect = btn.getBoundingClientRect();
		const markerCX = rect.left + rect.width / 2;
		const spaceBelow = window.innerHeight - rect.bottom;
		const above = spaceBelow < 130;

		// Clamp so popover never clips left or right edge (12px margin each side)
		const idealLeft = markerCX - POPOVER_WIDTH / 2;
		const left = Math.min(Math.max(idealLeft, 12), window.innerWidth - POPOVER_WIDTH - 12);

		// Arrow points at marker center, clamped within popover bounds
		const arrowLeft = Math.round(Math.min(Math.max(markerCX - left, 10), POPOVER_WIDTH - 10));

		const style = above
			? `left:${left}px; bottom:${window.innerHeight - rect.top + GAP}px; width:${POPOVER_WIDTH}px;`
			: `left:${left}px; top:${rect.bottom + GAP}px; width:${POPOVER_WIDTH}px;`;

		return { style, arrowLeft, above };
	}

	function dismiss() {
		openMn = null;
		popover = null;
	}

	function handleClick(e: MouseEvent) {
		const btn = (e.target as HTMLElement).closest('[data-mn]') as HTMLElement | null;
		if (!btn) {
			dismiss();
			return;
		}
		const mn = btn.dataset.mn ?? null;
		if (openMn === mn) {
			dismiss();
			return;
		}
		openMn = mn;
		popover = calcPopover(btn);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (openMn && e.key === 'Escape') dismiss();
	}

	function handleScroll() {
		if (openMn) dismiss();
	}

	$: paragraphs = renderParagraphs(text);
	$: activeNote = notes.find((n) => String(n.marker) === openMn) ?? null;
</script>

<svelte:window on:keydown={handleKeydown} on:scroll={handleScroll} />

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div class="annotation-prose" on:click={handleClick}>
	{#each paragraphs as para}
		<p class="font-reader text-[16px] leading-[1.83] text-foreground">
			{@html para}
		</p>
	{/each}

	{#if openMn && activeNote && popover}
		<div
			class="mn-popover"
			class:mn-popover-above={popover.above}
			role="tooltip"
			aria-live="polite"
			style="position:fixed; {popover.style} --arrow-left:{popover.arrowLeft}px;"
		>
			<span class="mn-popover-marker">{openMn}</span>
			<span class="mn-popover-text">{@html activeNote.text}</span>
		</div>
	{/if}
</div>

<style>
	.annotation-prose {
		position: relative;
	}

	.annotation-prose p + p {
		margin-top: 0.6em;
	}

	:global(.mn-marker) {
		color: #e56868;
		font-size: 9px;
		font-family: var(--font-ui);
		font-weight: 400;
		vertical-align: super;
		line-height: 1;
		cursor: pointer;
		border: none;
		background: #29191b;
		padding: 1px 3px;
		margin: 0 1px;
		border-radius: 2px;
	}

	:global(.mn-marker:hover) {
		opacity: 0.75;
	}

	/* Tooltip */
	.mn-popover {
		background: var(--color-text);
		color: var(--color-bg);
		font-size: 13px;
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
		animation: tooltip-in 120ms ease-out both;
	}

	/* Caret — absolute within the fixed popover box */
	.mn-popover::before {
		content: '';
		position: absolute;
		left: var(--arrow-left, 12px);
		transform: translateX(-50%);
		width: 0;
		height: 0;
		border-left: 6px solid transparent;
		border-right: 6px solid transparent;
		/* Default: pointing up (popover is below marker) */
		top: -6px;
		border-bottom: 7px solid var(--color-text);
	}

	/* Flipped: pointing down (popover is above marker) */
	.mn-popover-above::before {
		top: unset;
		bottom: -6px;
		border-bottom: none;
		border-top: 7px solid var(--color-text);
	}

	@keyframes tooltip-in {
		from {
			opacity: 0;
			transform: translateY(-3px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.mn-popover-above {
		animation-name: tooltip-in-above;
	}

	@keyframes tooltip-in-above {
		from {
			opacity: 0;
			transform: translateY(3px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.mn-popover-marker {
		color: var(--color-accent);
		font-size: 9px;
		font-weight: 700;
		margin-right: 6px;
	}

	.mn-popover-text {
		opacity: 0.9;
	}

	.annotation-prose :global(i) {
		font-style: italic;
	}
</style>
