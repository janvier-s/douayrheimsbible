<script lang="ts">
	import { onMount } from 'svelte';
	import { prefs } from '$lib/stores/prefs';
	import { FONTS, getFontById, isSansFont } from '$lib/data/fonts';

	export let compareMode = false;
	$: activeFontSize = compareMode ? $prefs.compareFontSize : $prefs.fontSize;

	const THEMES = [
		{ id: 'light', label: 'Light', bg: '#f8f5ef', fg: '#1c1710', lines: '#c8bfb0' },
		{ id: 'sepia', label: 'Sepia', bg: '#f2e8d8', fg: '#2c1e10', lines: '#c0a888' },
		{ id: 'dark', label: 'Dark', bg: '#111113', fg: '#e8ddd0', lines: '#2e2b32' },
		{ id: 'oled', label: 'OLED', bg: '#000000', fg: '#e0e0e0', lines: '#2a2a2a' }
	];

	let currentTheme = 'auto';
	let fontDropdownOpen = false;

	$: activeFontId = $prefs.dyslexiaFont ? 'grace' : $prefs.fontFamily;
	$: activeFont = getFontById(activeFontId);
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
		const font = getFontById(id);
		if (!font) return;
		prefs.update((p) => ({ ...p, fontFamily: id }));
		document.documentElement.style.setProperty('--font-reader', font.stack);
		if (font.gfUrl && !document.querySelector(`link[data-gf="${id}"]`)) {
			const link = document.createElement('link');
			link.rel = 'stylesheet';
			link.href = font.gfUrl;
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
			document.documentElement.style.setProperty('--bionic-bold-weight', '900');
		} else {
			const font = getFontById($prefs.fontFamily);
			document.documentElement.style.setProperty('--font-reader', font?.stack ?? 'serif');
			document.documentElement.style.setProperty(
				'--font-ui',
				"'Gotham', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
			);
			document.documentElement.style.setProperty(
				'--bionic-bold-weight',
				isSansFont($prefs.fontFamily) ? '900' : '700'
			);
		}
	}

	function setFontWithBionic(id: string) {
		setFont(id);
		const isSans = isSansFont(id);
		document.documentElement.style.setProperty('--bionic-bold-weight', isSans ? '900' : '700');
	}

	let activeTab: 'text' | 'reading' | 'verse' = 'text';
	let fontSectionEl: HTMLElement;
</script>

<div class="text-sm font-ui">
	<!-- Tab bar -->
	<div class="flex border-b border-border mb-md -mx-md px-md sticky top-0 z-10 bg-panel">
		{#each [{ id: 'text', label: 'Text' }, { id: 'reading', label: 'Reading' }, { id: 'verse', label: 'Verse' }] as tab}
			<button
				class="flex-1 py-[8px] text-[11px] uppercase tracking-[0.12em] font-semibold transition-colors duration-fast border-b-2 -mb-px
					{activeTab === tab.id
					? 'border-accent text-accent'
					: 'border-transparent text-subtle hover:text-foreground'}"
				on:click={() => (activeTab = tab.id as typeof activeTab)}
			>
				{tab.label}
			</button>
		{/each}
	</div>
	<!-- Text tab -->
	{#if activeTab === 'text'}
		<div class="space-y-[10px]">
			<label class="block">
				<span class="block mb-xs">Font size: {activeFontSize}px</span>
				<input
					type="range"
					min="12"
					max="20"
					step="1"
					value={activeFontSize}
					on:input={(e) => {
						const v = parseInt((e.target as HTMLInputElement).value);
						const key = compareMode ? 'compareFontSize' : 'fontSize';
						prefs.update((p) => ({ ...p, [key]: v }));
						document.documentElement.style.setProperty('--font-size-reader', `${v}px`);
					}}
					class="w-full accent-accent"
				/>
			</label>

			<div>
				<span class="block mb-xs">Line spacing</span>
				<div class="flex gap-xs">
					{#each [{ label: 'Tight', value: 1.5 }, { label: 'Default', value: 1.8 }, { label: 'Wide', value: 2.0 }] as opt}
						<button
							class="flex-1 py-xs border rounded-sm text-xs transition-colors duration-fast
								{$prefs.lineHeight === opt.value
								? 'bg-accent text-white border-accent'
								: 'border-border text-foreground hover:text-accent'}"
							on:click={() => {
								prefs.update((p) => ({ ...p, lineHeight: opt.value }));
								document.documentElement.style.setProperty(
									'--line-height-reader',
									String(opt.value)
								);
							}}
						>
							{opt.label}
						</button>
					{/each}
				</div>
			</div>

			<div class="relative" bind:this={fontSectionEl}>
				<span class="block mb-xs">Font</span>
				<button
					class="w-full border border-border rounded-sm px-sm py-[7px] bg-background text-foreground text-left flex items-center justify-between text-[14px] font-medium"
					style="font-family: {activeFontStack};"
					aria-expanded={fontDropdownOpen}
					aria-haspopup="listbox"
					on:click={() => {
						fontDropdownOpen = !fontDropdownOpen;
						if (fontDropdownOpen)
							fontSectionEl?.scrollIntoView({ block: 'start', behavior: 'smooth' });
					}}
				>
					<span>{activeFontId === 'grace' ? 'Grace Dyslexic MD' : (activeFont?.label ?? '')}</span>
					<span class="text-[10px] text-subtle font-ui" aria-hidden="true"
						>{fontDropdownOpen ? '▲' : '▼'}</span
					>
				</button>
				{#if fontDropdownOpen}
					<div
						class="absolute left-0 right-0 top-[calc(100%+2px)] bg-panel border border-border rounded-sm shadow-lg z-10 overflow-hidden"
					>
						{#each FONTS as f}
							{#if f.dividerBefore}
								<div class="border-t border-border my-[3px]"></div>
							{/if}
							<button
								class="w-full text-left px-sm py-[9px] text-[14px] font-medium hover:bg-accent hover:text-white transition-colors duration-fast
									{activeFontId === f.id ? 'text-accent' : 'text-foreground'}"
								style="font-family: {f.stack};"
								on:click={() => {
									setDyslexia(false);
									setFontWithBionic(f.id);
									fontDropdownOpen = false;
								}}
							>
								{f.label}
							</button>
						{/each}
						<button
							class="w-full text-left px-sm py-[9px] text-[14px] font-medium hover:bg-accent hover:text-white transition-colors duration-fast border-t border-border
								{activeFontId === 'grace' ? 'text-accent' : 'text-foreground'}"
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

			<div class="max-md:mb-[8px]">
				<span class="block mb-xs">Theme</span>
				<div class="flex gap-[6px]">
					{#each THEMES as t}
						<button
							title={t.label}
							on:click={() => setTheme(t.id)}
							class="theme-card flex-1 rounded-[4px] border-2 transition-colors duration-fast overflow-hidden
								{currentTheme === t.id ? 'border-accent' : 'border-transparent'}"
							style="background: {t.bg};"
						>
							<div class="theme-card-inner p-[7px] max-md:p-[4px]">
								<div class="flex items-baseline gap-[3px] mb-[5px]">
									<span
										class="font-reader text-[15px] max-md:text-[11px] leading-none font-bold"
										style="color: {t.fg};">A</span
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
		</div>
	{/if}

	<!-- Reading tab -->
	{#if activeTab === 'reading'}
		<div class="space-y-md">
			<div class="hidden md:block">
				<span class="block mb-xs">Column width</span>
				<div class="flex gap-xs">
					{#each [{ label: 'Narrow', value: 'narrow' }, { label: 'Default', value: 'default' }, { label: 'Wide', value: 'wide' }] as opt}
						<button
							class="flex-1 py-xs border rounded-sm text-xs transition-colors duration-fast
								{$prefs.columnWidth === opt.value
								? 'bg-accent text-white border-accent'
								: 'border-border text-foreground hover:text-accent'}"
							on:click={() =>
								prefs.update((p) => ({
									...p,
									columnWidth: opt.value as 'narrow' | 'default' | 'wide'
								}))}
						>
							{opt.label}
						</button>
					{/each}
				</div>
			</div>

			<label class="flex items-center gap-sm cursor-pointer">
				<input
					type="checkbox"
					checked={$prefs.justifiedText}
					on:change={(e) =>
						prefs.update((p) => ({
							...p,
							justifiedText: (e.target as HTMLInputElement).checked
						}))}
					class="accent-accent"
				/>
				<span>Justified text</span>
			</label>

			<label class="flex items-center gap-sm cursor-pointer">
				<input
					type="checkbox"
					checked={$prefs.infiniteScroll}
					on:change={(e) =>
						prefs.update((p) => ({
							...p,
							infiniteScroll: (e.target as HTMLInputElement).checked
						}))}
					class="accent-accent"
				/>
				<span>Infinite scroll</span>
			</label>

			<label class="flex items-center gap-sm cursor-pointer">
				<input
					type="checkbox"
					checked={$prefs.showChapterNav ?? true}
					on:change={(e) =>
						prefs.update((p) => ({
							...p,
							showChapterNav: (e.target as HTMLInputElement).checked
						}))}
					class="accent-accent"
				/>
				<span>Chapter navigation</span>
			</label>

			<label class="flex items-center gap-sm cursor-pointer">
				<input
					type="checkbox"
					checked={$prefs.bionicReading}
					on:change={(e) =>
						prefs.update((p) => ({
							...p,
							bionicReading: (e.target as HTMLInputElement).checked
						}))}
					class="accent-accent"
				/>
				<span>Bionic Reading</span>
			</label>

			{#if $prefs.bionicReading}
				<div class="pl-[20px] space-y-sm">
					<label class="block">
						<span class="block mb-xs text-subtle">Fixation: {$prefs.bionicFixation ?? 3}</span>
						<input
							type="range"
							min="1"
							max="5"
							step="1"
							value={$prefs.bionicFixation ?? 3}
							on:input={(e) =>
								prefs.update((p) => ({
									...p,
									bionicFixation: parseInt((e.target as HTMLInputElement).value)
								}))}
							class="w-full accent-accent"
						/>
					</label>
					<label class="block">
						<span class="block mb-xs text-subtle"
							>Saccade interval: {$prefs.bionicSaccade ?? 0}</span
						>
						<input
							type="range"
							min="0"
							max="4"
							step="1"
							value={$prefs.bionicSaccade ?? 0}
							on:input={(e) =>
								prefs.update((p) => ({
									...p,
									bionicSaccade: parseInt((e.target as HTMLInputElement).value)
								}))}
							class="w-full accent-accent"
						/>
					</label>
					<label class="block">
						<span class="block mb-xs text-subtle"
							>Non-bold opacity: {Math.round(($prefs.bionicOpacity ?? 1) * 100)}%</span
						>
						<input
							type="range"
							min="0"
							max="1"
							step="0.05"
							value={$prefs.bionicOpacity ?? 1}
							on:input={(e) => {
								const v = parseFloat((e.target as HTMLInputElement).value);
								prefs.update((p) => ({ ...p, bionicOpacity: v }));
								document.documentElement.style.setProperty('--bionic-opacity', String(v));
							}}
							class="w-full accent-accent"
						/>
					</label>
				</div>
			{/if}
		</div>
	{/if}

	<!-- Verse tab -->
	{#if activeTab === 'verse'}
		<div class="space-y-md">
			<label class="flex items-center gap-sm cursor-pointer">
				<input
					type="checkbox"
					checked={$prefs.showVerseNumbers}
					on:change={(e) =>
						prefs.update((p) => ({
							...p,
							showVerseNumbers: (e.target as HTMLInputElement).checked
						}))}
					class="accent-accent"
				/>
				<span>Verse numbers</span>
			</label>

			<label class="flex items-center gap-sm cursor-pointer">
				<input
					type="checkbox"
					checked={$prefs.paragraphView}
					on:change={(e) =>
						prefs.update((p) => ({
							...p,
							paragraphView: (e.target as HTMLInputElement).checked
						}))}
					class="accent-accent"
				/>
				<span>Paragraph view</span>
			</label>

			<label class="flex items-center gap-sm cursor-pointer">
				<input
					type="checkbox"
					checked={$prefs.modernBookNames}
					on:change={(e) =>
						prefs.update((p) => ({
							...p,
							modernBookNames: (e.target as HTMLInputElement).checked
						}))}
					class="accent-accent"
				/>
				<span>Modern book names</span>
			</label>

			<label class="flex items-center gap-sm cursor-pointer">
				<input
					type="checkbox"
					checked={$prefs.showPsalmNumbers}
					on:change={(e) =>
						prefs.update((p) => ({
							...p,
							showPsalmNumbers: (e.target as HTMLInputElement).checked
						}))}
					class="accent-accent"
				/>
				<span>Hebrew Psalm numbers</span>
			</label>

			<label class="flex items-center gap-sm cursor-pointer">
				<input
					type="checkbox"
					checked={$prefs.showSmallCaps ?? true}
					on:change={(e) =>
						prefs.update((p) => ({
							...p,
							showSmallCaps: (e.target as HTMLInputElement).checked
						}))}
					class="accent-accent"
				/>
				<span>Small caps</span>
			</label>

			<label class="flex items-center gap-sm cursor-pointer">
				<input
					type="checkbox"
					checked={$prefs.showItalics}
					on:change={(e) =>
						prefs.update((p) => ({
							...p,
							showItalics: (e.target as HTMLInputElement).checked
						}))}
					class="accent-accent"
				/>
				<span>Italics (OT quotes in NT)</span>
			</label>

			<label class="flex items-center gap-sm cursor-pointer">
				<input
					type="checkbox"
					checked={$prefs.expandAmpersand ?? false}
					on:change={(e) =>
						prefs.update((p) => ({
							...p,
							expandAmpersand: (e.target as HTMLInputElement).checked
						}))}
					class="accent-accent"
				/>
				<span>&amp; → and</span>
			</label>
		</div>
	{/if}
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
