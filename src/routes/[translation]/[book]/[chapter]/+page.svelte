<script lang="ts">
  import type { PageData } from './$types';
  import { prefs } from '$lib/stores/prefs';
  import PageFooter from '$lib/components/PageFooter.svelte';
  import { fade } from 'svelte/transition';

  export let data: PageData;

  $: ({ translation, bookMeta, chapter } = data);
  $: prevChapter = chapter.chapter > 1 ? chapter.chapter - 1 : null;
  $: nextChapter = chapter.chapter < data.totalChapters ? chapter.chapter + 1 : null;
  $: displayName = $prefs.modernBookNames ? bookMeta.modernName : bookMeta.odrName;
  $: base = `/${translation.id}`;
</script>

<svelte:head>
  <title>{displayName} {chapter.chapter} — {translation.abbr} ({translation.year})</title>
</svelte:head>

<header
  class="sticky top-0 z-30 bg-glass backdrop-blur-sm border-b border-border px-lg flex items-center justify-between"
  style="height: 50px;"
>
  <div class="font-ui text-[13px] font-semibold text-foreground">
    {translation.abbr}
    <span class="text-subtle font-normal ml-[6px] text-[11px]">{translation.year}</span>
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
</header>

<div in:fade={{ duration: 140 }}>
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
