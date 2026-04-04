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

	function handleClick(e: MouseEvent) {
		const btn = (e.target as HTMLElement).closest('[data-mn]') as HTMLElement | null;
		if (!btn) {
			openMn = null;
			return;
		}
		const mn = btn.dataset.mn ?? null;
		openMn = openMn === mn ? null : mn;
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
		<div class="mn-popover" role="status" aria-live="polite" aria-atomic="true">
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
		vertical-align: super;
		line-height: 1;
		cursor: pointer;
		border: none;
		background: none;
		padding: 0 1px;
		margin: 0 1px;
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	:global(.mn-marker:hover) {
		opacity: 0.75;
	}

	.mn-popover {
		margin-top: 6px;
		background: var(--color-text);
		color: var(--color-bg);
		font-size: 11px;
		font-family: var(--font-ui);
		line-height: 1.5;
		border-radius: 4px;
		padding: 8px 11px;
		box-shadow:
			0 4px 16px rgba(0, 0, 0, 0.2),
			0 1px 4px rgba(0, 0, 0, 0.12);
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
