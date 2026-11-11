<script lang="ts">
	import { onMount } from 'svelte';

	/**
	 * One popover for every `.clar` term in the page (see utils/clarifications.ts).
	 * Mounted once in the root layout and driven by delegated listeners, so it
	 * works the same with several chapters on screen. Opens on tap, click, Enter
	 * or Space; closes on outside tap, Escape, or scroll.
	 */
	interface Shown {
		term: string;
		latin: string;
		gloss: string;
		anchor: HTMLElement;
	}

	const WIDTH = 280;
	const GAP = 8;

	let shown: Shown | null = $state(null);
	let style = $state('');
	let above = $state(false);
	let box: HTMLDivElement | undefined = $state();

	function place(anchor: HTMLElement) {
		const r = anchor.getBoundingClientRect();
		const width = Math.min(WIDTH, window.innerWidth - 24);
		const left = Math.min(
			Math.max(r.left + r.width / 2 - width / 2, 12),
			window.innerWidth - width - 12
		);
		above = window.innerHeight - r.bottom < 150 && r.top > 150;
		style = above
			? `left:${left}px; bottom:${window.innerHeight - r.top + GAP}px; width:${width}px;`
			: `left:${left}px; top:${r.bottom + GAP}px; width:${width}px;`;
	}

	function open(el: HTMLElement) {
		if (shown?.anchor === el) return close();
		shown = {
			term: el.dataset.term ?? '',
			latin: el.dataset.latin ?? '',
			gloss: el.dataset.gloss ?? '',
			anchor: el
		};
		place(el);
	}

	function close() {
		shown = null;
	}

	onMount(() => {
		const onClick = (e: MouseEvent) => {
			const t = e.target as HTMLElement | null;
			const el = t?.closest?.('.clar') as HTMLElement | null;
			if (el) {
				e.stopPropagation();
				open(el);
			} else if (shown && !box?.contains(t as Node)) close();
		};
		const onKey = (e: KeyboardEvent) => {
			const t = e.target as HTMLElement | null;
			if (e.key === 'Escape' && shown) {
				const anchor = shown.anchor;
				close();
				anchor.focus();
			} else if ((e.key === 'Enter' || e.key === ' ') && t?.classList?.contains('clar')) {
				e.preventDefault();
				open(t);
			}
		};
		const onScroll = () => {
			if (shown) close();
		};
		// Capture, so a verse's own click handlers do not also fire on a term tap.
		document.addEventListener('click', onClick, true);
		document.addEventListener('keydown', onKey);
		document.addEventListener('scroll', onScroll, { capture: true, passive: true });
		window.addEventListener('resize', onScroll);
		return () => {
			document.removeEventListener('click', onClick, true);
			document.removeEventListener('keydown', onKey);
			document.removeEventListener('scroll', onScroll, true);
			window.removeEventListener('resize', onScroll);
		};
	});
</script>

{#if shown}
	<div
		bind:this={box}
		class="clar-popover"
		class:clar-popover-above={above}
		role="dialog"
		aria-label="Clarification of {shown.term}"
		style="position:fixed; {style}"
	>
		<div class="clar-head">
			<span class="clar-term">{shown.term}</span>
			<span class="clar-latin">{shown.latin}</span>
		</div>
		<div class="clar-gloss">{shown.gloss}</div>
	</div>
{/if}

<style>
	.clar-popover {
		background: var(--color-text);
		color: var(--color-bg);
		font-family: var(--font-ui);
		font-size: 13px;
		line-height: 1.5;
		letter-spacing: 0.2px;
		border-radius: 6px;
		padding: 9px 12px;
		box-shadow:
			0 8px 24px rgba(0, 0, 0, 0.25),
			0 2px 6px rgba(0, 0, 0, 0.15);
		z-index: 100;
		animation: clar-in 120ms ease-out both;
	}
	.clar-popover-above {
		animation-name: clar-in-above;
	}
	.clar-head {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.5em;
	}
	.clar-term {
		font-weight: 600;
	}
	.clar-latin {
		font-style: italic;
		opacity: 0.85;
	}
	.clar-gloss {
		margin-top: 2px;
		font-weight: 300;
	}
	@keyframes clar-in {
		from {
			opacity: 0;
			transform: translateY(-3px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
	@keyframes clar-in-above {
		from {
			opacity: 0;
			transform: translateY(3px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.clar-popover {
			animation: none;
		}
	}
</style>
