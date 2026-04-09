# Mobile Polish Round 3 — Design Spec

## Goal

Fix 8 UX issues discovered after the second mobile pass: verse padding, font dropdown scroll, Text tab spacing, theme preview size, sticky reading options tabs, column width visibility, study panel sticky header, and study panel text density.

## Scope

Primarily mobile. Items 3, 5, 6 affect ReadingPrefs in both contexts but are safe — sticky acts like normal flow when nothing scrolls; hidden md:block only removes the column width on mobile.

---

## Changes

### 1. Verse left padding — BibleReader.svelte

Reduce `max-md:px-[12px]` to `max-md:px-[8px]` on `<main>`.

### 2. Font dropdown scroll — ReadingPrefs.svelte

When the font dropdown opens, call `scrollIntoView({ block: 'start', behavior: 'smooth' })` on the Font section heading element. The 320px `overflow-y: auto` container in TopBar is the nearest scrollable ancestor, so the call targets it automatically. No prop threading or custom events needed.

Implementation: bind a ref to the Font heading (`bind:this={fontHeadingEl}`). In the font dropdown toggle function, after setting `fontOpen = true`, call `fontHeadingEl?.scrollIntoView({ block: 'start', behavior: 'smooth' })`.

### 3. Text tab tighter spacing — ReadingPrefs.svelte

Change the Text tab content wrapper from `space-y-md` to `space-y-[10px]`.

### 4. Theme previews smaller on mobile — ReadingPrefs.svelte

Add mobile-only overrides to the theme grid:
- Card inner padding: add `max-md:p-[4px]` (was `p-[7px]`)
- "A" letter: add `max-md:text-[11px]` (was `text-[15px]`)
- Theme grid container: add `max-md:mb-[8px]` for bottom margin

### 5. Sticky tabs — ReadingPrefs.svelte

Add to the tab bar div:
```css
position: sticky;
top: 0;
z-index: 10;
background: var(--color-panel);
```

The 320px overflow container in TopBar is the scroll ancestor. Tabs pin to its top edge while tab content scrolls beneath. On desktop (no overflow) sticky is a no-op.

### 6. Hide column width on mobile — ReadingPrefs.svelte

Wrap the column width section in `<div class="hidden md:block">`.

### 7. Study panel sticky header on Intro tab — StudyPanel.svelte

The study panel tab row (the bar containing Commentary / Introduction / etc.) must remain visible as content scrolls. On the Commentary tab this works because the verse list overflows; on the Intro tab it may not because intro content is sometimes sparse or the scroll context is different.

Fix: ensure the study panel's inner scroll container always has `overflow-y: auto` explicitly set (not just implied), and give the tab header row `position: sticky; top: 0; z-index: 2; background: var(--color-panel)` so it pins correctly regardless of content volume.

### 8. Study panel text density — StudyPanel.svelte

Mobile-only reductions:
- Content text (`font-size: 14px`): reduce to `12px` on mobile
- Annotation/commentary titles (`font-size: 16px`): reduce to `12px` on mobile
- Horizontal padding: `px-[14px]` → add `max-md:px-[10px]`
- Section header text (`font-size: 10px`): stays at `10px` (already small)

---

## Files to Change

| File | Changes |
|------|---------|
| `src/lib/components/BibleReader.svelte` | `max-md:px-[8px]` on `<main>` |
| `src/lib/components/ReadingPrefs.svelte` | Font scroll (§2), Text tab spacing (§3), theme previews (§4), sticky tabs (§5), hide column width (§6) |
| `src/lib/components/StudyPanel.svelte` | Sticky tab row (§7), font/margin density (§8) |

**Not changed:** TopBar.svelte, FloatingNav.svelte, BibleReader study panel container.

---

## Out of Scope

- Sub-project B (compare page mobile, site-wide nav, verse tag stripping)
- Desktop layout changes
- Gesture-based drag for reading options
