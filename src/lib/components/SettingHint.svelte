<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { supportsHover } from '$lib/stores/mobile';

	interface Props {
		text: string;
		children?: import('svelte').Snippet;
	}

	let { text, children }: Props = $props();

	const hintId = `setting-hint-${Math.random().toString(36).slice(2)}`;
	let anchorEl: HTMLElement | undefined = $state();
	let open = $state(false);
	let popoverStyle = $state('');
	let above = $state(false);

	const POPOVER_WIDTH = 220;
	const GAP = 6;

	function computePosition() {
		if (!anchorEl) return;
		const rect = anchorEl.getBoundingClientRect();
		above = window.innerHeight - rect.bottom < 100;
		const left = Math.min(Math.max(rect.left, 8), window.innerWidth - POPOVER_WIDTH - 8);
		popoverStyle = above
			? `left:${left}px; bottom:${window.innerHeight - rect.top + GAP}px; width:${POPOVER_WIDTH}px;`
			: `left:${left}px; top:${rect.bottom + GAP}px; width:${POPOVER_WIDTH}px;`;
	}

	function show() {
		open = true;
		computePosition();
	}

	function hide() {
		open = false;
	}

	function toggle(e: MouseEvent) {
		e.stopPropagation();
		if (open) hide();
		else show();
	}

	function onDocClick(e: MouseEvent) {
		if (open && anchorEl && !anchorEl.contains(e.target as Node)) hide();
	}

	function onScroll() {
		if (open) hide();
	}

	onMount(() => {
		if (!browser) return;
		document.addEventListener('click', onDocClick, true);
		document.addEventListener('scroll', onScroll, { capture: true, passive: true });
	});

	onDestroy(() => {
		if (!browser) return;
		document.removeEventListener('click', onDocClick, true);
		document.removeEventListener('scroll', onScroll, true);
	});
</script>

{#if $supportsHover}
	<span
		bind:this={anchorEl}
		class="setting-hint-label"
		role="button"
		tabindex="0"
		aria-describedby={open ? hintId : undefined}
		onmouseenter={show}
		onmouseleave={hide}
		onfocus={show}
		onblur={hide}
	>
		{@render children?.()}
	</span>
{:else}
	<span class="setting-hint-row">
		{@render children?.()}
		<button
			type="button"
			bind:this={anchorEl}
			class="setting-hint-icon"
			aria-label="More info"
			aria-expanded={open}
			aria-describedby={open ? hintId : undefined}
			onclick={toggle}
		>
			i
		</button>
	</span>
{/if}

{#if open}
	<div
		id={hintId}
		class="setting-hint-popover"
		class:setting-hint-popover-above={above}
		role="tooltip"
		style="position:fixed; {popoverStyle}"
	>
		{text}
	</div>
{/if}

<style>
	.setting-hint-label {
		cursor: help;
	}

	.setting-hint-row {
		display: inline-flex;
		align-items: center;
		gap: 5px;
	}

	.setting-hint-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 15px;
		height: 15px;
		border-radius: 50%;
		border: 1px solid var(--color-subtle);
		color: var(--color-subtle);
		font-size: 10px;
		font-style: italic;
		font-family: Georgia, serif;
		line-height: 1;
		background: none;
		flex-shrink: 0;
	}

	.setting-hint-popover {
		background: var(--color-text);
		color: var(--color-bg);
		font-size: 12px;
		font-weight: 300;
		font-family: var(--font-ui);
		letter-spacing: 0.3px;
		line-height: 1.45;
		border-radius: 6px;
		padding: 8px 10px;
		box-shadow:
			0 8px 24px rgba(0, 0, 0, 0.25),
			0 2px 6px rgba(0, 0, 0, 0.15);
		z-index: 100;
		animation: setting-hint-in 120ms ease-out both;
	}

	.setting-hint-popover-above {
		animation-name: setting-hint-in-above;
	}

	@keyframes setting-hint-in {
		from {
			opacity: 0;
			transform: translateY(-3px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@keyframes setting-hint-in-above {
		from {
			opacity: 0;
			transform: translateY(3px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
</style>
