<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { Chapter } from '$lib/data/types';

	export let chapter: Chapter;
	export let verseEntryCounts: Record<number, number>;
	export let filteredVerseEntryCounts: Record<number, number> | null;
	export let selectedVerse: number | null;

	const dispatch = createEventDispatcher<{ selectVerse: number }>();

	function handleVerseClick(verseNum: number) {
		dispatch('selectVerse', verseNum);
	}
</script>

<div class="h-full overflow-y-auto px-sm py-md" style="font-family: var(--font-reader)">
	<h1 class="text-[13px] uppercase tracking-[0.15em] text-subtle font-medium mb-md font-ui">
		Chapter {chapter.chapter}
	</h1>

	<div class="space-y-[2px]">
		{#each chapter.verses as verse}
			{@const totalCount = verseEntryCounts[verse.verse] ?? 0}
			{@const filteredCount = filteredVerseEntryCounts
				? (filteredVerseEntryCounts[verse.verse] ?? 0)
				: totalCount}
			{@const isSelected = selectedVerse === verse.verse}
			{@const hasBadge = totalCount > 0}

			<!-- svelte-ignore a11y-no-static-element-interactions -->
			<div
				class="flex items-start gap-[8px] rounded-sm px-[6px] py-[4px] transition-colors duration-fast group
					{isSelected ? 'bg-accent/10' : ''}
					{hasBadge ? 'cursor-pointer hover:bg-border/20' : ''}"
				on:click={() => hasBadge && handleVerseClick(verse.verse)}
				on:keydown={(e) => {
					if ((e.key === 'Enter' || e.key === ' ') && hasBadge) {
						e.preventDefault();
						handleVerseClick(verse.verse);
					}
				}}
			>
				<span class="shrink-0 text-[11px] text-subtle font-medium w-[20px] text-right pt-[2px]">
					{verse.verse}
				</span>
				<span class="flex-1 text-[15px] leading-relaxed text-foreground">{verse.text}</span>
				{#if hasBadge}
					<span
						class="shrink-0 mt-[4px] min-w-[18px] h-[18px] px-[4px] rounded-full text-[10px] font-semibold flex items-center justify-center transition-all duration-fast
							{filteredCount === 0
							? 'bg-border/40 text-border opacity-50'
							: isSelected
								? 'bg-accent text-white'
								: 'bg-accent/20 text-accent group-hover:bg-accent/30'}"
						title="{filteredCount} {filteredCount === 1 ? 'entry' : 'entries'}"
					>
						{filteredCount}
					</span>
				{/if}
			</div>
		{/each}
	</div>
</div>
