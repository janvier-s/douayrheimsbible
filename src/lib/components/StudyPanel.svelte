<script lang="ts">
	import { studyPanel } from '$lib/stores/studyPanel';
	import { readingPosition } from '$lib/stores/reading';
	import type { BookData } from '$lib/data/types';
	import AnnotatedText from './AnnotatedText.svelte';

	export let bookData: BookData | null = null;

	// Shorten intro titles to tab labels
	function tabLabel(title: string): string {
		if (/argument/i.test(title)) return 'Argument';
		if (/sum.*old/i.test(title)) return 'Sum (OT)';
		if (/sum.*new/i.test(title)) return 'Sum (NT)';
		if (/sum/i.test(title)) return 'Sum';
		if (/moyses|moses/i.test(title)) return 'Of Moyses';
		// Fall back: first two meaningful words
		return title
			.replace(/^the\s+/i, '')
			.split(/\s+/)
			.slice(0, 2)
			.join(' ');
	}

	$: intros = bookData?.intros ?? [];

	// Resolve default intro index when book data changes
	$: {
		const idx = intros.findIndex((i) => i.default);
		studyPanel.update((s) => ({ ...s, activeIntroIndex: idx >= 0 ? idx : 0 }));
	}

	// Commentary: get annotations for current chapter
	$: currentChapterNum = $readingPosition?.chapter ?? 1;
	$: currentChapterData = bookData?.chapters.find((c) => c.chapter === currentChapterNum);
	$: commentaryEntries = currentChapterData?.annotations ?? [];
</script>

<aside
	class="sticky top-0 h-screen overflow-y-auto border-l border-border bg-panel flex flex-col font-ui"
	aria-label="Study panel"
>
	<!-- Top-level tabs -->
	<div class="flex border-b border-border shrink-0">
		{#each ['intro', 'commentary'] as const as tab}
			<button
				class="flex-1 py-[8px] text-[10px] uppercase tracking-[0.1em] transition-colors duration-fast
					{$studyPanel.activeTab === tab
					? 'text-accent border-b-2 border-accent -mb-px'
					: 'text-subtle hover:text-foreground'}"
				on:click={() => studyPanel.update((s) => ({ ...s, activeTab: tab }))}
			>
				{tab === 'intro' ? 'Intro' : 'Commentary'}
			</button>
		{/each}
	</div>

	<div class="flex-1 overflow-y-auto">
		{#if $studyPanel.activeTab === 'intro'}
			{#if intros.length === 0}
				<p class="p-md text-[12px] text-subtle italic">
					No introduction available for this book yet.
				</p>
			{:else}
				<!-- Intro sub-tabs -->
				{#if intros.length > 1}
					<div class="flex border-b border-border bg-background overflow-x-auto shrink-0">
						{#each intros as intro, i}
							<button
								class="px-[10px] py-[6px] text-[10px] whitespace-nowrap transition-colors duration-fast shrink-0
									{$studyPanel.activeIntroIndex === i
									? 'text-accent border-b-2 border-accent -mb-px'
									: 'text-subtle hover:text-foreground'}"
								on:click={() => studyPanel.update((s) => ({ ...s, activeIntroIndex: i }))}
							>
								{tabLabel(intro.title)}
							</button>
						{/each}
					</div>
				{/if}

				<!-- Active intro content -->
				{#if intros[$studyPanel.activeIntroIndex]}
					{@const intro = intros[$studyPanel.activeIntroIndex]}
					<div class="p-md">
						<p class="text-[10px] uppercase tracking-[0.15em] text-accent mb-[10px] font-medium">
							{tabLabel(intro.title)}
						</p>
						<AnnotatedText text={intro.text} annotations={intro.annotations ?? []} />
					</div>
				{/if}
			{/if}
		{:else}
			<!-- Commentary tab -->
			{#if commentaryEntries.length === 0}
				<p class="p-md text-[12px] text-subtle italic">No commentary for this chapter yet.</p>
			{:else}
				<div class="divide-y divide-border">
					{#each commentaryEntries as entry}
						<div class="p-md">
							<p class="text-[11px] font-semibold text-accent mb-[6px]">{entry.title}</p>
							<AnnotatedText text={entry.text} annotations={entry.annotations ?? []} />
						</div>
					{/each}
				</div>
			{/if}
		{/if}
	</div>
</aside>
