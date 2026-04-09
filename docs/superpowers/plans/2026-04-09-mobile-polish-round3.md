# Mobile Polish Round 3 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 8 UX issues: verse padding, font dropdown scroll, Text tab spacing, theme preview size, sticky reading options tabs, column width visibility, study panel sticky intro subtab, and study panel text density.

**Architecture:** Three independent tasks across three files. Tasks 1 and 3 are single-file; Task 2 touches ReadingPrefs with five related changes committed together. No new files. No desktop layout changed.

**Tech Stack:** SvelteKit, Svelte 4, TypeScript, Tailwind CSS, CSS media queries in `<style>` blocks.

---

## File Map

| File | Role |
|------|------|
| `src/lib/components/BibleReader.svelte` | Reduce `max-md:px-[12px]` → `max-md:px-[8px]` on `<main>` |
| `src/lib/components/ReadingPrefs.svelte` | Sticky tabs, font scroll, Text tab spacing, theme previews, column width hide |
| `src/lib/components/StudyPanel.svelte` | Sticky intro subtab row, mobile font/margin density |

---

### Task 1: BibleReader — reduce verse left padding

**Files:**
- Modify: `src/lib/components/BibleReader.svelte` (line 306)

---

- [ ] **Step 1: Reduce padding**

Find line 306:
```svelte
class="flex-1 min-w-0 px-md max-md:px-[12px] pt-[20px] pb-xl max-md:pb-[80px]"
```

Replace with:
```svelte
class="flex-1 min-w-0 px-md max-md:px-[8px] pt-[20px] pb-xl max-md:pb-[80px]"
```

- [ ] **Step 2: Type-check**

```bash
cd "/Users/Janvier/Library/Mobile Documents/com~apple~CloudDocs/for-the-kingdom/douayrheimsbible"
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd "/Users/Janvier/Library/Mobile Documents/com~apple~CloudDocs/for-the-kingdom/douayrheimsbible"
npx prettier --write "src/lib/components/BibleReader.svelte"
git add src/lib/components/BibleReader.svelte
git commit -m "fix: reduce verse left padding to 8px on mobile"
```

---

### Task 2: ReadingPrefs — sticky tabs, font scroll, spacing, theme previews, column width

**Files:**
- Modify: `src/lib/components/ReadingPrefs.svelte`

**Context:** Five independent mobile improvements to the reading options panel:
1. Tab bar (Text/Reading/Verse) must stick to the top of the 320px scroll container when content scrolls.
2. Opening the font dropdown should scroll the Font section heading to the top of the panel.
3. Text tab inner spacing is too loose — tighten from `space-y-md` to `space-y-[10px]`.
4. Theme preview cards are too tall on mobile — smaller inner padding and letter size; extra margin below the grid.
5. Column width control is irrelevant on mobile — hide with `hidden md:block`.

---

- [ ] **Step 1: Add `fontSectionEl` ref variable**

In the `<script>` block, after line 113 (`let activeTab: 'text' | 'reading' | 'verse' = 'text';`), add:

```typescript
let fontSectionEl: HTMLElement;
```

- [ ] **Step 2: Make tab bar sticky**

Find line 118:
```svelte
<div class="flex border-b border-border mb-md -mx-md px-md">
```

Replace with:
```svelte
<div class="flex border-b border-border mb-md -mx-md px-md sticky top-0 z-10 bg-panel">
```

- [ ] **Step 3: Tighten Text tab spacing**

Find line 133:
```svelte
<div class="space-y-md">
```
(This is the first `space-y-md` inside `{#if activeTab === 'text'}`)

Replace with:
```svelte
<div class="space-y-[10px]">
```

- [ ] **Step 4: Bind fontSectionEl and update click handler to scroll on open**

Find the font section div at line 174:
```svelte
			<div class="relative">
				<span class="block mb-xs">Font</span>
```

Replace with:
```svelte
			<div class="relative" bind:this={fontSectionEl}>
				<span class="block mb-xs">Font</span>
```

Then find the font dropdown button's click handler at line 181:
```svelte
					on:click={() => (fontDropdownOpen = !fontDropdownOpen)}
```

Replace with:
```svelte
					on:click={() => {
						fontDropdownOpen = !fontDropdownOpen;
						if (fontDropdownOpen) fontSectionEl?.scrollIntoView({ block: 'start', behavior: 'smooth' });
					}}
```

- [ ] **Step 5: Make theme previews smaller on mobile**

Find line 224 (the Theme section wrapper — `<div>` just before `<span class="block mb-xs">Theme</span>`):
```svelte
			<div>
				<span class="block mb-xs">Theme</span>
```

Replace with:
```svelte
			<div class="max-md:mb-[8px]">
				<span class="block mb-xs">Theme</span>
```

Find line 235:
```svelte
						<div class="theme-card-inner p-[7px]">
```

Replace with:
```svelte
						<div class="theme-card-inner p-[7px] max-md:p-[4px]">
```

Find lines 237–240 (the "A" letter span inside theme cards):
```svelte
									<span
										class="font-reader text-[15px] leading-none font-bold"
										style="color: {t.fg};">A</span
									>
```

Replace with:
```svelte
									<span
										class="font-reader text-[15px] max-md:text-[11px] leading-none font-bold"
										style="color: {t.fg};">A</span
									>
```

- [ ] **Step 6: Hide column width control on mobile**

Find line 263 (inside the Reading tab, the column width section):
```svelte
			<div>
				<span class="block mb-xs">Column width</span>
```

Replace with:
```svelte
			<div class="hidden md:block">
				<span class="block mb-xs">Column width</span>
```

- [ ] **Step 7: Type-check**

```bash
cd "/Users/Janvier/Library/Mobile Documents/com~apple~CloudDocs/for-the-kingdom/douayrheimsbible"
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
cd "/Users/Janvier/Library/Mobile Documents/com~apple~CloudDocs/for-the-kingdom/douayrheimsbible"
npx prettier --write "src/lib/components/ReadingPrefs.svelte"
git add src/lib/components/ReadingPrefs.svelte
git commit -m "fix: sticky tabs, font scroll, tighter spacing, smaller theme previews, hide column width on mobile"
```

---

### Task 3: StudyPanel — sticky intro subtab row and text density

**Files:**
- Modify: `src/lib/components/StudyPanel.svelte`

**Context:** Two independent fixes:
1. The intro subtab row (shown when a book has multiple intro sections, e.g. Genesis: Argument, Sum, etc.) lives inside `panel-scroll` but isn't sticky — it scrolls away when reading long intros. Make it `position: sticky; top: 0` inside `panel-scroll`.
2. On mobile the side padding is 52px (huge) and text is 14–16px. Reduce with CSS media queries: content text and annotation titles to 12px, side padding to 12px.

---

- [ ] **Step 1: Make intro subtab row sticky**

Find line 233:
```svelte
					<div
						class="subtab-row flex overflow-x-auto border-b border-border bg-background shrink-0"
					>
```

Replace with:
```svelte
					<div
						class="subtab-row flex overflow-x-auto border-b border-border bg-background sticky top-0 z-[2]"
					>
```

(`shrink-0` is removed because sticky elements don't need it; `z-[2]` ensures it paints above scrolling content.)

- [ ] **Step 2: Add mobile CSS media queries for font sizes and padding**

At the end of the `<style>` block (before the closing `</style>` tag, after line 625), add:

```css
	/* ─── Mobile density overrides ─────────────────── */
	@media (max-width: 767px) {
		.content-block {
			padding: 12px 16px;
		}

		.sub-section {
			padding: 4px 12px 10px;
		}

		.sub-section:last-child {
			padding-bottom: 14px;
		}

		.verse-section-header {
			padding: 8px 12px 4px;
		}

		.verse-section-header-sticky {
			padding-top: 10px;
			padding-bottom: 10px;
		}

		.cr-text {
			font-size: 12px;
		}

		.note-text {
			font-size: 12px;
		}

		.annotation-title {
			font-size: 12px;
			margin: 6px 0 5px;
		}
	}
```

- [ ] **Step 3: Type-check**

```bash
cd "/Users/Janvier/Library/Mobile Documents/com~apple~CloudDocs/for-the-kingdom/douayrheimsbible"
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd "/Users/Janvier/Library/Mobile Documents/com~apple~CloudDocs/for-the-kingdom/douayrheimsbible"
npx prettier --write "src/lib/components/StudyPanel.svelte"
git add src/lib/components/StudyPanel.svelte
git commit -m "fix: sticky intro subtab row; reduce font sizes and padding on mobile"
```
