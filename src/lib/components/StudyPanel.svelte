<script lang="ts">
	import { tick, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { studyPanel } from '$lib/stores/studyPanel';
	import { readingPosition } from '$lib/stores/reading';
	import { prefs } from '$lib/stores/prefs';
	import { loadAnnotations } from '$lib/data/loader';
	import type { BookData, ChapterAnnotations, AnnotationEntry, Verse } from '$lib/data/types';
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
	$: hasIntros = intros.length > 0;

	// When book changes, set the active tab based on user preference and intro availability
	$: {
		const idx = intros.findIndex((i) => i.default);
		const target = idx >= 0 ? idx : 0;
		const preferredTab = hasIntros ? $prefs.studyDefaultTab : 'commentary';
		if ($studyPanel.activeIntroIndex !== target || $studyPanel.activeTab !== preferredTab) {
			studyPanel.update((s) => ({ ...s, activeIntroIndex: target, activeTab: preferredTab }));
		}
	}

	function switchTab(tab: 'intro' | 'commentary') {
		studyPanel.update((s) => ({ ...s, activeTab: tab }));
		prefs.update((p) => ({ ...p, studyDefaultTab: tab }));
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
			// Capture these NOW, before any async gap
			const slug = currentBookSlug;
			const chNum = currentChapterNum;
			annotationsLoading = true;
			annotations = null;
			studyPanel.update((s) => ({ ...s, annotatedVerse: null }));
			loadAnnotations(slug, chNum, fetch)
				.then((data) => {
					// Only apply if still the same chapter (use captured values, not live ones)
					if (`${slug}/${chNum}` === key) {
						annotations = data;
						annotationsLoading = false;
					}
				})
				.catch(() => {
					if (`${slug}/${chNum}` === key) {
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
		// Guard against stale annotations from a previously-visited chapter
		const safeAnns = anns?.chapter === chapter.chapter ? anns : null;
		const sections: VerseSection[] = [];

		// Verse 0 is a summary continuation — merge its notes into the Summary section
		const verse0 = chapter.verses.find((v) => v.verse === 0);
		const hasSummaryNotes = chapter.summary_notes && chapter.summary_notes.length > 0;
		const hasVerse0Content =
			verse0 &&
			((verse0.notes && verse0.notes.length > 0) ||
				(verse0.cross_refs && verse0.cross_refs.length > 0));

		if (hasSummaryNotes || hasVerse0Content) {
			sections.push({
				verse: 0,
				label: 'Summary',
				verseData: verse0 ?? null,
				annotationEntries: []
			});
		}

		// Verse sections (skip verse 0 — handled above)
		for (const v of chapter.verses) {
			if (v.verse === 0) continue;
			const hasCrossRefs = v.cross_refs && v.cross_refs.length > 0;
			const hasNotes = v.notes && v.notes.length > 0;
			const annEntries = safeAnns?.annotations.filter((a) => a.verse === v.verse) ?? [];
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
	let programmaticScroll = false;
	let programmaticScrollTimer: ReturnType<typeof setTimeout> | null = null;
	let panelSectionObserver: IntersectionObserver | null = null;
	const intersectingVerses = new Map<number, number>();

	// Reset stale section element refs whenever the chapter changes
	$: (currentBookSlug, currentChapterNum, (sectionEls = {}));

	// Reader→panel auto-scroll disabled (too many edge cases with infinite scroll).
	// Explicit clicks (scrollTrigger) still scroll the panel.

	function scrollToSection(verse: number) {
		const el = sectionEls[verse];
		if (!el || !panelScroll) return;
		// Sync the verse underline in the reader
		studyPanel.update((s) => (s.annotatedVerse !== verse ? { ...s, annotatedVerse: verse } : s));
		programmaticScroll = true;
		if (programmaticScrollTimer) clearTimeout(programmaticScrollTimer);
		const panelTop = panelScroll.getBoundingClientRect().top;
		const elTop = el.getBoundingClientRect().top;
		const offset = elTop - panelTop + panelScroll.scrollTop;
		panelScroll.scrollTo({ top: offset, behavior: 'smooth' });
		programmaticScrollTimer = setTimeout(() => {
			programmaticScroll = false;
		}, 600);
	}

	function setupPanelObserver() {
		panelSectionObserver?.disconnect();
		panelSectionObserver = null;
		intersectingVerses.clear();
		if (!browser || !panelScroll || !$prefs.annotationSync) return;
		panelSectionObserver = new IntersectionObserver(
			(entries) => {
				if (programmaticScroll) return;
				for (const entry of entries) {
					const verse = parseInt((entry.target as HTMLElement).dataset.sectionVerse ?? '-1');
					if (verse < 0) continue;
					if (entry.isIntersecting) {
						intersectingVerses.set(verse, entry.boundingClientRect.top);
					} else {
						intersectingVerses.delete(verse);
					}
				}
				if (intersectingVerses.size > 0) {
					const active = [...intersectingVerses.entries()].sort((a, b) => a[1] - b[1])[0][0];
					studyPanel.update((s) => ({ ...s, annotatedVerse: active }));
				}
			},
			{ root: panelScroll, rootMargin: '0px 0px -55% 0px', threshold: 0 }
		);
		for (const key of Object.keys(sectionEls)) {
			const el = sectionEls[parseInt(key)];
			if (el) panelSectionObserver.observe(el);
		}
	}

	$: if (verseSections && browser) {
		tick().then(setupPanelObserver);
	}
	$: if (browser && !$prefs.annotationSync) {
		panelSectionObserver?.disconnect();
		panelSectionObserver = null;
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

		// Consume the trigger; also sync activeVerse so the observer reactive
		// doesn't re-run with a stale verse and clobber our scroll position.
		studyPanel.update((s) => ({ ...s, scrollTrigger: null, activeVerse: trigger.verse }));
	}

	// Slider position: 0 = Intro, 1 = Commentary
	$: sliderIndex = $studyPanel.activeTab === 'commentary' ? 1 : 0;

	onDestroy(() => {
		panelSectionObserver?.disconnect();
		if (programmaticScrollTimer) clearTimeout(programmaticScrollTimer);
	});
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
		{#if hasIntros}
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
						on:click={() => switchTab(tab)}
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
		{/if}

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
						class="subtab-row flex overflow-x-auto border-b border-border bg-background sticky top-0 z-[2]"
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
						<AnnotationProse text={intro.text} notes={intro.notes ?? []} />
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
							class:verse-section-active={$studyPanel.annotatedVerse === section.verse}
							bind:this={sectionEls[section.verse]}
							data-section-verse={section.verse}
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
											<span class="note-marker">{sn.marker}</span>
											<span class="note-text">{sn.text}</span>
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

							<!-- Cross-references -->
							{#if section.verseData?.cross_refs && section.verseData.cross_refs.length > 0}
								<div class="sub-section">
									<div class="sub-section-header">Cross-references</div>
									{#each section.verseData.cross_refs as cr, ci}
										<div class="cr-row" data-panel-id="panel-{section.verse}-cross_ref-{ci + 1}">
											<span class="cr-marker">{ci + 1}</span>
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
											<span class="note-marker">{note.label}</span>
											<span class="note-text">{@html note.text}</span>
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
		padding: 16px 52px;
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
		padding: 12px 52px 6px;
		user-select: none;
	}

	.verse-section-header-sticky {
		position: sticky;
		top: 0;
		background: var(--color-panel);
		z-index: 1;
		text-align: center;
		padding-top: 15px;
		padding-bottom: 15px;
		border-bottom: 1px solid var(--color-border);
		font-weight: 400;
		color: var(--color-accent);
		margin-bottom: 20px;
	}

	@supports (backdrop-filter: blur(1px)) {
		@media screen and (-webkit-min-device-pixel-ratio: 0) {
			.verse-section-header-sticky {
				background: color-mix(in srgb, var(--color-panel) 80%, transparent);
				backdrop-filter: blur(10px);
				-webkit-backdrop-filter: blur(10px);
			}
		}
	}

	.sub-section {
		padding: 4px 52px 12px;
	}

	.sub-section:last-child {
		padding-bottom: 17px;
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
		color: var(--color-accent-text);
		flex-shrink: 0;
		min-width: 18px;
	}

	.cr-text {
		font-family: var(--font-ui);
		font-size: 15px;
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
		color: var(--color-accent-text);
		flex-shrink: 0;
		min-width: 18px;
	}

	.note-text {
		font-family: var(--font-ui);
		font-size: 15px;
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
		font-size: 16px;
		font-weight: 600;
		color: var(--color-accent-text);
		margin: 10px 0 8px;
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

	/* ─── Reduced motion ───────────────────────────────────────── */
	@media (prefers-reduced-motion: reduce) {
		.tab-slider {
			transition: none;
		}

		.verse-section {
			transition: none;
		}

		:global(.flash-highlight) {
			animation: none;
			background: color-mix(in srgb, var(--color-accent) 15%, transparent);
		}
	}

	/* ─── Mobile density overrides ─────────────────────────────── */
	@media (max-width: 767px) {
		.content-block {
			padding: 12px 16px;
		}

		.sub-section {
			padding: 4px 12px 10px;
		}

		.sub-section:last-child {
			padding-bottom: 14px;
		}

		.verse-section-header {
			padding: 8px 12px 4px;
		}

		.verse-section-header-sticky {
			padding-top: 10px;
			padding-bottom: 10px;
		}

		.cr-text {
			font-size: 13px;
		}

		.note-text {
			font-size: 13px;
		}

		.annotation-title {
			font-size: 12px;
			margin: 6px 0 5px;
		}
	}
</style>
