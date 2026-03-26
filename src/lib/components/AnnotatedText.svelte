<!-- src/lib/components/AnnotatedText.svelte -->
<script lang="ts">
	import DOMPurify from 'isomorphic-dompurify';
	import type { InlineAnnotation } from '$lib/data/types';

	export let text: string;
	export let annotations: InlineAnnotation[] = [];

	function renderText(raw: string): string {
		const html = raw.replace(/\[(\w+)\]/g, (_, marker) => {
			return `<button class="annotated-marker" data-marker="${marker}">${marker}</button>`;
		});
		return DOMPurify.sanitize(html, {
			ALLOWED_TAGS: ['button'],
			ALLOWED_ATTR: ['class', 'data-marker']
		});
	}

	let openMarker: string | null = null;
	let footnotesExpanded = false;

	function handleTextClick(e: MouseEvent) {
		const btn = (e.target as HTMLElement).closest('[data-marker]') as HTMLElement | null;
		if (!btn) {
			openMarker = null;
			return;
		}
		const marker = btn.dataset.marker ?? null;
		openMarker = openMarker === marker ? null : marker;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') openMarker = null;
	}

	$: activeAnnotation = annotations.find((a) => a.marker === openMarker) ?? null;
	$: footnoteCount = annotations.length;
</script>

<svelte:window on:keydown={handleKeydown} />

<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-noninteractive-element-interactions -->
<div class="relative" on:click={handleTextClick} role="presentation">
	<div class="prose-text font-reader text-[13px] leading-relaxed text-foreground">
		{@html renderText(text)}
	</div>

	{#if openMarker && activeAnnotation}
		<!-- svelte-ignore a11y-click-events-have-key-events -->
		<div class="popover" role="tooltip">
			<span class="popover-marker">{openMarker}</span>
			<span class="popover-text">{activeAnnotation.text}</span>
		</div>
	{/if}
</div>

{#if footnoteCount > 0}
	<div class="notes-section">
		<button class="notes-toggle" on:click={() => (footnotesExpanded = !footnotesExpanded)}>
			<span class="notes-toggle-icon">{footnotesExpanded ? '▲' : '▼'}</span>
			{footnoteCount} note{footnoteCount > 1 ? 's' : ''}
		</button>

		{#if footnotesExpanded}
			<div class="notes-list">
				{#each annotations as ann}
					<div class="note-row">
						<span class="note-marker">{ann.marker}</span>
						<span class="note-text">{ann.text}</span>
					</div>
				{/each}
			</div>
		{/if}
	</div>
{/if}

<style>
	/* ─── Inline marker buttons ─────────────────────── */
	:global(.annotated-marker) {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		color: var(--color-panel);
		background: var(--color-accent);
		font-size: 9px;
		font-weight: 600;
		font-family: var(--font-ui);
		vertical-align: super;
		line-height: 1;
		cursor: pointer;
		border: none;
		padding: 1px 4px;
		border-radius: 2px;
		margin: 0 1px;
		transition: opacity 150ms ease;
	}

	:global(.annotated-marker:hover) {
		opacity: 0.75;
	}

	/* ─── Popover ───────────────────────────────────── */
	.popover {
		position: absolute;
		z-index: 10;
		left: 0;
		right: 0;
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

	.popover-marker {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		background: var(--color-accent);
		color: white;
		font-size: 9px;
		font-weight: 700;
		padding: 1px 4px;
		border-radius: 2px;
		margin-right: 6px;
		vertical-align: baseline;
	}

	.popover-text {
		opacity: 0.9;
	}

	/* ─── Notes section ─────────────────────────────── */
	.notes-section {
		margin-top: 10px;
	}

	.notes-toggle {
		display: flex;
		align-items: center;
		gap: 5px;
		font-family: var(--font-ui);
		font-size: 10px;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--color-subtle);
		background: none;
		border: none;
		cursor: pointer;
		padding: 0;
		transition: color 150ms ease;
	}

	.notes-toggle:hover {
		color: var(--color-accent);
	}

	.notes-toggle-icon {
		font-size: 8px;
		color: var(--color-accent);
	}

	.notes-list {
		margin-top: 8px;
		padding-top: 8px;
		border-top: 1px solid var(--color-border);
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.note-row {
		display: flex;
		gap: 8px;
		align-items: baseline;
		font-family: var(--font-ui);
		font-size: 11px;
		line-height: 1.45;
	}

	.note-marker {
		font-size: 9px;
		font-weight: 700;
		color: var(--color-accent);
		background: color-mix(in srgb, var(--color-accent) 12%, transparent);
		padding: 1px 4px;
		border-radius: 2px;
		flex-shrink: 0;
	}

	.note-text {
		color: var(--color-subtle);
	}
</style>
