<script lang="ts">
	import { run } from 'svelte/legacy';

	import { createEventDispatcher, onDestroy, onMount, tick } from 'svelte';
	import { browser } from '$app/environment';
	import type { FathersChapterFile, FathersEntry } from '$lib/data/fathers-types';
	import type { OsisRange } from '$lib/search/reference';
	import { parseOsis } from '$lib/search/reference';
	import { displayVerseRef } from '$lib/utils/fathers-display';
	import { prefs } from '$lib/stores/prefs';
	import { entryMatches, hasActiveFilter, type FathersFilterState } from './fathersFilterUtils';
	import FathersFilterBar from './FathersFilterBar.svelte';
	import FathersEntryCard from './FathersEntryCard.svelte';
	import VerseTooltip from './VerseTooltip.svelte';

	interface Props {
		chapterData: FathersChapterFile;
		selectedVerse: number | null;
		selectedPericope?: string | null;
	}

	let { chapterData, selectedVerse, selectedPericope = null }: Props = $props();

	const dispatch = createEventDispatcher<{ filteredCounts: Record<number, number> | null }>();

	// ── Filter state (owned by FathersFilterBar, received via event) ──
	let filter: FathersFilterState = $state({
		century: 'all',
		era: 'all',
		tradition: 'all',
		authors: new Set()
	});
	let expandAll = $state(false);

	function handleFilterChange(e: CustomEvent<FathersFilterState>) {
		filter = e.detail;
	}

	function handleExpandAllChange(e: CustomEvent<boolean>) {
		expandAll = e.detail;
	}

	function entryIsHighlighted(e: FathersEntry): boolean {
		if (selectedVerse === null) return false;
		if (e.subVerseNum !== null) return e.subVerseNum === selectedVerse;
		return false;
	}

	function entryIsDimmed(e: FathersEntry): boolean {
		if (!hasFilter) return false;
		return !entryMatches(e, filter);
	}

	let prevFilteredCounts: Record<number, number> | null = $state(null);

	// ── Scroll on verse or pericope select ────────────────────────
	let scrollContainer: HTMLElement | undefined = $state();

	async function scrollToEl(el: HTMLElement | null) {
		if (!el || !scrollContainer) return;
		const containerTop = scrollContainer.getBoundingClientRect().top;
		const elTop = el.getBoundingClientRect().top;
		const offset = elTop - containerTop + scrollContainer.scrollTop;
		scrollContainer.scrollTo({ top: offset, behavior: 'smooth' });
	}

	async function scrollToVerse(verse: number) {
		await tick();
		if (!scrollContainer) return;
		const idx = chapterData.pericopes.findIndex(
			(p) => verse >= p.startVerse && verse <= p.endVerse
		);
		if (idx >= 0 && ensurePericopeMounted(idx)) {
			await tick();
		}
		const el = scrollContainer.querySelector(`[data-verse="${verse}"]`) as HTMLElement | null;
		scrollToEl(el);
	}

	async function scrollToPericopeRef(verseRef: string) {
		await tick();
		if (!scrollContainer) return;
		const idx = chapterData.pericopes.findIndex((p) => p.verseRef === verseRef);
		if (idx >= 0 && ensurePericopeMounted(idx)) {
			await tick();
		}
		const el = scrollContainer.querySelector(
			`[data-pericope-ref="${CSS.escape(verseRef)}"]`
		) as HTMLElement | null;
		scrollToEl(el);
	}

	// ── Verse-ref tooltip (hover popover for linkified refs) ─────────
	let verseRefs: OsisRange[] = $state([]);
	let verseRefAnchor: HTMLElement | null = $state(null);
	let verseRefVisible = $state(false);
	let verseRefTimer: ReturnType<typeof setTimeout> | null = $state(null);

	function handleRefOver(e: Event) {
		const vref = (e.target as HTMLElement).closest('.verse-ref') as HTMLElement | null;
		if (!vref) return;
		if (verseRefTimer) clearTimeout(verseRefTimer);
		const osis = vref.dataset.osis ?? '';
		const refs = osis.split(',').flatMap((s) => {
			const r = parseOsis(s.trim());
			return r ? [r] : [];
		});
		if (refs.length > 0) {
			verseRefs = refs;
			verseRefAnchor = vref;
			verseRefVisible = true;
		}
	}

	function handleRefOut(e: Event) {
		const me = e as MouseEvent;
		const related = me.relatedTarget as HTMLElement | null;
		if (related?.closest?.('.tooltip')) return;
		const vref = (e.target as HTMLElement).closest('.verse-ref') as HTMLElement | null;
		if (vref) {
			verseRefTimer = setTimeout(() => {
				verseRefVisible = false;
				verseRefAnchor = null;
			}, 300);
		}
	}

	onDestroy(() => {
		if (verseRefTimer) clearTimeout(verseRefTimer);
	});

	// ── Lazy pericope rendering via IntersectionObserver ──────────────
	let visiblePericopes: Set<number> = $state(new Set([0, 1, 2]));
	let pericopeObserver: IntersectionObserver | null = null;
	const observedEls = new Map<number, HTMLElement>();

	onMount(() => {
		if (!browser) return;
		pericopeObserver = new IntersectionObserver(
			(entries) => {
				let changed = false;
				for (const ioEntry of entries) {
					if (ioEntry.isIntersecting) {
						const idx = Number((ioEntry.target as HTMLElement).dataset.pericopeIdx);
						if (!isNaN(idx) && !visiblePericopes.has(idx)) {
							visiblePericopes.add(idx);
							changed = true;
							pericopeObserver?.unobserve(ioEntry.target);
							observedEls.delete(idx);
						}
					}
				}
				if (changed) {
					visiblePericopes = new Set(visiblePericopes);
				}
			},
			{ rootMargin: '200px', root: scrollContainer }
		);
		if (scrollContainer) {
			const els = scrollContainer.querySelectorAll('[data-pericope-idx]');
			for (const el of Array.from(els) as HTMLElement[]) {
				const idx = Number(el.dataset.pericopeIdx);
				if (!isNaN(idx) && !visiblePericopes.has(idx)) {
					pericopeObserver.observe(el);
					observedEls.set(idx, el);
				}
			}
		}
	});

	onDestroy(() => {
		pericopeObserver?.disconnect();
		pericopeObserver = null;
		observedEls.clear();
	});

	function observePericope(node: HTMLElement, idx: number) {
		if (pericopeObserver && !visiblePericopes.has(idx)) {
			pericopeObserver.observe(node);
			observedEls.set(idx, node);
		}
		return {
			destroy() {
				pericopeObserver?.unobserve(node);
				observedEls.delete(idx);
			}
		};
	}

	function ensurePericopeMounted(idx: number): boolean {
		if (visiblePericopes.has(idx)) return false;
		visiblePericopes = new Set([...visiblePericopes, idx]);
		return true;
	}

	let hasFilter = $derived(hasActiveFilter(filter));
	let allEntries = $derived(chapterData.pericopes.flatMap((p) => p.entries));
	// Compute filtered counts, then dispatch only when they actually change
	let computedFilteredCounts = $derived(
		(() => {
			if (!hasFilter) return null;
			const counts: Record<number, number> = {};
			for (const p of chapterData.pericopes) {
				for (const entry of p.entries) {
					if (!entryMatches(entry, filter)) continue;
					if (entry.subVerseNum !== null) {
						counts[entry.subVerseNum] = (counts[entry.subVerseNum] ?? 0) + 1;
					} else {
						for (let v = p.startVerse; v <= p.endVerse; v++) {
							counts[v] = (counts[v] ?? 0) + 1;
						}
					}
				}
			}
			return counts;
		})()
	);
	run(() => {
		if (computedFilteredCounts !== prevFilteredCounts) {
			prevFilteredCounts = computedFilteredCounts;
			dispatch('filteredCounts', computedFilteredCounts);
		}
	});
	run(() => {
		if (selectedVerse !== null) {
			scrollToVerse(selectedVerse);
		}
	});
	run(() => {
		if (selectedPericope !== null) {
			scrollToPericopeRef(selectedPericope);
		}
	});
	run(() => {
		if (chapterData) {
			visiblePericopes = new Set([0, 1, 2]);
		}
	});
</script>

<div class="flex flex-col h-full overflow-hidden">
	<FathersFilterBar
		{allEntries}
		totalEntries={chapterData.totalEntries}
		{expandAll}
		on:filterChange={handleFilterChange}
		on:expandAllChange={handleExpandAllChange}
	/>

	<!-- ── Pericope groups ────────────────────────────────────── -->
	<!-- svelte-ignore a11y_no_static_element_interactions, a11y_mouse_events_have_key_events -->
	<div
		class="flex-1 overflow-y-auto styled-scroll"
		bind:this={scrollContainer}
		onmouseover={handleRefOver}
		onmouseout={handleRefOut}
	>
		{#if chapterData.pericopes.length === 0}
			<div class="p-lg text-center text-subtle text-[14px]">
				<p>No patristic commentary available for this chapter.</p>
			</div>
		{:else}
			{#each chapterData.pericopes as pericope, i}
				{@const pericopeEntries = pericope.entries}
				{@const verseInRange =
					selectedVerse !== null &&
					selectedVerse >= pericope.startVerse &&
					selectedVerse <= pericope.endVerse}
				{@const matchingCount = hasFilter
					? pericopeEntries.filter((e) => entryMatches(e, filter)).length
					: pericopeEntries.length}

				<div
					class="border-b border-border/50 last:border-b-0"
					data-pericope-ref={pericope.verseRef}
					data-pericope-idx={i}
					use:observePericope={i}
				>
					<div class="sticky top-0 z-10 bg-panel border-b border-border/30 px-sm py-[8px]">
						<div class="flex items-center justify-between">
							<span class="text-[11px] font-semibold uppercase tracking-[0.12em] text-subtle">
								{displayVerseRef(pericope.verseRef, $prefs.modernBookNames)}
							</span>
							<span class="text-[10px] text-subtle">
								{matchingCount}
								{matchingCount === 1 ? 'entry' : 'entries'}
								{#if hasFilter && matchingCount < pericopeEntries.length}
									<span class="text-border">/ {pericopeEntries.length}</span>
								{/if}
							</span>
						</div>
						{#if pericope.pericopeTitle}
							<p class="text-[12px] font-medium text-foreground/80 mt-[2px]">
								{pericope.pericopeTitle}
							</p>
						{/if}
					</div>

					{#if pericope.overview && expandAll}
						<div class="px-sm py-[8px] bg-accent/5 border-b border-border/20">
							<p class="text-[9px] uppercase tracking-[0.15em] text-subtle font-medium mb-[4px]">
								Overview
							</p>
							<p class="text-[13px] leading-relaxed text-foreground/80 italic">
								{pericope.overview}
							</p>
						</div>
					{/if}

					{#if visiblePericopes.has(i)}
						<div class="px-sm py-[8px] space-y-[8px]">
							{#each pericopeEntries as entry}
								<FathersEntryCard
									{entry}
									highlighted={verseInRange && entryIsHighlighted(entry)}
									dimmed={entryIsDimmed(entry)}
									forceOpen={expandAll}
								/>
							{/each}
						</div>
					{:else}
						<div class="px-sm py-[8px]" style="min-height: {pericopeEntries.length * 80}px"></div>
					{/if}
				</div>
			{/each}
		{/if}
	</div>

	<VerseTooltip
		translationId="odr"
		osisRanges={verseRefs}
		anchorEl={verseRefAnchor}
		visible={verseRefVisible}
		onmouseenter={() => {
			if (verseRefTimer) clearTimeout(verseRefTimer);
		}}
		onmouseleave={() => {
			verseRefTimer = setTimeout(() => {
				verseRefVisible = false;
				verseRefAnchor = null;
			}, 120);
		}}
	/>
</div>
