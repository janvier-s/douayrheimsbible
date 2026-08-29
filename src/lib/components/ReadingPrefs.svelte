<script lang="ts">
	import { onMount } from 'svelte';
	import { prefs } from '$lib/stores/prefs';
	import { FONTS, getFontById } from '$lib/data/fonts';
	import SettingHint from './SettingHint.svelte';

	interface Props {
		compareMode?: boolean;
		translationId?: string;
	}

	let { compareMode = false, translationId = 'odr' }: Props = $props();
	let isVul = $derived(translationId === 'vul');
	let activeFontSize = $derived(compareMode ? $prefs.compareFontSize : $prefs.fontSize);

	const THEMES = [
		{ id: 'light', label: 'Light', bg: '#fffdf9', fg: '#1c1710', lines: '#c8bfb0' },
		{ id: 'sepia', label: 'Sepia', bg: '#f8f5ef', fg: '#2c1e10', lines: '#c0a888' },
		{ id: 'dark', label: 'Dark', bg: '#111113', fg: '#e8ddd0', lines: '#2e2b32' },
		{ id: 'oled', label: 'OLED', bg: '#000000', fg: '#e0e0e0', lines: '#2a2a2a' }
	];

	let currentTheme = $state('auto');
	let fontDropdownOpen = $state(false);

	let activeFontId = $derived($prefs.dyslexiaFont ? 'grace' : $prefs.fontFamily);
	let activeFont = $derived(getFontById(activeFontId));
	let activeFontStack = $derived(
		activeFontId === 'grace' ? "'Grace Dyslexic MD', sans-serif" : (activeFont?.stack ?? 'inherit')
	);

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
		document.documentElement.style.setProperty(
			'--font-dropcap',
			id === 'montserrat' ? 'var(--font-baskerville)' : 'inherit'
		);
	}

	function setDyslexia(on: boolean) {
		prefs.update((p) => ({ ...p, dyslexiaFont: on }));
		if (on) {
			document.documentElement.style.setProperty(
				'--font-reader',
				"'Grace Dyslexic MD', sans-serif"
			);
			document.documentElement.style.setProperty('--font-ui', "'Grace Dyslexic MD', sans-serif");
			document.documentElement.style.setProperty('--font-dropcap', 'inherit');
		} else {
			const font = getFontById($prefs.fontFamily);
			document.documentElement.style.setProperty('--font-reader', font?.stack ?? 'serif');
			document.documentElement.style.setProperty(
				'--font-ui',
				"'Metropolis', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
			);
			document.documentElement.style.setProperty(
				'--font-dropcap',
				$prefs.fontFamily === 'montserrat' ? 'var(--font-baskerville)' : 'inherit'
			);
		}
	}

	function setBionicBoldWeight(value: 600 | 700) {
		prefs.update((p) => ({ ...p, bionicBoldWeight: value }));
		document.documentElement.style.setProperty('--bionic-bold-weight', String(value));
	}

	let activeTab: 'appearance' | 'reading' | 'text' = $state('appearance');
	let sliderIndex = $derived(['appearance', 'reading', 'text'].indexOf(activeTab));
	let fontSectionEl: HTMLElement | undefined = $state();
</script>

<div class="text-sm font-ui">
	<!-- Tab bar -->
	<div
		class="relative flex border-b border-border mb-md -mx-md px-md max-md:-mx-[20px] max-md:px-[20px] sticky top-0 z-10 bg-panel"
	>
		{#each [{ id: 'appearance', label: 'Appearance' }, { id: 'reading', label: 'Reading' }, { id: 'text', label: 'Text Options' }] as tab}
			<button
				class="flex-1 py-[8px] text-[11px] uppercase tracking-[0.12em] font-semibold transition-colors duration-fast
					{activeTab === tab.id ? 'text-accent' : 'text-subtle hover:text-foreground'}"
				onclick={() => (activeTab = tab.id as typeof activeTab)}
			>
				{tab.label}
			</button>
		{/each}
		<div
			class="tab-slider"
			style="transform: translateX({sliderIndex * 100}%)"
			aria-hidden="true"
		></div>
	</div>
	<!-- Appearance tab -->
	{#if activeTab === 'appearance'}
		<div class="space-y-[10px] max-md:pb-[20px]">
			<div>
				<span class="block mb-xs">
					<SettingHint
						text="Groups verses into flowing paragraphs instead of one line per verse, closer to how the 1582 print set the text."
					>
						Verse format
					</SettingHint>
				</span>
				<div class="flex gap-xs">
					{#each [{ label: 'Verse-by-verse', value: false }, { label: 'Paragraph', value: true }] as opt}
						<button
							class="flex-1 py-xs border rounded-sm text-xs transition-colors duration-fast
								{$prefs.paragraphView === opt.value
								? 'bg-accent text-white border-accent'
								: 'border-border text-foreground hover:text-accent'}"
							onclick={() => prefs.update((p) => ({ ...p, paragraphView: opt.value }))}
						>
							{opt.label}
						</button>
					{/each}
				</div>
			</div>

			{#if $prefs.paragraphView}
				<div class="pl-[20px] space-y-sm">
					<label class="flex items-center gap-sm cursor-pointer">
						<input
							type="checkbox"
							checked={$prefs.showDropcap ?? true}
							onchange={(e) =>
								prefs.update((p) => ({
									...p,
									showDropcap: (e.target as HTMLInputElement).checked
								}))}
							class="accent-accent"
						/>
						<SettingHint text="Enlarges the first letter of each chapter's opening word.">
							<span>Drop cap</span>
						</SettingHint>
					</label>
					<label class="flex items-center gap-sm cursor-pointer">
						<input
							type="checkbox"
							checked={$prefs.hangingVerseNumbers ?? false}
							onchange={(e) =>
								prefs.update((p) => ({
									...p,
									hangingVerseNumbers: (e.target as HTMLInputElement).checked
								}))}
							class="accent-accent"
						/>
						<SettingHint
							text="Sets verse numbers in the left margin instead of indenting each paragraph's first line."
						>
							<span>Hanging verse numbers</span>
						</SettingHint>
					</label>
				</div>
			{/if}

			<div class="max-md:mb-[8px]">
				<span class="block mb-xs">
					<SettingHint
						text="Sets the background and text colors for the whole site, not just this panel."
					>
						Theme
					</SettingHint>
				</span>
				<div class="flex gap-[6px]">
					{#each THEMES as t}
						<button
							title={t.label}
							onclick={() => setTheme(t.id)}
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

			<div class="relative" bind:this={fontSectionEl}>
				<span class="block mb-xs">
					<SettingHint text="Changes the typeface used for Scripture text (not menus or buttons).">
						Font
					</SettingHint>
				</span>
				<button
					class="w-full border border-border rounded-sm px-sm py-[7px] bg-background text-foreground text-left flex items-center justify-between text-[14px] font-medium"
					style="font-family: {activeFontStack};"
					aria-expanded={fontDropdownOpen}
					aria-haspopup="listbox"
					onclick={() => {
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
								onclick={() => {
									setDyslexia(false);
									setFont(f.id);
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
							onclick={() => {
								setDyslexia(true);
								fontDropdownOpen = false;
							}}
						>
							Grace Dyslexic MD
						</button>
					</div>
				{/if}
			</div>

			<label class="block">
				<span class="block mb-xs">
					<SettingHint
						text="Adjusts the Scripture text size independently of your browser's zoom level."
					>
						Font size: {activeFontSize}px
					</SettingHint>
				</span>
				<input
					type="range"
					min="12"
					max="20"
					step="1"
					value={activeFontSize}
					oninput={(e) => {
						const v = parseInt((e.target as HTMLInputElement).value);
						const key = compareMode ? 'compareFontSize' : 'fontSize';
						prefs.update((p) => ({ ...p, [key]: v }));
						document.documentElement.style.setProperty('--font-size-reader', `${v}px`);
					}}
					class="w-full accent-accent"
				/>
			</label>

			<div>
				<span class="block mb-xs">
					<SettingHint text="Tight fits more verses on screen; Wide eases long reading sessions.">
						Line spacing
					</SettingHint>
				</span>
				<div class="flex gap-xs">
					{#each [{ label: 'Tight', value: 1.5 }, { label: 'Default', value: 1.8 }, { label: 'Wide', value: 2.0 }] as opt}
						<button
							class="flex-1 py-xs border rounded-sm text-xs transition-colors duration-fast
								{$prefs.lineHeight === opt.value
								? 'bg-accent text-white border-accent'
								: 'border-border text-foreground hover:text-accent'}"
							onclick={() => {
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

			<div class="hidden md:block">
				<span class="block mb-xs">
					<SettingHint
						text="Narrower columns can be easier to track line-to-line; Wide uses more of the screen."
					>
						Column width
					</SettingHint>
				</span>
				<div class="flex gap-xs">
					{#each [{ label: 'Narrow', value: 'narrow' }, { label: 'Default', value: 'default' }, { label: 'Wide', value: 'wide' }] as opt}
						<button
							class="flex-1 py-xs border rounded-sm text-xs transition-colors duration-fast
								{$prefs.columnWidth === opt.value
								? 'bg-accent text-white border-accent'
								: 'border-border text-foreground hover:text-accent'}"
							onclick={() =>
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
		</div>
	{/if}

	<!-- Reading tab -->
	{#if activeTab === 'reading'}
		<div class="space-y-md">
			<label class="flex items-center gap-sm cursor-pointer">
				<input
					type="checkbox"
					checked={$prefs.infiniteScroll}
					onchange={(e) =>
						prefs.update((p) => ({
							...p,
							infiniteScroll: (e.target as HTMLInputElement).checked
						}))}
					class="accent-accent"
				/>
				<SettingHint
					text="Loads the next chapter automatically as you near the bottom, instead of requiring a tap to continue."
				>
					<span>Infinite scroll</span>
				</SettingHint>
			</label>

			<label class="flex items-center gap-sm cursor-pointer">
				<input
					type="checkbox"
					checked={($prefs.syncStudyScroll ?? true) && ($prefs.annotationSync ?? true)}
					onchange={(e) => {
						const v = (e.target as HTMLInputElement).checked;
						prefs.update((p) => ({ ...p, syncStudyScroll: v, annotationSync: v }));
					}}
					class="accent-accent"
				/>
				<SettingHint
					text="Keeps the Study panel's notes scrolled to match the verse currently in view."
				>
					<span>Verse &amp; notes scroll sync</span>
				</SettingHint>
			</label>

			<label class="flex items-center gap-sm cursor-pointer">
				<input
					type="checkbox"
					checked={$prefs.showChapterNav ?? true}
					onchange={(e) =>
						prefs.update((p) => ({
							...p,
							showChapterNav: (e.target as HTMLInputElement).checked
						}))}
					class="accent-accent"
				/>
				<SettingHint text="Shows the previous/next chapter links above and below the text.">
					<span>Chapter navigation</span>
				</SettingHint>
			</label>

			{#if $prefs.hasVisitedHomepage}
				<label class="flex items-center gap-sm cursor-pointer">
					<input
						type="checkbox"
						checked={!($prefs.skipHomepage ?? false)}
						onchange={(e) =>
							prefs.update((p) => ({
								...p,
								skipHomepage: !(e.target as HTMLInputElement).checked
							}))}
						class="accent-accent"
					/>
					<SettingHint
						text="Shows the animated welcome page when you open the site, instead of jumping straight to Genesis 1."
					>
						<span>Show intro page</span>
					</SettingHint>
				</label>
			{/if}

			<label class="flex items-center gap-sm cursor-pointer">
				<input
					type="checkbox"
					checked={$prefs.bionicReading}
					onchange={(e) =>
						prefs.update((p) => ({
							...p,
							bionicReading: (e.target as HTMLInputElement).checked
						}))}
					class="accent-accent"
				/>
				<SettingHint
					text="Bolds the leading letters of each word as a guide for the eye; may help reading speed and focus."
				>
					<span>Bionic Reading</span>
				</SettingHint>
			</label>

			{#if $prefs.bionicReading}
				<div class="pl-[20px] space-y-sm">
					<label class="block">
						<span class="block mb-xs text-subtle">
							<SettingHint text="How many letters at the start of each word are bolded.">
								Fixation: {$prefs.bionicFixation ?? 3}
							</SettingHint>
						</span>
						<input
							type="range"
							min="1"
							max="5"
							step="1"
							value={$prefs.bionicFixation ?? 3}
							oninput={(e) =>
								prefs.update((p) => ({
									...p,
									bionicFixation: parseInt((e.target as HTMLInputElement).value)
								}))}
							class="w-full accent-accent"
						/>
					</label>
					<label class="block">
						<span class="block mb-xs text-subtle">
							<SettingHint text="How many words to skip, unbolded, between each bolded word.">
								Saccade interval: {$prefs.bionicSaccade ?? 0}
							</SettingHint>
						</span>
						<input
							type="range"
							min="0"
							max="4"
							step="1"
							value={$prefs.bionicSaccade ?? 0}
							oninput={(e) =>
								prefs.update((p) => ({
									...p,
									bionicSaccade: parseInt((e.target as HTMLInputElement).value)
								}))}
							class="w-full accent-accent"
						/>
					</label>
					<label class="block">
						<span class="block mb-xs text-subtle">
							<SettingHint
								text="Fades the non-bold portion of each word instead of leaving it full strength."
							>
								Non-bold opacity: {Math.round(($prefs.bionicOpacity ?? 1) * 100)}%
							</SettingHint>
						</span>
						<input
							type="range"
							min="0"
							max="1"
							step="0.05"
							value={$prefs.bionicOpacity ?? 1}
							oninput={(e) => {
								const v = parseFloat((e.target as HTMLInputElement).value);
								prefs.update((p) => ({ ...p, bionicOpacity: v }));
								document.documentElement.style.setProperty('--bionic-opacity', String(v));
							}}
							class="w-full accent-accent"
						/>
					</label>
					<div>
						<span class="block mb-xs text-subtle">
							<SettingHint text="How bold the emphasized letters are.">Bold weight</SettingHint>
						</span>
						<div class="flex gap-xs">
							{#each [{ label: 'Lighter', value: 600 }, { label: 'Heavy', value: 700 }] as opt}
								<button
									class="flex-1 py-xs border rounded-sm text-xs transition-colors duration-fast
										{$prefs.bionicBoldWeight === opt.value
										? 'bg-accent text-white border-accent'
										: 'border-border text-foreground hover:text-accent'}"
									onclick={() => setBionicBoldWeight(opt.value as 600 | 700)}
								>
									{opt.label}
								</button>
							{/each}
						</div>
					</div>
				</div>
			{/if}
		</div>
	{/if}

	<!-- Text Options tab -->
	{#if activeTab === 'text'}
		<div class="space-y-md max-md:pb-[20px]">
			<label class="flex items-center gap-sm cursor-pointer">
				<input
					type="checkbox"
					checked={$prefs.showVerseNumbers}
					onchange={(e) =>
						prefs.update((p) => ({
							...p,
							showVerseNumbers: (e.target as HTMLInputElement).checked
						}))}
					class="accent-accent"
				/>
				<SettingHint text="Shows the small numeral before each verse.">
					<span>Verse numbers</span>
				</SettingHint>
			</label>

			<label class="flex items-center gap-sm cursor-pointer">
				<input
					type="checkbox"
					checked={$prefs.justifiedText}
					onchange={(e) =>
						prefs.update((p) => ({
							...p,
							justifiedText: (e.target as HTMLInputElement).checked
						}))}
					class="accent-accent"
				/>
				<SettingHint
					text="Stretches each line so both the left and right edges align, like a printed book."
				>
					<span>Justified text</span>
				</SettingHint>
			</label>

			<div class="border-t border-border pt-md space-y-md">
				<label class="flex items-center gap-sm cursor-pointer">
					<input
						type="checkbox"
						checked={$prefs.modernBookNames}
						onchange={(e) =>
							prefs.update((p) => ({
								...p,
								modernBookNames: (e.target as HTMLInputElement).checked
							}))}
						class="accent-accent"
					/>
					<SettingHint
						text="Use familiar names (e.g. Hosea) instead of the Douay-Rheims originals (e.g. Osee)."
					>
						<span>Modern book names</span>
					</SettingHint>
				</label>

				{#if isVul}
					<label class="flex items-center gap-sm cursor-pointer">
						<input
							type="checkbox"
							checked={$prefs.romanNumerals}
							onchange={(e) =>
								prefs.update((p) => ({
									...p,
									romanNumerals: (e.target as HTMLInputElement).checked
								}))}
							class="accent-accent"
						/>
						<SettingHint
							text="Show chapter numbers as roman numerals (I, II, III) instead of Arabic."
						>
							<span>Roman numerals</span>
						</SettingHint>
					</label>
				{/if}

				<label class="flex items-center gap-sm cursor-pointer">
					<input
						type="checkbox"
						checked={$prefs.showPsalmNumbers}
						onchange={(e) =>
							prefs.update((p) => ({
								...p,
								showPsalmNumbers: (e.target as HTMLInputElement).checked
							}))}
						class="accent-accent"
					/>
					<SettingHint
						text="Number the Psalms by the Hebrew count instead of the Douay-Rheims' Septuagint-based count."
					>
						<span>Hebrew Psalm numbers</span>
					</SettingHint>
				</label>

				<label class="flex items-center gap-sm cursor-pointer">
					<input
						type="checkbox"
						checked={$prefs.showSmallCaps ?? true}
						onchange={(e) =>
							prefs.update((p) => ({
								...p,
								showSmallCaps: (e.target as HTMLInputElement).checked
							}))}
						class="accent-accent"
					/>
					<SettingHint
						text="Renders words like GOD and LORD in small capitals, matching the original print convention."
					>
						<span>Small caps</span>
					</SettingHint>
				</label>

				<label class="flex items-center gap-sm cursor-pointer">
					<input
						type="checkbox"
						checked={$prefs.showItalics}
						onchange={(e) =>
							prefs.update((p) => ({
								...p,
								showItalics: (e.target as HTMLInputElement).checked
							}))}
						class="accent-accent"
					/>
					<SettingHint text="Italicizes Old Testament passages quoted within the New Testament.">
						<span>Italics (OT quotes in NT)</span>
					</SettingHint>
				</label>

				<label class="flex items-center gap-sm cursor-pointer">
					<input
						type="checkbox"
						checked={$prefs.expandAmpersand ?? false}
						onchange={(e) =>
							prefs.update((p) => ({
								...p,
								expandAmpersand: (e.target as HTMLInputElement).checked
							}))}
						class="accent-accent"
					/>
					<SettingHint text="Spell out every &amp; as “and”.">
						<span>&amp; → and</span>
					</SettingHint>
				</label>
			</div>
		</div>
	{/if}
</div>

<style>
	.tab-slider {
		position: absolute;
		bottom: -1px;
		left: 21px;
		height: 2px;
		border-radius: 1px 1px 0 0;
		background: var(--color-accent);
		width: calc((100% - 42px) / 3);
		transition: transform 200ms cubic-bezier(0.4, 0, 0.2, 1);
	}

	@media (max-width: 767px) {
		.tab-slider {
			left: 20px;
			width: calc((100% - 40px) / 3);
		}
	}

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
