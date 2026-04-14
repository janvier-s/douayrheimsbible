<!-- src/lib/components/AnnotationProse.svelte -->
<script lang="ts">
	import { onDestroy } from 'svelte';
	import { allcapsToSmallcaps } from '$lib/utils/text';
	import MarkerPopover from '$lib/components/MarkerPopover.svelte';
	import type { AnnotationNote } from '$lib/data/types';

	export let text: string;
	export let notes: AnnotationNote[] = [];

	/** Renumber numeric markers sequentially across the full text and notes. */
	function renumber(
		raw: string,
		originalNotes: AnnotationNote[]
	): { html: string; notes: AnnotationNote[] } {
		let seq = 0;
		// Build a mapping from (occurrence index of numeric marker) → new sequential number.
		// Non-numeric markers (◦ etc.) are left untouched.
		const renumbered = raw.replace(/<mn>\[?(\d+)\]?<\/mn>/g, () => {
			seq++;
			return `<mn>[${seq}]</mn>`;
		});
		// Renumber notes in the same order — numeric notes get new sequential numbers
		let noteSeq = 0;
		const newNotes = originalNotes.map((n) => {
			const isNumeric = /^\d+$/.test(String(n.marker));
			if (isNumeric) {
				noteSeq++;
				return { ...n, marker: noteSeq };
			}
			return n;
		});
		return { html: renumbered, notes: newNotes };
	}

	function renderParagraphs(raw: string): string[] {
		return raw.split('\n\n').map((p) => {
			let html = p.trim().replace(/<mn>([^<]+)<\/mn>/g, (_, raw) => {
				// Normalise [1] → 1 for numeric markers; leave ◦ and others as-is
				const display = raw.replace(/^\[(\d+)\]$/, '$1');
				return `<button class="mn-marker" data-mn="${display}" aria-label="Marginal note ${display}">${display}</button>`;
			});
			html = allcapsToSmallcaps(html);
			return html;
		});
	}

	let proseEl: HTMLElement;

	function scrollToInlineMarker(marker: string) {
		// Use data-mn attribute — more reliable than id for {@html}-injected elements
		const target = proseEl?.querySelector(`.mn-marker[data-mn="${marker}"]`) as HTMLElement | null;
		if (!target) return;
		scrollIntoPanel(target, () => blinkEl(target));
	}

	function scrollToNote(marker: string) {
		const target = proseEl?.querySelector(`[data-note-marker="${marker}"]`) as HTMLElement | null;
		if (!target) return;
		scrollIntoPanel(target, () => blinkEl(target));
	}

	function scrollIntoPanel(el: HTMLElement, onDone?: () => void) {
		const scroller = el.closest('.panel-scroll') as HTMLElement | null;
		if (scroller) {
			const scrollerTop = scroller.getBoundingClientRect().top;
			const elTop = el.getBoundingClientRect().top;
			const targetTop = elTop - scrollerTop + scroller.scrollTop - 80;
			scroller.scrollTo({ top: targetTop, behavior: 'smooth' });
			// Wait for scroll to settle, then fire callback
			if (onDone) waitForScrollEnd(scroller, onDone);
		} else {
			el.scrollIntoView({ behavior: 'smooth', block: 'center' });
			if (onDone) setTimeout(onDone, 400);
		}
	}

	function waitForScrollEnd(scroller: HTMLElement, cb: () => void) {
		let timer: ReturnType<typeof setTimeout>;
		const handler = () => {
			clearTimeout(timer);
			timer = setTimeout(() => {
				scroller.removeEventListener('scroll', handler);
				cb();
			}, 80);
		};
		scroller.addEventListener('scroll', handler, { passive: true });
		// Fallback if already at position (no scroll events fire).
		// 300ms gives smooth scroll enough time to begin emitting events.
		timer = setTimeout(() => {
			scroller.removeEventListener('scroll', handler);
			cb();
		}, 300);
	}

	/** Double-blink: two rapid fades then a longer glow that fades out. */
	function blinkEl(el: HTMLElement) {
		el.classList.remove('note-blink');
		// Force reflow so re-adding the class restarts the animation
		void el.offsetWidth;
		el.classList.add('note-blink');
		el.addEventListener('animationend', () => el.classList.remove('note-blink'), { once: true });
	}

	let openMn: string | null = null;
	let popoverAnchorEl: HTMLElement | null = null;
	let hoverTimer: ReturnType<typeof setTimeout> | null = null;

	function dismiss() {
		if (hoverTimer) {
			clearTimeout(hoverTimer);
			hoverTimer = null;
		}
		openMn = null;
		popoverAnchorEl = null;
	}

	function scheduleDismiss() {
		hoverTimer = setTimeout(dismiss, 120);
	}

	function cancelDismiss() {
		if (hoverTimer) {
			clearTimeout(hoverTimer);
			hoverTimer = null;
		}
	}

	function handleMouseover(e: Event) {
		const btn = (e.target as HTMLElement).closest('[data-mn]') as HTMLElement | null;
		if (!btn) return;
		cancelDismiss();
		const mn = btn.dataset.mn ?? null;
		openMn = mn;
		popoverAnchorEl = btn;
	}

	function handleMouseout(e: Event) {
		const btn = (e.target as HTMLElement).closest('[data-mn]') as HTMLElement | null;
		if (!btn) return;
		scheduleDismiss();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (openMn && e.key === 'Escape') dismiss();
	}

	onDestroy(() => {
		if (hoverTimer) clearTimeout(hoverTimer);
	});

	$: ({ html: sequentialText, notes: sequentialNotes } = renumber(text, notes));
	$: paragraphs = renderParagraphs(sequentialText);
	$: activeNote = sequentialNotes.find((n) => String(n.marker) === openMn) ?? null;
</script>

<svelte:window on:keydown={handleKeydown} />

<!-- svelte-ignore a11y_no_static_element_interactions a11y-click-events-have-key-events -->
<div
	class="annotation-prose"
	bind:this={proseEl}
	on:mouseover={handleMouseover}
	on:mouseout={handleMouseout}
	on:focus={handleMouseover}
	on:blur={handleMouseout}
	on:click={(e) => {
		const btn = (e.target as HTMLElement).closest('.mn-marker') as HTMLElement | null;
		if (btn) {
			const marker = btn.dataset.mn;
			if (marker) scrollToNote(marker);
		}
	}}
>
	{#each paragraphs as para}
		<p class="font-reader text-[16px] leading-[1.83] text-foreground">
			{@html para}
		</p>
	{/each}

	{#if sequentialNotes && sequentialNotes.length > 0}
		<ul class="ann-notes">
			{#each sequentialNotes as note}
				<li class="ann-note-row" data-note-marker={note.marker}>
					<button
						class="ann-note-marker"
						on:click|stopPropagation={() => scrollToInlineMarker(String(note.marker))}
						aria-label="Go to marker {note.marker} in text">{note.marker}</button
					>
					<span class="ann-note-text">{@html allcapsToSmallcaps(note.text)}</span>
				</li>
			{/each}
		</ul>
	{/if}

	<MarkerPopover
		anchorEl={popoverAnchorEl}
		visible={!!openMn && !!activeNote}
		on:dismiss={() => dismiss()}
		on:mouseenter={cancelDismiss}
		on:mouseleave={scheduleDismiss}
	>
		{#if activeNote}
			<span class="mn-popover-marker">{openMn}</span>
			<span class="mn-popover-text">{@html allcapsToSmallcaps(activeNote.text)}</span>
		{/if}
	</MarkerPopover>
</div>

<style>
	.annotation-prose {
		position: relative;
	}

	.annotation-prose p + p {
		margin-top: 0.6em;
	}

	:global(.mn-marker) {
		color: #e56868;
		font-size: 9px;
		font-family: var(--font-ui);
		font-weight: 400;
		vertical-align: super;
		line-height: 1;
		cursor: pointer;
		border: none;
		background: color-mix(in srgb, var(--color-accent) 15%, transparent);
		padding: 1px 3px;
		margin: 0 1px;
		border-radius: 2px;
	}

	:global(.mn-marker:hover) {
		opacity: 0.75;
	}

	.annotation-prose :global(i) {
		font-style: italic;
	}

	/* Notes list */
	.ann-notes {
		list-style: none;
		margin-top: 10px;
		padding: 8px 0 0;
		border-top: 1px solid color-mix(in srgb, var(--color-border) 60%, transparent);
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.ann-note-row {
		display: flex;
		gap: 7px;
		align-items: baseline;
		line-height: 1.45;
	}

	.ann-note-marker {
		font-family: var(--font-ui);
		font-size: 10px;
		font-weight: 600;
		color: var(--color-accent-text);
		flex-shrink: 0;
		min-width: 18px;
		cursor: pointer;
		background: none;
		border: none;
		padding: 0;
		text-align: left;
	}

	.ann-note-marker:hover {
		opacity: 0.7;
	}

	.ann-note-text {
		font-family: var(--font-ui);
		font-size: 15px;
	}

	.ann-note-text :global(i) {
		font-style: italic;
	}

	:global(.mn-popover-marker) {
		color: var(--color-accent);
		font-size: 9px;
		font-weight: 700;
		margin-right: 6px;
	}

	:global(.mn-popover-text) {
		opacity: 0.9;
	}

	/* Glow with double-blink at start — note rows */
	:global(.note-blink) {
		animation: note-blink 4s ease both;
		margin-left: -10px;
		padding-left: 10px;
	}

	@keyframes note-blink {
		0% {
			background: color-mix(in srgb, var(--color-accent) 8%, transparent);
		}
		5% {
			background: color-mix(in srgb, var(--color-accent) 13%, transparent);
		}
		12% {
			background: color-mix(in srgb, var(--color-accent) 6%, transparent);
		}
		18% {
			background: color-mix(in srgb, var(--color-accent) 12%, transparent);
		}
		26% {
			background: color-mix(in srgb, var(--color-accent) 8%, transparent);
		}
		100% {
			background: transparent;
		}
	}

	/* Bright blink + glow for inline text markers */
	:global(.mn-marker.note-blink) {
		animation: marker-blink 4s ease both;
		margin: 0 1px;
		padding: 1px 3px;
	}

	@keyframes marker-blink {
		0% {
			background: color-mix(in srgb, var(--color-accent) 50%, transparent);
		}
		5% {
			background: color-mix(in srgb, var(--color-accent) 80%, transparent);
		}
		12% {
			background: color-mix(in srgb, var(--color-accent) 35%, transparent);
		}
		18% {
			background: color-mix(in srgb, var(--color-accent) 70%, transparent);
		}
		26% {
			background: color-mix(in srgb, var(--color-accent) 40%, transparent);
		}
		100% {
			background: color-mix(in srgb, var(--color-accent) 15%, transparent);
		}
	}
</style>
