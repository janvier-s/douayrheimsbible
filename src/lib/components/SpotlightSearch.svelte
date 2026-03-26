<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { goto } from '$app/navigation';
	import { parseReference } from '$lib/search/reference';
	import { resolveReference } from '$lib/search/resolve';

	export let open = false;

	let inputEl: HTMLInputElement;
	let value = '';

	$: if (open) {
		value = '';
		// Defer focus so the element is in the DOM
		setTimeout(() => inputEl?.focus(), 30);
	}

	function close() {
		open = false;
	}

	async function handleSubmit() {
		const trimmed = value.trim();
		if (!trimmed) return;
		const parsed = parseReference(trimmed);
		if (parsed) {
			const resolved = resolveReference(parsed);
			if (resolved) {
				close();
				goto(resolved.url);
				return;
			}
		}
		close();
		goto(`/search?q=${encodeURIComponent(trimmed)}`);
	}

	function handleBackdropKey(e: KeyboardEvent) {
		if (e.key === 'Escape') close();
	}

	function handleInputKey(e: KeyboardEvent) {
		if (e.key === 'Escape') close();
	}
</script>

<svelte:window
	on:keydown={(e) => {
		if (open && e.key === 'Escape') close();
		if (!open && (e.key === '/' || ((e.metaKey || e.ctrlKey) && e.key === 'k'))) {
			e.preventDefault();
			open = true;
		}
	}}
/>

{#if open}
	<!-- Backdrop -->
	<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
	<div
		role="presentation"
		class="spotlight-backdrop"
		in:fade={{ duration: 160 }}
		out:fade={{ duration: 120 }}
		on:click={close}
		on:keydown={handleBackdropKey}
	></div>

	<!-- Panel -->
	<div
		class="spotlight-panel"
		in:fly={{ y: -10, duration: 200, easing: cubicOut }}
		out:fly={{ y: -6, duration: 130, easing: cubicOut }}
	>
		<form on:submit|preventDefault={handleSubmit} class="spotlight-form">
			<!-- Search icon -->
			<svg
				class="spotlight-icon"
				viewBox="0 0 20 20"
				fill="none"
				stroke="currentColor"
				stroke-width="1.7"
				stroke-linecap="round"
			>
				<circle cx="8.5" cy="8.5" r="5.5" />
				<line x1="13" y1="13" x2="18" y2="18" />
			</svg>

			<input
				bind:this={inputEl}
				bind:value
				type="text"
				placeholder="Go to verse — e.g. Matthew 16:18 or Genesis 1"
				class="spotlight-input"
				on:keydown={handleInputKey}
				autocomplete="off"
				autocorrect="off"
				autocapitalize="off"
				spellcheck="false"
			/>

			<!-- Keyboard hints -->
			<div class="spotlight-hints">
				<kbd>↵</kbd>
				<span class="spotlight-divider"></span>
				<kbd>esc</kbd>
			</div>
		</form>
	</div>
{/if}

<style>
	.spotlight-backdrop {
		position: fixed;
		inset: 0;
		z-index: 200;
		background: rgba(0, 0, 0, 0.52);
		backdrop-filter: blur(3px);
		-webkit-backdrop-filter: blur(3px);
	}

	.spotlight-panel {
		position: fixed;
		z-index: 201;
		top: 74px;
		left: 50%;
		transform: translateX(-50%);
		width: min(600px, 92vw);
		background: var(--color-panel);
		border: 1px solid var(--color-border);
		border-radius: 6px;
		box-shadow:
			0 20px 60px rgba(0, 0, 0, 0.25),
			0 4px 16px rgba(0, 0, 0, 0.12);
		overflow: hidden;
	}

	.spotlight-form {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 0 14px;
		height: 54px;
	}

	.spotlight-icon {
		width: 18px;
		height: 18px;
		flex-shrink: 0;
		color: var(--color-subtle);
	}

	.spotlight-input {
		flex: 1;
		background: transparent;
		border: none;
		outline: none;
		font-family: var(--font-ui);
		font-size: 15px;
		font-weight: 300;
		color: var(--color-text);
		caret-color: var(--color-accent);
		min-width: 0;
	}

	.spotlight-input::placeholder {
		color: color-mix(in srgb, var(--color-subtle) 55%, transparent);
		font-weight: 300;
	}

	.spotlight-hints {
		display: flex;
		align-items: center;
		gap: 6px;
		flex-shrink: 0;
	}

	kbd {
		font-family: var(--font-ui);
		font-size: 10px;
		font-weight: 400;
		color: var(--color-subtle);
		background: color-mix(in srgb, var(--color-border) 60%, transparent);
		border: 1px solid var(--color-border);
		border-radius: 3px;
		padding: 2px 6px;
		letter-spacing: 0.02em;
	}

	.spotlight-divider {
		display: block;
		width: 1px;
		height: 12px;
		background: var(--color-border);
	}
</style>
