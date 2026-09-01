<!-- src/lib/components/AnnotationProse.svelte -->
<script lang="ts">
	import { stopPropagation } from 'svelte/legacy';

	import { onDestroy } from 'svelte';
	import {
		allcapsToSmallcaps,
		formatTrailingCitation,
		splitAnnotationParagraphs
	} from '$lib/utils/text';
	import MarkerPopover from '$lib/components/MarkerPopover.svelte';
	import VerseTooltip from '$lib/components/VerseTooltip.svelte';
	import { linkifyDrcRefs } from '$lib/search/crossRefParser';
	import { linkifyItalicRefs } from '$lib/search/crossRefItalic';
	import { parseOsis } from '$lib/search/osis';
	import type { OsisRange } from '$lib/search/osis';
	import type { AnnotationNote } from '$lib/data/types';

	interface Props {
		text: string;
		notes?: AnnotationNote[];
		/** Optional heading rendered above the body, sharing a row with the copy button */
		title?: string;
		/** Use stricter parsing to avoid false positives in patristic-heavy content */
		conservativeLinks?: boolean;
		/** Also linkify bare (non-italic) DRC-style references like "Gen. 12. 22." */
		linkifyBare?: boolean;
		/** Translation prefix for direct chapter links (e.g. "odr", "drc") */
		translationPrefix?: string | undefined;
	}

	let {
		text,
		notes = [],
		title = undefined,
		conservativeLinks = false,
		linkifyBare = false,
		translationPrefix = undefined
	}: Props = $props();

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
		return splitAnnotationParagraphs(raw).map((p) => {
			let html = p.replace(/<mn>([^<]+)<\/mn>/g, (_, raw) => {
				// Normalise [1] → 1 for numeric markers; leave ◦ and others as-is
				const display = raw.replace(/^\[(\d+)\]$/, '$1');
				return `<button class="mn-marker" data-mn="${display}" aria-label="Marginal note ${display}">${display}</button>`;
			});
			html = linkifyItalicRefs(html, conservativeLinks, translationPrefix);
			if (linkifyBare) html = linkifyDrcRefs(html, translationPrefix);
			html = allcapsToSmallcaps(html);
			return formatTrailingCitation(html);
		});
	}

	let proseEl: HTMLElement | undefined = $state();

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

	let openMn: string | null = $state(null);
	let popoverAnchorEl: HTMLElement | null = $state(null);
	let hoverTimer: ReturnType<typeof setTimeout> | null = null;

	let openVerseRef: OsisRange[] = $state([]);
	let verseRefAnchorEl: HTMLElement | null = $state(null);
	let verseRefVisible = $state(false);
	let verseRefTimer: ReturnType<typeof setTimeout> | null = $state(null);

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
		const target = e.target as HTMLElement;
		const btn = target.closest('[data-mn]') as HTMLElement | null;
		if (btn) {
			cancelDismiss();
			const mn = btn.dataset.mn ?? null;
			openMn = mn;
			popoverAnchorEl = btn;
			return;
		}
		const vref = target.closest('.verse-ref') as HTMLElement | null;
		if (vref) {
			if (verseRefTimer) clearTimeout(verseRefTimer);
			const osis = vref.dataset.osis ?? '';
			const refs = osis.split(',').flatMap((s) => {
				const r = parseOsis(s.trim());
				return r ? [r] : [];
			});
			if (refs.length > 0) {
				openVerseRef = refs;
				verseRefAnchorEl = vref;
				verseRefVisible = true;
			}
		}
	}

	function handleMouseout(e: Event) {
		const target = e.target as HTMLElement;
		const btn = target.closest('[data-mn]') as HTMLElement | null;
		if (btn) {
			scheduleDismiss();
			return;
		}
		const vref = target.closest('.verse-ref') as HTMLElement | null;
		if (vref) {
			verseRefTimer = setTimeout(() => {
				verseRefVisible = false;
				verseRefAnchorEl = null;
			}, 120);
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (openMn && e.key === 'Escape') dismiss();
	}

	onDestroy(() => {
		if (hoverTimer) clearTimeout(hoverTimer);
		if (verseRefTimer) clearTimeout(verseRefTimer);
		if (copiedTimer) clearTimeout(copiedTimer);
	});

	let { html: sequentialText, notes: sequentialNotes } = $derived(renumber(text, notes));
	let paragraphs = $derived(renderParagraphs(sequentialText));
	let activeNote = $derived(sequentialNotes.find((n) => String(n.marker) === openMn) ?? null);

	// ── Copy with formatting, markers stripped ─────────────────────────
	let copied = $state(false);
	let copiedTimer: ReturnType<typeof setTimeout> | null = null;

	function buildCopyHtml(): string {
		return paragraphs
			.map((p) => {
				let html = p.replace(/<button class="mn-marker"[^>]*>[\s\S]*?<\/button>/g, '');
				html = html.replace(/<a\b[^>]*>([\s\S]*?)<\/a>/g, '$1');
				html = html.replace(/<span class="sc">/g, '<span style="font-variant: small-caps;">');
				return `<p>${html}</p>`;
			})
			.join('');
	}

	async function copyAnnotation() {
		const html = buildCopyHtml();
		const plain = html
			.replace(/<br\s*\/?>/g, '\n')
			.replace(/<\/p>/g, '\n\n')
			.replace(/<[^>]+>/g, '')
			.trim();
		try {
			await navigator.clipboard.write([
				new ClipboardItem({
					'text/html': new Blob([html], { type: 'text/html' }),
					'text/plain': new Blob([plain], { type: 'text/plain' })
				})
			]);
		} catch {
			await navigator.clipboard.writeText(plain);
		}
		copied = true;
		if (copiedTimer) clearTimeout(copiedTimer);
		copiedTimer = setTimeout(() => {
			copied = false;
		}, 1500);
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- svelte-ignore a11y_no_static_element_interactions, a11y_click_events_have_key_events -->
<div
	class="annotation-prose"
	bind:this={proseEl}
	onmouseover={handleMouseover}
	onmouseout={handleMouseout}
	onfocus={handleMouseover}
	onblur={handleMouseout}
	onclick={(e) => {
		const btn = (e.target as HTMLElement).closest('.mn-marker') as HTMLElement | null;
		if (btn) {
			const marker = btn.dataset.mn;
			if (marker) scrollToNote(marker);
		}
	}}
>
	<div class="annotation-header-row">
		{#if title}
			<p class="annotation-title">{@html allcapsToSmallcaps(title)}</p>
		{/if}
		<button
			class="copy-annotation-btn"
			class:copied
			onclick={stopPropagation(copyAnnotation)}
			aria-label={copied ? 'Copied' : 'Copy annotation text'}
		>
			{#if copied}
				<svg width="14" height="14" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"
					><path
						d="M229.66,77.66l-128,128a8,8,0,0,1-11.32,0l-56-56a8,8,0,0,1,11.32-11.32L96,188.69,218.34,66.34a8,8,0,0,1,11.32,11.32Z"
					/></svg
				>
			{:else}
				<svg width="14" height="14" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"
					><path
						d="M216,32H88a8,8,0,0,0-8,8V80H40a8,8,0,0,0-8,8V216a8,8,0,0,0,8,8H168a8,8,0,0,0,8-8V176h40a8,8,0,0,0,8-8V40A8,8,0,0,0,216,32ZM160,208H48V96H160Zm48-48H176V88a8,8,0,0,0-8-8H96V48H208Z"
					/></svg
				>
			{/if}
		</button>
	</div>

	{#each paragraphs as para}
		<p class="font-reader text-[15px] leading-[1.6] text-foreground">
			{@html para}
		</p>
	{/each}

	{#if sequentialNotes && sequentialNotes.length > 0}
		<ul class="ann-notes">
			{#each sequentialNotes as note}
				<li class="ann-note-row" data-note-marker={note.marker}>
					<button
						class="ann-note-marker"
						onclick={stopPropagation(() => scrollToInlineMarker(String(note.marker)))}
						aria-label="Go to marker {note.marker} in text">{note.marker}</button
					>
					<span class="ann-note-text"
						>{@html formatTrailingCitation(
							allcapsToSmallcaps(
								linkifyBare
									? linkifyDrcRefs(
											linkifyItalicRefs(note.text, false, translationPrefix),
											translationPrefix
										)
									: linkifyItalicRefs(note.text, false, translationPrefix)
							)
						)}</span
					>
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

	<VerseTooltip
		osisRanges={openVerseRef}
		anchorEl={verseRefAnchorEl}
		visible={verseRefVisible}
		onmouseenter={() => {
			if (verseRefTimer) clearTimeout(verseRefTimer);
		}}
		onmouseleave={() => {
			verseRefTimer = setTimeout(() => {
				verseRefVisible = false;
				verseRefAnchorEl = null;
			}, 120);
		}}
	/>
</div>

<style>
	.annotation-prose {
		position: relative;
	}

	.annotation-header-row {
		display: flex;
		align-items: baseline;
		justify-content: flex-end;
		gap: 8px;
	}

	.annotation-title {
		flex: 1 1 auto;
		font-size: 16px;
		font-weight: 600;
		color: var(--color-accent-text);
		margin: 10px 0 8px;
		font-family: var(--font-reader);
		font-style: italic;
	}

	.copy-annotation-btn {
		flex-shrink: 0;
		align-self: center;
		opacity: 0;
		color: var(--color-subtle);
		background: none;
		border: none;
		padding: 4px;
		cursor: pointer;
		line-height: 0;
		transition: opacity 150ms ease;
	}

	.annotation-prose:hover .copy-annotation-btn,
	.copy-annotation-btn:focus-visible {
		opacity: 1;
	}

	.copy-annotation-btn:hover {
		color: var(--color-accent);
	}

	.copy-annotation-btn.copied {
		opacity: 1;
		color: var(--color-accent);
	}

	@media (max-width: 767px) {
		.annotation-title {
			font-size: 12px;
			margin: 6px 0 5px;
		}
	}

	.annotation-prose p + p {
		margin-top: 0.6em;
	}

	:global(.mn-marker) {
		color: #e56868;
		font-size: 9px;
		font-family: var(--font-ui);
		letter-spacing: 0.4px;
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

	.annotation-prose :global(.verse-ref) {
		color: var(--color-accent-text);
		text-decoration: none;
		border-bottom: 1px solid color-mix(in srgb, var(--color-accent-text) 40%, transparent);
		cursor: pointer;
	}

	.annotation-prose :global(.verse-ref:hover) {
		color: var(--color-accent);
		border-bottom-color: var(--color-accent);
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
		letter-spacing: 0.4px;
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
		letter-spacing: 0.4px;
		font-size: 15px;
		font-weight: 300;
	}

	:global(.mn-popover-marker) {
		/* The popover inverts the page: its background is --color-text. A raw
		   --color-accent lands at 2.6:1 there in light mode and fails AA in every
		   theme, so lift it toward the popover's own foreground (--color-bg).
		   Keeps the red tint and clears 5.2:1 at worst across all four themes. */
		color: color-mix(in srgb, var(--color-accent) 50%, var(--color-bg));
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
