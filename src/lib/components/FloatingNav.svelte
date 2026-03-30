<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { fly, slide } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { ALL_BOOKS } from '$lib/data/books';
	import { prefs } from '$lib/stores/prefs';

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

	function bookLabel(odrName: string, modernName: string): string {
		return $prefs.modernBookNames ? modernName : odrName;
	}

	function protPsalmNum(n: number): string | null {
		if (n <= 8) return null;
		if (n === 9) return '9\u201310';
		if (n >= 10 && n <= 112) return String(n + 1);
		if (n === 113) return '114\u2013115';
		if (n === 114 || n === 115) return '116';
		if (n >= 116 && n <= 145) return String(n + 1);
		if (n === 146 || n === 147) return '147';
		return null;
	}

	function focusTrap(node: HTMLElement) {
		const FOCUSABLE =
			'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';
		const first = () => node.querySelectorAll<HTMLElement>(FOCUSABLE)[0];
		const last = () => {
			const els = node.querySelectorAll<HTMLElement>(FOCUSABLE);
			return els[els.length - 1];
		};

		function onKeydown(e: KeyboardEvent) {
			if (e.key !== 'Tab') return;
			if (e.shiftKey) {
				if (document.activeElement === first()) {
					e.preventDefault();
					last()?.focus();
				}
			} else {
				if (document.activeElement === last()) {
					e.preventDefault();
					first()?.focus();
				}
			}
		}

		node.addEventListener('keydown', onKeydown);
		// Move focus into the dialog on mount
		first()?.focus();
		return { destroy: () => node.removeEventListener('keydown', onKeydown) };
	}
</script>

<svelte:window on:keydown={handleKeydown} />

<div
	class="fixed top-[var(--header-height)] left-1/2 -translate-x-1/2 z-50 bg-panel border border-border rounded-sm shadow-xl w-80 max-h-[72vh] flex flex-col font-ui"
	role="dialog"
	aria-label="Bible navigation"
	aria-modal="true"
	transition:fly={{ y: -6, duration: 160, easing: cubicOut }}
	use:focusTrap
>
	<!-- OT / NT tabs -->
	<div class="flex border-b border-border shrink-0" role="tablist" aria-label="Testament">
		{#each ['OT', 'NT'] as Testament[] as t}
			<button
				role="tab"
				aria-selected={activeTestament === t}
				tabindex={activeTestament === t ? 0 : -1}
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
						aria-expanded={expandedBooks.has(book.slug)}
						class="w-full text-left px-[16px] py-[9px] text-[16px] font-medium transition-colors duration-fast
                 {book.slug === bookSlug
							? 'text-accent bg-background hover:bg-border'
							: 'text-foreground hover:bg-border hover:text-accent'}"
						on:click={() => toggleBook(book.slug)}
					>
						{bookLabel(book.odrName, book.modernName)}
					</button>
					{#if expandedBooks.has(book.slug)}
						<div
							transition:slide={{ duration: 180 }}
							class="px-[16px] pb-[10px] pt-[4px] gap-[4px]"
							class:grid={true}
							class:grid-cols-7={!($prefs.showPsalmNumbers && book.slug === 'psalms')}
							class:grid-cols-5={$prefs.showPsalmNumbers && book.slug === 'psalms'}
						>
							{#each Array.from({ length: book.chapters }, (_, i) => i + 1) as ch}
								<a
									href="{base}/{book.slug}/{ch}"
									on:click={onClose}
									class="py-[8px] rounded-[2px] hover:bg-accent hover:text-white transition-colors duration-fast text-center block tabular-nums font-medium leading-tight
                       {book.slug === bookSlug && ch === chapterNum
										? 'bg-accent text-white'
										: 'text-subtle'}"
								>
									<span class="block text-[14px]">{ch}</span>
									{#if $prefs.showPsalmNumbers && book.slug === 'psalms' && protPsalmNum(ch) !== null}
										<span class="block text-[9px] opacity-60">{protPsalmNum(ch)}</span>
									{/if}
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
						aria-expanded={expandedBooks.has(book.slug)}
						class="w-full text-left px-[16px] py-[9px] text-[16px] font-medium transition-colors duration-fast
                 {book.slug === bookSlug
							? 'text-accent bg-background hover:bg-border'
							: 'text-foreground hover:bg-border hover:text-accent'}"
						on:click={() => toggleBook(book.slug)}
					>
						{bookLabel(book.odrName, book.modernName)}
					</button>
					{#if expandedBooks.has(book.slug)}
						<div
							transition:slide={{ duration: 180 }}
							class="px-[16px] pb-[10px] pt-[4px] gap-[4px]"
							class:grid={true}
							class:grid-cols-7={!($prefs.showPsalmNumbers && book.slug === 'psalms')}
							class:grid-cols-5={$prefs.showPsalmNumbers && book.slug === 'psalms'}
						>
							{#each Array.from({ length: book.chapters }, (_, i) => i + 1) as ch}
								<a
									href="{base}/{book.slug}/{ch}"
									on:click={onClose}
									class="py-[8px] rounded-[2px] hover:bg-accent hover:text-white transition-colors duration-fast text-center block tabular-nums font-medium leading-tight
                       {book.slug === bookSlug && ch === chapterNum
										? 'bg-accent text-white'
										: 'text-subtle'}"
								>
									<span class="block text-[14px]">{ch}</span>
									{#if $prefs.showPsalmNumbers && book.slug === 'psalms' && protPsalmNum(ch) !== null}
										<span class="block text-[9px] opacity-60">{protPsalmNum(ch)}</span>
									{/if}
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
