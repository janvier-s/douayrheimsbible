<script lang="ts">
	import type { FathersEntry } from '$lib/data/fathers-types';

	export let entry: FathersEntry;
	export let highlighted: boolean = false;
	export let dimmed: boolean = false;
	export let forceOpen: boolean = false;

	let expanded = false;
	$: isOpen = forceOpen || expanded;

	function toggle() {
		if (!forceOpen) expanded = !expanded;
	}

	/** Replace {fn:N} with superscript footnote markers (1-indexed) */
	function renderBody(text: string): string {
		return text.replace(/\{fn:(\d+)\}/g, (_, n) => {
			const idx = parseInt(n);
			return `<sup class="fathers-fn" data-fn="${idx}">[${idx + 1}]</sup>`;
		});
	}
</script>

<article
	class="rounded-sm border transition-all duration-fast
		{highlighted ? 'border-accent/40 bg-accent/5' : 'border-border bg-panel'}
		{dimmed ? 'opacity-40' : 'opacity-100'}"
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
			class="text-[14px] leading-relaxed text-foreground overflow-hidden transition-all duration-200"
			style="max-height: {isOpen ? '9999px' : '6em'};"
		>
			<p>{@html renderBody(entry.body)}</p>
		</div>
		{#if !forceOpen}
			<button
				class="text-[11px] text-subtle hover:text-accent transition-colors duration-fast mt-[4px] pb-[2px]"
				on:click={toggle}
			>
				{expanded ? 'Show less' : 'Show more'}
			</button>
		{/if}
	</div>

	<!-- Footnotes -->
	{#if entry.footnotes.length > 0 && isOpen}
		<div class="px-sm mt-[6px] border-t border-border/30 pt-[6px]">
			{#each entry.footnotes as fn, i}
				<p class="text-[11px] text-subtle leading-snug">
					<span class="font-semibold">[{i + 1}]</span>
					{fn.text}
				</p>
			{/each}
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
	:global(.fathers-fn) {
		font-size: 9px;
		font-family: var(--font-ui);
		font-weight: 600;
		color: var(--color-accent-text);
		cursor: default;
		vertical-align: super;
		line-height: 1;
	}
</style>
