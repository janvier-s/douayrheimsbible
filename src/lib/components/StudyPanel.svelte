<script lang="ts">
	import { tick } from 'svelte';
	import { browser } from '$app/environment';
	import { studyPanel } from '$lib/stores/studyPanel';
	import { readingPosition } from '$lib/stores/reading';
	import { prefs } from '$lib/stores/prefs';
	import { loadAnnotations } from '$lib/data/loader';
	import type { BookData, ChapterAnnotations, AnnotationEntry, Verse } from '$lib/data/types';
	import AnnotatedText from './AnnotatedText.svelte';
	import AnnotationProse from './AnnotationProse.svelte';

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
		const target = idx >= 0 ? idx : 0;
		if ($studyPanel.activeIntroIndex !== target) {
			studyPanel.update((s) => ({ ...s, activeIntroIndex: target }));
		}
	}

	// ── Current chapter data ─────────────────────────────────────────

	$: currentChapterNum = $readingPosition?.chapter ?? 1;
	$: currentBookSlug = $readingPosition?.bookSlug ?? '';
	$: currentChapterData = bookData?.chapters.find((c) => c.chapter === currentChapterNum);

	// ── Annotation sidecar loading ───────────────────────────────────

	let annotations: ChapterAnnotations | null = null;
	let annotationsLoading = false;
	let lastAnnotationKey = '';

	$: {
		const key = `${currentBookSlug}/${currentChapterNum}`;
		if (key !== lastAnnotationKey && currentBookSlug) {
			// eslint-disable-next-line no-useless-assignment
			lastAnnotationKey = key;
			annotationsLoading = true;
			annotations = null;
			loadAnnotations(currentBookSlug, currentChapterNum, fetch).then((data) => {
				// Only apply if still the same chapter
				if (`${currentBookSlug}/${currentChapterNum}` === key) {
					annotations = data;
					annotationsLoading = false;
				}
			});
		}
	}

	// ── Build verse sections for the commentary tab ──────────────────

	interface VerseSection {
		verse: number;
		label: string;
		verseData: Verse | null;
		annotationEntries: AnnotationEntry[];
	}

	$: verseSections = buildVerseSections(currentChapterData, annotations);

	function buildVerseSections(
		chapter: typeof currentChapterData,
		anns: ChapterAnnotations | null
	): VerseSection[] {
		if (!chapter) return [];
		const sections: VerseSection[] = [];

		// Verse 0 = Summary (if summary has notes)
		if (chapter.summary_notes && chapter.summary_notes.length > 0) {
			sections.push({
				verse: 0,
				label: 'Summary',
				verseData: null,
				annotationEntries: []
			});
		}

		// Verse sections
		for (const v of chapter.verses) {
			const hasCrossRefs = v.cross_refs && v.cross_refs.length > 0;
			const hasNotes = v.notes && v.notes.length > 0;
			const annEntries = anns?.annotations.filter((a) => a.verse === v.verse) ?? [];
			const hasAnnotations = v.has_annotation && annEntries.length > 0;

			if (hasCrossRefs || hasNotes || hasAnnotations) {
				sections.push({
					verse: v.verse,
					label: `Verse ${v.verse}`,
					verseData: v,
					annotationEntries: annEntries
				});
			}
		}

		return sections;
	}

	// ── Synced scroll ────────────────────────────────────────────────

	let panelScroll: HTMLElement;
	let sectionEls: Record<number, HTMLElement> = {};

	$: if (
		browser &&
		$prefs.syncStudyScroll &&
		$studyPanel.activeVerse != null &&
		$studyPanel.activeTab === 'commentary' &&
		panelScroll
	) {
		scrollToSection($studyPanel.activeVerse);
	}

	function scrollToSection(verse: number) {
		const el = sectionEls[verse];
		if (!el || !panelScroll) return;
		const panelTop = panelScroll.getBoundingClientRect().top;
		const elTop = el.getBoundingClientRect().top;
		const offset = elTop - panelTop + panelScroll.scrollTop;
		panelScroll.scrollTo({ top: offset, behavior: 'smooth' });
	}

	// ── ScrollTrigger consumption ────────────────────────────────────

	$: if ($studyPanel.scrollTrigger && panelScroll) {
		handleScrollTrigger($studyPanel.scrollTrigger);
	}

	async function handleScrollTrigger(trigger: NonNullable<typeof $studyPanel.scrollTrigger>) {
		// Switch to commentary tab
		if ($studyPanel.activeTab !== 'commentary') {
			studyPanel.update((s) => ({ ...s, activeTab: 'commentary' }));
			await tick();
		}

		// Scroll to the section
		scrollToSection(trigger.verse);

		// Flash highlight on the specific sub-entry if marker is specified
		await tick();
		if (trigger.marker) {
			const targetId = `panel-${trigger.verse}-${trigger.type}-${trigger.marker}`;
			const targetEl = panelScroll?.querySelector(
				`[data-panel-id="${targetId}"]`
			) as HTMLElement | null;
			if (targetEl) {
				targetEl.classList.add('flash-highlight');
				setTimeout(() => targetEl.classList.remove('flash-highlight'), 1500);
			}
		}

		// Consume the trigger
		studyPanel.update((s) => ({ ...s, scrollTrigger: null }));
	}

	// Slider position: 0 = Intro, 1 = Commentary
	$: sliderIndex = $studyPanel.activeTab === 'commentary' ? 1 : 0;
</script>

<aside
	class="panel-root h-full overflow-hidden border-l border-border bg-panel flex flex-col font-ui"
	aria-label="Study panel"
>
	<!-- Panel identity bar -->
	<div class="panel-header shrink-0 flex flex-col">
		<div class="flex items-center justify-center px-[14px] pt-[11px] pb-[10px]">
			<span class="panel-title">Study Notes</span>
		</div>

		<!-- Tabs with sliding underline -->
		<div
			class="tab-row relative flex px-[4px] gap-[2px]"
			role="tablist"
			aria-label="Study panel sections"
		>
			{#each ['intro', 'commentary'] as const as tab}
				<button
					role="tab"
					aria-selected={$studyPanel.activeTab === tab}
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
	<div class="panel-scroll flex-1 overflow-y-auto" bind:this={panelScroll}>
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
		{:else}
			<!-- Commentary tab -->
			{#if annotationsLoading}
				<div class="empty-state">
					<p>Loading commentary...</p>
				</div>
			{:else if verseSections.length === 0}
				<div class="empty-state">
					<span class="empty-icon" aria-hidden="true">✦</span>
					<p>No commentary for this chapter yet.</p>
				</div>
			{:else}
				<div class="commentary-list">
					{#each verseSections as section (section.verse)}
						<div
							class="verse-section"
							class:verse-section-active={$studyPanel.activeVerse === section.verse}
							bind:this={sectionEls[section.verse]}
						>
							<!-- Verse header (sticky for non-summary) -->
							<div
								class="verse-section-header"
								class:verse-section-header-sticky={section.verse !== 0}
							>
								{section.label}
							</div>

							<!-- Summary notes (verse 0) -->
							{#if section.verse === 0 && currentChapterData?.summary_notes}
								<div class="sub-section">
									<div class="sub-section-header">Notes</div>
									{#each currentChapterData.summary_notes as sn}
										<div class="note-row" data-panel-id="panel-0-note-{sn.marker}">
											<span class="note-marker">[{sn.marker}]</span>
											<span class="note-text">{sn.text}</span>
										</div>
									{/each}
								</div>
							{/if}

							<!-- Cross-references -->
							{#if section.verseData?.cross_refs && section.verseData.cross_refs.length > 0}
								<div class="sub-section">
									<div class="sub-section-header">Cross-references</div>
									{#each section.verseData.cross_refs as cr, ci}
										<div class="cr-row" data-panel-id="panel-{section.verse}-cross_ref-{ci + 1}">
											<span class="cr-marker">[{ci + 1}]</span>
											<span class="cr-text">{cr.text}</span>
										</div>
									{/each}
								</div>
							{/if}

							<!-- Notes -->
							{#if section.verseData?.notes && section.verseData.notes.length > 0}
								<div class="sub-section">
									<div class="sub-section-header">Notes</div>
									{#each section.verseData.notes as note}
										<div class="note-row" data-panel-id="panel-{section.verse}-note-{note.label}">
											<span class="note-marker">({note.label})</span>
											<span class="note-text">{@html note.text}</span>
										</div>
									{/each}
								</div>
							{/if}

							<!-- Annotations -->
							{#if section.annotationEntries.length > 0}
								<div class="sub-section">
									<div class="sub-section-header">Annotations</div>
									{#each section.annotationEntries as ann}
										<div
											class="annotation-block"
											data-panel-id="panel-{section.verse}-annotation-{ann.part}"
										>
											<p class="annotation-title">{ann.title}</p>
											<AnnotationProse text={ann.text} notes={ann.notes} />
										</div>
									{/each}
								</div>
							{/if}
						</div>
					{/each}
				</div>
			{/if}
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

	.tab-slider {
		position: absolute;
		bottom: 0;
		left: 4px;
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

	/* ─── Commentary ────────────────────────────────── */
	.commentary-list {
		display: flex;
		flex-direction: column;
	}

	.verse-section {
		border-bottom: 1px solid var(--color-border);
		padding: 0;
		transition: box-shadow 200ms ease;
	}

	.verse-section-active {
		box-shadow: inset 3px 0 0 var(--color-accent);
	}

	.verse-section-header {
		font-size: 10px;
		text-transform: uppercase;
		letter-spacing: 0.15em;
		color: var(--color-subtle);
		font-weight: 500;
		padding: 12px 18px 6px;
		user-select: none;
	}

	.verse-section-header-sticky {
		position: sticky;
		top: 0;
		background: var(--color-panel);
		z-index: 1;
	}

	.sub-section {
		padding: 4px 18px 12px;
	}

	.sub-section-header {
		font-size: 10px;
		text-transform: uppercase;
		letter-spacing: 0.15em;
		color: var(--color-subtle);
		margin-bottom: 6px;
	}

	/* Cross-references */
	.cr-row {
		display: flex;
		gap: 7px;
		align-items: baseline;
		line-height: 1.45;
		padding: 2px 0;
	}

	.cr-marker {
		font-family: var(--font-ui);
		font-size: 10px;
		font-weight: 600;
		color: var(--color-accent);
		flex-shrink: 0;
		min-width: 18px;
	}

	.cr-text {
		font-family: var(--font-ui);
		font-size: 12px;
		color: var(--color-subtle);
		font-style: italic;
	}

	/* Notes */
	.note-row {
		display: flex;
		gap: 7px;
		align-items: baseline;
		line-height: 1.45;
		padding: 2px 0;
	}

	.note-marker {
		font-family: var(--font-ui);
		font-size: 10px;
		font-weight: 600;
		color: var(--color-accent);
		flex-shrink: 0;
		min-width: 18px;
	}

	.note-text {
		font-family: var(--font-ui);
		font-size: 12px;
		color: var(--color-muted);
	}

	/* Allow <i> inside note text */
	.note-text :global(i) {
		font-style: italic;
	}

	/* Annotations */
	.annotation-block {
		padding: 4px 0 8px;
	}

	.annotation-block + .annotation-block {
		border-top: 1px solid var(--color-border);
		margin-top: 4px;
		padding-top: 8px;
	}

	.annotation-title {
		font-size: 13px;
		font-weight: 600;
		color: var(--color-accent);
		margin-bottom: 6px;
		font-family: var(--font-reader);
		font-style: italic;
	}

	/* Flash highlight for scroll-triggered entries */
	:global(.flash-highlight) {
		animation: flash 1.5s ease-out;
	}

	@keyframes flash {
		0% {
			background: color-mix(in srgb, var(--color-accent) 15%, transparent);
		}
		100% {
			background: transparent;
		}
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
