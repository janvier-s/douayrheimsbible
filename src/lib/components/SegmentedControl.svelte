<script lang="ts">
	/**
	 * Sub-tab picker used when a study tab holds several documents (multiple
	 * intros, articles or end matters). The panel had three copies of this,
	 * differing only in which array they walked and which store index they wrote.
	 *
	 * Renders nothing for zero or one item, matching the guards the three call
	 * sites used to carry.
	 */
	import { tabLabel } from './studyPanelUtils';

	interface Props {
		/** Anything with a `title`; only the title is read. */
		items: { title: string }[];
		activeIndex: number;
		onSelect: (index: number) => void;
	}

	let { items, activeIndex, onSelect }: Props = $props();
</script>

{#if items.length > 1}
	<div class="subtab-bar shrink-0">
		<div class="segmented-control" style="grid-template-columns: repeat({items.length}, 1fr)">
			{#each items as item, i}
				<button class="seg-btn" class:seg-active={activeIndex === i} onclick={() => onSelect(i)}>
					{tabLabel(item.title)}
				</button>
			{/each}
			<div
				class="seg-slider"
				style="width: {100 / items.length}%; transform: translateX({activeIndex * 100}%)"
				aria-hidden="true"
			></div>
		</div>
	</div>
{/if}

<style>
	.subtab-bar {
		display: flex;
		justify-content: center;
		padding: 8px 16px;
	}

	.segmented-control {
		display: inline-grid;
		border: 1px solid var(--color-border);
		border-radius: 6px;
		overflow: hidden;
		background: color-mix(in srgb, var(--color-foreground) 5%, var(--color-background));
		position: relative;
	}

	.seg-btn {
		grid-row: 1;
		font-size: 11px;
		font-weight: 500;
		color: var(--color-subtle);
		background: none;
		border: none;
		cursor: pointer;
		font-family: var(--font-ui);
		padding: 5px 16px;
		position: relative;
		z-index: 1;
		text-align: center;
		transition: color var(--duration-fast);
	}

	.seg-btn:hover {
		color: var(--color-text);
	}

	.seg-active {
		color: var(--color-accent);
	}

	.seg-slider {
		position: absolute;
		top: 0;
		bottom: 0;
		left: 0;
		background: color-mix(in srgb, var(--color-accent) 15%, transparent);
		transition: transform 200ms cubic-bezier(0.4, 0, 0.2, 1);
		pointer-events: none;
		grid-column: 1 / -1;
		grid-row: 1;
	}

	@media (prefers-reduced-motion: reduce) {
		.seg-slider {
			transition: none;
		}
	}
</style>
