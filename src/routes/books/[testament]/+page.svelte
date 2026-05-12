<script lang="ts">
	import type { PageData } from './$types';
	export let data: PageData;
</script>

<svelte:head>
	<title>{data.label} · Original Douay-Rheims Bible</title>
	<meta
		name="description"
		content="Browse all {data.books
			.length} books of the {data.label} in the original Douay-Rheims Bible (1582–1610). Pre-Challoner English Catholic translation from the Latin Vulgate."
	/>
	<link
		rel="canonical"
		href="https://thedouayrheims.com/books/{data.testament === 'OT'
			? 'old-testament'
			: 'new-testament'}"
	/>
</svelte:head>

<main id="main-content" class="max-w-[750px] mx-auto px-md pt-[40px] pb-xl font-ui">
	<header class="mb-[40px]">
		<p class="text-[11px] uppercase tracking-[0.3em] text-subtle mb-sm">
			Original Douay-Rheims Bible
		</p>
		<h1 class="font-reader text-[2.5rem] leading-[1.2] tracking-[-0.01em] text-foreground mb-sm">
			{data.label}
		</h1>
		<div class="w-10 h-px bg-accent opacity-70"></div>
		<p class="text-muted text-base mt-[20px] font-reader leading-relaxed">
			{data.books.length} books{data.apocrypha.length > 0
				? ` · ${data.apocrypha.length} apocryphal books`
				: ''} · Original Douay-Rheims translation, 1582–1610
		</p>
	</header>

	<div class="grid grid-cols-1 sm:grid-cols-2 gap-[2px]">
		{#each data.books as book}
			<a
				href="/odr/{book.slug}/1"
				class="group flex items-baseline justify-between px-[16px] py-[13px] rounded-[3px]
					hover:bg-accent/10 transition-colors duration-fast"
			>
				<span
					class="text-foreground text-[15px] font-reader group-hover:text-accent transition-colors duration-fast"
				>
					{book.odrName}
				</span>
				<span class="text-subtle text-[11px] tabular-nums">
					{book.chapters} ch.
				</span>
			</a>
		{/each}
	</div>

	{#if data.apocrypha.length > 0}
		<section class="mt-[48px]">
			<p class="text-[10px] uppercase tracking-[0.28em] text-subtle mb-[16px]">Apocryphal Books</p>
			<div class="grid grid-cols-1 sm:grid-cols-2 gap-[2px]">
				{#each data.apocrypha as book}
					<a
						href="/odr/{book.slug}/1"
						class="group flex items-baseline justify-between px-[16px] py-[13px] rounded-[3px]
							hover:bg-accent/10 transition-colors duration-fast"
					>
						<span
							class="text-muted text-[15px] font-reader group-hover:text-accent transition-colors duration-fast"
						>
							{book.odrName}
						</span>
						<span class="text-subtle text-[11px] tabular-nums">
							{book.chapters} ch.
						</span>
					</a>
				{/each}
			</div>
		</section>
	{/if}

	<nav class="mt-[48px] flex justify-center gap-[24px] text-[12px] uppercase tracking-[0.15em]">
		{#if data.testament === 'NT'}
			<a
				href="/books/old-testament"
				class="text-subtle hover:text-accent transition-colors duration-fast"
			>
				← Old Testament
			</a>
		{/if}
		{#if data.testament === 'OT'}
			<a
				href="/books/new-testament"
				class="text-subtle hover:text-accent transition-colors duration-fast"
			>
				New Testament →
			</a>
		{/if}
	</nav>

	<section class="mt-[56px]">
		<p class="text-[10px] uppercase tracking-[0.28em] text-subtle mb-[16px]">Reference Material</p>
		<a
			href="/reference/odr/{data.testament === 'NT' ? 'nt' : 'ot'}/title-page"
			class="group flex items-center justify-between px-[16px] py-[14px] border border-border rounded-[3px]
				hover:border-accent/50 hover:bg-accent/5 transition-colors duration-fast"
		>
			<div>
				<p
					class="text-foreground text-[15px] font-reader group-hover:text-accent transition-colors duration-fast"
				>
					{data.testament === 'NT' ? 'New' : 'Old'} Testament Reference
				</p>
				<p class="text-muted text-[12px] mt-[3px]">
					{data.testament === 'NT'
						? 'Preface, annotations, evangelical history, corruptions table & more'
						: 'Preface, historical tables, glossary & more'}
				</p>
			</div>
			<span
				class="text-subtle text-[18px] group-hover:text-accent transition-colors duration-fast ml-4"
				aria-hidden="true">→</span
			>
		</a>
	</section>
</main>
