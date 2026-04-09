<script lang="ts">
	import { slide, fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { goto } from '$app/navigation';
	import { prefs } from '$lib/stores/prefs';
	import { readingPosition } from '$lib/stores/reading';
	import FloatingNav from './FloatingNav.svelte';
	import ReadingPrefs from './ReadingPrefs.svelte';
	import ModeToggle from './ModeToggle.svelte';
	import { compareStore, TRANSLATIONS } from '$lib/stores/compare';
	import type { BookMeta } from '$lib/data/types';

	export let bookMeta: BookMeta;
	export let chapterNum: number;

	// Return URLs derived from the last known reading position or current compare context.
	$: _base = $readingPosition?.routeBase ?? '/odr';
	$: _slug = $readingPosition?.bookSlug ?? bookMeta.slug;
	$: _ch = $readingPosition?.chapter ?? chapterNum;
	$: readerHref = `${_base}/${_slug}/${_ch}`;

	// Build toggle items — study is always available (uses same href as reading)
	$: modeItems = [
		{ key: 'reading', label: 'Read' },
		{ key: 'study', label: 'Study' },
		{ key: 'compare', label: 'Compare' }
	];
	$: activeModeIdx = modeItems.length - 1; // Compare is always active here

	let pendingIdx = -1;

	async function selectMode(key: string, index: number) {
		if (key === 'compare') return; // already on compare
		pendingIdx = index;
		const delay = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 210;
		await new Promise<void>((r) => setTimeout(r, delay));
		prefs.update((p) => ({ ...p, readingMode: key === 'study' ? 'study' : 'reading' }));
		goto(readerHref);
	}

	async function handleModeSelect(e: CustomEvent<{ key: string; index: number }>) {
		const { key, index } = e.detail;
		await selectMode(key, index);
	}

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
	<!-- Row 1: branding + mode + search -->
	<div
		class="bg-glass backdrop-blur-sm border-b border-border px-lg flex items-center gap-[10px] relative"
		style="height: 50px;"
	>
		<!-- Logo -->
		<a
			href="/"
			aria-label="Douay-Rheims"
			class="flex items-center gap-[6px] group shrink-0"
			on:click={closeAll}
		>
			<span class="text-accent text-[15px] leading-none select-none" aria-hidden="true">✠</span>
			<span
				class="hidden md:block text-[12px] uppercase tracking-[0.2em] font-semibold text-foreground group-hover:text-accent transition-colors duration-fast"
			>
				Douay-Rheims
			</span>
			<span class="md:hidden flex flex-col gap-[1px] leading-[1.2]" aria-hidden="true">
				<span
					class="text-[7px] uppercase tracking-[0.18em] font-bold text-foreground group-hover:text-accent transition-colors duration-fast"
					>Douay</span
				>
				<span
					class="text-[7px] uppercase tracking-[0.18em] font-bold text-foreground group-hover:text-accent transition-colors duration-fast"
					>Rheims</span
				>
			</span>
		</a>

		<!-- Spacer (desktop only) -->
		<div class="hidden md:flex flex-1"></div>

		<!-- ModeToggle — desktop only (mobile uses bottom tab bar) -->
		<div class="hidden md:flex">
			<ModeToggle
				items={modeItems}
				activeIndex={activeModeIdx}
				pendingIndex={pendingIdx}
				on:select={handleModeSelect}
			/>
		</div>

		<!-- Search icon — desktop only (mobile uses bottom tab bar) -->
		<a
			href="/search"
			class="hidden md:flex ml-0 shrink-0 items-center justify-center w-[30px] h-[30px]
		    rounded-[3px] text-subtle hover:text-foreground transition-colors duration-fast"
			aria-label="Search"
		>
			<svg
				width="15"
				height="15"
				viewBox="0 0 15 15"
				fill="none"
				stroke="currentColor"
				stroke-width="1.5"
				stroke-linecap="round"
			>
				<circle cx="6.5" cy="6.5" r="4.5" />
				<line x1="10" y1="10" x2="14" y2="14" />
			</svg>
		</a>
	</div>

	<!-- Row 2: compare controls -->
	<div
		class="bg-glass backdrop-blur-sm border-b border-border px-lg max-md:px-[8px] flex items-center gap-[10px] md:gap-[14px] relative"
		style="height: 50px;"
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
				class="flex items-center gap-[4px] px-[8px] py-[4px] rounded-[3px] border border-border text-[11px] font-medium transition-colors duration-fast
					{mobileTransOpen
					? 'bg-interactive text-white border-interactive'
					: 'text-foreground hover:text-accent'}"
				on:click={() => {
					mobileTransOpen = !mobileTransOpen;
					navOpen = false;
					prefsOpen = false;
				}}
			>
				Trans.
				<span class="text-[9px] opacity-70" aria-hidden="true">{mobileTransOpen ? '▲' : '▼'}</span>
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
								class="accent-accent"
							/>
							<span class="text-[13px] text-foreground">{t.abbr}</span>
							<span class="text-[11px] text-subtle ml-auto">{t.year}</span>
						</label>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Center: chapter nav — absolutely centered on desktop, in-flow on mobile -->
		<div
			class="md:absolute md:left-1/2 md:-translate-x-1/2 flex-1 md:flex-none flex justify-center"
		>
			<button
				class="flex items-center gap-[5px] px-[12px] md:px-[17px] py-[8px] md:py-[10px] rounded-[3px] transition-colors duration-fast
					{navOpen ? 'bg-accent text-white' : 'text-accent hover:bg-accent hover:text-white'}"
				on:click={() => {
					navOpen = !navOpen;
					prefsOpen = false;
					mobileTransOpen = false;
				}}
			>
				<span class="text-[14px] md:text-[16px] font-medium">{navLabel}</span>
				<span class="text-[10px] md:text-[11px] opacity-70 leading-none" aria-hidden="true"
					>{navOpen ? '▲' : '▼'}</span
				>
			</button>
		</div>

		<!-- Right: summary + text options -->
		<div class="shrink-0 flex items-center gap-[8px] md:gap-[20px] md:ml-auto">
			<button
				on:click={() => compareStore.toggleSummary()}
				class="hidden sm:block text-[13px] font-medium text-muted hover:text-foreground transition-colors duration-fast"
			>
				Summary: <span class={$compareStore.showSummary ? 'text-accent' : ''}
					>{$compareStore.showSummary ? 'on' : 'off'}</span
				>
			</button>
			<!-- Desktop: text button -->
			<button
				class="hidden sm:flex px-[8px] h-[28px] items-center justify-center rounded-[3px] transition-colors duration-fast text-[13px] font-medium
					{prefsOpen ? 'bg-accent text-white' : 'text-muted hover:text-accent'}"
				aria-label="Reading options"
				on:click={() => {
					prefsOpen = !prefsOpen;
					navOpen = false;
					mobileTransOpen = false;
				}}
			>
				Reading options
			</button>
			<!-- Mobile: sliders icon -->
			<button
				class="sm:hidden shrink-0 flex items-center justify-center w-[30px] h-[30px]
					rounded-[3px] transition-colors duration-fast
					{prefsOpen ? 'text-accent' : 'text-subtle hover:text-foreground'}"
				aria-label="Reading options"
				on:click={() => {
					prefsOpen = !prefsOpen;
					navOpen = false;
					mobileTransOpen = false;
				}}
			>
				<svg
					width="16"
					height="14"
					viewBox="0 0 16 14"
					fill="none"
					stroke="currentColor"
					stroke-width="1.5"
					stroke-linecap="round"
				>
					<line x1="1" y1="2" x2="15" y2="2" />
					<line x1="1" y1="7" x2="15" y2="7" />
					<line x1="1" y1="12" x2="15" y2="12" />
					<circle cx="5" cy="2" r="2" fill="currentColor" stroke="none" />
					<circle cx="11" cy="7" r="2" fill="currentColor" stroke="none" />
					<circle cx="7" cy="12" r="2" fill="currentColor" stroke="none" />
				</svg>
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
	<!-- Desktop panel -->
	<div
		transition:slide={{ duration: 180 }}
		class="hidden md:block fixed top-[var(--header-height)] right-md bg-panel border border-border rounded-sm shadow-lg p-md z-50 w-72 font-ui"
		role="dialog"
		aria-label="Reading options"
	>
		<ReadingPrefs compareMode={true} />
	</div>

	<!-- Mobile top panel — slides down from header -->
	<div
		transition:fly={{ y: -30, duration: 200, easing: cubicOut }}
		class="md:hidden fixed inset-x-0 top-[var(--header-height)] bg-panel border-b border-border z-[60] font-ui"
		style="border-radius: 0 0 12px 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.12);"
		role="dialog"
		aria-label="Reading options"
	>
		<div style="height: 320px; overflow-y: auto; overscroll-behavior: contain;">
			<ReadingPrefs compareMode={true} />
		</div>
	</div>
{/if}

{#if navOpen || prefsOpen || mobileTransOpen}
	<div
		class="fixed inset-0 z-[57]"
		role="presentation"
		on:click={closeAll}
		on:keydown={(e) => {
			if (e.key === 'Escape') closeAll();
		}}
	></div>
{/if}

<!-- Bottom tab bar — mobile only -->
<nav
	class="md:hidden fixed bottom-0 inset-x-0 z-[56] bg-glass backdrop-blur-sm border-t border-border font-ui"
	style="padding-bottom: env(safe-area-inset-bottom);"
	aria-label="Main navigation"
>
	<div class="flex" style="height: 56px;">
		{#each modeItems as item, i}
			<button
				class="flex-1 flex flex-col items-center justify-center gap-[3px] transition-colors duration-fast
				{pendingIdx === i || (pendingIdx === -1 && activeModeIdx === i)
					? 'text-accent'
					: 'text-subtle hover:text-foreground'}"
				aria-label={item.label}
				aria-pressed={activeModeIdx === i}
				on:click={() => selectMode(item.key, i)}
			>
				{#if item.key === 'reading'}
					<svg
						width="18"
						height="18"
						viewBox="0 0 18 18"
						fill="none"
						stroke="currentColor"
						stroke-width="1.5"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<rect x="3" y="2" width="12" height="14" rx="1.5" />
						<line x1="6" y1="6" x2="12" y2="6" />
						<line x1="6" y1="9" x2="12" y2="9" />
						<line x1="6" y1="12" x2="9" y2="12" />
					</svg>
				{:else if item.key === 'study'}
					<svg
						width="18"
						height="18"
						viewBox="0 0 18 18"
						fill="none"
						stroke="currentColor"
						stroke-width="1.3"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<path
							d="M9 4C7.5 3 5.5 2.5 3 3v11c2.5-.5 4.5 0 6 1m0-11c1.5-1 3.5-1.5 6-1v11c-2.5-.5-4.5 0-6 1"
						/>
						<line x1="9" y1="6" x2="9" y2="11" />
						<line x1="7" y1="8" x2="11" y2="8" />
					</svg>
				{:else if item.key === 'compare'}
					<svg
						width="18"
						height="18"
						viewBox="0 0 18 18"
						fill="none"
						stroke="currentColor"
						stroke-width="1.5"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<rect x="2" y="3" width="5.5" height="12" rx="1" />
						<rect x="10.5" y="3" width="5.5" height="12" rx="1" />
					</svg>
				{/if}
				<span class="text-[8px] uppercase tracking-[0.1em] font-medium">{item.label}</span>
			</button>
		{/each}
		<!-- Search tab -->
		<a
			href="/search"
			class="flex-1 flex flex-col items-center justify-center gap-[3px] transition-colors duration-fast
		    text-subtle hover:text-foreground"
			aria-label="Search"
		>
			<svg
				width="18"
				height="18"
				viewBox="0 0 18 18"
				fill="none"
				stroke="currentColor"
				stroke-width="1.5"
				stroke-linecap="round"
			>
				<circle cx="8" cy="8" r="5.5" />
				<line x1="12" y1="12" x2="16" y2="16" />
			</svg>
			<span class="text-[8px] uppercase tracking-[0.1em] font-medium">Search</span>
		</a>
	</div>
</nav>
