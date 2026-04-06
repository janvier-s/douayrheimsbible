<!-- src/lib/components/AnnotationProse.svelte -->
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
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
	let popoverStyle = '';
	let above = false;

	function calcPopover(btn: HTMLElement): string {
		const rect = btn.getBoundingClientRect();
		const markerCX = rect.left + rect.width / 2;
		const spaceBelow = window.innerHeight - rect.bottom;
		above = spaceBelow < 130;

		const idealLeft = markerCX - POPOVER_WIDTH / 2;
		const left = Math.min(Math.max(idealLeft, 12), window.innerWidth - POPOVER_WIDTH - 12);

		return above
			? `left:${left}px; bottom:${window.innerHeight - rect.top + GAP}px; width:${POPOVER_WIDTH}px;`
			: `left:${left}px; top:${rect.bottom + GAP}px; width:${POPOVER_WIDTH}px;`;
	}

	function dismiss() {
		openMn = null;
		popoverStyle = '';
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
		popoverStyle = calcPopover(btn);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (openMn && e.key === 'Escape') dismiss();
	}

	// Capture-phase scroll catches panel internal scroll, not just window scroll
	onMount(() => {
		document.addEventListener('scroll', dismiss, true);
	});
	onDestroy(() => {
		if (browser) document.removeEventListener('scroll', dismiss, true);
	});

	$: paragraphs = renderParagraphs(text);
	$: activeNote = notes.find((n) => String(n.marker) === openMn) ?? null;
</script>

<svelte:window on:keydown={handleKeydown} />

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div class="annotation-prose" on:click={handleClick}>
	{#each paragraphs as para}
		<p class="font-reader text-[16px] leading-[1.83] text-foreground">
			{@html para}
		</p>
	{/each}

	{#if openMn && activeNote && popoverStyle}
		<div
			class="mn-popover"
			class:mn-popover-above={above}
			role="tooltip"
			aria-live="polite"
			style="position:fixed; {popoverStyle}"
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

	.mn-popover-above {
		animation-name: tooltip-in-above;
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
