<!-- src/lib/components/AnnotatedText.svelte -->
<script lang="ts">
	import type { InlineAnnotation } from '$lib/data/types';

	export let text: string;
	export let annotations: InlineAnnotation[] = [];

	// Replace [n] markers in text with <button> elements
	function renderText(raw: string): string {
		return raw.replace(/\[(\w+)\]/g, (_, marker) => {
			return `<button class="annotated-marker" data-marker="${marker}">[${marker}]</button>`;
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
	<div class="font-reader text-[13px] leading-relaxed text-foreground">
		{@html renderText(text)}
	</div>

	{#if openMarker && activeAnnotation}
		<!-- svelte-ignore a11y-click-events-have-key-events -->
		<div
			class="absolute z-10 left-0 right-0 mt-1 bg-[#2a2a2a] text-[#f0ebe4] text-[11px] font-ui leading-snug rounded px-[10px] py-[8px] shadow-lg"
			role="tooltip"
		>
			<span class="text-accent font-bold mr-[5px]">[{openMarker}]</span>{activeAnnotation.text}
		</div>
	{/if}
</div>

{#if footnoteCount > 0}
	<div class="mt-[10px]">
		<button
			class="text-[11px] font-ui text-subtle hover:text-accent transition-colors duration-fast"
			on:click={() => (footnotesExpanded = !footnotesExpanded)}
		>
			{footnoteCount} note{footnoteCount > 1 ? 's' : ''}
			{footnotesExpanded ? '▲' : '▼'}
		</button>

		{#if footnotesExpanded}
			<div class="mt-[8px] border-t border-border pt-[8px] space-y-[6px]">
				{#each annotations as ann}
					<div class="flex gap-[6px] text-[11px] font-ui leading-snug">
						<span class="text-accent font-bold shrink-0 min-w-[18px]">[{ann.marker}]</span>
						<span class="text-subtle">{ann.text}</span>
					</div>
				{/each}
			</div>
		{/if}
	</div>
{/if}

<style>
	:global(.annotated-marker) {
		color: var(--color-accent);
		font-size: 10px;
		vertical-align: super;
		cursor: pointer;
		font-family: var(--font-ui);
		background: none;
		border: none;
		padding: 0;
		line-height: 1;
	}
	:global(.annotated-marker:hover) {
		text-decoration: underline;
	}
</style>
