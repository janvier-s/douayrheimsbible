<script lang="ts">
	import ModeToggle from './ModeToggle.svelte';
	import { page } from '$app/stores';

	export let modeItems: Array<{ key: string; label: string }>;
	export let activeModeIdx: number;
	export let pendingIdx: number;
	export let onModeSelect: (e: CustomEvent<{ key: string; index: number }>) => void;
	export let onLogoClick: () => void = () => {};

	$: isSearchPage = $page.url.pathname.startsWith('/search');
</script>

<div
	class="bg-glass backdrop-blur-sm border-b border-border px-lg flex items-center gap-[10px] relative"
	style="height: 50px;"
>
	<!-- Logo -->
	<a
		href="/"
		aria-label="Douay-Rheims"
		class="flex items-center gap-[6px] group shrink-0"
		on:click={onLogoClick}
	>
		<span class="text-accent text-[15px] leading-none select-none" aria-hidden="true">✠</span>
		<!-- Desktop: single line -->
		<span
			class="hidden md:block text-[12px] uppercase tracking-[0.2em] font-semibold text-foreground group-hover:text-accent transition-colors duration-fast"
		>
			Douay-Rheims
		</span>
		<!-- Mobile: two lines stacked -->
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

	<!-- ModeToggle — desktop only -->
	<div class="hidden md:flex">
		<ModeToggle
			items={modeItems}
			activeIndex={activeModeIdx}
			pendingIndex={pendingIdx}
			on:select={onModeSelect}
		/>
	</div>

	<!-- Search icon — desktop only -->
	<a
		href="/search"
		class="hidden md:flex ml-0 shrink-0 items-center justify-center w-[30px] h-[30px]
		    rounded-[3px] transition-colors duration-fast
		    {isSearchPage ? 'text-accent' : 'text-subtle hover:text-foreground'}"
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

	<!-- Slot for mobile-specific controls (e.g. TopBar's prefs toggle) -->
	<slot />
</div>
