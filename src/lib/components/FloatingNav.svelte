<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { fly, slide } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { ALL_BOOKS } from '$lib/data/books';

	export let bookSlug: string;
	export let chapterNum: number;
	export let onClose: () => void;
	export let compareMode: boolean = false;

	$: base = compareMode ? '/compare' : '/odr';

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

	let otContainer: HTMLElement;
	let ntContainer: HTMLElement;

	onMount(async () => {
		await tick();
		const container = activeTestament === 'OT' ? otContainer : ntContainer;
		const active = container?.querySelector('[data-active-book]') as HTMLElement | null;
		active?.scrollIntoView({ block: 'center', behavior: 'instant' });
	});

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onClose();
	}
</script>

<svelte:window on:keydown={handleKeydown} />

<div
	class="fixed {compareMode
		? 'top-[110px]'
		: 'top-[90px]'} left-1/2 -translate-x-1/2 z-50 bg-panel border border-border rounded-sm shadow-xl w-80 max-h-[72vh] flex flex-col font-ui"
	role="dialog"
	aria-label="Bible navigation"
	transition:fly={{ y: -6, duration: 160, easing: cubicOut }}
>
	<!-- OT / NT tabs -->
	<div class="flex border-b border-border shrink-0">
		{#each ['OT', 'NT'] as Testament[] as t}
			<button
				class="flex-1 py-[15px] text-[12px] uppercase tracking-[0.15em] font-medium transition-colors duration-fast
               {activeTestament === t
					? 'bg-background text-accent border-b-2 border-accent'
					: 'text-subtle hover:text-foreground'}"
				on:click={() => (activeTestament = t)}
			>
				{t === 'OT' ? 'Old Testament' : 'New Testament'}
			</button>
		{/each}
	</div>

	<!-- Both lists always in DOM — hidden preserves each testament's scroll position -->
	<div class="flex-1 flex flex-col min-h-0">
		<div
			bind:this={otContainer}
			class="overflow-y-auto flex-1 py-[6px] nav-scroll"
			class:hidden={activeTestament !== 'OT'}
		>
			{#each otBooks as book}
				<div
					class:border-t={book.slug === 'prayer-of-manasses'}
					class:border-border={book.slug === 'prayer-of-manasses'}
					class:mt-[6px]={book.slug === 'prayer-of-manasses'}
					class:pt-[6px]={book.slug === 'prayer-of-manasses'}
				>
					<button
						data-active-book={book.slug === bookSlug ? 'true' : undefined}
						class="w-full text-left px-[16px] py-[9px] text-[16px] font-medium transition-colors duration-fast
                 {book.slug === bookSlug
							? 'text-accent bg-accent/8 hover:bg-accent hover:text-white'
							: 'text-foreground hover:bg-accent/10'}"
						on:click={() => toggleBook(book.slug)}
					>
						{book.odrName}
					</button>
					{#if expandedBooks.has(book.slug)}
						<div
							transition:slide={{ duration: 180 }}
							class="px-[16px] pb-[10px] pt-[4px] grid grid-cols-7 gap-[4px]"
						>
							{#each Array.from({ length: book.chapters }, (_, i) => i + 1) as ch}
								<a
									href="{base}/{book.slug}/{ch}"
									on:click={onClose}
									class="text-[16px] py-[8px] rounded-[2px] hover:bg-accent hover:text-white transition-colors duration-fast text-center block tabular-nums font-medium
                       {book.slug === bookSlug && ch === chapterNum
										? 'bg-accent text-white'
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

		<div
			bind:this={ntContainer}
			class="overflow-y-auto flex-1 py-[6px] nav-scroll"
			class:hidden={activeTestament !== 'NT'}
		>
			{#each ntBooks as book}
				<div>
					<button
						data-active-book={book.slug === bookSlug ? 'true' : undefined}
						class="w-full text-left px-[16px] py-[9px] text-[16px] font-medium transition-colors duration-fast
                 {book.slug === bookSlug
							? 'text-accent bg-accent/8 hover:bg-accent hover:text-white'
							: 'text-foreground hover:bg-accent/10'}"
						on:click={() => toggleBook(book.slug)}
					>
						{book.odrName}
					</button>
					{#if expandedBooks.has(book.slug)}
						<div
							transition:slide={{ duration: 180 }}
							class="px-[16px] pb-[10px] pt-[4px] grid grid-cols-7 gap-[4px]"
						>
							{#each Array.from({ length: book.chapters }, (_, i) => i + 1) as ch}
								<a
									href="{base}/{book.slug}/{ch}"
									on:click={onClose}
									class="text-[16px] py-[8px] rounded-[2px] hover:bg-accent hover:text-white transition-colors duration-fast text-center block tabular-nums font-medium
                       {book.slug === bookSlug && ch === chapterNum
										? 'bg-accent text-white'
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
