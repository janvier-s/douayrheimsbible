<script lang="ts">
	import { onMount } from 'svelte';
	import { offline } from '$lib/stores/offline';

	onMount(() => {
		offline.init();
	});
</script>

{#if $offline.status === 'checking'}
	<div class="offline-card">
		<p class="offline-note">Checking offline status&hellip;</p>
	</div>
{:else if $offline.status === 'unavailable'}
	<!-- Browser doesn't support service workers — hide silently -->
{:else if $offline.status === 'not-downloaded'}
	<div class="offline-card">
		<p class="offline-heading">Read offline</p>
		<p class="offline-desc">
			Download the complete site for offline reading, including all translations, annotations, and
			study notes. Approximately 8&nbsp;MB.
		</p>
		<button class="offline-btn" onclick={offline.startDownload}>Download for offline use</button>
	</div>
{:else if $offline.status === 'downloading'}
	<div class="offline-card">
		<p class="offline-heading">Downloading&hellip;</p>
		<div class="progress-track">
			<div class="progress-fill" style="width: {$offline.progress}%"></div>
		</div>
		<p class="offline-note">
			{$offline.progress}%
			{#if $offline.total > 0}
				&middot; {$offline.current.toLocaleString()} / {$offline.total.toLocaleString()} files
			{/if}
		</p>
	</div>
{:else if $offline.status === 'complete'}
	<div class="offline-card offline-complete">
		<p class="offline-heading">
			<span class="offline-check" aria-hidden="true">&#10003;</span> Available offline
		</p>
		<p class="offline-note">
			All content has been downloaded. You can read without an internet connection.
		</p>
	</div>
{:else if $offline.status === 'error'}
	<div class="offline-card">
		<p class="offline-error">{$offline.error}</p>
		<button class="offline-btn" onclick={offline.startDownload}>Retry download</button>
	</div>
{/if}

<style>
	.offline-card {
		border: 1px solid var(--color-border);
		border-radius: 4px;
		padding: 20px 24px;
		background: var(--color-panel);
	}

	.offline-complete {
		border-color: color-mix(in srgb, var(--color-accent) 40%, var(--color-border));
	}

	.offline-heading {
		font-family: var(--font-ui);
		font-size: 14px;
		font-weight: 600;
		color: var(--color-text);
		margin: 0 0 8px;
	}

	.offline-desc {
		font-family: var(--font-ui);
		font-size: 14px;
		color: var(--color-muted);
		line-height: 1.55;
		margin: 0 0 16px;
	}

	.offline-note {
		font-family: var(--font-ui);
		font-size: 12px;
		color: var(--color-subtle);
		margin: 0;
	}

	.offline-error {
		font-family: var(--font-ui);
		font-size: 13px;
		color: #c0392b;
		margin: 0 0 12px;
	}

	.offline-check {
		color: var(--color-accent);
		margin-right: 4px;
	}

	.offline-btn {
		display: inline-flex;
		align-items: center;
		padding: 8px 18px;
		border: 1px solid var(--color-subtle);
		border-radius: 3px;
		background: transparent;
		font-family: var(--font-ui);
		font-size: 12px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.14em;
		color: var(--color-text);
		cursor: pointer;
		transition:
			background 150ms ease,
			border-color 150ms ease;
	}

	.offline-btn:hover {
		border-color: var(--color-muted);
		background: color-mix(in srgb, var(--color-subtle) 15%, transparent);
	}

	.progress-track {
		width: 100%;
		height: 4px;
		background: var(--color-border);
		border-radius: 2px;
		overflow: hidden;
		margin: 12px 0 8px;
	}

	.progress-fill {
		height: 100%;
		background: var(--color-accent);
		border-radius: 2px;
		transition: width 300ms ease;
	}
</style>
