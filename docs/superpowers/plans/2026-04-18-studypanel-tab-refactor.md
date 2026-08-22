# StudyPanel Tab Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the StudyPanel component to use a unified, configurable tab system and split ODR's monolithic "Commentary" tab into three focused tabs: Annotations, Notes, and Cross-Refs.

**Architecture:** The current StudyPanel has three hardcoded rendering branches (ODR, Confraternity, DRC/Knox/CPDV) with separate tab types and tab bars. This refactor unifies them into a single tab configuration system where each translation declares which tabs it supports. ODR's per-verse interleaved content (annotations + notes + cross-refs) is split into three dedicated tabs, each showing only its content type but still organized by verse for scroll sync.

**Tech Stack:** SvelteKit 2, Svelte 4 syntax (`export let`, `$:`, `on:click`), TypeScript

---

## Context

### Current StudyPanel Structure (1515 lines)

The StudyPanel has three completely separate rendering paths:

1. **ODR** (`isOdr`): Tab bar with [Intro, Commentary, Article, End]. The "Commentary" tab interleaves all three content types per verse:
   - Annotations (long-form commentaries from sidecar JSONs, with their own internal notes)
   - Cross-references (from `verse.cross_refs`)
   - Notes (from `verse.notes` and `chapter.summary_notes`)

2. **Confraternity** (`isConf`): Separate tab bar with [Intro, Footnotes, Commentary]

3. **DRC/Knox/CPDV** (`hasTranslationNotes`): No tabs, flat note list

4. **KJV/Vulgate**: Empty state

### Key Files

| File | Role |
|------|------|
| `src/lib/components/StudyPanel.svelte` | The component being refactored |
| `src/lib/stores/studyPanel.ts` | Store: `StudyTab` type, `StudyPanelState`, `scrollTrigger` |
| `src/lib/stores/prefs.ts` | Persists `studyDefaultTab` preference |
| `src/lib/data/types.ts` | `ChapterAnnotations`, `AnnotationEntry`, `Verse`, `CrossRef`, `VerseNote`, etc. |
| `src/lib/components/AnnotationProse.svelte` | Renders annotation prose with `<mn>` markers |
| `src/lib/components/CrossRefText.svelte` | Renders cross-reference text |

### Target Tab Configuration

| Translation | Tabs |
|---|---|
| **ODR** | Intro*, Annotations, Notes, Cross-Refs, Article*, End* |
| **Confraternity** | Intro*, Footnotes, Commentary |
| **DRC/Knox/CPDV** | Notes |
| **KJV/Vulgate** | _(empty state)_ |

\* = conditional on data availability

---

## Task 1: Update StudyTab type and store

**Files:**
- Modify: `src/lib/stores/studyPanel.ts`

- [ ] **Step 1: Extend the StudyTab type with new tab IDs**

In `src/lib/stores/studyPanel.ts`, the current type is:

```typescript
export type StudyTab = 'intro' | 'commentary' | 'article' | 'end' | 'footnotes';
```

Change it to:

```typescript
export type StudyTab = 'intro' | 'commentary' | 'article' | 'end' | 'footnotes' | 'annotations' | 'notes' | 'cross-refs';
```

The default `activeTab` in `defaults` should change from `'commentary'` to `'annotations'`:

```typescript
const defaults: StudyPanelState = {
    activeTab: 'annotations',
    // ... rest unchanged
};
```

- [ ] **Step 2: Run type check**

Run: `npx svelte-check --tsconfig tsconfig.json 2>&1 | head -30`

Expected: No new type errors (existing code still compiles because the old tab IDs are still in the union).

- [ ] **Step 3: Commit**

```bash
git add src/lib/stores/studyPanel.ts
git commit -m "refactor: extend StudyTab type with annotations/notes/cross-refs"
```

---

## Task 2: Unify tab bar and tab configuration in StudyPanel

**Files:**
- Modify: `src/lib/components/StudyPanel.svelte`

This task replaces the two separate tab systems (ODR's `TabDef`/`visibleTabs` and Confraternity's `ConfTabDef`/`confVisibleTabs`) with a single unified system.

- [ ] **Step 1: Replace dual tab types with a single TabDef type**

In StudyPanel.svelte `<script>`, find the two tab type definitions:

```typescript
type TabDef = { id: 'intro' | 'commentary' | 'article' | 'end'; label: string };
```

and

```typescript
type ConfTabDef = { id: 'intro' | 'footnotes' | 'commentary'; label: string };
```

Remove both. Replace with a single type that uses the store's `StudyTab`:

```typescript
import type { StudyTab } from '$lib/stores/studyPanel';

type TabDef = { id: StudyTab; label: string };
```

- [ ] **Step 2: Replace dual visibleTabs reactives with a single one**

Remove the existing `visibleTabs` reactive (ODR-only):

```typescript
$: visibleTabs = ([] as TabDef[])
    .concat(hasIntros ? [{ id: 'intro', label: 'Intro' }] : [])
    .concat([{ id: 'commentary', label: 'Commentary' }])
    .concat(hasArticles ? [{ id: 'article', label: 'Article' }] : [])
    .concat(hasEndMatters ? [{ id: 'end', label: 'End' }] : []);
$: showTabBar = visibleTabs.length > 1;
```

Remove the Confraternity `confVisibleTabs` reactive:

```typescript
$: confVisibleTabs = ((): ConfTabDef[] => { ... })();
$: confShowTabBar = confVisibleTabs.length > 1;
$: confSliderIndex = ...;
```

Replace all of them with a single reactive that builds tabs for any translation:

```typescript
$: visibleTabs = buildVisibleTabs(translationId, hasIntros, hasArticles, hasEndMatters, confIntro);
$: showTabBar = visibleTabs.length > 1;
$: sliderIndex = Math.max(0, visibleTabs.findIndex((t) => t.id === $studyPanel.activeTab));

function buildVisibleTabs(
    tid: string,
    hasIntros: boolean,
    hasArticles: boolean,
    hasEndMatters: boolean,
    confIntro: ConfIntro | null
): TabDef[] {
    if (tid === 'odr') {
        return [
            ...(hasIntros ? [{ id: 'intro' as StudyTab, label: 'Intro' }] : []),
            { id: 'annotations' as StudyTab, label: 'Annotations' },
            { id: 'notes' as StudyTab, label: 'Notes' },
            { id: 'cross-refs' as StudyTab, label: 'Cross-Refs' },
            ...(hasArticles ? [{ id: 'article' as StudyTab, label: 'Article' }] : []),
            ...(hasEndMatters ? [{ id: 'end' as StudyTab, label: 'End' }] : []),
        ];
    }
    if (tid === 'conf') {
        const tabs: TabDef[] = [];
        if (confIntro && (confIntro.bibleIntro.length > 0 || confIntro.commentaryIntro.length > 0)) {
            tabs.push({ id: 'intro', label: 'Intro' });
        }
        tabs.push({ id: 'footnotes', label: 'Footnotes' });
        tabs.push({ id: 'commentary', label: 'Commentary' });
        return tabs;
    }
    if (tid === 'drc' || tid === 'cpdv' || tid === 'knox') {
        return [{ id: 'notes', label: 'Notes' }];
    }
    // KJV, Vulgate, etc. — no tabs
    return [];
}
```

- [ ] **Step 3: Remove the old `sliderIndex` and `confSliderIndex` reactives**

The old code has:

```typescript
$: sliderIndex = Math.max(0, visibleTabs.findIndex((t) => t.id === $studyPanel.activeTab));
```

This already exists — keep it. Remove `confSliderIndex`:

```typescript
// DELETE THIS:
$: confSliderIndex = Math.max(0, confVisibleTabs.findIndex((t) => t.id === $studyPanel.activeTab));
```

- [ ] **Step 4: Update the book-change tab initialization logic**

Find the reactive block that starts with `$: if (bookData && bookData.book !== prevBook)`. Replace it entirely with:

```typescript
$: if (bookData && bookData.book !== prevBook) {
    prevBook = bookData.book;
    const preferred = $prefs.studyDefaultTab;

    // Find the best default tab for this translation
    let defaultTab: StudyTab;
    if (translationId === 'odr') {
        defaultTab = 'annotations';
        if (preferred === 'annotations' || preferred === 'notes' || preferred === 'cross-refs') {
            defaultTab = preferred;
        }
        if (preferred === 'intro' && hasIntros) defaultTab = 'intro';
        if (preferred === 'article' && hasArticles) defaultTab = 'article';
        if (preferred === 'end' && hasEndMatters) defaultTab = 'end';
    } else if (translationId === 'conf') {
        defaultTab = 'footnotes';
        if (preferred === 'footnotes' || preferred === 'commentary') {
            defaultTab = preferred;
        }
        if (
            preferred === 'intro' &&
            confIntro &&
            (confIntro.bibleIntro.length > 0 || confIntro.commentaryIntro.length > 0)
        ) {
            defaultTab = 'intro';
        }
    } else if (hasTranslationNotes) {
        defaultTab = 'notes';
    } else {
        defaultTab = 'annotations'; // fallback
    }

    const idx = intros.findIndex((i) => i.default);
    studyPanel.update((s) => ({
        ...s,
        activeTab: defaultTab,
        activeIntroIndex: idx >= 0 ? idx : 0,
        activeEndIndex: 0,
        activeArticleIndex: 0
    }));
}
```

- [ ] **Step 5: Update the article-tab fallback reactive**

Change:

```typescript
$: if ($studyPanel.activeTab === 'article' && !hasArticles) {
    studyPanel.update((s) => ({ ...s, activeTab: 'commentary' }));
}
```

To:

```typescript
$: if ($studyPanel.activeTab === 'article' && !hasArticles) {
    studyPanel.update((s) => ({ ...s, activeTab: isOdr ? 'annotations' : 'commentary' }));
}
```

- [ ] **Step 6: Update the switchTab function signature**

Change:

```typescript
function switchTab(tab: 'intro' | 'commentary' | 'article' | 'end' | 'footnotes') {
```

To:

```typescript
function switchTab(tab: StudyTab) {
```

- [ ] **Step 7: Run type check**

Run: `npx svelte-check --tsconfig tsconfig.json 2>&1 | head -40`

Expected: No type errors. Template will still reference old variables (`confVisibleTabs`, `confShowTabBar`, `confSliderIndex`) — those template changes come in the next task.

- [ ] **Step 8: Commit**

```bash
git add src/lib/components/StudyPanel.svelte
git commit -m "refactor: unify tab configuration into single buildVisibleTabs function"
```

---

## Task 3: Unify the template tab bar rendering

**Files:**
- Modify: `src/lib/components/StudyPanel.svelte`

Currently there are two separate tab bar blocks in the template: one inside `{#if isOdr && showTabBar}` and another inside `{#if confShowTabBar}`. This task merges them into a single tab bar that renders for any translation with tabs.

- [ ] **Step 1: Replace the two tab bars with a single one**

Find the ODR-only tab bar (around line 554):

```svelte
<!-- Tabs with sliding underline (ODR only) -->
{#if isOdr && showTabBar}
    <div class="tab-row relative flex px-[4px] gap-[2px]" role="tablist" ...>
        {#each visibleTabs as tab}
            <button role="tab" ...>{tab.label}</button>
        {/each}
        <div class="tab-slider" ...></div>
    </div>
{/if}
```

Change the condition from `{#if isOdr && showTabBar}` to just `{#if showTabBar}`:

```svelte
{#if showTabBar}
    <div
        class="tab-row relative flex px-[4px] gap-[2px]"
        role="tablist"
        aria-label="Study panel sections"
    >
        {#each visibleTabs as tab}
            <button
                role="tab"
                aria-selected={$studyPanel.activeTab === tab.id}
                class="tab-btn flex-1 pb-[9px] pt-[2px]"
                class:tab-active={$studyPanel.activeTab === tab.id}
                on:click={() => switchTab(tab.id)}
            >
                {tab.label}
            </button>
        {/each}
        <div
            class="tab-slider"
            style="width: calc({100 / visibleTabs.length}% - 4px); transform: translateX({sliderIndex * 100}%)"
            aria-hidden="true"
        ></div>
    </div>
{/if}
```

- [ ] **Step 2: Remove the Confraternity tab bar block**

Find the Confraternity tab bar (around line 652):

```svelte
<!-- Confraternity tab bar -->
{#if confShowTabBar}
    <div class="tab-row relative flex px-[4px] gap-[2px]" role="tablist" ...>
        {#each confVisibleTabs as tab}
            ...
        {/each}
        <div class="tab-slider" style="... confSliderIndex ..."></div>
    </div>
{/if}
<div class="border-b border-border"></div>
```

Delete this entire block. The unified tab bar above now handles Confraternity tabs too.

- [ ] **Step 3: Verify visually**

Run: `npm run dev`

Open the app in a browser. Navigate to:
- An ODR chapter (e.g., `/odr/genesis/1`) — should see tabs: Intro, Annotations, Notes, Cross-Refs
- A Confraternity chapter (e.g., `/conf/matthew/1`) — should see tabs: Intro, Footnotes, Commentary
- A DRC chapter (e.g., `/drc/genesis/1`) — should see no tab bar (single tab)

At this point the ODR "Annotations", "Notes", and "Cross-Refs" tabs won't render content yet (they'll show empty or the old Commentary content depending on the template state). That's expected — content rendering comes in the next task.

- [ ] **Step 4: Commit**

```bash
git add src/lib/components/StudyPanel.svelte
git commit -m "refactor: unify tab bar rendering for all translations"
```

---

## Task 4: Restructure the template for ODR's three content tabs

**Files:**
- Modify: `src/lib/components/StudyPanel.svelte`

This is the core change: replacing the monolithic ODR Commentary tab (which interleaves annotations, notes, and cross-refs per verse) with three focused tabs that each show only one content type.

- [ ] **Step 1: Restructure the main template branching**

The current template has a top-level `{#if !isOdr} ... {:else} ... {/if}` split. We'll restructure it so ALL translations use the same flow: tab bar → sub-tabs → scrollable content area → tab content blocks.

Replace the entire `{#if !isOdr}` ... `{:else}` ... `{/if}` section (from after `<div class="border-b border-border"></div>` to before `</aside>`) with the new unified structure below.

The key insight: ODR's Intro/Article/End tabs stay exactly as they are. Only the Commentary tab is replaced by three new tabs. Non-ODR translations keep their existing rendering. The big `{#if !isOdr}` branch is eliminated — instead, each `activeTab` value gets its own `{:else if}` block.

```svelte
<!-- Sub-tab segmented controls (outside scroll — applies to any translation) -->
{#if $studyPanel.activeTab === 'intro' && isOdr && intros.length > 1}
    <div class="subtab-bar shrink-0">
        <div class="segmented-control" style="grid-template-columns: repeat({intros.length}, 1fr)">
            {#each intros as intro, i}
                <button
                    class="seg-btn"
                    class:seg-active={$studyPanel.activeIntroIndex === i}
                    on:click={() => studyPanel.update((s) => ({ ...s, activeIntroIndex: i }))}
                >
                    {tabLabel(intro.title)}
                </button>
            {/each}
            <div
                class="seg-slider"
                style="width: {100 / intros.length}%; transform: translateX({$studyPanel.activeIntroIndex * 100}%)"
                aria-hidden="true"
            ></div>
        </div>
    </div>
{:else if $studyPanel.activeTab === 'intro' && isConf && confIntro}
    <div class="subtab-bar shrink-0">
        <div class="segmented-control" style="grid-template-columns: repeat(2, 1fr)">
            <button
                class="seg-btn"
                class:seg-active={$studyPanel.activeConfIntroTab === 'bible'}
                on:click={() => studyPanel.update((s) => ({ ...s, activeConfIntroTab: 'bible' }))}
            >
                Confraternity Bible
            </button>
            <button
                class="seg-btn"
                class:seg-active={$studyPanel.activeConfIntroTab === 'commentary'}
                on:click={() => studyPanel.update((s) => ({ ...s, activeConfIntroTab: 'commentary' }))}
            >
                Supplemental Commentary
            </button>
            <div
                class="seg-slider"
                style="width: 50%; transform: translateX({$studyPanel.activeConfIntroTab === 'bible' ? 0 : 100}%)"
                aria-hidden="true"
            ></div>
        </div>
    </div>
{:else if $studyPanel.activeTab === 'article' && isOdr && articles.length > 1}
    <div class="subtab-bar shrink-0">
        <div class="segmented-control" style="grid-template-columns: repeat({articles.length}, 1fr)">
            {#each articles as art, i}
                <button
                    class="seg-btn"
                    class:seg-active={$studyPanel.activeArticleIndex === i}
                    on:click={() => studyPanel.update((s) => ({ ...s, activeArticleIndex: i }))}
                >
                    {tabLabel(art.title)}
                </button>
            {/each}
            <div
                class="seg-slider"
                style="width: {100 / articles.length}%; transform: translateX({$studyPanel.activeArticleIndex * 100}%)"
                aria-hidden="true"
            ></div>
        </div>
    </div>
{:else if $studyPanel.activeTab === 'end' && isOdr && endMatters.length > 1}
    <div class="subtab-bar shrink-0">
        <div class="segmented-control" style="grid-template-columns: repeat({endMatters.length}, 1fr)">
            {#each endMatters as em, i}
                <button
                    class="seg-btn"
                    class:seg-active={$studyPanel.activeEndIndex === i}
                    on:click={() => studyPanel.update((s) => ({ ...s, activeEndIndex: i }))}
                >
                    {tabLabel(em.title)}
                </button>
            {/each}
            <div
                class="seg-slider"
                style="width: {100 / endMatters.length}%; transform: translateX({$studyPanel.activeEndIndex * 100}%)"
                aria-hidden="true"
            ></div>
        </div>
    </div>
{/if}

<!-- Scrollable content area -->
<!-- svelte-ignore a11y-no-static-element-interactions a11y-mouse-events-have-key-events -->
<div
    class="panel-scroll flex-1 overflow-y-scroll"
    bind:this={panelScroll}
    on:mouseover={hasLinkifiedNotes || isConf ? handleConfRefOver : undefined}
    on:mouseout={hasLinkifiedNotes || isConf ? handleConfRefOut : undefined}
>
    <!-- ═══ ODR: Intro tab ═══ -->
    {#if $studyPanel.activeTab === 'intro' && isOdr}
        {#if intros.length === 0}
            <div class="empty-state">
                <span class="empty-icon" aria-hidden="true">✦</span>
                <p>No introduction for this book yet.</p>
            </div>
        {:else if intros[$studyPanel.activeIntroIndex]}
            {@const intro = intros[$studyPanel.activeIntroIndex]}
            <div class="content-block">
                {#if currentBookSlug === 'genesis' || currentBookSlug === 'matthew'}
                    {@const bookMeta = getBookBySlug(currentBookSlug)}
                    <a
                        href="/reference/{bookMeta?.testament === 'NT' ? 'nt' : 'ot'}/title-page"
                        target="_blank"
                        rel="noopener"
                        class="ref-gateway"
                    >
                        <span class="ref-gateway-label">
                            {bookMeta?.testament === 'NT' ? 'New' : 'Old'} Testament Reference
                        </span>
                        <span class="ref-gateway-desc">
                            {bookMeta?.testament === 'NT'
                                ? 'Preface, annotations, evangelical history & more'
                                : 'Preface, historical tables, glossary & more'}
                        </span>
                        <span class="ref-gateway-arrow" aria-hidden="true">↗</span>
                    </a>
                {/if}
                <p class="content-eyebrow">{tabLabel(intro.title)}</p>
                <AnnotationProse text={intro.text} notes={intro.notes ?? []} />
            </div>
        {/if}

    <!-- ═══ ODR: Annotations tab ═══ -->
    {:else if $studyPanel.activeTab === 'annotations' && isOdr}
        {#if annotationsLoading}
            <div class="empty-state"><p>Loading annotations...</p></div>
        {:else}
            {@const annotationSections = verseSections.filter((s) => s.annotationEntries.length > 0)}
            {#if annotationSections.length === 0}
                <div class="empty-state">
                    <span class="empty-icon" aria-hidden="true">✦</span>
                    <p>No annotations for this chapter yet.</p>
                </div>
            {:else}
                <div class="commentary-list">
                    {#each annotationSections as section (section.verse)}
                        <div
                            class="verse-section"
                            class:verse-section-active={$studyPanel.annotatedVerse === section.verse}
                            bind:this={sectionEls[section.verse]}
                            data-section-verse={section.verse}
                        >
                            <div
                                class="verse-section-header"
                                class:verse-section-header-sticky={section.verse !== 0}
                            >
                                {section.label}
                            </div>
                            {#each section.annotationEntries as ann}
                                <div
                                    class="annotation-block"
                                    data-panel-id="panel-{section.verse}-annotation-{ann.part}"
                                >
                                    {#if ann.title}<p class="annotation-title">
                                            {@html allcapsToSmallcaps(ann.title)}
                                        </p>{/if}
                                    <AnnotationProse text={ann.text} notes={ann.notes} />
                                </div>
                            {/each}
                        </div>
                    {/each}
                </div>
            {/if}
        {/if}

    <!-- ═══ ODR: Notes tab ═══ -->
    {:else if $studyPanel.activeTab === 'notes' && isOdr}
        {#if annotationsLoading}
            <div class="empty-state"><p>Loading notes...</p></div>
        {:else}
            {@const noteSections = verseSections.filter(
                (s) =>
                    (s.verse === 0 && currentChapterData?.summary_notes?.length) ||
                    (s.verseData?.notes && s.verseData.notes.length > 0)
            )}
            {#if noteSections.length === 0}
                <div class="empty-state">
                    <span class="empty-icon" aria-hidden="true">✦</span>
                    <p>No notes for this chapter.</p>
                </div>
            {:else}
                <div class="commentary-list">
                    {#each noteSections as section (section.verse)}
                        <div
                            class="verse-section"
                            class:verse-section-active={$studyPanel.annotatedVerse === section.verse}
                            bind:this={sectionEls[section.verse]}
                            data-section-verse={section.verse}
                        >
                            <div
                                class="verse-section-header"
                                class:verse-section-header-sticky={section.verse !== 0}
                            >
                                {section.label}
                            </div>

                            {#if section.verse === 0 && currentChapterData?.summary_notes}
                                {#each currentChapterData.summary_notes as sn}
                                    <div class="note-row sub-section-inline" data-panel-id="panel-0-note-{sn.marker}">
                                        <span class="note-marker">{sn.marker}</span>
                                        <span class="note-text">{@html allcapsToSmallcaps(sn.text)}</span>
                                    </div>
                                {/each}
                            {/if}

                            {#if section.verseData?.notes && section.verseData.notes.length > 0}
                                {#each section.verseData.notes as note}
                                    <div class="note-row sub-section-inline" data-panel-id="panel-{section.verse}-note-{note.label}">
                                        <span class="note-marker">{note.label}</span>
                                        <span class="note-text">{@html allcapsToSmallcaps(note.text)}</span>
                                    </div>
                                {/each}
                            {/if}
                        </div>
                    {/each}
                </div>
            {/if}
        {/if}

    <!-- ═══ ODR: Cross-Refs tab ═══ -->
    {:else if $studyPanel.activeTab === 'cross-refs' && isOdr}
        {#if annotationsLoading}
            <div class="empty-state"><p>Loading cross-references...</p></div>
        {:else}
            {@const crossRefSections = verseSections.filter(
                (s) => s.verseData?.cross_refs && s.verseData.cross_refs.length > 0
            )}
            {#if crossRefSections.length === 0}
                <div class="empty-state">
                    <span class="empty-icon" aria-hidden="true">✦</span>
                    <p>No cross-references for this chapter.</p>
                </div>
            {:else}
                <div class="commentary-list">
                    {#each crossRefSections as section (section.verse)}
                        <div
                            class="verse-section"
                            class:verse-section-active={$studyPanel.annotatedVerse === section.verse}
                            bind:this={sectionEls[section.verse]}
                            data-section-verse={section.verse}
                        >
                            <div class="verse-section-header verse-section-header-sticky">
                                {section.label}
                            </div>
                            {#each section.verseData.cross_refs as cr, ci}
                                <div class="cr-row sub-section-inline" data-panel-id="panel-{section.verse}-cross_ref-{ci + 1}">
                                    <span class="cr-marker">{ci + 1}</span>
                                    <CrossRefText text={cr.text} />
                                </div>
                            {/each}
                        </div>
                    {/each}
                </div>
            {/if}
        {/if}

    <!-- ═══ ODR: Article tab ═══ -->
    {:else if $studyPanel.activeTab === 'article' && isOdr}
        {#if articles.length === 0}
            <div class="empty-state">
                <span class="empty-icon" aria-hidden="true">✦</span>
                <p>No article for this chapter.</p>
            </div>
        {:else if articles[$studyPanel.activeArticleIndex]}
            {@const art = articles[$studyPanel.activeArticleIndex]}
            <div class="content-block">
                <p class="content-eyebrow">{tabLabel(art.title)}</p>
                <AnnotationProse text={art.text} notes={art.notes ?? []} />
            </div>
        {/if}

    <!-- ═══ ODR: End matter tab ═══ -->
    {:else if $studyPanel.activeTab === 'end' && isOdr}
        {#if endMatters.length === 0}
            <div class="empty-state">
                <span class="empty-icon" aria-hidden="true">✦</span>
                <p>No end matter for this book yet.</p>
            </div>
        {:else if endMatters[$studyPanel.activeEndIndex]}
            {@const em = endMatters[$studyPanel.activeEndIndex]}
            <div class="content-block">
                <p class="content-eyebrow">{tabLabel(em.title)}</p>
                <AnnotationProse text={em.text} notes={em.notes ?? []} />
            </div>
        {/if}

    <!-- ═══ Confraternity: Intro tab ═══ -->
    {:else if $studyPanel.activeTab === 'intro' && isConf && confIntro}
        <div class="content-block">
            {#if $studyPanel.activeConfIntroTab === 'bible'}
                <p class="content-eyebrow">Introduction · Confraternity Bible</p>
                {#each confIntro.bibleIntro as para}
                    <p class="prose-para">{@html linkifyConfRefs(para)}</p>
                {/each}
            {:else}
                <p class="content-eyebrow">Introduction · Supplemental Commentary</p>
                {#each confIntro.commentaryIntro as para}
                    <p class="prose-para">{@html linkifyConfRefs(para)}</p>
                {/each}
            {/if}
        </div>

    <!-- ═══ Confraternity: Footnotes tab ═══ -->
    {:else if $studyPanel.activeTab === 'footnotes' && isConf}
        <div class="content-block">
            {#if confFootnotesLoading}
                <div class="empty-state"><p>Loading footnotes...</p></div>
            {:else if confFootnotes && confFootnotes.footnotes.length > 0}
                <p class="content-eyebrow">Bible Footnotes</p>
                {#each confFootnotes.footnotes as fn}
                    <div class="conf-note-entry">
                        <span class="cr-marker">{fn.verse}</span>
                        <div class="note-body">
                            <span class="note-text">{@html linkifyConfRefs(fn.text)}</span>
                        </div>
                    </div>
                {/each}
            {:else}
                <div class="empty-state">
                    <span class="empty-icon" aria-hidden="true">✦</span>
                    <p>No footnotes for this chapter.</p>
                </div>
            {/if}
        </div>

    <!-- ═══ Confraternity: Commentary tab ═══ -->
    {:else if $studyPanel.activeTab === 'commentary' && isConf}
        <div class="content-block">
            {#if confCommentaryLoading}
                <div class="empty-state"><p>Loading commentary...</p></div>
            {:else if confCommentary && confCommentary.sections.length > 0}
                <p class="content-eyebrow">Supplemental Commentary</p>
                {#each confCommentary.sections as section}
                    <div class="conf-commentary-section">
                        {#if section.heading}
                            <p class="conf-section-heading">{section.heading}</p>
                        {/if}
                        {#each section.paragraphs as para}
                            <p class="prose-para">{@html linkifyConfRefs(para)}</p>
                        {/each}
                    </div>
                {/each}
            {:else}
                <div class="empty-state">
                    <span class="empty-icon" aria-hidden="true">✦</span>
                    <p>No commentary for this chapter.</p>
                </div>
            {/if}
        </div>

    <!-- ═══ DRC/Knox/CPDV: Translation Notes tab ═══ -->
    {:else if $studyPanel.activeTab === 'notes' && hasTranslationNotes}
        {#if translationNotesLoading}
            <div class="empty-state"><p>Loading notes...</p></div>
        {:else if translationNotes && translationNotes.length > 0}
            <div class="content-block">
                <p class="content-eyebrow">
                    Notes · {translationMeta?.abbr ?? translationId.toUpperCase()}
                </p>
                {#each translationNotes as note (note.verse)}
                    {@const headingMatch = note.text.match(/^(".*?")\s*\.{3}\s*/)}
                    {@const linkify = isKnox ? linkifyKnoxRefs : isDrc ? linkifyDrcRefs : null}
                    <div class="translation-note-entry">
                        <span class="cr-marker">{note.verse}</span>
                        <div class="note-body">
                            {#if headingMatch}
                                <p class="annotation-title">{headingMatch[1].replace(/^"|"$/g, '')}</p>
                                {#if linkify}
                                    <span class="note-text">{@html linkify(note.text.slice(headingMatch[0].length))}</span>
                                {:else}
                                    <span class="note-text">{note.text.slice(headingMatch[0].length)}</span>
                                {/if}
                            {:else if linkify}
                                <span class="note-text">{@html linkify(note.text)}</span>
                            {:else}
                                <span class="note-text">{note.text}</span>
                            {/if}
                        </div>
                    </div>
                {/each}
            </div>
        {:else}
            <div class="empty-state">
                <span class="empty-icon" aria-hidden="true">✦</span>
                <p>No notes for this chapter.</p>
            </div>
        {/if}

    <!-- ═══ Fallback: No study content ═══ -->
    {:else}
        <div class="empty-state">
            <span class="empty-icon" aria-hidden="true">✦</span>
            <p>
                No study notes available for {translationMeta?.abbr ?? translationId.toUpperCase()}.
            </p>
        </div>
    {/if}

    <!-- Verse-ref tooltip (for linkified notes) -->
    {#if hasLinkifiedNotes || isConf}
        <VerseTooltip
            {translationId}
            osisRanges={confVerseRefs}
            anchorEl={confVerseRefAnchor}
            visible={confVerseRefVisible}
            on:mouseenter={() => {
                if (confVerseRefTimer) clearTimeout(confVerseRefTimer);
            }}
            on:mouseleave={() => {
                confVerseRefTimer = setTimeout(() => {
                    confVerseRefVisible = false;
                    confVerseRefAnchor = null;
                }, 120);
            }}
        />
    {/if}
</div>
```

- [ ] **Step 2: Add the `.sub-section-inline` CSS class**

The new Annotations/Notes/Cross-Refs tabs render note rows and cross-ref rows directly inside the verse section (without the "sub-section" wrapper and header, since each tab only has one content type). Add this CSS class:

```css
.sub-section-inline {
    padding: 2px 52px;
}

@media (max-width: 767px) {
    .sub-section-inline {
        padding: 2px 12px;
    }
}
```

- [ ] **Step 3: Run dev server and verify all translations**

Run: `npm run dev`

Test each translation:
- `/odr/genesis/1` — Tabs: Intro, Annotations, Notes, Cross-Refs. Each tab shows only its content type.
- `/odr/matthew/1` — Tabs should include Article if chapter has articles.
- `/conf/matthew/1` — Tabs: Intro, Footnotes, Commentary.
- `/drc/genesis/1` — Single Notes tab, no tab bar.
- `/knox/genesis/1` — Single Notes tab with linkified refs.
- `/kjv/genesis/1` — Empty state.

- [ ] **Step 4: Commit**

```bash
git add src/lib/components/StudyPanel.svelte
git commit -m "refactor: split ODR Commentary into Annotations/Notes/Cross-Refs tabs"
```

---

## Task 5: Update scrollTrigger to route to the correct tab

**Files:**
- Modify: `src/lib/components/StudyPanel.svelte`

When a user clicks a cross-ref marker `[1]` or note marker `(a)` in the verse text, the `scrollTrigger` store fires. Currently it always switches to the `'commentary'` tab. Now it needs to switch to the appropriate tab.

- [ ] **Step 1: Update handleScrollTrigger to switch to the right tab**

Find the `handleScrollTrigger` function. The current code:

```typescript
if ($studyPanel.activeTab !== 'commentary') {
    studyPanel.update((s) => ({ ...s, activeTab: 'commentary' }));
    await tick();
}
```

Replace with:

```typescript
// Determine which tab the trigger should route to
let targetTab: StudyTab;
if (!isOdr) {
    // Non-ODR translations don't have separate tabs for these
    targetTab = $studyPanel.activeTab;
} else if (trigger.type === 'cross_ref') {
    targetTab = 'cross-refs';
} else if (trigger.type === 'note') {
    targetTab = 'notes';
} else if (trigger.type === 'annotation') {
    targetTab = 'annotations';
} else {
    targetTab = 'annotations'; // default for verse clicks
}

if ($studyPanel.activeTab !== targetTab) {
    studyPanel.update((s) => ({ ...s, activeTab: targetTab }));
    await tick();
}
```

- [ ] **Step 2: Test scroll trigger routing**

Run: `npm run dev`

On `/odr/genesis/1` in study mode:
1. Click a `[1]` cross-ref marker in a verse → panel should switch to Cross-Refs tab and scroll to that verse
2. Click an `(a)` note marker → panel should switch to Notes tab and scroll to that verse
3. Click a verse with annotations → panel should switch to Annotations tab

- [ ] **Step 3: Commit**

```bash
git add src/lib/components/StudyPanel.svelte
git commit -m "fix: route scrollTrigger to correct tab (annotations/notes/cross-refs)"
```

---

## Task 6: Re-attach IntersectionObserver on tab switch

**Files:**
- Modify: `src/lib/components/StudyPanel.svelte`

The `sectionEls` are bound via `bind:this` in whichever tab is active. When tabs switch, the old section elements are destroyed and new ones are created. The IntersectionObserver needs to re-attach.

- [ ] **Step 1: Re-run observer setup when activeTab changes**

Find the reactive that sets up the observer:

```typescript
$: if (verseSections && browser) {
    tick().then(setupPanelObserver);
}
```

Add a second reactive that triggers on tab changes:

```typescript
$: if ($studyPanel.activeTab && browser) {
    tick().then(setupPanelObserver);
}
```

These can coexist — Svelte deduplicates the calls within the same tick.

- [ ] **Step 2: Clear sectionEls on tab switch**

Add a reactive to reset `sectionEls` when the tab changes, so stale DOM refs from the previous tab don't confuse the observer:

```typescript
let lastActiveTab: StudyTab | null = null;
$: if ($studyPanel.activeTab !== lastActiveTab) {
    lastActiveTab = $studyPanel.activeTab;
    sectionEls = {};
}
```

Place this BEFORE the existing `sectionEls` binding in the template takes effect.

- [ ] **Step 3: Test scroll sync**

Run: `npm run dev`

On `/odr/genesis/1` in study mode with annotation sync enabled:
1. Switch to Annotations tab → scroll → reader should follow
2. Switch to Notes tab → scroll → reader should follow
3. Switch to Cross-Refs tab → scroll → reader should follow
4. Click a verse in the reader → correct tab should activate and scroll to that verse

- [ ] **Step 4: Commit**

```bash
git add src/lib/components/StudyPanel.svelte
git commit -m "fix: re-attach scroll sync observer on tab switch"
```

---

## Task 7: Run checks and clean up

**Files:**
- Modify: `src/lib/components/StudyPanel.svelte` (if needed)

- [ ] **Step 1: Run svelte-check**

Run: `npx svelte-check --tsconfig tsconfig.json 2>&1 | tail -20`

Fix any type errors. Common issues:
- References to deleted `confVisibleTabs` or `confSliderIndex` variables
- `StudyTab` import path issues

- [ ] **Step 2: Run ESLint**

Run: `npm run lint 2>&1 | tail -20`

Fix any lint issues.

- [ ] **Step 3: Run Prettier**

Run: `npm run format`

- [ ] **Step 4: Run unit tests**

Run: `npm run test 2>&1 | tail -20`

Verify no regressions.

- [ ] **Step 5: Manual smoke test**

Test the full matrix:

| Route | Expected Tabs | Scroll Sync | Notes Display |
|-------|--------------|-------------|---------------|
| `/odr/genesis/1` | Intro, Annotations, Notes, Cross-Refs | Yes | Annotations show "In the beginning..." commentary |
| `/odr/psalms/1` | Annotations, Notes, Cross-Refs | Yes | No intro tab (Psalms has no intros) |
| `/odr/matthew/1` | Intro, Annotations, Notes, Cross-Refs, Article | Yes | Article tab appears |
| `/conf/matthew/1` | Intro, Footnotes, Commentary | n/a | Footnotes linkified |
| `/drc/genesis/1` | _(no bar)_ | n/a | DRC notes with linkified refs |
| `/knox/genesis/1` | _(no bar)_ | n/a | Knox notes with linkified refs |
| `/kjv/genesis/1` | _(no bar)_ | n/a | Empty state |

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: lint, format, and verify StudyPanel tab refactor"
```

---

## Self-Review Checklist

1. **Spec coverage:**
   - [x] ODR: Annotations, Notes, Cross-Refs as separate tabs
   - [x] Confraternity: keeps Intro, Footnotes, Commentary
   - [x] DRC/Knox/CPDV: keeps single Notes tab
   - [x] KJV/Vulgate: empty state
   - [x] Scroll sync works per-tab
   - [x] ScrollTrigger routes to correct tab
   - [x] Tab preference persisted

2. **Placeholder scan:** No TBDs, TODOs, or "add appropriate..." language.

3. **Type consistency:**
   - `StudyTab` union updated in store, imported in component
   - `TabDef` uses `StudyTab` for `id`
   - `buildVisibleTabs` returns `TabDef[]`
   - `switchTab` accepts `StudyTab`
   - `handleScrollTrigger` routes using `StudyTab`
