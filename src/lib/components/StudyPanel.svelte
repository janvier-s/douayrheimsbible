<script lang="ts">
	import { studyPanel } from '$lib/stores/studyPanel';
	import { readingPosition } from '$lib/stores/reading';
	import type { BookData } from '$lib/data/types';
	import AnnotatedText from './AnnotatedText.svelte';

	export let bookData: BookData | null = null;

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

	// Slider position: 0 = Intro, 1 = Commentary
	$: sliderIndex = $studyPanel.activeTab === 'commentary' ? 1 : 0;
</script>

<aside
	class="panel-root sticky overflow-hidden border-l border-border bg-panel flex flex-col font-ui"
	style="top: var(--header-height); height: calc(100vh - var(--header-height));"
	aria-label="Study panel"
>
	<!-- Panel identity bar -->
	<div class="panel-header shrink-0 flex flex-col">
		<div class="flex items-center justify-center px-[14px] pt-[11px] pb-[10px]">
			<span class="panel-title">Study Notes</span>
		</div>

		<!-- Tabs with sliding underline -->
		<div class="tab-row relative flex px-[4px] gap-[2px]">
			{#each ['intro', 'commentary'] as const as tab}
				<button
					class="tab-btn flex-1 pb-[9px] pt-[2px]"
					class:tab-active={$studyPanel.activeTab === tab}
					on:click={() => studyPanel.update((s) => ({ ...s, activeTab: tab }))}
				>
					{tab === 'intro' ? 'Intro' : 'Commentary'}
				</button>
			{/each}
			<!-- Single sliding underline -->
			<div
				class="tab-slider"
				style="transform: translateX({sliderIndex * 100}%)"
				aria-hidden="true"
			></div>
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
				{#if intros.length > 1}
					<div
						class="subtab-row flex overflow-x-auto border-b border-border bg-background shrink-0"
					>
						{#each intros as intro, i}
							<button
								class="subtab-btn px-[12px] py-[7px] whitespace-nowrap transition-colors duration-fast shrink-0 relative"
								class:subtab-active={$studyPanel.activeIntroIndex === i}
								on:click={() => studyPanel.update((s) => ({ ...s, activeIntroIndex: i }))}
							>
								{tabLabel(intro.title)}
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
	/* ─── Identity bar ──────────────────────────────── */
	.panel-title {
		font-size: 10px;
		text-transform: uppercase;
		letter-spacing: 0.25em;
		color: var(--color-subtle);
		font-weight: 500;
		user-select: none;
	}

	/* ─── Tabs ──────────────────────────────────────── */
	.tab-row {
		position: relative;
	}

	.tab-btn {
		font-size: 12px;
		font-weight: 400;
		color: var(--color-subtle);
		background: none;
		border: none;
		cursor: pointer;
		letter-spacing: 0.02em;
		transition: color var(--duration-fast);
		font-family: var(--font-ui);
	}

	.tab-btn:hover {
		color: var(--color-text);
	}

	.tab-active {
		color: var(--color-accent);
	}

	/* Sliding underline — 50% wide, translates by 100% per step */
	.tab-slider {
		position: absolute;
		bottom: 0;
		left: 4px; /* offset matches px-[4px] on tab-row */
		width: calc(50% - 4px);
		height: 2px;
		border-radius: 1px 1px 0 0;
		background: var(--color-accent);
		transition: transform 200ms cubic-bezier(0.4, 0, 0.2, 1);
	}

	/* ─── Sub-tabs ──────────────────────────────────── */
	.subtab-btn {
		font-size: 11px;
		font-weight: 400;
		color: var(--color-subtle);
		background: none;
		border: none;
		cursor: pointer;
		font-family: var(--font-ui);
		transition: color var(--duration-fast);
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
		padding: 16px 18px;
	}

	.content-eyebrow {
		font-size: 10px;
		text-transform: uppercase;
		letter-spacing: 0.22em;
		color: var(--color-accent);
		font-weight: 500;
		margin-bottom: 12px;
	}

	.content-entry-title {
		font-size: 13px;
		font-weight: 600;
		color: var(--color-accent);
		margin-bottom: 8px;
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
		font-size: 13px;
		color: var(--color-subtle);
		font-style: italic;
		line-height: 1.5;
	}
</style>
