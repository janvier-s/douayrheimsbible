# Mobile Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix three mobile UX problems — overlapping TopBar elements, unusable side-by-side study panel, and untappable study markers — while leaving the desktop layout completely unchanged.

**Architecture:** Six independent tasks executed sequentially. Tasks 3–5 all touch `TopBar.svelte` but are additive (each builds on the previous without conflicting). `isMobile` store (Task 1) is a shared dependency used by Task 6. All mobile-only changes are gated by `max-md` Tailwind classes or a matchMedia store; desktop code paths are untouched.

**Tech Stack:** SvelteKit, Svelte 4, TypeScript, Tailwind CSS, `$app/environment` browser guard.

---

## File Map

| File | Role |
|------|------|
| `src/lib/stores/mobile.ts` | **Create** — reactive `isMobile` store via matchMedia |
| `src/lib/components/VerseList.svelte` | **Modify** — larger tap targets for `.study-marker` on touch devices |
| `src/lib/components/TopBar.svelte` | **Modify** — logo, Row 1/Row 2 layout, bottom tab bar, mobile prefs sheet |
| `src/lib/components/BibleReader.svelte` | **Modify** — full-width study panel + bottom padding on mobile |

---

### Task 1: `isMobile` store

**Files:**
- Create: `src/lib/stores/mobile.ts`

**Context:** Several components need to know if the viewport is mobile (`< 768px`) at runtime. Tailwind classes handle static CSS-only concerns, but some logic (hiding/showing the main reading column, overriding panel widths) must branch in Svelte script. A shared readable store keeps this in one place and reacts to orientation changes.

- [ ] **Step 1: Create the store file**

```typescript
// src/lib/stores/mobile.ts
import { readable } from 'svelte/store';
import { browser } from '$app/environment';

export const isMobile = readable(false, (set) => {
	if (!browser) return;
	const mq = window.matchMedia('(max-width: 767px)');
	set(mq.matches);
	const handler = (e: MediaQueryListEvent) => set(e.matches);
	mq.addEventListener('change', handler);
	return () => mq.removeEventListener('change', handler);
});
```

- [ ] **Step 2: Verify it type-checks**

```bash
cd "/Users/Janvier/Library/Mobile Documents/com~apple~CloudDocs/for-the-kingdom/douayrheimsbible"
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd "/Users/Janvier/Library/Mobile Documents/com~apple~CloudDocs/for-the-kingdom/douayrheimsbible"
npx prettier --write src/lib/stores/mobile.ts
git add src/lib/stores/mobile.ts
git commit -m "feat: add isMobile store for mobile-responsive logic"
```

---

### Task 2: Study marker tap targets

**Files:**
- Modify: `src/lib/components/VerseList.svelte` (style block, lines ~428–444)

**Context:** `.study-marker` buttons are 8px font with 1–3px padding — far below the 44px minimum touch target. The fix uses a `::before` pseudo-element on touch devices to extend the invisible hit area without changing visual appearance. The marker already has `padding: 1px 3px` and no `position` set — `position: relative` must be added to enable `::before` absolute positioning.

- [ ] **Step 1: Open `src/lib/components/VerseList.svelte` and find the `.study-marker` rule**

It's around line 430. Currently:
```css
:global(.study-marker) {
    font-size: 8px;
    font-family: var(--font-ui);
    font-weight: 600;
    vertical-align: super;
    line-height: 1;
    cursor: pointer;
    border: none;
    padding: 1px 3px;
    margin: 0 1px;
    border-radius: 2px;
    color: var(--color-accent-text);
    background: color-mix(in srgb, var(--color-accent-text) 14%, transparent);
}
```

- [ ] **Step 2: Add `position: relative` and the touch hit-target rule**

Replace the `.study-marker` rule with:
```css
:global(.study-marker) {
    position: relative;
    font-size: 8px;
    font-family: var(--font-ui);
    font-weight: 600;
    vertical-align: super;
    line-height: 1;
    cursor: pointer;
    border: none;
    padding: 1px 3px;
    margin: 0 1px;
    border-radius: 2px;
    color: var(--color-accent-text);
    background: color-mix(in srgb, var(--color-accent-text) 14%, transparent);
}

@media (pointer: coarse) {
    :global(.study-marker::before) {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        min-width: 44px;
        min-height: 44px;
    }
}
```

- [ ] **Step 3: Verify type-check and format**

```bash
cd "/Users/Janvier/Library/Mobile Documents/com~apple~CloudDocs/for-the-kingdom/douayrheimsbible"
npx tsc --noEmit
```

- [ ] **Step 4: Manual test**

Open Chrome DevTools → toggle mobile emulation (any phone preset). Open a chapter in study mode. The cross-ref and note badges should be visually unchanged. Using DevTools pointer simulation, the tap target area should extend 44×44px around each badge.

- [ ] **Step 5: Commit**

```bash
cd "/Users/Janvier/Library/Mobile Documents/com~apple~CloudDocs/for-the-kingdom/douayrheimsbible"
npx prettier --write "src/lib/components/VerseList.svelte"
git add src/lib/components/VerseList.svelte
git commit -m "fix: extend study marker tap targets to 44px on touch devices"
```

---

### Task 3: TopBar — Row 1 & Row 2 mobile layout

**Files:**
- Modify: `src/lib/components/TopBar.svelte`

**Context:** Two overlapping element problems exist on mobile:
1. **Row 1**: Logo is `max-md:absolute max-md:left-1/2 max-md:-translate-x-1/2` (centered absolute) while ModeToggle is in normal flow — they collide. Fix: remove absolute centering, keep logo in flow on the left. ModeToggle is hidden on mobile (replaced by the tab bar in Task 4). Search icon is hidden on mobile (moved to tab bar in Task 4). A new sliders icon opens the reading options sheet (Task 5).
2. **Row 2**: Chapter nav is `absolute left-1/2 -translate-x-1/2` while translation selector is in flow — they overlap on narrow screens. Fix: use `flex-1` centering on mobile only. The reading options button moves to Row 1 on mobile (as sliders icon), so it's hidden in Row 2 on mobile.

The `selectMode` helper is extracted from `handleModeSelect` so the tab bar (Task 4) can call it directly.

- [ ] **Step 1: In the `<script>` block, replace `handleModeSelect` with a `selectMode` helper**

Currently (around line 63):
```typescript
async function handleModeSelect(e: CustomEvent<{ key: string; index: number }>) {
    const { key, index } = e.detail;
    if (key === 'compare') {
        pendingIdx = index;
        const delay = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 210;
        await new Promise<void>((r) => setTimeout(r, delay));
        goto(`/compare/${bookSlug}/${chapterNum}`);
        return;
    }
    pendingIdx = -1;
    prefs.update((p) => ({ ...p, readingMode: key as 'reading' | 'study' }));
}
```

Replace with:
```typescript
async function selectMode(key: string, index: number) {
    if (key === 'compare') {
        pendingIdx = index;
        const delay = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 210;
        await new Promise<void>((r) => setTimeout(r, delay));
        goto(`/compare/${bookSlug}/${chapterNum}`);
        return;
    }
    pendingIdx = -1;
    prefs.update((p) => ({ ...p, readingMode: key as 'reading' | 'study' }));
}

async function handleModeSelect(e: CustomEvent<{ key: string; index: number }>) {
    const { key, index } = e.detail;
    await selectMode(key, index);
}
```

- [ ] **Step 2: Update the logo `<a>` tag in Row 1**

Currently (around line 86):
```svelte
<a
    href="/"
    class="flex items-center gap-[6px] group shrink-0
           max-md:absolute max-md:left-1/2 max-md:-translate-x-1/2"
    on:click={closeAll}
>
    <span class="text-accent text-[15px] leading-none select-none" aria-hidden="true">✠</span>
    <span
        class="text-[12px] uppercase tracking-[0.2em] font-semibold text-foreground group-hover:text-accent transition-colors duration-fast"
    >
        Douay-Rheims
    </span>
</a>
```

Replace with:
```svelte
<a
    href="/"
    class="flex items-center gap-[6px] group shrink-0"
    on:click={closeAll}
>
    <span class="text-accent text-[15px] leading-none select-none" aria-hidden="true">✠</span>
    <!-- Desktop: single line -->
    <span
        class="hidden md:block text-[12px] uppercase tracking-[0.2em] font-semibold text-foreground group-hover:text-accent transition-colors duration-fast"
    >
        Douay-Rheims
    </span>
    <!-- Mobile: two lines stacked -->
    <span class="md:hidden flex flex-col gap-[1px] leading-[1.2]" aria-hidden="true">
        <span class="text-[7px] uppercase tracking-[0.18em] font-bold text-foreground group-hover:text-accent transition-colors duration-fast">Douay</span>
        <span class="text-[7px] uppercase tracking-[0.18em] font-bold text-foreground group-hover:text-accent transition-colors duration-fast">Rheims</span>
    </span>
</a>
```

- [ ] **Step 3: Wrap ModeToggle to hide on mobile**

Currently (around line 103):
```svelte
<ModeToggle
    items={modeItems}
    activeIndex={activeModeIdx}
    pendingIndex={pendingIdx}
    on:select={handleModeSelect}
/>
```

Replace with:
```svelte
<div class="hidden md:flex">
    <ModeToggle
        items={modeItems}
        activeIndex={activeModeIdx}
        pendingIndex={pendingIdx}
        on:select={handleModeSelect}
    />
</div>
```

- [ ] **Step 4: Hide search icon on mobile and add sliders icon for mobile**

Currently (around line 111):
```svelte
<!-- Search icon -->
<button
    class="ml-auto md:ml-0 shrink-0 flex items-center justify-center w-[30px] h-[30px]
        rounded-[3px] text-subtle hover:text-foreground transition-colors duration-fast"
    aria-label="Search"
    on:click={() => (searchOpen = true)}
>
    <svg ...></svg>
</button>
```

Replace with:
```svelte
<!-- Search icon — desktop only -->
<button
    class="hidden md:flex ml-0 shrink-0 items-center justify-center w-[30px] h-[30px]
        rounded-[3px] text-subtle hover:text-foreground transition-colors duration-fast"
    aria-label="Search"
    on:click={() => (searchOpen = true)}
>
    <svg
        width="15"
        height="15"
        viewBox="0 0 15 15"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
    >
        <circle cx="6.5" cy="6.5" r="4.5" />
        <line x1="10" y1="10" x2="14" y2="14" />
    </svg>
</button>

<!-- Reading options sliders icon — mobile only, Row 1 -->
<button
    class="md:hidden ml-auto shrink-0 flex items-center justify-center w-[30px] h-[30px]
        rounded-[3px] transition-colors duration-fast
        {prefsOpen ? 'text-accent' : 'text-subtle hover:text-foreground'}"
    aria-label="Reading options"
    aria-expanded={prefsOpen}
    aria-haspopup="dialog"
    on:click={() => {
        prefsOpen = !prefsOpen;
        translationOpen = false;
        navOpen = false;
    }}
>
    <svg width="16" height="14" viewBox="0 0 16 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
        <line x1="1" y1="2" x2="15" y2="2"/>
        <line x1="1" y1="7" x2="15" y2="7"/>
        <line x1="1" y1="12" x2="15" y2="12"/>
        <circle cx="5" cy="2" r="2" fill="currentColor" stroke="none"/>
        <circle cx="11" cy="7" r="2" fill="currentColor" stroke="none"/>
        <circle cx="7" cy="12" r="2" fill="currentColor" stroke="none"/>
    </svg>
</button>
```

- [ ] **Step 5: Fix Row 2 — chapter nav flex layout on mobile**

Currently (around line 184):
```svelte
<!-- Center: chapter nav — absolutely centered so unequal sides don't shift it -->
<div class="absolute left-1/2 -translate-x-1/2">
```

Replace with:
```svelte
<!-- Center: chapter nav — absolute on desktop, flex-1 centered on mobile -->
<div class="md:absolute md:left-1/2 md:-translate-x-1/2 max-md:flex-1 max-md:flex max-md:justify-center">
```

- [ ] **Step 6: Hide reading options button in Row 2 on mobile**

Currently (around line 204):
```svelte
<!-- Right: reading prefs (ml-auto pushes to right) -->
<div class="ml-auto shrink-0">
```

Replace with:
```svelte
<!-- Right: reading prefs — desktop only (mobile uses sliders icon in Row 1) -->
<div class="hidden md:flex ml-auto shrink-0">
```

- [ ] **Step 7: Verify type-check**

```bash
cd "/Users/Janvier/Library/Mobile Documents/com~apple~CloudDocs/for-the-kingdom/douayrheimsbible"
npx tsc --noEmit
```

- [ ] **Step 8: Manual test**

Open Chrome DevTools, set to iPhone 14 Pro viewport (393×852). Check:
- Row 1: `✠ Douay / Rheims` on the left, sliders icon on the right, no overlap
- Row 2: Translation button left, chapter nav centered (no overlap), reading options button hidden
- Desktop (toggle off mobile emulation): layout identical to before

- [ ] **Step 9: Commit**

```bash
cd "/Users/Janvier/Library/Mobile Documents/com~apple~CloudDocs/for-the-kingdom/douayrheimsbible"
npx prettier --write "src/lib/components/TopBar.svelte"
git add src/lib/components/TopBar.svelte
git commit -m "fix: resolve TopBar mobile overlaps — logo in-flow, chapter nav flex, mode toggle hidden"
```

---

### Task 4: Bottom tab bar

**Files:**
- Modify: `src/lib/components/TopBar.svelte`

**Context:** The ModeToggle is hidden on mobile (Task 3). The bottom tab bar replaces it on mobile with an iOS-style fixed nav showing Read · Study · Compare · Search. It is `md:hidden` so it never appears on desktop. The tab bar uses `selectMode` (extracted in Task 3) and toggles `searchOpen` for the Search tab. The overlay backdrop z-index is raised to `z-[55]` so it covers the tab bar (z-50) when any panel is open.

- [ ] **Step 1: Add the bottom tab bar to the template**

Add this block immediately after the closing `</header>` tag (before `{#if navOpen}`):

```svelte
<!-- Bottom tab bar — mobile only -->
<nav
    class="md:hidden fixed bottom-0 inset-x-0 z-50 bg-glass backdrop-blur-sm border-t border-border font-ui"
    style="padding-bottom: env(safe-area-inset-bottom);"
    aria-label="Main navigation"
>
    <div class="flex" style="height: 56px;">
        {#each modeItems as item, i}
            <button
                class="flex-1 flex flex-col items-center justify-center gap-[3px] transition-colors duration-fast
                    {activeModeIdx === i ? 'text-accent' : 'text-subtle hover:text-foreground'}"
                aria-label={item.label}
                aria-pressed={activeModeIdx === i}
                on:click={() => selectMode(item.key, i)}
            >
                {#if item.key === 'reading'}
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="3" y="2" width="12" height="14" rx="1.5"/>
                        <line x1="6" y1="6" x2="12" y2="6"/>
                        <line x1="6" y1="9" x2="12" y2="9"/>
                        <line x1="6" y1="12" x2="9" y2="12"/>
                    </svg>
                {:else if item.key === 'study'}
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
                        <circle cx="9" cy="9" r="7"/>
                        <line x1="9" y1="6" x2="9" y2="9.5"/>
                        <circle cx="9" cy="12" r="0.8" fill="currentColor" stroke="none"/>
                    </svg>
                {:else if item.key === 'compare'}
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="3" y1="9" x2="15" y2="9"/>
                        <polyline points="11,5 15,9 11,13"/>
                        <polyline points="7,5 3,9 7,13"/>
                    </svg>
                {/if}
                <span class="text-[8px] uppercase tracking-[0.1em] font-medium">{item.label}</span>
            </button>
        {/each}
        <!-- Search tab -->
        <button
            class="flex-1 flex flex-col items-center justify-center gap-[3px] transition-colors duration-fast text-subtle hover:text-foreground"
            aria-label="Search"
            on:click={() => (searchOpen = true)}
        >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
                <circle cx="8" cy="8" r="5.5"/>
                <line x1="12" y1="12" x2="16" y2="16"/>
            </svg>
            <span class="text-[8px] uppercase tracking-[0.1em] font-medium">Search</span>
        </button>
    </div>
</nav>
```

- [ ] **Step 2: Raise the overlay z-index so it covers the tab bar**

Currently (near bottom of template):
```svelte
{#if navOpen || prefsOpen || translationOpen}
    <div
        class="fixed inset-0 z-40"
        role="presentation"
        on:click={closeAll}
        on:keydown={(e) => {
            if (e.key === 'Escape') closeAll();
        }}
    ></div>
{/if}
```

Change `z-40` to `z-[55]`:
```svelte
{#if navOpen || prefsOpen || translationOpen}
    <div
        class="fixed inset-0 z-[55]"
        role="presentation"
        on:click={closeAll}
        on:keydown={(e) => {
            if (e.key === 'Escape') closeAll();
        }}
    ></div>
{/if}
```

- [ ] **Step 3: Verify type-check**

```bash
cd "/Users/Janvier/Library/Mobile Documents/com~apple~CloudDocs/for-the-kingdom/douayrheimsbible"
npx tsc --noEmit
```

- [ ] **Step 4: Manual test**

iPhone 14 Pro viewport:
- Bottom tab bar visible with Read · Study · Compare (if on a book with study mode) · Search
- Tapping Read sets `readingMode = 'reading'`, Read tab highlighted
- Tapping Compare navigates to `/compare/[book]/[chapter]`
- Tapping Search opens SpotlightSearch overlay
- Desktop: tab bar completely absent

- [ ] **Step 5: Commit**

```bash
cd "/Users/Janvier/Library/Mobile Documents/com~apple~CloudDocs/for-the-kingdom/douayrheimsbible"
npx prettier --write "src/lib/components/TopBar.svelte"
git add src/lib/components/TopBar.svelte
git commit -m "feat: add mobile bottom tab bar (Read · Study · Compare · Search)"
```

---

### Task 5: Reading options — mobile bottom sheet

**Files:**
- Modify: `src/lib/components/TopBar.svelte`

**Context:** On mobile, the reading options panel currently opens as a `fixed top-[var(--header-height)] right-md w-72` floating panel — it clips off-screen on narrow phones. Replace with a full-width bottom sheet on mobile. The existing desktop panel is kept with `class="hidden md:block"`. The mobile sheet uses `transition:fly` (slides up from bottom). `fly` and `cubicOut` need to be imported. The sheet is above the overlay at `z-[60]`.

- [ ] **Step 1: Add `fly` and `cubicOut` imports**

Currently at the top of the script (line 3):
```typescript
import { slide } from 'svelte/transition';
```

Replace with:
```typescript
import { slide, fly } from 'svelte/transition';
import { cubicOut } from 'svelte/easing';
```

- [ ] **Step 2: Replace the `{#if prefsOpen}` block**

Currently:
```svelte
{#if prefsOpen}
    <div
        transition:slide={{ duration: 180 }}
        class="fixed top-[var(--header-height)] right-md bg-panel border border-border rounded-sm shadow-lg p-md z-50 w-72 font-ui"
        role="dialog"
        aria-label="Reading options"
    >
        <ReadingPrefs />
    </div>
{/if}
```

Replace with:
```svelte
{#if prefsOpen}
    <!-- Desktop panel (unchanged) -->
    <div
        transition:slide={{ duration: 180 }}
        class="hidden md:block fixed top-[var(--header-height)] right-md bg-panel border border-border rounded-sm shadow-lg p-md z-50 w-72 font-ui"
        role="dialog"
        aria-label="Reading options"
    >
        <ReadingPrefs />
    </div>

    <!-- Mobile bottom sheet -->
    <div
        transition:fly={{ y: 400, duration: 260, easing: cubicOut }}
        class="md:hidden fixed inset-x-0 bottom-0 bg-panel border-t border-border rounded-t-xl z-[60] font-ui overflow-y-auto"
        style="max-height: 85vh; padding-bottom: env(safe-area-inset-bottom);"
        role="dialog"
        aria-label="Reading options"
    >
        <!-- Drag handle -->
        <div class="flex justify-center pt-[10px] pb-[6px] sticky top-0 bg-panel border-b border-border z-10">
            <div class="w-[32px] h-[4px] bg-border rounded-full"></div>
        </div>
        <div class="p-md">
            <ReadingPrefs />
        </div>
    </div>
{/if}
```

- [ ] **Step 3: Verify type-check**

```bash
cd "/Users/Janvier/Library/Mobile Documents/com~apple~CloudDocs/for-the-kingdom/douayrheimsbible"
npx tsc --noEmit
```

- [ ] **Step 4: Manual test**

iPhone 14 Pro viewport:
- Tap the sliders icon (Row 1 right) → full-width sheet slides up from bottom with drag handle
- Sheet shows Text / Reading / Verse tabs spanning the full width
- Tapping the overlay (semi-transparent backdrop) closes the sheet
- Desktop: tapping "Reading options" opens the original right-side panel, no sheet visible

- [ ] **Step 5: Commit**

```bash
cd "/Users/Janvier/Library/Mobile Documents/com~apple~CloudDocs/for-the-kingdom/douayrheimsbible"
npx prettier --write "src/lib/components/TopBar.svelte"
git add src/lib/components/TopBar.svelte
git commit -m "feat: reading options opens as full-width bottom sheet on mobile"
```

---

### Task 6: BibleReader — study panel mobile tab switcher + bottom padding

**Files:**
- Modify: `src/lib/components/BibleReader.svelte`

**Context:** On mobile, switching to Study mode currently opens the study panel as a `42.65vw` side-by-side column — nearly half the phone screen. Instead, on mobile: (a) the main reading column hides, (b) the study panel fills `100%` width, (c) the resize divider is hidden. The `isMobile` store from Task 1 drives this branching. The study panel height on mobile is reduced by 56px to not extend behind the tab bar. The `<main>` also gets `max-md:pb-[80px]` so the last verse isn't hidden behind the tab bar in reading mode.

- [ ] **Step 1: Import `isMobile`**

In the `<script>` block, after the existing imports (around line 19):
```typescript
import { isMobile } from '$lib/stores/mobile';
```

- [ ] **Step 2: Add reactive derivations for panel width and transition**

After the existing reactive statement on line 63 (`$: if (!panelDragging) liveWidth = $prefs.studyPanelWidth;`), add:

```typescript
$: panelMaxWidth = $prefs.readingMode === 'study'
    ? ($isMobile ? '100%' : liveWidth)
    : '0';
$: panelTransition = panelDragging
    ? 'opacity 250ms ease'
    : $isMobile
        ? 'opacity 150ms ease'
        : 'max-width 250ms ease, opacity 250ms ease';
```

- [ ] **Step 3: Guard the `panelEl.style.width` assignment against mobile**

Currently (around line 68):
```typescript
$: if (panelEl && !panelDragging) panelEl.style.width = $prefs.studyPanelWidth;
```

Replace with:
```typescript
$: if (panelEl && !panelDragging && !$isMobile) panelEl.style.width = $prefs.studyPanelWidth;
$: if (panelEl && $isMobile) panelEl.style.width = '100%';
```

- [ ] **Step 4: Update the `<main>` element to hide in study mode on mobile and add bottom padding**

Currently (around line 293):
```svelte
<main id="main-content" bind:this={container} class="flex-1 min-w-0 px-md pt-[20px] pb-xl">
```

Replace with:
```svelte
<main
    id="main-content"
    bind:this={container}
    class="flex-1 min-w-0 px-md pt-[20px] pb-xl max-md:pb-[80px]"
    class:hidden={$prefs.readingMode === 'study' && $isMobile}
>
```

- [ ] **Step 5: Update the study panel container style**

Currently (around line 318):
```svelte
<div
    class="shrink-0 sticky flex [overflow:clip]"
    style="top: var(--header-height); height: calc(100vh - var(--header-height)); max-width: {$prefs.readingMode ===
    'study'
        ? liveWidth
        : '0'}; opacity: {$prefs.readingMode === 'study' ? '1' : '0'}; transition: {panelDragging
        ? 'opacity 250ms ease'
        : 'max-width 250ms ease, opacity 250ms ease'};"
>
```

Replace with:
```svelte
<div
    class="shrink-0 sticky flex [overflow:clip]"
    style="top: var(--header-height); height: {$isMobile ? 'calc(100vh - var(--header-height) - 56px)' : 'calc(100vh - var(--header-height))'}; max-width: {panelMaxWidth}; opacity: {$prefs.readingMode === 'study' ? '1' : '0'}; transition: {panelTransition};"
>
```

- [ ] **Step 6: Hide the resize divider on mobile**

Currently (around line 330):
```svelte
<div
    role="separator"
    aria-orientation="vertical"
    aria-label="Resize study panel"
    tabindex="0"
    class="w-[5px] shrink-0 cursor-col-resize hover:bg-[rgba(128,128,128,0.2)] focus:bg-[rgba(128,128,128,0.3)] transition-colors duration-fast self-stretch outline-none"
    on:mousedown={resize.onDividerMousedown}
    on:touchstart={resize.onTouchStart}
    on:touchmove={resize.onTouchMove}
    on:touchend={resize.onTouchEnd}
    on:keydown={resize.onKeydown}
></div>
```

Add `max-md:hidden` to the class list:
```svelte
<div
    role="separator"
    aria-orientation="vertical"
    aria-label="Resize study panel"
    tabindex="0"
    class="w-[5px] shrink-0 cursor-col-resize hover:bg-[rgba(128,128,128,0.2)] focus:bg-[rgba(128,128,128,0.3)] transition-colors duration-fast self-stretch outline-none max-md:hidden"
    on:mousedown={resize.onDividerMousedown}
    on:touchstart={resize.onTouchStart}
    on:touchmove={resize.onTouchMove}
    on:touchend={resize.onTouchEnd}
    on:keydown={resize.onKeydown}
></div>
```

- [ ] **Step 7: Verify type-check**

```bash
cd "/Users/Janvier/Library/Mobile Documents/com~apple~CloudDocs/for-the-kingdom/douayrheimsbible"
npx tsc --noEmit
```

- [ ] **Step 8: Manual test**

iPhone 14 Pro viewport on a book with study mode (e.g. `/odr/genesis/1`):
- Read mode: text fills full width, no study panel visible, bottom of content not hidden behind tab bar
- Tap "Study" in tab bar: text column disappears, study panel fills full width, resize divider absent
- Tap "Read" in tab bar: text column returns, study panel hidden
- Desktop (toggle off mobile emulation): side-by-side panel behavior identical to before, resize divider present

- [ ] **Step 9: Commit**

```bash
cd "/Users/Janvier/Library/Mobile Documents/com~apple~CloudDocs/for-the-kingdom/douayrheimsbible"
npx prettier --write "src/lib/components/BibleReader.svelte"
git add src/lib/components/BibleReader.svelte
git commit -m "feat: study panel goes full-width on mobile with tab-switcher behavior"
```
