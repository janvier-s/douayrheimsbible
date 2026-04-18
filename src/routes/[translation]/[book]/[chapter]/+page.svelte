<script lang="ts">
	import type { PageData } from './$types';
	import BibleReader from '$lib/components/BibleReader.svelte';
	import { prefs } from '$lib/stores/prefs';

	export let data: PageData;

	$: bookDisplayName = $prefs.modernBookNames ? data.bookMeta.modernName : data.bookMeta.odrName;
</script>

<svelte:head>
	<title
		>{data.bookMeta.odrName}
		{data.chapter?.chapter ?? ''} — {data.translationId.toUpperCase()}</title
	>
</svelte:head>

{#if data.ntOnly}
	<div class="nt-only-notice">
		<div class="notice-card">
			<span class="notice-icon" aria-hidden="true">✦</span>
			<h2 class="notice-title">Book Not Available</h2>
			<p class="notice-body">
				<strong>{bookDisplayName}</strong> is an Old Testament book. The {data.translationLabel} only
				covers the New Testament.
			</p>
			<div class="notice-actions">
				<a href="/odr/{data.bookMeta.slug}/1" class="notice-btn notice-btn-secondary">
					Read in Original Douay-Rheims
				</a>
				<a href="/{data.translationId}/matthew/1" class="notice-btn notice-btn-primary">
					Go to Matthew 1
				</a>
			</div>
		</div>
	</div>
{:else if data.chapter}
	{#key `${data.translationId}-${data.bookMeta.slug}-${data.chapter.chapter}`}
		<div>
			<BibleReader
				initialBookMeta={data.bookMeta}
				initialChapter={data.chapter}
				initialTotalChapters={data.totalChapters}
				routeBase={`/${data.translationId}`}
				translationId={data.translationId}
			/>
		</div>
	{/key}
{/if}

<style>
	.nt-only-notice {
		display: flex;
		justify-content: center;
		align-items: center;
		min-height: 60vh;
		padding: 40px 20px;
	}

	.notice-card {
		max-width: 440px;
		text-align: center;
		font-family: var(--font-ui);
	}

	.notice-icon {
		font-size: 20px;
		color: var(--color-accent);
		display: block;
		margin-bottom: 16px;
	}

	.notice-title {
		font-size: 22px;
		font-weight: 600;
		color: var(--color-text);
		margin: 0 0 12px;
	}

	.notice-body {
		font-size: 15px;
		line-height: 1.6;
		color: var(--color-subtle);
		margin: 0 0 28px;
	}

	.notice-actions {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.notice-btn {
		display: block;
		padding: 12px 20px;
		border-radius: 4px;
		font-size: 14px;
		font-weight: 500;
		text-decoration: none;
		text-align: center;
		transition:
			background-color 150ms ease,
			color 150ms ease;
	}

	.notice-btn-primary {
		background: var(--color-accent);
		color: white;
	}

	.notice-btn-primary:hover {
		background: color-mix(in srgb, var(--color-accent) 85%, black);
	}

	.notice-btn-secondary {
		background: color-mix(in srgb, var(--color-accent) 8%, transparent);
		color: var(--color-accent);
	}

	.notice-btn-secondary:hover {
		background: color-mix(in srgb, var(--color-accent) 15%, transparent);
	}
</style>
