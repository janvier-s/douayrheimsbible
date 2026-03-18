<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	onMount(() => goto('/odr/genesis/1', { replaceState: true }));
</script>
