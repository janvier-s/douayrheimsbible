<script lang="ts">
  import type { PageData } from './$types';
  import { prefs } from '$lib/stores/prefs';
  import PageFooter from '$lib/components/PageFooter.svelte';
  import { fade } from 'svelte/transition';
  import { isMobile } from '$lib/stores/mobile';

  export let data: PageData;

  $: ({ translation, bookMeta, chapter, notes, intro } = data);
  $: prevChapter = chapter.chapter > 1 ? chapter.chapter - 1 : null;
  $: nextChapter = chapter.chapter < data.totalChapters ? chapter.chapter + 1 : null;
  $: displayName = $prefs.modernBookNames ? bookMeta.modernName : bookMeta.odrName;
  $: base = `/${translation.id}`;

  $: studyOpen = $prefs.readingMode === 'study';

  // Confraternity intro: skip heading-only lines at the start and outline sections
  $: introParagraphs = (() => {
    if (!intro) return [];
    const dividerIdx = intro.findIndex((p: string) => p === 'OUTLINE' || p.startsWith('----------'));
    const body = dividerIdx > 0 ? intro.slice(0, dividerIdx) : intro;
    let start = 0;
    while (start < body.length) {
      const p = body[start].trim();
      if (p.length <= 120 && !/\.\s+[A-Z]/.test(p)) {
        start++;
      } else {
        break;
      }
    }
    return body.slice(start);
  })();

  function toggleStudy() {
    prefs.update((p) => ({
      ...p,
      readingMode: p.readingMode === 'study' ? 'reading' : 'study'
    }));
  }
</script>

<svelte:head>
  <title>{displayName} {chapter.chapter} — {translation.abbr} ({translation.year})</title>
</svelte:head>

<!-- ── Sticky header ─────────────────────────────────────────────── -->
<header
  class="sticky top-0 z-30 bg-glass backdrop-blur-sm border-b border-border px-lg flex items-center justify-between"
  style="height: 50px;"
>
  <div class="font-ui text-[13px] font-semibold text-foreground flex items-center gap-[10px]">
    {translation.abbr}
    <span class="text-subtle font-normal text-[11px]">{translation.year}</span>
  </div>

  <nav class="flex items-center gap-[16px] font-ui text-[11px] uppercase tracking-[0.12em] text-subtle">
    {#if prevChapter}
      <a
        href="{base}/{bookMeta.slug}/{prevChapter}"
        class="hover:text-accent transition-colors duration-fast"
      >‹ Ch. {prevChapter}</a>
    {/if}
    <span class="text-foreground font-medium">{displayName} {chapter.chapter}</span>
    {#if nextChapter}
      <a
        href="{base}/{bookMeta.slug}/{nextChapter}"
        class="hover:text-accent transition-colors duration-fast"
      >Ch. {nextChapter} ›</a>
    {/if}
  </nav>

  <!-- Study mode toggle -->
  <button
    class="font-ui text-[11px] uppercase tracking-[0.12em] px-[10px] py-[6px] rounded-[3px] transition-colors duration-fast
    {studyOpen ? 'text-accent bg-accent/10' : 'text-subtle hover:text-foreground'}"
    on:click={toggleStudy}
    aria-pressed={studyOpen}
    aria-label="Toggle study panel"
  >
    {studyOpen ? 'Reading' : 'Study'}
  </button>
</header>

<!-- ── Content layout ────────────────────────────────────────────── -->
<div
  class="flex h-full"
  in:fade={{ duration: 140 }}
>
  <!-- Reader column -->
  <div
    class="flex-1 min-w-0 overflow-y-auto"
    class:hidden={studyOpen && $isMobile}
  >
    <article
      class="mx-auto px-lg py-[32px] font-reader text-[length:var(--font-size-reader)] leading-[var(--line-height-reader)]"
      style="max-width: 680px;"
      class:text-justify={$prefs.justifiedText}
    >
      {#each chapter.verses as v (v.verse)}
        <span class="verse-unit" id="v{v.verse}">
          {#if $prefs.showVerseNumbers}
            <sup class="text-subtle font-ui text-[10px] font-light select-none tabular-nums mr-[3px]"
              >{v.verse}</sup
            >
          {/if}{v.text}{' '}
        </span>
      {/each}
    </article>

    <PageFooter
      {bookMeta}
      chapterNum={chapter.chapter}
      totalChapters={data.totalChapters}
      routeBase={base}
    />
  </div>

  <!-- Study panel -->
  {#if studyOpen}
    <aside
      class="study-panel border-l border-border bg-panel flex flex-col font-ui overflow-hidden
      {$isMobile ? 'fixed inset-0 top-[50px] z-40' : 'w-[380px] shrink-0'}"
      aria-label="Study notes"
    >
      <!-- Panel header -->
      <div class="flex items-center justify-center px-[14px] pt-[11px] pb-[10px] border-b border-border shrink-0">
        <span class="panel-title">Study Notes</span>
      </div>

      <!-- Scrollable content -->
      <div class="flex-1 overflow-y-auto panel-scroll">
        {#if notes && notes.length > 0}
          <!-- DRC / CPDV verse notes -->
          <div class="content-block">
            <p class="content-eyebrow">Notes · {translation.abbr}</p>
            {#each notes as note (note.verse)}
              <div class="note-entry">
                <span class="note-verse">{note.verse}</span>
                <p class="note-text">{note.text}</p>
              </div>
            {/each}
          </div>
        {:else if introParagraphs.length > 0}
          <!-- Confraternity book intro -->
          <div class="content-block">
            <p class="content-eyebrow">Introduction · {translation.abbr}</p>
            {#each introParagraphs as para}
              <p class="prose-para">{para}</p>
            {/each}
          </div>
        {:else}
          <div class="empty-state">
            <span class="empty-icon" aria-hidden="true">✦</span>
            <p>No study notes available for {translation.abbr}.</p>
          </div>
        {/if}
      </div>
    </aside>
  {/if}
</div>

<style>
  /* ─── Panel title ───────────────────────────────── */
  .panel-title {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.25em;
    color: var(--color-subtle);
    font-weight: 500;
    user-select: none;
  }

  /* ─── Scrollable pane — match ODR study panel ───── */
  .panel-scroll {
    scrollbar-width: auto;
    scrollbar-color: color-mix(in srgb, var(--color-accent) 50%, transparent)
      color-mix(in srgb, var(--color-border) 40%, transparent);
  }

  .panel-scroll::-webkit-scrollbar {
    width: 10px;
    -webkit-appearance: none;
  }

  .panel-scroll::-webkit-scrollbar-track {
    background: color-mix(in srgb, var(--color-border) 40%, transparent);
  }

  .panel-scroll::-webkit-scrollbar-thumb {
    background: color-mix(in srgb, var(--color-accent) 50%, transparent);
    border-radius: 5px;
    border: 2px solid transparent;
    background-clip: padding-box;
    min-height: 40px;
  }

  .panel-scroll::-webkit-scrollbar-thumb:hover {
    background: color-mix(in srgb, var(--color-accent) 70%, transparent);
    background-clip: padding-box;
  }

  /* ─── Content ───────────────────────────────────── */
  .content-block {
    padding: 16px 52px;
  }

  .content-eyebrow {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.22em;
    color: var(--color-accent);
    font-weight: 500;
    margin-bottom: 12px;
  }

  .prose-para {
    font-family: var(--font-reader);
    font-size: 16px;
    line-height: 1.83;
    color: var(--color-foreground);
    margin-bottom: 0.6em;
  }

  /* ─── Verse notes ───────────────────────────────── */
  .note-entry {
    display: flex;
    gap: 10px;
    align-items: baseline;
    margin-bottom: 14px;
  }
  .note-verse {
    font-size: 10px;
    font-weight: 600;
    color: var(--color-accent);
    min-width: 20px;
    text-align: right;
    flex-shrink: 0;
    padding-top: 3px;
  }
  .note-text {
    font-family: var(--font-reader);
    font-size: 15px;
    line-height: 1.7;
    color: var(--color-foreground);
    margin: 0;
  }

  /* ─── Empty state ───────────────────────────────── */
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 48px 20px;
    text-align: center;
  }

  .empty-icon {
    font-size: 18px;
    color: color-mix(in srgb, var(--color-accent) 35%, transparent);
    display: block;
  }

  .empty-state p {
    font-size: 13px;
    color: var(--color-subtle);
    font-style: italic;
    line-height: 1.5;
  }

  /* ─── Mobile ────────────────────────────────────── */
  @media (max-width: 767px) {
    .content-block {
      padding: 12px 16px;
    }
  }
</style>
