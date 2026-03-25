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
		return title
			.replace(/^the\s+/i, '')
			.split(/\s+/)
			.slice(0, 2)
			.join(' ');
	}

	$: intros = bookData?.intros ?? [];

	$: {
		const idx = intros.findIndex((i) => i.default);
		studyPanel.update((s) => ({ ...s, activeIntroIndex: idx >= 0 ? idx : 0 }));
	}

	$: currentChapterNum = $readingPosition?.chapter ?? 1;
	$: currentChapterData = bookData?.chapters.find((c) => c.chapter === currentChapterNum);
	$: commentaryEntries = currentChapterData?.annotations ?? [];
</script>

<aside
	class="panel-root sticky overflow-hidden border-l border-border bg-panel flex flex-col font-ui"
	style="top: var(--header-height); height: calc(100vh - var(--header-height));"
	aria-label="Study panel"
>
	<!-- Panel identity bar -->
	<div class="panel-header shrink-0 flex flex-col">
		<div class="flex items-center gap-[8px] px-[14px] pt-[11px] pb-[10px]">
			<span class="spine-mark" aria-hidden="true"></span>
			<span class="text-[9px] uppercase tracking-[0.28em] text-subtle font-medium select-none">
				Study Notes
			</span>
		</div>

		<!-- Tabs -->
		<div class="tab-row flex px-[4px] gap-[2px]">
			{#each ['intro', 'commentary'] as const as tab}
				<button
					class="tab-btn flex-1 pb-[9px] pt-[2px] text-[10px] uppercase tracking-[0.13em] font-medium transition-colors duration-fast relative"
					class:tab-active={$studyPanel.activeTab === tab}
					on:click={() => studyPanel.update((s) => ({ ...s, activeTab: tab }))}
				>
					{tab === 'intro' ? 'Intro' : 'Commentary'}
					{#if $studyPanel.activeTab === tab}
						<span class="tab-indicator" aria-hidden="true"></span>
					{/if}
				</button>
			{/each}
		</div>

		<div class="border-b border-border"></div>
	</div>

	<!-- Scrollable content -->
	<div class="panel-scroll flex-1 overflow-y-auto">
		{#if $studyPanel.activeTab === 'intro'}
			{#if intros.length === 0}
				<div class="empty-state">
					<span class="empty-icon" aria-hidden="true">✦</span>
					<p>No introduction for this book yet.</p>
				</div>
			{:else}
				<!-- Intro sub-tabs -->
				{#if intros.length > 1}
					<div
						class="subtab-row flex overflow-x-auto border-b border-border bg-background shrink-0"
					>
						{#each intros as intro, i}
							<button
								class="subtab-btn px-[12px] py-[7px] text-[10px] whitespace-nowrap transition-colors duration-fast shrink-0 relative"
								class:subtab-active={$studyPanel.activeIntroIndex === i}
								on:click={() => studyPanel.update((s) => ({ ...s, activeIntroIndex: i }))}
							>
								{tabLabel(intro.title)}
								{#if $studyPanel.activeIntroIndex === i}
									<span class="tab-indicator" aria-hidden="true"></span>
								{/if}
							</button>
						{/each}
					</div>
				{/if}

				{#if intros[$studyPanel.activeIntroIndex]}
					{@const intro = intros[$studyPanel.activeIntroIndex]}
					<div class="content-block">
						<p class="content-eyebrow">{tabLabel(intro.title)}</p>
						<AnnotatedText text={intro.text} annotations={intro.annotations ?? []} />
					</div>
				{/if}
			{/if}
		{:else if commentaryEntries.length === 0}
			<div class="empty-state">
				<span class="empty-icon" aria-hidden="true">✦</span>
				<p>No commentary for this chapter yet.</p>
			</div>
		{:else}
			<div class="divide-y divide-border">
				{#each commentaryEntries as entry}
					<div class="content-block">
						<p class="content-entry-title">{entry.title}</p>
						<AnnotatedText text={entry.text} annotations={entry.annotations ?? []} />
					</div>
				{/each}
			</div>
		{/if}
	</div>
</aside>

<style>
	.panel-root {
		background: var(--color-panel);
	}

	/* ─── Identity bar ──────────────────────────────── */
	.panel-header {
		background: var(--color-panel);
	}

	.spine-mark {
		display: block;
		width: 3px;
		height: 13px;
		border-radius: 2px;
		background: var(--color-accent);
		flex-shrink: 0;
	}

	/* ─── Tabs ──────────────────────────────────────── */
	.tab-btn {
		color: var(--color-subtle);
		background: none;
		border: none;
		cursor: pointer;
	}

	.tab-btn:hover {
		color: var(--color-text);
	}

	.tab-active {
		color: var(--color-accent);
	}

	.tab-indicator {
		position: absolute;
		bottom: 0;
		left: 10%;
		right: 10%;
		height: 2px;
		border-radius: 1px 1px 0 0;
		background: var(--color-accent);
	}

	/* ─── Sub-tabs ──────────────────────────────────── */
	.subtab-btn {
		color: var(--color-subtle);
		background: none;
		border: none;
		cursor: pointer;
		font-family: var(--font-ui);
	}

	.subtab-btn:hover {
		color: var(--color-text);
	}

	.subtab-active {
		color: var(--color-accent);
	}

	/* ─── Scrollable pane ───────────────────────────── */
	.panel-scroll {
		scrollbar-width: thin;
		scrollbar-color: color-mix(in srgb, var(--color-accent) 25%, transparent) transparent;
	}

	.panel-scroll::-webkit-scrollbar {
		width: 4px;
	}

	.panel-scroll::-webkit-scrollbar-track {
		background: transparent;
	}

	.panel-scroll::-webkit-scrollbar-thumb {
		background: color-mix(in srgb, var(--color-accent) 30%, transparent);
		border-radius: 2px;
	}

	.panel-scroll::-webkit-scrollbar-thumb:hover {
		background: color-mix(in srgb, var(--color-accent) 50%, transparent);
	}

	/* ─── Content ───────────────────────────────────── */
	.content-block {
		padding: 14px 16px;
	}

	.content-eyebrow {
		font-size: 9px;
		text-transform: uppercase;
		letter-spacing: 0.22em;
		color: var(--color-accent);
		font-weight: 500;
		margin-bottom: 10px;
	}

	.content-entry-title {
		font-size: 11px;
		font-weight: 600;
		color: var(--color-accent);
		margin-bottom: 7px;
		letter-spacing: 0.02em;
	}

	/* ─── Empty state ───────────────────────────────── */
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 10px;
		padding: 48px 20px;
		text-align: center;
	}

	.empty-icon {
		font-size: 18px;
		color: color-mix(in srgb, var(--color-accent) 35%, transparent);
		display: block;
	}

	.empty-state p {
		font-size: 12px;
		color: var(--color-subtle);
		font-style: italic;
		line-height: 1.5;
	}
</style>
