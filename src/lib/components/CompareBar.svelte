<script lang="ts">
	import { tick } from 'svelte';
	import { slide } from 'svelte/transition';
	import { goto } from '$app/navigation';
	import { prefs } from '$lib/stores/prefs';
	import { readingPosition } from '$lib/stores/reading';
	import FloatingNav from './FloatingNav.svelte';
	import SpotlightSearch from './SpotlightSearch.svelte';
	import ReadingPrefs from './ReadingPrefs.svelte';
	import { compareStore, TRANSLATIONS } from '$lib/stores/compare';
	import type { BookMeta } from '$lib/data/types';

	export let bookMeta: BookMeta;
	export let chapterNum: number;

	// Return URLs derived from the last known reading position (includes routeBase).
	// Falls back to ODR if no position recorded (e.g. user landed directly on /compare).
	$: _base = $readingPosition?.routeBase ?? '/odr';
	$: _slug = $readingPosition?.bookSlug ?? bookMeta.slug;
	$: _ch = $readingPosition?.chapter ?? chapterNum;
	$: readingHref = `${_base}/${_slug}/${_ch}`;
	$: studyHref = $readingPosition ? `${_base}/${_slug}/${_ch}` : null;

	// Build toggle items: Reading, [Study], Compare (always active/last)
	$: _rawItems = [
		{ label: 'Read', href: readingHref, study: false, active: false },
		...(studyHref ? [{ label: 'Study', href: studyHref, study: true, active: false }] : []),
		{ label: 'Compare', href: null, study: false, active: true }
	];
	$: toggleItems = _rawItems.map((item, idx) => ({ ...item, idx }));
	$: toggleCount = toggleItems.length;
	$: activeToggleIdx = toggleCount - 1; // Compare is always last

	// pendingIdx lets the pill animate before navigation fires
	let pendingIdx = -1;
	$: displayIdx = pendingIdx >= 0 ? pendingIdx : activeToggleIdx;

	// Pill measurement
	let toggleEl: HTMLElement;
	let pillLeft = 0;
	let pillWidth = 0;

	async function measurePill(idx: number) {
		await tick();
		if (!toggleEl) return;
		const btns = toggleEl.querySelectorAll<HTMLElement>('.mode-btn');
		const btn = btns[idx >= 0 ? idx : 0];
		if (!btn) return;
		pillLeft = btn.offsetLeft;
		pillWidth = btn.offsetWidth;
	}

	$: if (toggleEl) measurePill(displayIdx);

	async function handleToggleClick(item: {
		label: string;
		href: string | null;
		study: boolean;
		active: boolean;
		idx: number;
	}) {
		if (item.active || !item.href) return;
		pendingIdx = item.idx;
		await new Promise<void>((r) => setTimeout(r, 210));
		prefs.update((p) => ({ ...p, readingMode: item.study ? 'study' : 'reading' }));
		goto(item.href);
	}

	let navOpen = false;
	let prefsOpen = false;
	let mobileTransOpen = false;
	let searchOpen = false;

	$: isOT = bookMeta.testament === 'OT';
	$: navLabel = `${bookMeta.odrName} ${chapterNum}`;

	function closeAll() {
		navOpen = false;
		prefsOpen = false;
		mobileTransOpen = false;
		searchOpen = false;
	}
</script>

<SpotlightSearch bind:open={searchOpen} />

<header class="sticky top-0 z-50 font-ui">
	<!-- Row 1: branding + mode + search -->
	<div
		class="bg-glass backdrop-blur-sm border-b border-border px-lg flex items-center gap-[10px] relative"
		style="height: 50px;"
	>
		<!-- Logo: absolute-centered on mobile, in-flow on desktop -->
		<a
			href="/"
			class="flex items-center gap-[6px] group shrink-0
				   max-md:absolute max-md:left-1/2 max-md:-translate-x-1/2 max-md:pointer-events-auto"
			on:click={closeAll}
		>
			<span class="text-accent text-[15px] leading-none select-none" aria-hidden="true">✠</span>
			<span
				class="text-[12px] uppercase tracking-[0.2em] font-semibold text-foreground group-hover:text-accent transition-colors duration-fast"
			>
				Douay-Rheims
			</span>
		</a>

		<!-- Spacer (desktop only) -->
		<div class="hidden md:flex flex-1"></div>

		<!-- Mode toggle — pill measured from actual button bounds -->
		<div
			bind:this={toggleEl}
			class="mode-toggle relative flex items-center text-[11px] font-medium shrink-0"
		>
			{#if pillWidth > 0}
				<div
					class="mode-pill"
					style="transform: translateX({pillLeft}px); width: {pillWidth}px;"
				></div>
			{/if}
			{#each toggleItems as item (item.label)}
				<button
					class="mode-btn relative z-10 px-[10px] py-[5px] transition-colors duration-fast whitespace-nowrap
						{displayIdx === item.idx ? 'text-white' : 'text-subtle hover:text-foreground'}"
					on:click={() => handleToggleClick(item)}
				>
					{item.label}
				</button>
			{/each}
		</div>

		<!-- Search icon (always visible) -->
		<button
			class="ml-auto md:ml-0 shrink-0 flex items-center justify-center w-[30px] h-[30px]
				rounded-[3px] text-subtle hover:text-foreground transition-colors duration-fast"
			aria-label="Search"
			on:click={() => (searchOpen = true)}
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
		</button>
	</div>

	<!-- Row 2: compare controls -->
	<div
		class="bg-glass backdrop-blur-sm border-b border-border px-lg flex items-center gap-[14px] relative"
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
					: 'text-foreground hover:text-accent'}"
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
								class="accent-accent"
							/>
							<span class="text-[13px] text-foreground">{t.abbr}</span>
							<span class="text-[11px] text-subtle ml-auto">{t.year}</span>
						</label>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Center: chapter nav — absolutely centered so unequal sides don't shift it -->
		<div class="absolute left-1/2 -translate-x-1/2">
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
		<div class="ml-auto shrink-0 flex items-center gap-[10px] md:gap-[20px]">
			<button
				on:click={() => compareStore.toggleSummary()}
				class="hidden sm:block text-[13px] font-medium text-muted hover:text-foreground transition-colors duration-fast"
			>
				Summary: <span class={$compareStore.showSummary ? 'text-accent' : ''}
					>{$compareStore.showSummary ? 'on' : 'off'}</span
				>
			</button>
			<button
				class="px-[8px] h-[28px] flex items-center justify-center rounded-[3px] transition-colors duration-fast text-[13px] font-medium
					{prefsOpen ? 'bg-accent text-white' : 'text-muted hover:text-accent'}"
				aria-label="Reading options"
				on:click={() => {
					prefsOpen = !prefsOpen;
					navOpen = false;
					mobileTransOpen = false;
				}}
			>
				<span class="hidden sm:inline">Reading options</span>
				<span class="sm:hidden">Aa</span>
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
		class="fixed top-[var(--header-height)] right-md bg-panel border border-border rounded-sm shadow-lg p-md z-50 w-72 font-ui"
	>
		<ReadingPrefs />
	</div>
{/if}

{#if navOpen || prefsOpen || mobileTransOpen}
	<div
		class="fixed inset-0 z-40"
		role="presentation"
		on:click={closeAll}
		on:keydown={(e) => {
			if (e.key === 'Escape') closeAll();
		}}
	></div>
{/if}

<style>
	.mode-toggle {
		border: 1px solid var(--color-border);
		border-radius: 4px;
		overflow: hidden;
		background: color-mix(in srgb, var(--color-border) 35%, transparent);
	}
	.mode-pill {
		position: absolute;
		top: 0;
		bottom: 0;
		left: 0;
		background: var(--color-interactive);
		transition:
			transform 220ms cubic-bezier(0.34, 1.06, 0.64, 1),
			width 220ms cubic-bezier(0.34, 1.06, 0.64, 1);
		pointer-events: none;
	}
	.mode-btn {
		font-size: 11px;
	}
</style>
