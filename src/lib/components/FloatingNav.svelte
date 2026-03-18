<script lang="ts">
	import { ALL_BOOKS } from '$lib/data/books';
	import { goto } from '$app/navigation';

	export let bookSlug: string;
	export let chapterNum: number;
	export let onClose: () => void;

	type Testament = 'OT' | 'NT';
	let activeTestament: Testament = ALL_BOOKS.find((b) => b.slug === bookSlug)?.testament ?? 'OT';
	let expandedBook: string | null = bookSlug || null;

	$: filteredBooks = ALL_BOOKS.filter((b) => b.testament === activeTestament);

	function navigateTo(slug: string, chapter: number) {
		goto(`/odr/${slug}/${chapter}`);
		onClose();
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
	class="fixed top-14 left-md z-50 bg-panel border border-border rounded-md shadow-lg w-80 max-h-[70vh] flex flex-col font-ui text-sm"
	role="dialog"
	aria-label="Bible navigation"
>
	<!-- OT / NT tabs -->
	<div class="flex border-b border-border shrink-0">
		{#each ['OT', 'NT'] as Testament[] as t}
			<button
				class="flex-1 py-sm font-medium transition-colors duration-fast
               {activeTestament === t
					? 'text-interactive border-b-2 border-interactive'
					: 'text-muted hover:text-foreground'}"
				on:click={() => {
					activeTestament = t;
					expandedBook = null;
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
					class="w-full text-left px-md py-xs hover:bg-interactive hover:bg-opacity-10 transition-colors duration-fast
                 {book.slug === bookSlug ? 'text-interactive font-medium' : 'text-foreground'}"
					data-active-book={book.slug === bookSlug}
					on:click={() => (expandedBook = expandedBook === book.slug ? null : book.slug)}
				>
					{book.odrName}
				</button>

				{#if expandedBook === book.slug}
					<div class="px-md pb-xs grid grid-cols-8 gap-1">
						{#each Array.from({ length: book.chapters }, (_, i) => i + 1) as ch}
							<button
								class="text-xs py-1 rounded hover:bg-interactive hover:text-white transition-colors duration-fast
                       {book.slug === bookSlug && ch === chapterNum
									? 'bg-interactive text-white'
									: 'text-muted'}"
								data-chapter={ch}
								data-active-chapter={book.slug === bookSlug && ch === chapterNum ? ch : undefined}
								on:click={() => navigateTo(book.slug, ch)}
							>
								{ch}
							</button>
						{/each}
					</div>
				{/if}
			</div>
		{/each}
	</div>
</div>
