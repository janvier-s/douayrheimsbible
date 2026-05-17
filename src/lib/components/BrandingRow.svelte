<script lang="ts">
	import ModeToggle from './ModeToggle.svelte';
	import { page } from '$app/stores';
	import { prayerOpen } from '$lib/stores/prayer';

	interface Props {
		modeItems: Array<{ key: string; label: string }>;
		activeModeIdx: number;
		pendingIdx: number;
		onModeSelect: (e: CustomEvent<{ key: string; index: number }>) => void;
		onLogoClick?: () => void;
		children?: import('svelte').Snippet;
	}

	let {
		modeItems,
		activeModeIdx,
		pendingIdx,
		onModeSelect,
		onLogoClick = () => {},
		children
	}: Props = $props();

	let isSearchPage = $derived($page.url.pathname.startsWith('/search'));
	let currentPath = $derived($page.url.pathname);

	let menuOpen = $state(false);

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
				{ label: 'Compare Translations', href: '/compare' },
				{ label: 'Articles', href: '/articles', disabled: true },
				{ label: 'Search', href: '/search' }
			]
		},
		{
			label: 'About',
			links: [
				{ label: 'About This Website', href: '/about' },
				{ label: 'About the Translation', href: '/history/the-douay-rheims' },
				{ label: 'History', href: '/history' },
				{ label: 'Contact', href: '/contact' }
			]
		}
	];
</script>

<svelte:window
	onkeydown={(e) => {
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
		onclick={onLogoClick}
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

	<!-- Spacer: pushes right-side controls to the end on both mobile and desktop -->
	<div class="flex-1"></div>

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

	<!-- Prayer button -->
	<button
		class="shrink-0 flex items-center justify-center w-[30px] h-[30px]
			rounded-[3px] transition-colors duration-fast
			{$prayerOpen ? 'text-accent' : 'text-subtle hover:text-foreground'}"
		aria-label="Prayer before reading"
		onclick={() => prayerOpen.set(true)}
	>
		<svg width="20" height="20" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
			<path
				d="M235.32,180l-36.24-36.25L162.62,23.46A21.76,21.76,0,0,0,128,12.93,21.76,21.76,0,0,0,93.38,23.46L56.92,143.76,20.68,180a16,16,0,0,0,0,22.62l32.69,32.69a16,16,0,0,0,22.63,0L124.28,187a40.68,40.68,0,0,0,3.72-4.29,40.68,40.68,0,0,0,3.72,4.29L180,235.32a16,16,0,0,0,22.63,0l32.69-32.69A16,16,0,0,0,235.32,180ZM64.68,224,32,191.32l12.69-12.69,32.69,32.69ZM120,158.75a23.85,23.85,0,0,1-7,17L88.68,200,56,167.32l13.65-13.66a8,8,0,0,0,2-3.34l37-122.22A5.78,5.78,0,0,1,120,29.78Zm23,17a23.85,23.85,0,0,1-7-17v-129a5.78,5.78,0,0,1,11.31-1.68l37,122.22a8,8,0,0,0,2,3.34l14.49,14.49-33.4,32ZM191.32,224l-12.56-12.57,33.39-32L224,191.32Z"
			/>
		</svg>
	</button>

	<!-- Hamburger menu button -->
	<button
		class="shrink-0 flex items-center justify-center w-[30px] h-[30px]
			rounded-[3px] transition-colors duration-fast
			{menuOpen ? 'text-accent' : 'text-subtle hover:text-foreground'}"
		aria-label="Site navigation"
		aria-expanded={menuOpen}
		aria-haspopup="menu"
		onclick={() => (menuOpen = !menuOpen)}
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
	{@render children?.()}
</div>

<!-- Dropdown — OUTSIDE the backdrop-blur div to avoid stacking context trap -->
{#if menuOpen}
	<nav class="site-menu" aria-label="Site navigation menu">
		{#each navGroups as group}
			<div class="site-menu-group">
				<p class="site-menu-group-label">{group.label}</p>
				{#each group.links as link}
					{#if link.disabled}
						<div class="site-menu-item site-menu-item--disabled">
							<div class="site-menu-bar"></div>
							<span class="site-menu-link">{link.label}</span>
						</div>
					{:else}
						<div class="site-menu-item {isActive(link.href) ? 'site-menu-item--active' : ''}">
							<div class="site-menu-bar"></div>
							<a href={link.href} class="site-menu-link" onclick={closeMenu}>{link.label}</a>
						</div>
					{/if}
				{/each}
			</div>
		{/each}
	</nav>
{/if}

<!-- Backdrop -->
{#if menuOpen}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="site-backdrop" role="presentation" onclick={closeMenu}></div>
{/if}

<style>
	/* ── Site nav dropdown ──────────────────────────────────── */
	.site-menu {
		position: fixed;
		top: 52px;
		right: 8px;
		background: var(--color-panel);
		border: 1px solid var(--color-border);
		border-radius: 5px;
		box-shadow:
			0 4px 8px rgba(0, 0, 0, 0.07),
			0 12px 28px rgba(0, 0, 0, 0.1);
		z-index: 9999;
		width: 260px;
		overflow: hidden;
		animation: menu-in 160ms cubic-bezier(0.16, 1, 0.3, 1) both;
		transform-origin: top right;
	}

	@keyframes menu-in {
		from {
			opacity: 0;
			transform: scale(0.95) translateY(-4px);
		}
		to {
			opacity: 1;
			transform: scale(1) translateY(0);
		}
	}

	.site-menu-group {
		padding: 6px 0 4px;
	}

	.site-menu-group + .site-menu-group {
		border-top: 1px solid color-mix(in srgb, var(--color-border) 60%, transparent);
	}

	.site-menu-group-label {
		padding: 4px 14px 4px;
		font-family: var(--font-ui);
		font-size: 9px;
		font-weight: 600;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--color-subtle);
		opacity: 0.65;
	}

	.site-menu-item {
		display: flex;
		align-items: stretch;
		min-height: 42px;
	}

	.site-menu-bar {
		width: 2px;
		flex-shrink: 0;
		background: transparent;
		transition: background 130ms ease;
	}

	.site-menu-link {
		flex: 1;
		display: flex;
		align-items: center;
		padding: 10px 14px 10px 12px;
		font-family: var(--font-ui);
		font-size: 14px;
		font-weight: 400;
		color: var(--color-text);
		text-decoration: none;
		transition: background 130ms ease;
	}

	.site-menu-item:hover .site-menu-bar {
		background: color-mix(in srgb, var(--color-accent) 40%, transparent);
	}

	.site-menu-item:hover .site-menu-link {
		background: color-mix(in srgb, var(--color-foreground) 4%, var(--color-panel));
		color: var(--color-accent);
	}

	.site-menu-item--active .site-menu-bar {
		background: var(--color-accent);
	}

	.site-menu-item--active .site-menu-link {
		color: var(--color-accent);
		background: color-mix(in srgb, var(--color-accent) 7%, var(--color-panel));
		font-weight: 500;
	}

	.site-menu-item--disabled {
		cursor: not-allowed;
	}

	.site-menu-item--disabled .site-menu-link {
		color: var(--color-subtle);
		opacity: 0.45;
		pointer-events: none;
	}

	.site-backdrop {
		position: fixed;
		inset: 0;
		z-index: 9998;
	}
</style>
