# Mobile Refinements — Design Spec

## Goal

Fix eight UX issues discovered after the first mobile redesign pass.

## Scope

Primarily mobile (`max-md`). Two changes are device-agnostic: default read mode reset and chapter nav font size reduction.

---

## Problem Summary

1. **Reading options panel direction** — slides up from bottom, covering the text. User can't see font/spacing changes while the panel is open.
2. **Reading options panel height jumps** — switching tabs (Text / Reading / Verse) changes the panel height because content lengths differ.
3. **Background scrolls through panel** — tapping the panel area, or even a natural scroll gesture, scrolls the Bible text behind the open panel.
4. **Back button doesn't close panel** — pressing the browser back button / swipe-back navigates away instead of closing the sheet.
5. **readingMode persists across sessions** — if user was in study mode last session, the reader opens in study mode on next visit. Should always start in read mode.
6. **Chapter nav button text too large on mobile** — `text-[16px]` is too large for narrow screens, especially long book/chapter names.
7. **Too much left padding on verses** — `px-md` on `<main>` in `BibleReader.svelte` leaves too little reading width on mobile.
8. **Study panel not full-width on mobile** — the outer panel container has `shrink-0` but no explicit width, so it doesn't expand to fill the viewport when `<main>` is hidden.

---

## Design Decisions

### 1. Reading options — slide down from top

**New behavior:** The panel slides down from just below the header instead of up from the bottom.

- `top: var(--header-height)` (same anchor as desktop panel, but full-width)
- `border-radius: 0 0 12px 12px` (rounded bottom corners only)
- `transition:fly={{ y: -30, duration: 200, easing: cubicOut }}` — subtle drop-in from above
- No drag handle (was only needed for bottom-sheet pattern)
- Dismiss: tap overlay or back button (see §4)
- The overlay (`z-[55]`) sits below the panel (`z-[60]`), so tapping outside the panel closes it
- On desktop: no change — the existing `fixed top-[var(--header-height)] right-md w-72` panel is unchanged

**Why:** The panel drops down just below the header, leaving the Bible text partially visible below it. The user can see font size, spacing, and theme changes in real time without the panel being dismissed.

### 2. Reading options — fixed height

The mobile sheet gets a fixed-height inner container so tab switches don't resize the panel:

```css
height: 320px;
overflow-y: auto;
```

Applied to the content wrapper inside the mobile panel (wrapping `<ReadingPrefs />`). The panel chrome (tabs row) stays outside this container and is always visible at the top.

### 3. Body scroll lock

When the mobile reading options panel is open, prevent the body from scrolling behind it:

```typescript
$: if (browser) {
    document.body.style.overflow = $isMobile && prefsOpen ? 'hidden' : '';
}
```

This reactive runs in `TopBar.svelte`. Clears `overflow` when the panel closes or when on desktop.

### 4. Back button dismiss

When the mobile reading options panel opens, push a shallow history entry:

```typescript
if ($isMobile) history.pushState({ prefsOpen: true }, '');
```

Listen for `popstate` in `onMount`:

```typescript
function onPopState(e: PopStateEvent) {
    if (prefsOpen) {
        prefsOpen = false;
        e.preventDefault?.(); // no-op on popstate but signals intent
    }
}
window.addEventListener('popstate', onPopState);
```

Remove listener in `onDestroy`. If the user dismisses via overlay or back button, the pushed history state is consumed and the back-navigation is absorbed.

### 5. readingMode always resets to 'reading' on load

In `BibleReader.svelte` `onMount`, unconditionally reset:

```typescript
prefs.update((p) => ({ ...p, readingMode: 'reading' }));
```

No device condition. Study mode is a per-session choice; it is not persisted across page loads.

### 6. Chapter nav button font size and line height

Reduce the nav label span from `text-[16px]` to `text-[13px] md:text-[16px]` and add `leading-tight` (or `leading-[1.2]`). The chevron icon stays `text-[12px]`. This prevents overflow on long book names like "Ecclesiasticus 45" on narrow phones and tightens the vertical rhythm of the button.

### 7. Verse left padding

In `BibleReader.svelte`, the `<main>` element currently has `px-md`. Add `max-md:px-[12px]` to reduce the horizontal padding on mobile, giving more reading width.

Full updated class:
```
class="flex-1 min-w-0 px-md max-md:px-[12px] pt-[20px] pb-xl max-md:pb-[80px]"
```

### 8. Study panel full-width fix

The outer panel container (`class="shrink-0 sticky flex [overflow:clip]"`) needs `max-md:w-full` when in study mode so it expands to fill the viewport after `<main>` is hidden.

Add to the container:
```svelte
class:max-md:w-full={$prefs.readingMode === 'study'}
```

Or via inline style — set `width: 100%` on mobile alongside the existing `max-width: panelMaxWidth`:

```typescript
$: panelWidth = $isMobile && $prefs.readingMode === 'study' ? '100%' : '';
```

And in the style attribute: `width: {panelWidth};`

---

## Files to Change

| File | What changes |
|------|-------------|
| `src/lib/components/TopBar.svelte` | Import `isMobile` from `$lib/stores/mobile`; import `onMount`/`onDestroy` from `svelte`; import `browser` from `$app/environment`; panel direction (fly y=-30), rounded bottom corners, fixed-height inner container, body scroll lock reactive, popstate listener in onMount/onDestroy |
| `src/lib/components/TopBar.svelte` | Chapter nav label: `text-[13px] md:text-[16px]` |
| `src/lib/components/BibleReader.svelte` | `onMount` readingMode reset; `max-md:px-[12px]` on `<main>`; `width: 100%` on panel container on mobile in study mode |

| `src/lib/components/FloatingNav.svelte` | Reduce `max-h-[72vh]` to `max-h-[calc(100vh-var(--header-height)-56px)]` on mobile so the panel doesn't overlap the tab bar |

**Not changed:** `ReadingPrefs.svelte`, `mobile.ts`, `prefs.ts`, `VerseList.svelte`.

---

## Out of Scope

- Sub-project B (compare page mobile, site-wide nav, verse tag stripping)
- Gesture-based drag for the reading options panel
- Any desktop layout changes
