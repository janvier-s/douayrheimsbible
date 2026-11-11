<script lang="ts">
	import ProseLayout from '$lib/components/ProseLayout.svelte';
	import { CHANGELOG } from '$lib/data/changelog';
</script>

<svelte:head>
	<title>Changelog · The Original Douay-Rheims Bible</title>
	<meta
		name="description"
		content="What has changed on The Original Douay-Rheims Bible site, release by release, from the first public build in March 2026."
	/>
	<link rel="canonical" href="https://thedouayrheims.com/changelog" />
	<meta property="og:type" content="website" />
	<meta property="og:title" content="Changelog" />
	<meta
		property="og:description"
		content="What has changed on The Original Douay-Rheims Bible site, release by release."
	/>
	<meta property="og:url" content="https://thedouayrheims.com/changelog" />
	<meta property="og:site_name" content="Douay-Rheims Bible" />
</svelte:head>

<ProseLayout title="Changelog" subtitle="What has changed on this site, release by release.">
	{#each CHANGELOG as entry (entry.version)}
		<h2>
			{entry.version === 'Beta' ? 'Beta' : `Version ${entry.version}`}
		</h2>
		<p class="release-date"><time datetime={entry.iso}>{entry.date}</time></p>
		<ul>
			{#each entry.changes as change}
				<li>{change}</li>
			{/each}
		</ul>
	{/each}
</ProseLayout>

<style>
	.release-date {
		margin-top: -0.5rem;
		opacity: 0.7;
		font-size: 0.9em;
	}
</style>
