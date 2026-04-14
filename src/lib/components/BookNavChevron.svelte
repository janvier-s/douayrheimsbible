<script lang="ts">
	export let direction: 'prev' | 'next';
</script>

<!--
  Double chevron for book navigation (« prev book / next book »).
  Distinguishes book jumps from single-step chapter navigation.
-->
<svg
	width="15"
	height="15"
	viewBox="0 0 15 15"
	fill="none"
	stroke="currentColor"
	stroke-width="1.6"
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"
>
	{#if direction === 'prev'}
		<polyline points="11,2.5 7,7.5 11,12.5" />
		<polyline points="6.5,2.5 2.5,7.5 6.5,12.5" />
	{:else}
		<polyline points="4,2.5 8,7.5 4,12.5" />
		<polyline points="8.5,2.5 12.5,7.5 8.5,12.5" />
	{/if}
</svg>
