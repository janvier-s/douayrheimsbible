<script lang="ts">
	import BookNavChevron from './BookNavChevron.svelte';

	export let href: string;
	export let direction: 'prev' | 'next';
	export let chapter: number;
</script>

<div class="relative group/chapnav shrink-0">
	<a
		{href}
		class="text-subtle hover:text-accent transition-colors duration-fast block p-2 -m-2"
		aria-label="{direction === 'prev' ? 'Previous' : 'Next'} chapter"
	>
		<BookNavChevron {direction} double={false} />
	</a>
	<div
		class="pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-[5px] px-[6px] py-[3px] bg-foreground text-background text-[11px] rounded-[3px] whitespace-nowrap opacity-0 group-hover/chapnav:opacity-100 transition-opacity z-50"
		style="transition-delay: 150ms;"
	>
		Chapter {chapter}
	</div>
</div>
