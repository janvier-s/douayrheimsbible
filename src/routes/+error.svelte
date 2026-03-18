<script lang="ts">
	import { page } from '$app/stores';
</script>

<svelte:head>
	<title>Error — ODR Bible</title>
</svelte:head>

<main class="max-w-[750px] mx-auto px-md py-2xl font-reader text-center">
	<h1 class="text-4xl mb-md">{$page.status}</h1>
	<p class="text-muted mb-xl">{$page.error?.message ?? 'Something went wrong.'}</p>
	<a href="/odr/genesis/1" class="text-interactive hover:underline font-ui text-sm">
		← Return to Genesis 1
	</a>
</main>
