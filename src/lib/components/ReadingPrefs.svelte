<script lang="ts">
	import { onMount } from 'svelte';
	import { prefs } from '$lib/stores/prefs';

	const FONTS = [
		{ id: 'fs-brabo-pro', label: 'FS Brabo Pro', stack: "'FS Brabo Pro', Georgia, serif" },
		{
			id: 'libre-baskerville',
			label: 'Libre Baskerville',
			stack: "'Libre Baskerville', Georgia, serif",
			gfUrl:
				'https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&display=swap'
		},
		{
			id: 'linux-libertine',
			label: 'Linux Libertine',
			stack: "'Linux Libertine', 'Linux Libertine O', Georgia, serif",
			gfUrl: 'https://fonts.bunny.net/css?family=linux-libertine:400,400i,700,700i&display=swap'
		},
		{
			id: 'atkinson-hyperlegible',
			label: 'Atkinson Hyperlegible',
			stack: "'Atkinson Hyperlegible', sans-serif",
			gfUrl:
				'https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400&display=swap'
		},
		{ id: 'inter', label: 'Inter', stack: "'Inter', sans-serif" },
		{ id: 'lexend', label: 'Lexend', stack: "'Lexend', sans-serif" }
	];

	const THEMES = [
		{ id: 'light', label: 'Light', bg: '#f6f1e8', fg: '#1c1710' },
		{ id: 'sepia', label: 'Sepia', bg: '#f2e8d8', fg: '#2c1e10' },
		{ id: 'dark', label: 'Dark', bg: '#1c1511', fg: '#e8ddd0' },
		{ id: 'oled', label: 'OLED', bg: '#000000', fg: '#e0e0e0' }
	];

	let currentTheme = 'light';
	let fontDropdownOpen = false;

	$: activeFontId = $prefs.dyslexiaFont ? 'grace' : $prefs.fontFamily;
	$: activeFont = FONTS.find((f) => f.id === activeFontId);
	$: activeFontStack =
		activeFontId === 'grace' ? "'Grace Dyslexic MD', sans-serif" : (activeFont?.stack ?? 'inherit');

	onMount(() => {
		currentTheme = document.documentElement.getAttribute('data-theme') ?? 'light';
	});

	function setTheme(id: string) {
		currentTheme = id;
		if (id === 'light') {
			document.documentElement.removeAttribute('data-theme');
		} else {
			document.documentElement.setAttribute('data-theme', id);
		}
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
		<span class="text-muted block mb-xs">Font size: {$prefs.fontSize}px</span>
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
		<span class="text-muted block mb-xs">Line spacing</span>
		<div class="flex gap-xs">
			{#each [{ label: 'Tight', value: 1.5 }, { label: 'Default', value: 1.8 }, { label: 'Wide', value: 2.0 }] as opt}
				<button
					class="flex-1 py-xs border rounded-sm text-xs transition-colors duration-fast
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
		<span class="text-muted block mb-xs">Font</span>
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

	<div>
		<span class="text-muted block mb-xs">Theme</span>
		<div class="flex gap-[6px]">
			{#each THEMES as t}
				<button
					title={t.label}
					on:click={() => setTheme(t.id)}
					style="background: {t.bg}; color: {t.fg};"
					class="flex-1 flex flex-col items-center justify-center gap-[4px] py-[10px] rounded-[3px] border-2 transition-colors duration-fast text-[11px] font-medium
						{currentTheme === t.id ? 'border-interactive' : 'border-transparent'}"
				>
					<span class="text-[18px] font-reader leading-none">Aa</span>
					{t.label}
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
		<span>Show verse numbers</span>
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
			disabled={$prefs.dyslexiaFont}
			on:change={(e) =>
				prefs.update((p) => ({ ...p, bionicReading: (e.target as HTMLInputElement).checked }))}
			class="accent-interactive"
		/>
		<span class:opacity-40={$prefs.dyslexiaFont}>Bionic Reading</span>
	</label>
</div>
