<script lang="ts">
	import BookNavChevron from './BookNavChevron.svelte';

	export let href: string;
	export let direction: 'prev' | 'next';
	export let label: string;
</script>

<div class="relative group/booknav shrink-0">
	<a
		{href}
		class="text-subtle hover:text-accent transition-colors duration-fast block"
		aria-label="{direction === 'prev' ? 'Previous' : 'Next'} book: {label}"
	>
		<BookNavChevron {direction} />
	</a>
	<div
		class="pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-[5px] px-[6px] py-[3px] bg-foreground text-background text-[11px] rounded-[3px] whitespace-nowrap opacity-0 group-hover/booknav:opacity-100 transition-opacity z-50"
		style="transition-delay: 150ms;"
	>
		{label}
	</div>
</div>
