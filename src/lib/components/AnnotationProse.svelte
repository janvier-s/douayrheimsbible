<!-- src/lib/components/AnnotationProse.svelte -->
<script lang="ts">
	import type { AnnotationNote } from '$lib/data/types';

	export let text: string;
	export let notes: AnnotationNote[] = [];

	/** Split on \n\n for paragraph breaks, render <mn> as clickable superscript, keep <i>. */
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

	let openMn: string | null = null;
	let popoverStyle = '';

	async function handleClick(e: MouseEvent) {
		const btn = (e.target as HTMLElement).closest('[data-mn]') as HTMLElement | null;
		if (!btn) {
			openMn = null;
			return;
		}
		const mn = btn.dataset.mn ?? null;
		openMn = openMn === mn ? null : mn;
		if (openMn) {
			const rect = btn.getBoundingClientRect();
			const spaceBelow = window.innerHeight - rect.bottom;
			const maxH = Math.min(200, spaceBelow > 80 ? spaceBelow - 16 : rect.top - 16);
			if (spaceBelow > 80) {
				// Show below the marker
				popoverStyle = `position:fixed; top:${rect.bottom + 6}px; left:${rect.left}px; max-height:${maxH}px;`;
			} else {
				// Flip above the marker
				popoverStyle = `position:fixed; bottom:${window.innerHeight - rect.top + 6}px; left:${rect.left}px; max-height:${maxH}px;`;
			}
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (openMn && e.key === 'Escape') openMn = null;
	}

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

	{#if openMn && activeNote}
		<div
			class="mn-popover"
			role="status"
			aria-live="polite"
			aria-atomic="true"
			style={popoverStyle}
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
		border-radius: 4px;
		padding: 8px 11px;
		box-shadow:
			0 4px 16px rgba(0, 0, 0, 0.2),
			0 1px 4px rgba(0, 0, 0, 0.12);
		z-index: 100;
		max-width: 320px;
		overflow-y: auto;
		width: max-content;
	}

	.mn-popover-marker {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		color: var(--color-accent);
		font-size: 9px;
		font-weight: 700;
		margin-right: 6px;
		vertical-align: baseline;
	}

	.mn-popover-text {
		opacity: 0.9;
	}

	/* Allow <i> tags in annotation prose to render as italic */
	.annotation-prose :global(i) {
		font-style: italic;
	}
</style>
