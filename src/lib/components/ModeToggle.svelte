<script lang="ts">
	import { run } from 'svelte/legacy';

	import { tick, createEventDispatcher } from 'svelte';

	interface Props {
		items: { key: string; label: string }[];
		activeIndex: number;
		pendingIndex?: number;
	}

	let { items, activeIndex, pendingIndex = -1 }: Props = $props();

	const dispatch = createEventDispatcher<{ select: { key: string; index: number } }>();

	let displayIdx = $derived(pendingIndex >= 0 ? pendingIndex : activeIndex);

	let toggleEl: HTMLElement | undefined = $state();
	let pillLeft = $state(0);
	let pillWidth = $state(0);

	async function measurePill(idx: number) {
		await tick();
		if (!toggleEl) return;
		if (idx < 0) {
			pillWidth = 0;
			return;
		}
		const btns = toggleEl.querySelectorAll<HTMLElement>('.mode-btn');
		const btn = btns[idx];
		if (!btn) return;
		pillLeft = btn.offsetLeft;
		pillWidth = btn.offsetWidth;
	}

	run(() => {
		if (toggleEl) measurePill(displayIdx);
	});
</script>

<div
	bind:this={toggleEl}
	class="mode-toggle relative flex items-center text-[11px] font-medium shrink-0"
	role="group"
	aria-label="Reading mode"
>
	{#if pillWidth > 0}
		<div class="mode-pill" style="transform: translateX({pillLeft}px); width: {pillWidth}px;"></div>
	{/if}
	{#each items as item, i (item.key)}
		<button
			class="mode-btn relative z-10 px-[10px] py-[5px] transition-colors duration-fast whitespace-nowrap
				{displayIdx === i ? 'text-white' : 'text-subtle hover:text-foreground'}"
			aria-pressed={displayIdx === i}
			onclick={() => dispatch('select', { key: item.key, index: i })}
		>
			{item.label}
		</button>
	{/each}
</div>

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

	@media (prefers-reduced-motion: reduce) {
		.mode-pill {
			transition: none;
		}
	}

	.mode-btn {
		font-family: var(--font-ui);
		letter-spacing: 0.04em;
		background: none;
		border: none;
		cursor: pointer;
		outline: none;
	}

	.mode-btn:focus-visible {
		box-shadow: inset 0 0 0 2px var(--color-accent);
		border-radius: 3px;
	}
</style>
