<script lang="ts">
	import { tick, createEventDispatcher } from 'svelte';

	export let items: { key: string; label: string }[];
	export let activeIndex: number;
	export let pendingIndex: number = -1;

	const dispatch = createEventDispatcher<{ select: { key: string; index: number } }>();

	$: displayIdx = pendingIndex >= 0 ? pendingIndex : activeIndex;

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
			on:click={() => dispatch('select', { key: item.key, index: i })}
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

	.mode-btn {
		font-family: var(--font-ui);
		letter-spacing: 0.04em;
		background: none;
		border: none;
		cursor: pointer;
	}
</style>
