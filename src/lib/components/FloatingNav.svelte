<script lang="ts">
	import { fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { ALL_BOOKS } from '$lib/data/books';

	export let bookSlug: string;
	export let chapterNum: number;
	export let onClose: () => void;

	type Testament = 'OT' | 'NT';
	let activeTestament: Testament = ALL_BOOKS.find((b) => b.slug === bookSlug)?.testament ?? 'OT';
	let expandedBooks = new Set<string>(bookSlug ? [bookSlug] : []);

	const otBooks = ALL_BOOKS.filter((b) => b.testament === 'OT');
	const ntBooks = ALL_BOOKS.filter((b) => b.testament === 'NT');

	function toggleBook(slug: string) {
		const next = new Set(expandedBooks);
		if (next.has(slug)) {
			next.delete(slug);
		} else {
			next.add(slug);
		}
		expandedBooks = next;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onClose();
	}
</script>

<svelte:window on:keydown={handleKeydown} />

<div
	class="fixed top-[61px] left-1/2 -translate-x-1/2 z-50 bg-panel border border-border rounded-sm shadow-xl w-80 max-h-[72vh] flex flex-col font-ui"
	role="dialog"
	aria-label="Bible navigation"
	transition:fly={{ y: -6, duration: 160, easing: cubicOut }}
>
	<!-- OT / NT tabs -->
	<div class="flex border-b border-border shrink-0">
		{#each ['OT', 'NT'] as Testament[] as t}
			<button
				class="flex-1 py-[10px] text-[12px] uppercase tracking-[0.15em] font-medium transition-colors duration-fast
               {activeTestament === t
					? 'text-interactive border-b-2 border-interactive'
					: 'text-subtle hover:text-foreground'}"
				on:click={() => (activeTestament = t)}
			>
				{t === 'OT' ? 'Old Testament' : 'New Testament'}
			</button>
		{/each}
	</div>

	<!-- Both lists always in DOM — hidden preserves each testament's scroll position -->
	<div class="flex-1 flex flex-col min-h-0">
		<div class="overflow-y-auto flex-1 py-[6px] nav-scroll" class:hidden={activeTestament !== 'OT'}>
			{#each otBooks as book}
				<div>
					<button
						class="w-full text-left px-[16px] py-[9px] text-[16px] font-light hover:bg-interactive hover:bg-opacity-8 transition-colors duration-fast
                 {book.slug === bookSlug ? 'text-interactive' : 'text-foreground'}"
						on:click={() => toggleBook(book.slug)}
					>
						{book.odrName}
					</button>
					{#if expandedBooks.has(book.slug)}
						<div class="px-[16px] pb-[10px] pt-[4px] grid grid-cols-8 gap-[4px]">
							{#each Array.from({ length: book.chapters }, (_, i) => i + 1) as ch}
								<a
									href="/odr/{book.slug}/{ch}"
									on:click={onClose}
									class="text-[16px] py-[7px] rounded-[2px] hover:bg-interactive hover:text-white transition-colors duration-fast text-center block tabular-nums font-light
                       {book.slug === bookSlug && ch === chapterNum
										? 'bg-interactive text-white'
										: 'text-subtle'}"
								>
									{ch}
								</a>
							{/each}
						</div>
					{/if}
				</div>
			{/each}
		</div>

		<div class="overflow-y-auto flex-1 py-[6px] nav-scroll" class:hidden={activeTestament !== 'NT'}>
			{#each ntBooks as book}
				<div>
					<button
						class="w-full text-left px-[16px] py-[9px] text-[16px] font-light hover:bg-interactive hover:bg-opacity-8 transition-colors duration-fast
                 {book.slug === bookSlug ? 'text-interactive' : 'text-foreground'}"
						on:click={() => toggleBook(book.slug)}
					>
						{book.odrName}
					</button>
					{#if expandedBooks.has(book.slug)}
						<div class="px-[16px] pb-[10px] pt-[4px] grid grid-cols-8 gap-[4px]">
							{#each Array.from({ length: book.chapters }, (_, i) => i + 1) as ch}
								<a
									href="/odr/{book.slug}/{ch}"
									on:click={onClose}
									class="text-[16px] py-[7px] rounded-[2px] hover:bg-interactive hover:text-white transition-colors duration-fast text-center block tabular-nums font-light
                       {book.slug === bookSlug && ch === chapterNum
										? 'bg-interactive text-white'
										: 'text-subtle'}"
								>
									{ch}
								</a>
							{/each}
						</div>
					{/if}
				</div>
			{/each}
		</div>
	</div>
</div>

<style>
	.nav-scroll {
		scrollbar-width: thin;
		scrollbar-color: var(--color-border) transparent;
	}
	.nav-scroll::-webkit-scrollbar {
		width: 4px;
	}
	.nav-scroll::-webkit-scrollbar-track {
		background: transparent;
	}
	.nav-scroll::-webkit-scrollbar-thumb {
		background: var(--color-border);
		border-radius: 2px;
	}
	.nav-scroll::-webkit-scrollbar-thumb:hover {
		background: var(--color-subtle);
	}
</style>
