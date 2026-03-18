<script lang="ts">
	import { slide } from 'svelte/transition';
	import { ALL_BOOKS } from '$lib/data/books';

	export let bookSlug: string;
	export let chapterNum: number;
	export let onClose: () => void;

	type Testament = 'OT' | 'NT';
	let activeTestament: Testament = ALL_BOOKS.find((b) => b.slug === bookSlug)?.testament ?? 'OT';
	let expandedBooks = new Set<string>(bookSlug ? [bookSlug] : []);

	$: filteredBooks = ALL_BOOKS.filter((b) => b.testament === activeTestament);

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

<!-- Backdrop -->
<div class="fixed inset-0 z-40" role="presentation" on:click={onClose} on:keydown={() => {}}></div>

<!-- Nav panel -->
<div
	class="fixed top-[53px] left-lg z-50 bg-panel border border-border rounded-sm shadow-xl w-72 max-h-[72vh] flex flex-col font-ui text-sm"
	role="dialog"
	aria-label="Bible navigation"
>
	<!-- OT / NT tabs -->
	<div class="flex border-b border-border shrink-0">
		{#each ['OT', 'NT'] as Testament[] as t}
			<button
				class="flex-1 py-sm text-[11px] uppercase tracking-[0.15em] font-medium transition-colors duration-fast
               {activeTestament === t
					? 'text-interactive border-b-2 border-interactive'
					: 'text-subtle hover:text-foreground'}"
				on:click={() => {
					activeTestament = t;
				}}
			>
				{t === 'OT' ? 'Old Testament' : 'New Testament'}
			</button>
		{/each}
	</div>

	<!-- Book list -->
	<div class="overflow-y-auto flex-1 py-xs">
		{#each filteredBooks as book}
			<div>
				<button
					class="w-full text-left px-md py-[7px] text-[13px] hover:bg-interactive hover:bg-opacity-8 transition-colors duration-fast
                 {book.slug === bookSlug ? 'text-interactive' : 'text-foreground'}"
					on:click={() => toggleBook(book.slug)}
				>
					{book.odrName}
				</button>

				{#if expandedBooks.has(book.slug)}
					<div
						class="px-md pb-sm pt-xs grid grid-cols-8 gap-[3px]"
						transition:slide={{ duration: 150 }}
					>
						{#each Array.from({ length: book.chapters }, (_, i) => i + 1) as ch}
							<a
								href="/odr/{book.slug}/{ch}"
								on:click={onClose}
								class="text-[11px] py-[5px] rounded-[2px] hover:bg-interactive hover:text-white transition-colors duration-fast text-center block tabular-nums
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
