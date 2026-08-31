<script lang="ts">
	import { tick } from 'svelte';
	import { browser } from '$app/environment';
	import { loadGlossary, type GlossaryEntry } from '$lib/data/loader';
	import {
		formatGlossaryContent,
		glossaryWordVariants,
		normalizeGlossaryTerm
	} from './studyPanelUtils';

	// Two fixed rows (A–M / N–Z) rather than a wrap-flow, so the split point
	// doesn't shift with panel width.
	const LETTER_ROWS = ['ABCDEFGHIJKLM'.split(''), 'NOPQRSTUVWXYZ'.split('')];

	// Global word list, not chapter-scoped — fetched once and kept for the
	// component's lifetime, which spans chapter navigation (StudyPanel stays
	// mounted while the reader moves between chapters).
	let entries = $state<GlossaryEntry[] | null>(null);
	let loadFailed = $state(false);
	let activeLetter: string | null = $state(null);
	let openTerms: Set<number> = $state(new Set());
	let termEls: Record<number, HTMLElement> = $state({});
	let flashedTerm: number | null = $state(null);
	let flashTimer: ReturnType<typeof setTimeout> | null = null;
	let letterPickerEl: HTMLElement | undefined = $state();

	$effect(() => {
		if (!browser || entries !== null) return;
		loadGlossary(fetch)
			.then((data) => {
				entries = data;
			})
			.catch(() => {
				loadFailed = true;
			});
	});

	let lettersPresent = $derived(new Set((entries ?? []).map((e) => e.letter)));

	// Maps a normalized headword variant to its entry's index in `entries`, so
	// "→ target" cross-refs (in prose or in a redirect-only word field) can be
	// resolved to a specific entry to jump to.
	let variantIndex = $derived.by(() => {
		const map = new Map<string, number>();
		(entries ?? []).forEach((e, i) => {
			for (const variant of glossaryWordVariants(e.word)) {
				map.set(variant, i);
			}
		});
		return map;
	});

	function resolveTarget(target: string): string | null {
		const idx = variantIndex.get(target);
		return idx === undefined ? null : String(idx);
	}

	let visibleEntries = $derived(
		activeLetter
			? (entries ?? [])
					.map((entry, idx) => ({ entry, idx }))
					.filter(({ entry }) => entry.letter === activeLetter)
			: []
	);

	function selectLetter(letter: string) {
		activeLetter = activeLetter === letter ? null : letter;
	}

	function toggleTerm(idx: number) {
		const next = new Set(openTerms);
		if (next.has(idx)) next.delete(idx);
		else next.add(idx);
		openTerms = next;
	}

	async function jumpToTerm(idx: number) {
		const target = entries?.[idx];
		if (!target) return;
		activeLetter = target.letter;
		openTerms = new Set(openTerms).add(idx);
		await tick();
		await tick();
		const el = termEls[idx];
		// Plain scrollIntoView aligns the term's top edge with the scroll
		// container's top — which is exactly where the sticky letter-picker
		// sits, so the headword ends up hidden behind it. Offset by the
		// picker's own height so the term lands just below it instead.
		const scrollEl = el?.closest<HTMLElement>('.panel-scroll');
		if (el && scrollEl) {
			const pickerHeight = letterPickerEl?.getBoundingClientRect().height ?? 0;
			const offset =
				el.getBoundingClientRect().top -
				scrollEl.getBoundingClientRect().top +
				scrollEl.scrollTop -
				pickerHeight;
			scrollEl.scrollTo({ top: offset, behavior: 'smooth' });
		} else {
			el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
		}
		flashedTerm = idx;
		if (flashTimer) clearTimeout(flashTimer);
		flashTimer = setTimeout(() => {
			flashedTerm = null;
		}, 1200);
	}

	// Delegated click handler: cross-ref buttons are inside {@html} content, so
	// they can't carry a Svelte onclick directly.
	function handleContentClick(e: MouseEvent) {
		const btn = (e.target as HTMLElement).closest<HTMLElement>('.glossary-xref');
		if (!btn) return;
		const idx = Number(btn.dataset.glossaryTarget);
		if (Number.isNaN(idx)) return;
		jumpToTerm(idx);
	}

	function redirectParts(word: string): { alias: string; targets: string[] } {
		const [alias, rest] = word.split('→');
		return {
			alias: alias.trim(),
			targets: (rest ?? '')
				.split(',')
				.map((t) => t.trim())
				.filter(Boolean)
		};
	}
</script>

<div class="glossary-root">
	<div class="letter-picker" role="group" aria-label="Jump to letter" bind:this={letterPickerEl}>
		{#each LETTER_ROWS as row (row)}
			<div class="letter-row">
				{#each row as letter (letter)}
					{@const present = lettersPresent.has(letter)}
					<button
						type="button"
						class="letter-btn"
						class:active={activeLetter === letter}
						disabled={!present}
						onclick={() => selectLetter(letter)}
					>
						{letter}
					</button>
				{/each}
			</div>
		{/each}
	</div>

	<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
	<div class="glossary-content" onclick={handleContentClick}>
		{#if entries === null}
			<div class="empty-state">
				<p>{loadFailed ? 'Could not load glossary.' : 'Loading glossary…'}</p>
			</div>
		{:else if !activeLetter}
			<div class="empty-state">
				<span class="empty-icon" aria-hidden="true">✦</span>
				<p>Choose a letter to browse Vulgate vocabulary.</p>
			</div>
		{:else}
			<ul class="term-list">
				{#each visibleEntries as { entry, idx } (idx)}
					{@const isRedirect = !entry.content.trim() && entry.word.includes('→')}
					<li
						class="term-item"
						class:flash-highlight={flashedTerm === idx}
						bind:this={termEls[idx]}
					>
						{#if isRedirect}
							{@const { alias, targets } = redirectParts(entry.word)}
							<p class="term-redirect">
								<span class="term-word">{alias}</span>
								<span class="redirect-arrow" aria-hidden="true">→</span>
								{#each targets as t, i (t)}
									{@const targetIdx = variantIndex.get(normalizeGlossaryTerm(t))}
									{#if targetIdx !== undefined}
										<button
											type="button"
											class="glossary-xref"
											onclick={() => jumpToTerm(targetIdx)}
										>
											{t}
										</button>
									{:else}
										<span>{t}</span>
									{/if}
									{#if i < targets.length - 1}<span>,&nbsp;</span>{/if}
								{/each}
							</p>
						{:else}
							<button
								type="button"
								class="term-header"
								aria-expanded={openTerms.has(idx)}
								onclick={() => toggleTerm(idx)}
							>
								<span class="term-word">{entry.word}</span>
								<span class="term-chevron" class:open={openTerms.has(idx)} aria-hidden="true"
									>▸</span
								>
							</button>
							{#if openTerms.has(idx)}
								<div class="term-content">
									{@html formatGlossaryContent(entry.content, resolveTarget)}
								</div>
							{/if}
						{/if}
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</div>

<style>
	.glossary-root {
		display: flex;
		flex-direction: column;
	}

	.letter-picker {
		position: sticky;
		top: 0;
		z-index: 1;
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding: 12px 16px;
		background: var(--color-verse-sticky-bg);
		border-bottom: 1px solid var(--color-border);
	}

	.letter-row {
		display: grid;
		grid-template-columns: repeat(13, 1fr);
		gap: 2px;
	}

	.letter-btn {
		padding: 4px 0;
		border: none;
		border-radius: 3px;
		background: none;
		color: var(--color-foreground);
		font-family: var(--font-ui);
		font-size: 12px;
		font-weight: 500;
		text-align: center;
		cursor: pointer;
		transition:
			background 150ms ease,
			color 150ms ease,
			opacity 150ms ease;
	}

	.letter-btn:hover:not(:disabled) {
		background: color-mix(in srgb, var(--color-accent) 10%, transparent);
	}

	.letter-btn.active {
		background: var(--color-accent);
		color: var(--color-panel);
	}

	.letter-btn:disabled {
		opacity: 0.25;
		cursor: default;
	}

	.glossary-content {
		flex: 1;
		font-family: var(--font-reader);
	}

	.term-list {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.term-item {
		border-bottom: 1px solid var(--color-border);
		padding: 10px 16px;
		transition: box-shadow 200ms ease;
	}

	.term-item.flash-highlight {
		animation: glossary-flash 1.2s ease;
	}

	@keyframes glossary-flash {
		0% {
			background: color-mix(in srgb, var(--color-accent) 14%, transparent);
		}
		100% {
			background: transparent;
		}
	}

	.term-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		border: none;
		background: none;
		padding: 0;
		cursor: pointer;
		text-align: left;
		color: inherit;
		font-family: inherit;
	}

	.term-word {
		font-weight: 600;
		font-style: italic;
		font-synthesis: none;
	}

	.term-chevron {
		color: var(--color-subtle);
		font-size: 11px;
		transition: transform 150ms ease;
		flex-shrink: 0;
		margin-left: 8px;
	}

	.term-chevron.open {
		transform: rotate(90deg);
	}

	.term-content {
		margin-top: 8px;
		line-height: 1.6;
	}

	.term-content :global(p) {
		margin: 0 0 0.8rem;
	}

	.term-content :global(p:last-child) {
		margin-bottom: 0;
	}

	.term-redirect {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 4px;
		margin: 0;
	}

	.redirect-arrow {
		color: var(--color-subtle);
	}

	.glossary-content :global(.glossary-xref) {
		border: none;
		background: none;
		padding: 0;
		color: var(--color-accent);
		font-style: italic;
		font-synthesis: none;
		cursor: pointer;
		text-decoration: underline;
		text-underline-offset: 2px;
		font: inherit;
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
		padding: 48px 24px;
		text-align: center;
		color: var(--color-subtle);
		font-family: var(--font-ui);
	}

	.empty-icon {
		color: var(--color-accent);
		font-size: 18px;
	}
</style>
