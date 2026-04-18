<script lang="ts">
	import { onMount } from 'svelte';
	import { offline } from '$lib/stores/offline';
	import { fade } from 'svelte/transition';

	let show = false;
	let dismissed = false;

	onMount(() => {
		// Only show in installed PWA mode
		const isStandalone =
			window.matchMedia('(display-mode: standalone)').matches ||
			(navigator as any).standalone === true;

		if (!isStandalone) return;
		if (localStorage.getItem('install-banner-dismissed')) return;

		offline.init();

		const unsub = offline.subscribe((state) => {
			if (state.status === 'not-downloaded') {
				show = true;
			} else if (state.status === 'complete' || state.status === 'unavailable') {
				show = false;
			}
		});

		return unsub;
	});

	function dismiss() {
		dismissed = true;
		localStorage.setItem('install-banner-dismissed', '1');
		setTimeout(() => (show = false), 200);
	}
</script>

{#if show && !dismissed}
	<div class="install-banner" transition:fade={{ duration: 160 }}>
		<p class="install-text">
			<strong>You're using the app!</strong> Download the full text for offline reading so the Bible is
			always available, even without a connection.
		</p>
		<div class="install-actions">
			<a href="/download" class="install-link">Go to Downloads</a>
			<button class="install-dismiss" on:click={dismiss}>
				Not now
				<span class="install-hint"
					>You can always download later from the <a href="/download" class="install-hint-link"
						>Downloads</a
					> page.</span
				>
			</button>
		</div>
	</div>
{/if}

<style>
	.install-banner {
		position: fixed;
		bottom: calc(env(safe-area-inset-bottom, 0px) + 64px);
		left: 12px;
		right: 12px;
		max-width: 420px;
		margin: 0 auto;
		padding: 16px 20px;
		background: var(--color-panel);
		border: 1px solid var(--color-border);
		border-radius: 6px;
		box-shadow: 0 4px 24px rgba(0, 0, 0, 0.12);
		z-index: 900;
	}

	.install-text {
		font-family: var(--font-ui);
		font-size: 13px;
		line-height: 1.5;
		color: var(--color-text);
		margin: 0 0 12px;
	}

	.install-text strong {
		font-weight: 600;
	}

	.install-actions {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.install-link {
		display: inline-flex;
		align-items: center;
		padding: 7px 16px;
		border: 1px solid var(--color-accent);
		border-radius: 3px;
		background: var(--color-accent);
		font-family: var(--font-ui);
		font-size: 12px;
		font-weight: 600;
		letter-spacing: 0.04em;
		color: var(--color-bg);
		text-decoration: none;
		cursor: pointer;
		transition:
			background 150ms ease,
			border-color 150ms ease;
	}

	.install-link:hover {
		background: color-mix(in srgb, var(--color-accent) 85%, black);
		border-color: color-mix(in srgb, var(--color-accent) 85%, black);
		text-decoration: none;
	}

	.install-dismiss {
		padding: 7px 12px;
		border: none;
		border-radius: 3px;
		background: transparent;
		font-family: var(--font-ui);
		font-size: 12px;
		font-weight: 500;
		color: var(--color-subtle);
		cursor: pointer;
		transition: color 150ms ease;
		text-align: left;
	}

	.install-dismiss:hover {
		color: var(--color-text);
	}

	.install-hint {
		display: block;
		font-size: 10px;
		font-weight: 400;
		color: var(--color-subtle);
		margin-top: 2px;
	}

	.install-hint-link {
		color: var(--color-subtle);
		text-decoration: underline;
	}

	.install-hint-link:hover {
		color: var(--color-text);
	}

	@media (max-width: 767px) {
		.install-banner {
			bottom: calc(env(safe-area-inset-bottom, 0px) + 72px);
			left: 8px;
			right: 8px;
		}
	}
</style>
