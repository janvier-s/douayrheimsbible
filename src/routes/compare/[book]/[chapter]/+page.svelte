<script lang="ts">
	import type { PageData } from './$types';
	import { prefs } from '$lib/stores/prefs';

	export let data: PageData;

	$: ({ bookMeta, chapter, totalChapters } = data);
	$: prevChapter = chapter.chapter > 1 ? chapter.chapter - 1 : null;
	$: nextChapter = chapter.chapter < totalChapters ? chapter.chapter + 1 : null;

	// Translations shown in comparison — ODR is live, others are placeholders
	const TRANSLATIONS = [
		{ id: 'odr', label: 'Original Douay-Rheims', abbr: 'ODR', year: '1609', live: true },
		{ id: 'knox', label: 'Knox Bible', abbr: 'Knox', year: '1955', live: false },
		{ id: 'drc', label: 'Douay-Rheims Challoner', abbr: 'DRC', year: '1752', live: false },
		{
			id: 'rsv2ce',
			label: 'RSV Second Catholic Edition',
			abbr: 'RSV-2CE',
			year: '2006',
			live: false
		},
		{ id: 'kjv', label: 'King James Version', abbr: 'KJV', year: '1611', live: false }
	];

	let visibleTranslations = new Set(['odr', 'knox', 'drc']);

	function toggleTranslation(id: string) {
		const next = new Set(visibleTranslations);
		if (next.has(id)) {
			if (next.size > 1) next.delete(id); // keep at least one
		} else {
			next.add(id);
		}
		visibleTranslations = next;
	}

	$: activeCols = TRANSLATIONS.filter((t) => visibleTranslations.has(t.id));
</script>

<svelte:head>
	<title>{bookMeta.odrName} {chapter.chapter} — Compare Translations</title>
</svelte:head>

<div class="min-h-screen font-ui">
	<!-- Sub-header: translation toggles + chapter nav -->
	<div
		class="sticky top-[90px] z-30 bg-glass backdrop-blur-sm border-b border-border px-lg flex items-center gap-md"
		style="height: 44px;"
	>
		<!-- Translation toggles -->
		<div class="flex items-center gap-[6px] flex-1 min-w-0 overflow-x-auto scrollbar-hide">
			{#each TRANSLATIONS as t}
				<button
					on:click={() => toggleTranslation(t.id)}
					class="shrink-0 px-[10px] py-[4px] rounded-[3px] text-[11px] font-medium uppercase tracking-[0.1em] transition-colors duration-fast border
						{visibleTranslations.has(t.id)
						? 'bg-interactive text-white border-interactive'
						: 'border-border text-subtle hover:text-foreground hover:border-foreground/30'}"
				>
					{t.abbr}
				</button>
			{/each}
		</div>

		<!-- Chapter nav -->
		<div class="flex items-center gap-[4px] shrink-0 ml-auto">
			<a
				href={prevChapter ? `/compare/${bookMeta.slug}/${prevChapter}` : undefined}
				class="w-[28px] h-[28px] flex items-center justify-center rounded-[3px] text-[13px] transition-colors duration-fast
					{prevChapter ? 'text-foreground hover:text-interactive' : 'text-border pointer-events-none'}"
				aria-label="Previous chapter"
			>
				‹
			</a>
			<span class="text-[13px] font-medium text-foreground px-[6px] select-none">
				{bookMeta.odrName}
				{chapter.chapter}
			</span>
			<a
				href={nextChapter ? `/compare/${bookMeta.slug}/${nextChapter}` : undefined}
				class="w-[28px] h-[28px] flex items-center justify-center rounded-[3px] text-[13px] transition-colors duration-fast
					{nextChapter ? 'text-foreground hover:text-interactive' : 'text-border pointer-events-none'}"
				aria-label="Next chapter"
			>
				›
			</a>
		</div>
	</div>

	<!-- Column grid -->
	<div
		class="grid divide-x divide-border"
		style="grid-template-columns: repeat({activeCols.length}, minmax(0, 1fr));"
	>
		{#each activeCols as t (t.id)}
			<div class="flex flex-col">
				<!-- Column header -->
				<div
					class="sticky top-[134px] z-20 bg-panel px-[24px] py-[14px] border-b border-border flex items-baseline justify-between"
				>
					<div>
						<span class="text-[13px] font-semibold text-foreground">{t.abbr}</span>
						<span class="text-[11px] text-subtle ml-[6px]">{t.year}</span>
					</div>
					{#if !t.live}
						<span
							class="text-[10px] uppercase tracking-[0.12em] text-subtle border border-border rounded-[2px] px-[6px] py-[2px]"
						>
							Coming soon
						</span>
					{/if}
				</div>

				<!-- Column body -->
				<div class="px-[24px] py-[28px] flex-1">
					{#if t.live}
						<!-- Chapter summary -->
						{#if chapter.summary && chapter.summary !== '---'}
							<p
								class="font-reader italic text-subtle text-sm leading-relaxed mb-[28px] pb-[20px] border-b border-border"
							>
								{chapter.summary}
							</p>
						{/if}

						<!-- Verses -->
						<ol class="list-none space-y-[0.65rem]">
							{#each chapter.verses as v (v.verse)}
								<li
									id="compare-odr-v{v.verse}"
									class="font-reader text-[length:var(--font-size-reader)] leading-[var(--line-height-reader)]"
									class:text-justify={$prefs.justifiedText}
								>
									{#if $prefs.showVerseNumbers}
										<sup
											class="text-subtle font-ui text-[10px] font-thin select-none mr-[4px] tabular-nums"
											>{v.verse}</sup
										>
									{/if}
									{v.text}
								</li>
							{/each}
						</ol>
					{:else}
						<!-- Placeholder -->
						<div class="flex flex-col items-center justify-center py-[60px] text-center">
							<p class="text-[32px] mb-[12px] opacity-20 select-none">✠</p>
							<p class="text-sm font-medium text-foreground mb-[6px]">{t.label}</p>
							<p class="text-[13px] text-subtle max-w-[200px]">
								This translation will be available in a future update.
							</p>
						</div>

						<!-- Skeleton lines to match visual weight -->
						<div class="mt-[32px] space-y-[10px] opacity-[0.06]">
							{#each chapter.verses as v (v.verse)}
								<div
									class="h-[14px] rounded-full bg-foreground"
									style="width: {55 + ((v.verse * 37 + chapter.chapter * 13) % 40)}%"
								></div>
							{/each}
						</div>
					{/if}
				</div>
			</div>
		{/each}
	</div>
</div>

<style>
	.scrollbar-hide {
		scrollbar-width: none;
	}
	.scrollbar-hide::-webkit-scrollbar {
		display: none;
	}
</style>
