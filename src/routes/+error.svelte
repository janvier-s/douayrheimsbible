<script lang="ts">
	import { page } from '$app/stores';
</script>

<svelte:head>
	<title>Error — Douay-Rheims Bible</title>
</svelte:head>

<main class="min-h-[80vh] flex flex-col items-center justify-center px-md font-ui text-center">
	<p class="text-[11px] uppercase tracking-[0.3em] text-subtle mb-[18px]">
		{$page.status === 404 ? 'Page not found' : 'Error'}
	</p>
	<h1 class="font-reader text-[6rem] leading-none text-foreground mb-[24px] tracking-[-0.02em]">
		{$page.status}
	</h1>
	<p class="text-muted text-[18px] leading-relaxed mb-[40px] max-w-sm">
		{$page.status === 404
			? "This page doesn't exist."
			: ($page.error?.message ?? 'Something went wrong.')}
	</p>
	<a
		href="/odr/genesis/1"
		class="inline-flex items-center gap-[6px] px-[20px] py-[10px] border border-border rounded-[3px] text-[14px] text-muted hover:text-interactive hover:border-interactive transition-colors duration-fast"
	>
		← Return to Genesis 1
	</a>
</main>
