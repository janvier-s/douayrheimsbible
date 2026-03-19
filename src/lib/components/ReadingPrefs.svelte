<script lang="ts">
	import { onMount } from 'svelte';
	import { prefs } from '$lib/stores/prefs';

	const FONTS = [
		{
			id: 'libre-baskerville',
			label: 'Libre Baskerville',
			stack: "'Libre Baskerville', Georgia, serif",
			gfUrl:
				'https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&display=swap'
		},
		{ id: 'sentinel', label: 'Sentinel', stack: "'Sentinel', Georgia, serif" },
		{
			id: 'source-serif-4',
			label: 'Source Serif 4',
			stack: "'Source Serif 4', Georgia, serif",
			gfUrl:
				'https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,wght@0,400;0,700;1,400&display=swap'
		},
		{ id: 'verdana', label: 'Verdana', stack: 'Verdana, Geneva, sans-serif' },
		{
			id: 'libre-franklin',
			label: 'Libre Franklin',
			stack: "'Libre Franklin', sans-serif",
			gfUrl:
				'https://fonts.googleapis.com/css2?family=Libre+Franklin:ital,wght@0,400;0,700;1,400&display=swap'
		},
		{ id: 'lexend', label: 'Lexend', stack: "'Lexend', sans-serif" }
	];

	const THEMES = [
		{ id: 'light', label: 'Light', bg: '#f8f5ef', fg: '#1c1710', lines: '#c8bfb0' },
		{ id: 'sepia', label: 'Sepia', bg: '#f2e8d8', fg: '#2c1e10', lines: '#c0a888' },
		{ id: 'dark', label: 'Dark', bg: '#111113', fg: '#e8ddd0', lines: '#2e2b32' },
		{ id: 'oled', label: 'OLED', bg: '#000000', fg: '#e0e0e0', lines: '#2a2a2a' }
	];

	let currentTheme = 'auto';
	let fontDropdownOpen = false;

	$: activeFontId = $prefs.dyslexiaFont ? 'grace' : $prefs.fontFamily;
	$: activeFont = FONTS.find((f) => f.id === activeFontId);
	$: activeFontStack =
		activeFontId === 'grace' ? "'Grace Dyslexic MD', sans-serif" : (activeFont?.stack ?? 'inherit');

	onMount(() => {
		currentTheme = document.documentElement.getAttribute('data-theme') ?? 'auto';
	});

	function setTheme(id: string) {
		currentTheme = id;
		document.documentElement.setAttribute('data-theme', id);
		localStorage.setItem('theme', id);
	}

	function setFont(id: string) {
		const font = FONTS.find((f) => f.id === id);
		if (!font) return;
		prefs.update((p) => ({ ...p, fontFamily: id }));
		document.documentElement.style.setProperty('--font-reader', font.stack);
		if ('gfUrl' in font && font.gfUrl && !document.querySelector(`link[data-gf="${id}"]`)) {
			const link = document.createElement('link');
			link.rel = 'stylesheet';
			link.href = font.gfUrl as string;
			link.dataset.gf = id;
			document.head.appendChild(link);
		}
	}

	function setDyslexia(on: boolean) {
		prefs.update((p) => ({ ...p, dyslexiaFont: on }));
		if (on) {
			document.documentElement.style.setProperty(
				'--font-reader',
				"'Grace Dyslexic MD', sans-serif"
			);
			document.documentElement.style.setProperty('--font-ui', "'Grace Dyslexic MD', sans-serif");
		} else {
			const font = FONTS.find((f) => f.id === $prefs.fontFamily);
			document.documentElement.style.setProperty('--font-reader', font?.stack ?? 'serif');
			document.documentElement.style.setProperty(
				'--font-ui',
				"'Gotham', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
			);
		}
	}
</script>

<div class="space-y-md text-sm font-ui">
	<label class="block">
		<span class="block mb-xs">Font size: {$prefs.fontSize}px</span>
		<input
			type="range"
			min="12"
			max="20"
			step="1"
			value={$prefs.fontSize}
			on:input={(e) => {
				const v = parseInt((e.target as HTMLInputElement).value);
				prefs.update((p) => ({ ...p, fontSize: v }));
				document.documentElement.style.setProperty('--font-size-reader', `${v}px`);
			}}
			class="w-full accent-interactive"
		/>
	</label>

	<div>
		<span class="block mb-xs">Line spacing</span>
		<div class="flex gap-xs">
			{#each [{ label: 'Tight', value: 1.5 }, { label: 'Default', value: 1.8 }, { label: 'Wide', value: 2.0 }] as opt}
				<button
					class="flex-1 py-xs border rounded-sm text-xs font-light transition-colors duration-fast
						{$prefs.lineHeight === opt.value
						? 'bg-interactive text-white border-interactive'
						: 'border-border text-muted hover:text-foreground'}"
					on:click={() => {
						prefs.update((p) => ({ ...p, lineHeight: opt.value }));
						document.documentElement.style.setProperty('--line-height-reader', String(opt.value));
					}}
				>
					{opt.label}
				</button>
			{/each}
		</div>
	</div>

	<div class="relative">
		<span class="block mb-xs">Font</span>
		<button
			class="w-full border border-border rounded-sm px-sm py-[7px] bg-background text-foreground text-left flex items-center justify-between text-[14px] font-medium"
			style="font-family: {activeFontStack};"
			on:click={() => (fontDropdownOpen = !fontDropdownOpen)}
		>
			<span>{activeFontId === 'grace' ? 'Grace Dyslexic MD' : (activeFont?.label ?? '')}</span>
			<span class="text-[10px] text-subtle font-ui">{fontDropdownOpen ? '▲' : '▼'}</span>
		</button>
		{#if fontDropdownOpen}
			<div
				class="absolute left-0 right-0 top-[calc(100%+2px)] bg-panel border border-border rounded-sm shadow-lg z-10 overflow-hidden"
			>
				{#each FONTS as f}
					<button
						class="w-full text-left px-sm py-[9px] text-[14px] font-medium hover:bg-interactive hover:text-white transition-colors duration-fast
							{activeFontId === f.id ? 'text-interactive' : 'text-foreground'}"
						style="font-family: {f.stack};"
						on:click={() => {
							setDyslexia(false);
							setFont(f.id);
							fontDropdownOpen = false;
						}}
					>
						{f.label}
					</button>
				{/each}
				<button
					class="w-full text-left px-sm py-[9px] text-[14px] font-medium hover:bg-interactive hover:text-white transition-colors duration-fast border-t border-border
						{activeFontId === 'grace' ? 'text-interactive' : 'text-foreground'}"
					style="font-family: 'Grace Dyslexic MD', sans-serif;"
					on:click={() => {
						setDyslexia(true);
						fontDropdownOpen = false;
					}}
				>
					Grace Dyslexic MD
				</button>
			</div>
		{/if}
	</div>

	<!-- ESV-style theme cards -->
	<div>
		<span class="block mb-xs">Theme</span>
		<div class="flex gap-[6px]">
			{#each THEMES as t}
				<button
					title={t.label}
					on:click={() => setTheme(t.id)}
					class="theme-card flex-1 rounded-[4px] border-2 transition-colors duration-fast overflow-hidden
						{currentTheme === t.id ? 'border-interactive' : 'border-transparent'}"
					style="background: {t.bg};"
				>
					<div class="theme-card-inner p-[7px]">
						<div class="flex items-baseline gap-[3px] mb-[5px]">
							<span class="font-reader text-[15px] leading-none font-bold" style="color: {t.fg};"
								>A</span
							>
							<span
								class="block h-[1.5px] flex-1 rounded-full"
								style="background: {t.fg}; opacity: 0.5;"
							></span>
						</div>
						<div class="space-y-[3px]">
							<span class="block h-[1.5px] rounded-full" style="background: {t.lines};"></span>
							<span class="block h-[1.5px] rounded-full" style="background: {t.lines};"></span>
							<span class="block h-[1.5px] w-[70%] rounded-full" style="background: {t.lines};"
							></span>
						</div>
					</div>
				</button>
			{/each}
		</div>
	</div>

	<label class="flex items-center gap-sm cursor-pointer">
		<input
			type="checkbox"
			checked={$prefs.showVerseNumbers}
			on:change={(e) =>
				prefs.update((p) => ({
					...p,
					showVerseNumbers: (e.target as HTMLInputElement).checked
				}))}
			class="accent-interactive"
		/>
		<span>Verse numbers</span>
	</label>

	<label class="flex items-center gap-sm cursor-pointer">
		<input
			type="checkbox"
			checked={$prefs.justifiedText}
			on:change={(e) =>
				prefs.update((p) => ({ ...p, justifiedText: (e.target as HTMLInputElement).checked }))}
			class="accent-interactive"
		/>
		<span>Justified text</span>
	</label>

	<label class="flex items-center gap-sm cursor-pointer">
		<input
			type="checkbox"
			checked={$prefs.paragraphView}
			on:change={(e) =>
				prefs.update((p) => ({ ...p, paragraphView: (e.target as HTMLInputElement).checked }))}
			class="accent-interactive"
		/>
		<span>Paragraph view</span>
	</label>

	<label class="flex items-center gap-sm cursor-pointer">
		<input
			type="checkbox"
			checked={$prefs.infiniteScroll}
			on:change={(e) =>
				prefs.update((p) => ({ ...p, infiniteScroll: (e.target as HTMLInputElement).checked }))}
			class="accent-interactive"
		/>
		<span>Infinite scroll</span>
	</label>

	<label class="flex items-center gap-sm cursor-pointer">
		<input
			type="checkbox"
			checked={$prefs.bionicReading}
			on:change={(e) =>
				prefs.update((p) => ({ ...p, bionicReading: (e.target as HTMLInputElement).checked }))}
			class="accent-interactive"
		/>
		<span>Bionic Reading</span>
	</label>
</div>

<style>
	.theme-card {
		aspect-ratio: 3 / 4;
	}
	.theme-card-inner {
		height: 100%;
		display: flex;
		flex-direction: column;
		justify-content: center;
	}
</style>
