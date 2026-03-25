<!-- src/lib/components/InlineAnnotationBlock.svelte -->
<script lang="ts">
	import type { InlineAnnotation } from '$lib/data/types';
	import { isCrossRef } from '$lib/data/types';

	export let annotations: InlineAnnotation[];
</script>

<div class="annotation-wrapper">
	<div class="annotation-inner">
		<div class="annotation-block">
			{#each annotations as ann}
				<div class="ann-row">
					<span class="ann-marker">{ann.marker}</span>
					{#if isCrossRef(ann.marker)}
						<span class="ann-crossref">{ann.text}</span>
					{:else}
						<span class="ann-note">{ann.text}</span>
					{/if}
				</div>
			{/each}
		</div>
	</div>
</div>

<style>
	.annotation-wrapper {
		display: grid;
		grid-template-rows: 0fr;
		opacity: 0;
		transition:
			grid-template-rows 280ms ease,
			opacity 280ms ease;
	}

	:global([data-mode='study']) .annotation-wrapper {
		grid-template-rows: 1fr;
		opacity: 1;
	}

	.annotation-inner {
		overflow: hidden;
	}

	.annotation-block {
		margin: 4px 0 8px 0;
		padding: 7px 10px 7px 12px;
		border-left: 2px solid color-mix(in srgb, var(--color-accent) 40%, transparent);
		background: color-mix(in srgb, var(--color-accent) 4%, transparent);
		border-radius: 0 3px 3px 0;
		display: flex;
		flex-direction: column;
		gap: 5px;
	}

	.ann-row {
		display: flex;
		gap: 7px;
		align-items: baseline;
		line-height: 1.45;
	}

	.ann-marker {
		font-family: var(--font-ui);
		font-size: 10px;
		font-weight: 600;
		color: var(--color-accent);
		flex-shrink: 0;
		min-width: 14px;
	}

	.ann-note {
		font-family: var(--font-ui);
		font-size: 12px;
		color: var(--color-muted);
	}

	.ann-crossref {
		font-family: var(--font-ui);
		font-size: 12px;
		color: var(--color-subtle);
		font-style: italic;
	}
</style>
