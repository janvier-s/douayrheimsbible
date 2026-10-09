<script lang="ts">
	import { fade } from 'svelte/transition';
	import { konamiUnlocked } from '$lib/stores/compare';

	const KONAMI_SEQUENCE = [
		'ArrowUp',
		'ArrowUp',
		'ArrowDown',
		'ArrowDown',
		'ArrowLeft',
		'ArrowRight',
		'ArrowLeft',
		'ArrowRight',
		'b',
		'a'
	];
	let konamiProgress = 0;
	let showUnlockToast = $state(false);
	let konamiToastUnlocked = $state(true);

	function toggleKonami() {
		konamiProgress = 0;
		const willUnlock = !$konamiUnlocked;
		konamiToastUnlocked = willUnlock;
		konamiUnlocked.update((v) => !v);
		showUnlockToast = true;

		if (willUnlock) {
			new Audio('/audio/konami_unlock.mp3').play().catch(() => {});
		} else {
			new Audio('/audio/konami_lock.mp3').play().catch(() => {});
		}

		setTimeout(() => (showUnlockToast = false), 4000);
	}

	export function onKonamiKeydown(e: KeyboardEvent) {
		if (e.key === KONAMI_SEQUENCE[konamiProgress]) {
			konamiProgress++;
			if (konamiProgress === KONAMI_SEQUENCE.length) {
				toggleKonami();
			}
		} else {
			konamiProgress = e.key === KONAMI_SEQUENCE[0] ? 1 : 0;
		}
	}

	import { onMount } from 'svelte';
	onMount(() => {
		const handler = () => toggleKonami();
		window.addEventListener('konamitoggle', handler);
		return () => window.removeEventListener('konamitoggle', handler);
	});
</script>

<svelte:window onkeydown={onKonamiKeydown} />

{#if showUnlockToast}
	<div
		class="unlock-toast"
		in:fade={{ duration: 200 }}
		out:fade={{ duration: 400 }}
		role="status"
		aria-live="polite"
	>
		<span class="unlock-icon" aria-hidden="true">✦</span>
		<div>
			<p class="unlock-title">
				{konamiToastUnlocked ? 'Translation unlocked' : 'Translation hidden'}
			</p>
			<p class="unlock-sub">
				{konamiToastUnlocked
					? 'RSV-2CE 2006 is now available in the translation selector'
					: 'RSV-2CE 2006 has been removed from the translation selector'}
			</p>
		</div>
	</div>
{/if}

<style>
	.unlock-toast {
		position: fixed;
		bottom: 32px;
		left: 50%;
		transform: translateX(-50%);
		z-index: 200;
		display: flex;
		align-items: center;
		gap: 14px;
		padding: 14px 22px;
		background: var(--color-panel);
		border: 1px solid var(--color-accent);
		border-radius: 4px;
		box-shadow: 0 4px 24px color-mix(in srgb, var(--color-accent) 20%, transparent);
		font-family: var(--font-ui);
		letter-spacing: 0.4px;
		white-space: nowrap;
	}

	.unlock-icon {
		font-size: 14px;
		color: var(--color-accent);
		flex-shrink: 0;
	}

	.unlock-title {
		font-size: 13px;
		font-weight: 600;
		color: var(--color-text);
		margin: 0;
	}

	.unlock-sub {
		font-size: 11px;
		color: var(--color-subtle);
		margin: 2px 0 0;
	}
</style>
