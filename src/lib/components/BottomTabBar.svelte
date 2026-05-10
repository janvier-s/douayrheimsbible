<script lang="ts">
	export let modeItems: Array<{ key: string; label: string }>;
	export let activeModeIdx: number;
	export let pendingIdx: number;
	export let selectMode: (key: string, index: number) => void;
</script>

<nav
	class="md:hidden fixed bottom-0 inset-x-0 z-[56] bg-glass backdrop-blur-sm border-t border-border font-ui"
	style="padding-bottom: env(safe-area-inset-bottom);"
	aria-label="Main navigation"
>
	<div class="flex" style="height: 56px;">
		{#each modeItems as item, i}
			<button
				class="flex-1 flex flex-col items-center justify-center gap-[3px] transition-colors duration-fast
                {pendingIdx === i || (pendingIdx === -1 && activeModeIdx === i)
					? 'text-accent'
					: 'text-subtle hover:text-foreground'}"
				aria-label={item.label}
				aria-pressed={activeModeIdx === i}
				on:click={() => selectMode(item.key, i)}
			>
				{#if item.key === 'reading'}
					<svg
						width="18"
						height="18"
						viewBox="0 0 18 18"
						fill="none"
						stroke="currentColor"
						stroke-width="1.5"
						stroke-linecap="round"
						stroke-linejoin="round"
						aria-hidden="true"
					>
						<rect x="3" y="2" width="12" height="14" rx="1.5" />
						<line x1="6" y1="6" x2="12" y2="6" />
						<line x1="6" y1="9" x2="12" y2="9" />
						<line x1="6" y1="12" x2="9" y2="12" />
					</svg>
				{:else if item.key === 'study'}
					<svg
						width="18"
						height="18"
						viewBox="0 0 18 18"
						fill="none"
						stroke="currentColor"
						stroke-width="1.3"
						stroke-linecap="round"
						stroke-linejoin="round"
						aria-hidden="true"
					>
						<path
							d="M9 4C7.5 3 5.5 2.5 3 3v11c2.5-.5 4.5 0 6 1m0-11c1.5-1 3.5-1.5 6-1v11c-2.5-.5-4.5 0-6 1"
						/>
						<line x1="9" y1="6" x2="9" y2="11" />
						<line x1="7" y1="8" x2="11" y2="8" />
					</svg>
				{:else if item.key === 'fathers'}
					<svg
						width="18"
						height="18"
						viewBox="0 0 18 18"
						fill="none"
						stroke="currentColor"
						stroke-width="1.4"
						stroke-linecap="round"
						stroke-linejoin="round"
						aria-hidden="true"
					>
						<circle cx="9" cy="5" r="2.2" />
						<path d="M4.5 15c0-2.4 2-4.2 4.5-4.2s4.5 1.8 4.5 4.2" />
						<line x1="9" y1="2" x2="9" y2="3.2" />
						<line x1="7.8" y1="2.6" x2="10.2" y2="2.6" />
					</svg>
				{:else if item.key === 'compare'}
					<svg
						width="18"
						height="18"
						viewBox="0 0 18 18"
						fill="none"
						stroke="currentColor"
						stroke-width="1.5"
						stroke-linecap="round"
						stroke-linejoin="round"
						aria-hidden="true"
					>
						<rect x="2" y="3" width="5.5" height="12" rx="1" />
						<rect x="10.5" y="3" width="5.5" height="12" rx="1" />
					</svg>
				{/if}
				<span class="text-[8px] uppercase tracking-[0.1em] font-medium">{item.label}</span>
			</button>
		{/each}
		<!-- Search tab -->
		<a
			href="/search"
			class="flex-1 flex flex-col items-center justify-center gap-[3px] transition-colors duration-fast
		    text-subtle hover:text-foreground"
			aria-label="Search"
		>
			<svg
				width="18"
				height="18"
				viewBox="0 0 18 18"
				fill="none"
				stroke="currentColor"
				stroke-width="1.5"
				stroke-linecap="round"
				aria-hidden="true"
			>
				<circle cx="8" cy="8" r="5.5" />
				<line x1="12" y1="12" x2="16" y2="16" />
			</svg>
			<span class="text-[8px] uppercase tracking-[0.1em] font-medium">Search</span>
		</a>
	</div>
</nav>
