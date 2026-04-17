<script lang="ts">
	import ModeToggle from './ModeToggle.svelte';
	import { page } from '$app/stores';

	export let modeItems: Array<{ key: string; label: string }>;
	export let activeModeIdx: number;
	export let pendingIdx: number;
	export let onModeSelect: (e: CustomEvent<{ key: string; index: number }>) => void;
	export let onLogoClick: () => void = () => {};

	$: isSearchPage = $page.url.pathname.startsWith('/search');
	$: currentPath = $page.url.pathname;

	let menuOpen = false;

	function closeMenu() {
		menuOpen = false;
	}

	function isActive(href: string) {
		if (href === '/') return currentPath === '/';
		return currentPath.startsWith(href);
	}

	const navGroups = [
		{
			label: 'Scripture',
			links: [
				{ label: 'Old Testament', href: '/books/old-testament' },
				{ label: 'New Testament', href: '/books/new-testament' },
				{ label: 'Reference Material', href: '/reference' }
			]
		},
		{
			label: 'Study',
			links: [
				{ label: 'Search', href: '/search' },
				{ label: 'Compare Translations', href: '/compare' },
				{ label: 'Articles', href: '/articles' }
			]
		},
		{
			label: 'About',
			links: [
				{ label: 'History', href: '/history' },
				{ label: 'About This Website', href: '/about' },
				{ label: 'About the Translation', href: '/history/the-douay-rheims' }
			]
		}
	];
</script>

<svelte:window
	on:keydown={(e) => {
		if (e.key === 'Escape') closeMenu();
	}}
/>

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
			class="hidden md:block text-[12px] uppercase tracking-[0.2em] font-medium text-foreground group-hover:text-accent transition-colors duration-fast"
		>
			Douay-Rheims
		</span>
		<!-- Mobile: two lines stacked -->
		<span class="md:hidden flex flex-col gap-[1px] leading-[1.2]" aria-hidden="true">
			<span
				class="text-[7px] uppercase tracking-[0.18em] font-medium text-foreground group-hover:text-accent transition-colors duration-fast"
				>Douay</span
			>
			<span
				class="text-[7px] uppercase tracking-[0.18em] font-medium text-foreground group-hover:text-accent transition-colors duration-fast"
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

	<!-- Hamburger menu button -->
	<button
		class="shrink-0 flex items-center justify-center w-[30px] h-[30px]
			rounded-[3px] transition-colors duration-fast
			{menuOpen ? 'text-accent' : 'text-subtle hover:text-foreground'}"
		aria-label="Site navigation"
		aria-expanded={menuOpen}
		aria-haspopup="menu"
		on:click={() => (menuOpen = !menuOpen)}
	>
		{#if menuOpen}
			<svg
				width="12"
				height="12"
				viewBox="0 0 12 12"
				fill="none"
				stroke="currentColor"
				stroke-width="1.6"
				stroke-linecap="round"
				aria-hidden="true"
			>
				<line x1="1" y1="1" x2="11" y2="11" />
				<line x1="11" y1="1" x2="1" y2="11" />
			</svg>
		{:else}
			<svg
				width="15"
				height="12"
				viewBox="0 0 15 12"
				fill="none"
				stroke="currentColor"
				stroke-width="1.5"
				stroke-linecap="round"
				aria-hidden="true"
			>
				<line x1="1" y1="1.5" x2="14" y2="1.5" />
				<line x1="1" y1="6" x2="14" y2="6" />
				<line x1="1" y1="10.5" x2="14" y2="10.5" />
			</svg>
		{/if}
	</button>

	<!-- Slot for mobile-specific controls (e.g. TopBar's prefs toggle) -->
	<slot />
</div>

<!-- Dropdown — OUTSIDE the backdrop-blur div to avoid stacking context trap -->
{#if menuOpen}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<nav class="site-menu" aria-label="Site navigation menu">
		{#each navGroups as group, gi}
			{#if gi > 0}
				<div class="site-menu-divider" aria-hidden="true"></div>
			{/if}
			<p class="site-menu-group-label">{group.label}</p>
			{#each group.links as link}
				<a
					href={link.href}
					class="site-menu-link {isActive(link.href) ? 'active' : ''}"
					on:click={closeMenu}
				>
					{link.label}
					{#if isActive(link.href)}
						<span class="site-menu-dot" aria-hidden="true"></span>
					{/if}
				</a>
			{/each}
		{/each}
	</nav>
{/if}

<!-- Backdrop -->
{#if menuOpen}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="site-backdrop" role="presentation" on:click={closeMenu}></div>
{/if}

<style>
	/* ── Dropdown ───────────────────────────────────────────── */
	.site-menu {
		position: fixed;
		top: 52px;
		right: 8px;
		background: var(--color-panel);
		border: 1px solid var(--color-border);
		border-radius: 6px;
		box-shadow:
			0 4px 6px -1px rgba(0, 0, 0, 0.06),
			0 16px 40px -8px rgba(0, 0, 0, 0.2);
		z-index: 9999;
		min-width: 200px;
		padding: 8px 0;
		display: flex;
		flex-direction: column;
		animation: menu-in 160ms cubic-bezier(0.16, 1, 0.3, 1) both;
		transform-origin: top right;
	}

	@keyframes menu-in {
		from {
			opacity: 0;
			transform: scale(0.94) translateY(-6px);
		}
		to {
			opacity: 1;
			transform: scale(1) translateY(0);
		}
	}

	.site-menu-group-label {
		padding: 6px 14px 3px;
		font-family: var(--font-ui);
		font-size: 9px;
		font-weight: 600;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--color-subtle);
		opacity: 0.6;
	}

	.site-menu-link {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 7px 14px;
		font-family: var(--font-ui);
		font-size: 13px;
		font-weight: 400;
		color: var(--color-muted);
		text-decoration: none;
		transition:
			background 80ms ease,
			color 80ms ease;
	}

	.site-menu-link:hover {
		background: color-mix(in srgb, var(--color-accent) 7%, transparent);
		color: var(--color-text);
	}

	.site-menu-link.active {
		color: var(--color-accent);
	}

	.site-menu-dot {
		width: 4px;
		height: 4px;
		border-radius: 50%;
		background: var(--color-accent);
		opacity: 0.7;
		flex-shrink: 0;
	}

	.site-menu-divider {
		height: 1px;
		background: var(--color-border);
		margin: 6px 0;
		opacity: 0.5;
	}

	.site-backdrop {
		position: fixed;
		inset: 0;
		z-index: 9998;
	}
</style>
