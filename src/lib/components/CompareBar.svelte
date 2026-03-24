<script lang="ts">
	import { slide } from 'svelte/transition';
	import FloatingNav from './FloatingNav.svelte';
	import SearchBar from './SearchBar.svelte';
	import ReadingPrefs from './ReadingPrefs.svelte';
	import { compareStore, TRANSLATIONS } from '$lib/stores/compare';
	import type { BookMeta } from '$lib/data/types';

	export let bookMeta: BookMeta;
	export let chapterNum: number;

	let navOpen = false;
	let prefsOpen = false;
	let mobileTransOpen = false;

	$: isOT = bookMeta.testament === 'OT';
	$: navLabel = `${bookMeta.odrName} ${chapterNum}`;

	function closeAll() {
		navOpen = false;
		prefsOpen = false;
		mobileTransOpen = false;
	}
</script>

<header class="sticky top-0 z-50 font-ui">
	<!-- Row 1: branding + search -->
	<div
		class="bg-glass backdrop-blur-sm border-b border-border px-lg flex items-center gap-[10px]"
		style="height: 50px;"
	>
		<a href="/" class="flex items-center gap-[6px] group shrink-0" on:click={closeAll}>
			<span class="text-accent text-[15px] leading-none select-none" aria-hidden="true">✠</span>
			<span
				class="text-[12px] uppercase tracking-[0.2em] font-semibold text-foreground group-hover:text-interactive transition-colors duration-fast"
			>
				Douay-Rheims
			</span>
		</a>
		<div class="flex-1"></div>
		<!-- Mode toggle -->
		<div
			class="flex items-center text-[11px] font-medium uppercase tracking-[0.1em] rounded-[3px] border border-border overflow-hidden shrink-0"
		>
			<a
				href="/odr/{bookMeta.slug}/{chapterNum}"
				class="px-[9px] py-[5px] text-subtle hover:text-foreground border-r border-border transition-colors duration-fast"
			>
				Reading
			</a>
			<span class="px-[9px] py-[5px] bg-interactive text-white">Compare</span>
		</div>
		<div class="w-[380px]">
			<SearchBar />
		</div>
	</div>

	<!-- Row 2: compare controls -->
	<div
		class="bg-glass backdrop-blur-sm border-b border-border px-lg flex items-center gap-[14px]"
		style="height: 60px;"
	>
		<!-- Translation chips — desktop -->
		<div class="hidden md:flex flex-col justify-center gap-[5px] shrink-0">
			<span class="text-[9px] uppercase tracking-[0.15em] text-subtle leading-none font-medium"
				>Translations</span
			>
			<div class="flex items-center gap-[5px]">
				{#each TRANSLATIONS as t (t.id)}
					{@const disabled = t.ntOnly && isOT}
					{@const active = $compareStore.visible.has(t.id)}
					<div class="relative group/tip">
						<button
							on:click={() => compareStore.toggle(t.id, isOT)}
							{disabled}
							class="px-[9px] py-[3px] rounded-[3px] text-[11px] font-medium uppercase tracking-[0.1em] border transition-colors duration-fast
								{disabled
								? 'border-border text-border cursor-not-allowed'
								: active
									? 'bg-interactive text-white border-interactive'
									: 'border-border text-subtle hover:text-foreground hover:border-foreground/30'}"
						>
							{t.abbr}
						</button>
						{#if disabled}
							<div
								class="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-[6px] px-[8px] py-[4px] bg-foreground text-background text-[11px] rounded-[3px] whitespace-nowrap opacity-0 group-hover/tip:opacity-100 transition-opacity duration-fast z-50"
							>
								New Testament only
								<div
									class="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[4px] border-r-[4px] border-t-[4px] border-l-transparent border-r-transparent border-t-foreground"
								></div>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		</div>

		<!-- Translation dropdown — mobile -->
		<div class="md:hidden relative shrink-0">
			<button
				class="flex items-center gap-[6px] px-[10px] py-[4px] rounded-[3px] border border-border text-[12px] font-medium transition-colors duration-fast
					{mobileTransOpen
					? 'bg-interactive text-white border-interactive'
					: 'text-foreground hover:text-interactive'}"
				on:click={() => {
					mobileTransOpen = !mobileTransOpen;
					navOpen = false;
					prefsOpen = false;
				}}
			>
				Translations
				<span class="text-[10px] opacity-70">{mobileTransOpen ? '▲' : '▼'}</span>
			</button>
			{#if mobileTransOpen}
				<div
					transition:slide={{ duration: 180 }}
					class="absolute top-[calc(100%+6px)] left-0 bg-panel border border-border rounded-sm shadow-lg p-sm z-50 w-48"
				>
					{#each TRANSLATIONS as t (t.id)}
						{@const disabled = t.ntOnly && isOT}
						<label
							class="flex items-center gap-sm py-[6px] cursor-pointer {disabled
								? 'opacity-40 pointer-events-none'
								: ''}"
						>
							<input
								type="checkbox"
								checked={$compareStore.visible.has(t.id)}
								{disabled}
								on:change={() => compareStore.toggle(t.id, isOT)}
								class="accent-interactive"
							/>
							<span class="text-[13px] text-foreground">{t.abbr}</span>
							<span class="text-[11px] text-subtle ml-auto">{t.year}</span>
						</label>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Center: chapter nav (flex-1 centered, no absolute overlay) -->
		<div class="flex-1 flex justify-center">
			<button
				class="flex items-center gap-[7px] px-[17px] py-[10px] rounded-[3px] transition-colors duration-fast
					{navOpen ? 'bg-accent text-white' : 'text-accent hover:bg-accent hover:text-white'}"
				on:click={() => {
					navOpen = !navOpen;
					prefsOpen = false;
					mobileTransOpen = false;
				}}
			>
				<span class="text-[16px] font-medium">{navLabel}</span>
				<span class="text-[11px] opacity-70 leading-none">{navOpen ? '▲' : '▼'}</span>
			</button>
		</div>

		<!-- Right: summary + text options -->
		<div class="shrink-0 flex items-center gap-[20px]">
			<button
				on:click={() => compareStore.toggleSummary()}
				class="text-[12px] font-medium text-muted hover:text-foreground transition-colors duration-fast"
			>
				Summary: <span class={$compareStore.showSummary ? 'text-interactive' : ''}
					>{$compareStore.showSummary ? 'on' : 'off'}</span
				>
			</button>
			<button
				class="px-[8px] h-[28px] flex items-center justify-center rounded-[3px] transition-colors duration-fast text-[12px] font-medium
					{prefsOpen ? 'bg-interactive text-white' : 'text-muted hover:text-interactive'}"
				title="Text options"
				on:click={() => {
					prefsOpen = !prefsOpen;
					navOpen = false;
					mobileTransOpen = false;
				}}
			>
				Text options
			</button>
		</div>
	</div>
</header>

{#if navOpen}
	<FloatingNav
		bookSlug={bookMeta.slug}
		{chapterNum}
		onClose={() => (navOpen = false)}
		compareMode={true}
	/>
{/if}

{#if prefsOpen}
	<div
		transition:slide={{ duration: 180 }}
		class="fixed top-[110px] right-md bg-panel border border-border rounded-sm shadow-lg p-md z-50 w-72 font-ui"
	>
		<ReadingPrefs />
	</div>
{/if}

{#if navOpen || prefsOpen || mobileTransOpen}
	<div
		class="fixed inset-0 z-40"
		role="presentation"
		on:click={closeAll}
		on:keydown={() => {}}
	></div>
{/if}
