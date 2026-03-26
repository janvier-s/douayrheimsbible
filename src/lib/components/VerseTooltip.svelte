<script lang="ts">
	import { fade } from 'svelte/transition';

	export let verseNum: number;
	export let verseText: string;
	export let anchorX: number;
	export let anchorY: number;

	let windowWidth = 1024;

	// Clamp so the tooltip never bleeds off screen edges
	$: left = Math.min(Math.max(anchorX, 170), windowWidth - 170);
</script>

<svelte:window bind:innerWidth={windowWidth} />

<div
	class="tooltip"
	style="left: {left}px; top: {anchorY}px;"
	transition:fade={{ duration: 140 }}
	role="tooltip"
	on:mouseover
	on:mouseout
>
	<!-- Top rule -->
	<div class="rule"></div>

	<!-- Header: label + verse number -->
	<div class="header">
		<span class="verse-label">
			<span class="sigil">verse</span>
			<span class="verse-num">{verseNum}</span>
		</span>
	</div>

	<!-- Separator -->
	<div class="sep"></div>

	<!-- Verse text -->
	<p class="verse-text">{verseText}</p>

	<!-- Nib pointing down toward the reference -->
	<div class="nib" aria-hidden="true"></div>
</div>

<style>
	.tooltip {
		position: fixed;
		z-index: 9999;
		transform: translateX(-50%) translateY(calc(-100% - 14px));
		width: 300px;
		background: var(--color-panel);
		border: 1px solid var(--color-border);
		padding: 0 0 14px;
		pointer-events: auto;
		box-shadow:
			0 2px 0 color-mix(in srgb, var(--color-accent) 20%, transparent),
			0 8px 24px color-mix(in srgb, var(--color-foreground) 18%, transparent),
			0 2px 6px color-mix(in srgb, var(--color-foreground) 10%, transparent);
	}

	/* Crimson top rule */
	.rule {
		height: 2px;
		background: var(--color-accent);
		margin-bottom: 10px;
	}

	.header {
		display: flex;
		justify-content: center;
		padding: 0 14px;
		margin-bottom: 8px;
	}

	.verse-label {
		display: flex;
		align-items: baseline;
		gap: 5px;
	}

	.sigil {
		font-family: var(--font-ui);
		font-size: 9px;
		letter-spacing: 0.22em;
		color: var(--color-accent);
		font-weight: 600;
	}

	.verse-num {
		font-family: var(--font-reader);
		font-size: 12px;
		color: var(--color-accent);
		font-weight: 700;
		letter-spacing: 0.02em;
	}

	.sep {
		height: 1px;
		background: var(--color-border);
		margin: 0 14px 12px;
		opacity: 0.6;
	}

	.verse-text {
		font-family: var(--font-reader);
		font-size: 13.5px;
		font-style: italic;
		line-height: 1.65;
		color: var(--color-foreground);
		padding: 0 14px;
		margin: 0;
	}

	/* Downward-pointing nib connecting to the verse ref */
	.nib {
		position: absolute;
		bottom: -6px;
		left: 50%;
		transform: translateX(-50%);
		width: 10px;
		height: 6px;
		background: var(--color-panel);
		clip-path: polygon(0 0, 100% 0, 50% 100%);
		border-bottom: none;
	}

	/* Nib border — rendered as a pseudo-element behind */
	.tooltip::after {
		content: '';
		position: absolute;
		bottom: -7px;
		left: 50%;
		transform: translateX(-50%);
		width: 12px;
		height: 7px;
		background: var(--color-border);
		clip-path: polygon(0 0, 100% 0, 50% 100%);
		z-index: -1;
	}
</style>
