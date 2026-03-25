<!-- src/lib/components/InlineAnnotationBlock.svelte -->
<script lang="ts">
	import type { InlineAnnotation } from '$lib/data/types';
	import { isCrossRef } from '$lib/data/types';

	export let annotations: InlineAnnotation[];
</script>

<div class="annotation-wrapper">
	<div class="annotation-inner">
		<div class="my-[6px] rounded-sm border border-border bg-panel px-[10px] py-[8px] text-sm font-ui space-y-[5px]">
			{#each annotations as ann}
				<div class="flex gap-[6px] items-baseline leading-snug">
					<span class="text-accent font-semibold text-[11px] shrink-0 min-w-[16px]">
						({ann.marker})
					</span>
					{#if isCrossRef(ann.marker)}
						<span class="italic text-subtle text-[13px]">{ann.text}</span>
					{:else}
						<span class="text-foreground text-[13px]">{ann.text}</span>
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
			grid-template-rows 250ms ease,
			opacity 250ms ease;
	}

	:global([data-mode='study']) .annotation-wrapper {
		grid-template-rows: 1fr;
		opacity: 1;
	}

	.annotation-inner {
		overflow: hidden;
	}
</style>
