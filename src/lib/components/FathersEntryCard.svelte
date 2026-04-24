<script lang="ts">
	import type { FathersEntry } from '$lib/data/fathers-types';
	import { linkifyBareRefs } from '$lib/search/crossRefParser';

	export let entry: FathersEntry;
	export let highlighted: boolean = false;
	export let dimmed: boolean = false;
	export let forceOpen: boolean = false;

	let expanded = false;
	$: isOpen = forceOpen || expanded;

	function toggle() {
		if (!forceOpen) expanded = !expanded;
	}

	// The last footnote is always the source reference (PG, PL, CSEL, etc.)
	$: sourceFootnoteIdx = entry.footnotes.length > 0 ? entry.footnotes.length - 1 : -1;
	$: sourceFootnote = sourceFootnoteIdx >= 0 ? entry.footnotes[sourceFootnoteIdx] : null;
	$: inlineFootnotes = entry.footnotes.slice(0, sourceFootnoteIdx);

	/** Replace {fn:N} with superscript footnote markers, stripping the last (source ref) marker */
	function renderBody(text: string, lastFnIdx: number): string {
		let html = text.replace(/\{fn:(\d+)\}/g, (_, n) => {
			const idx = parseInt(n);
			if (idx === lastFnIdx) return '';
			return `<sup class="fathers-fn" data-fn="${idx}">[${idx + 1}]</sup>`;
		});
		return linkifyBareRefs(html, 'odr');
	}

	$: bodyParagraphs = entry.body.split('\n\n').filter((p) => p.trim().length > 0);

	// Body text longer than 350 chars will be truncated by the 6em max-height
	$: bodyTruncated = entry.body.length > 350;

	$: buttonLabel = expanded
		? 'Show less'
		: bodyTruncated
			? 'Show more'
			: inlineFootnotes.length > 0
				? `Show ${inlineFootnotes.length} footnote${inlineFootnotes.length === 1 ? '' : 's'}`
				: sourceFootnote
					? 'Show source'
					: 'Show more';
</script>

<article
	class="rounded-sm border transition-all duration-fast
		{highlighted ? 'border-accent/40 bg-accent/5' : 'border-border bg-panel'}
		{dimmed ? 'opacity-40' : 'opacity-100'}"
	data-verse={entry.subVerseNum}
>
	<!-- Header: title + author + badges -->
	<div class="px-sm pt-sm pb-[6px]">
		{#if entry.title}
			<p
				class="text-[11px] uppercase tracking-[0.1em] text-subtle font-medium leading-snug mb-[4px]"
			>
				{entry.title}
			</p>
		{/if}
		<div class="flex items-center gap-[6px] flex-wrap">
			<span class="text-[13px] font-medium text-foreground {entry.isDocument ? 'italic' : ''}">
				{entry.author}
			</span>
			{#if entry.date}
				<span class="text-[11px] text-subtle">({entry.date})</span>
			{/if}
			{#if entry.subVerse}
				<span
					class="text-[10px] px-[5px] py-[1px] rounded-full bg-border text-subtle font-medium ml-auto"
				>
					verse {entry.subVerseNum}
				</span>
			{/if}
		</div>
		<div class="w-[24px] h-[2px] bg-accent/50 mt-[5px] rounded-full"></div>
		{#if entry.fkbChapter}
			<p class="text-[10px] text-subtle italic mt-[2px]">{entry.fkbChapter}</p>
		{/if}
	</div>

	<!-- Body: collapsible -->
	<div class="px-sm">
		<div
			class="fathers-body text-[14px] leading-relaxed text-foreground overflow-hidden"
			class:body-collapsed={!isOpen}
		>
			{#each bodyParagraphs as para}
				<p>{@html renderBody(para, sourceFootnoteIdx)}</p>
			{/each}
		</div>
		{#if !forceOpen}
			<button
				class="text-[11px] text-subtle hover:text-accent transition-colors duration-fast mt-[4px] pb-[2px]"
				on:click={toggle}
			>
				{buttonLabel}
			</button>
		{/if}
	</div>

	<!-- Inline footnotes (all except last/source) -->
	{#if inlineFootnotes.length > 0 && isOpen}
		<div class="px-sm mt-[6px] border-t border-border/30 pt-[6px]">
			{#each inlineFootnotes as fn, i}
				<p class="text-[11px] text-subtle leading-snug fathers-body">
					<span class="font-semibold">[{i + 1}]</span>
					{@html linkifyBareRefs(fn.text, 'odr')}
				</p>
			{/each}
		</div>
	{/if}

	<!-- Source reference (last footnote) -->
	{#if sourceFootnote && isOpen}
		<div class="px-sm mt-[4px] pb-[2px]">
			<p class="source-ref text-[10px] text-subtle/70 tracking-[0.02em]">
				<span class="source-label">Source:</span>
				{@html linkifyBareRefs(sourceFootnote.text, 'odr')}
			</p>
		</div>
	{/if}

	<!-- Citation -->
	{#if entry.citation}
		<div class="px-sm pb-sm mt-[4px]">
			<p class="text-[11px] italic text-subtle text-right">{entry.citation}</p>
		</div>
	{/if}
</article>

<style>
	.body-collapsed {
		max-height: 6em;
	}

	.fathers-body p + p {
		margin-top: 10px;
	}

	:global(.fathers-body .verse-ref) {
		color: var(--color-accent-text);
		text-decoration: underline;
		text-decoration-color: var(--color-border);
		text-underline-offset: 2px;
		transition: color 150ms ease;
	}

	:global(.fathers-body .verse-ref:hover) {
		color: var(--color-accent);
	}

	:global(.fathers-fn) {
		font-size: 9px;
		font-family: var(--font-ui);
		font-weight: 600;
		color: var(--color-accent-text);
		cursor: default;
		vertical-align: super;
		line-height: 1;
	}

	.source-ref {
		font-family: var(--font-ui);
		font-style: italic;
		line-height: 1.5;
	}

	.source-label {
		font-weight: 600;
		font-style: normal;
		text-transform: uppercase;
		font-size: 9px;
		letter-spacing: 0.08em;
		opacity: 0.6;
		margin-right: 3px;
	}
</style>
