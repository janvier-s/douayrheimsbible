#!/usr/bin/env python3
"""
Scrape all books of the modernized Douay-Rheims translation (verses, annotations,
marginal/cross-reference notes, chapter summaries, and book intros) from
https://sanctaclarapress.com/read using Scrapling, and save them under
static/data/odr-sancta/ in a format matching static/data/odr/.
"""

from __future__ import annotations

import json
import re
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Any

from scrapling.fetchers import Fetcher
from scrapling.parser import Selector

BASE_URL = "https://sanctaclarapress.com/read"
OUT_DIR = Path(__file__).resolve().parent.parent / "static" / "data" / "odr-sancta"

# Map sanctaclarapress slugs to static/data/odr/ filenames where they differ
SLUG_MAP = {
    "isaias": "isaie",
    "jeremias": "jeremie",
    "malachias": "malachie",
}


def fetch_with_retry(url: str, retries: int = 3) -> Any:
    last_err: Exception | None = None
    for attempt in range(retries):
        try:
            return Fetcher.get(url)
        except Exception as e:
            last_err = e
            time.sleep(0.5 * (attempt + 1))
    raise RuntimeError(f"Failed to fetch {url}: {last_err}")


def clean_ws(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def extract_reader_text(el: Selector) -> str:
    """Extract clean modernized reader text from a span.ed-reader element."""
    parts: list[str] = []

    def walk(node: Any, is_root: bool = False) -> None:
        tag = getattr(node, "tag", None)
        if not isinstance(tag, str):
            if node.text:
                parts.append(node.text)
            return

        cls = node.attrib.get("class", "") if hasattr(node, "attrib") else ""
        classes = cls.split()
        if "clar-pop" in classes:
            if not is_root and node.tail:
                parts.append(node.tail)
            return

        is_italic = tag in ("i", "em")
        if is_italic:
            parts.append("<i>")

        if node.text:
            parts.append(node.text)
        for child in node:
            walk(child)

        if is_italic:
            parts.append("</i>")

        if not is_root and node.tail:
            parts.append(node.tail)

    walk(el._root, is_root=True)
    return re.sub(r"\s+", " ", "".join(parts)).strip()


def extract_inline_html(el: Selector, skip_classes: set[str] | None = None) -> str:
    """Extract text preserving <i>...</i> for <i>/<em> tags."""
    skip_classes = skip_classes or set()
    parts: list[str] = []

    def walk(node: Any, is_root: bool = False) -> None:
        tag = getattr(node, "tag", None)
        if not isinstance(tag, str):
            if node.text:
                parts.append(node.text)
            return

        cls = node.attrib.get("class", "") if hasattr(node, "attrib") else ""
        if any(c in skip_classes for c in cls.split()):
            if not is_root and node.tail:
                parts.append(node.tail)
            return

        is_italic = tag in ("i", "em")
        if is_italic:
            parts.append("<i>")

        if node.text:
            parts.append(node.text)
        for child in node:
            walk(child)

        if is_italic:
            parts.append("</i>")

        if not is_root and node.tail:
            parts.append(node.tail)

    walk(el._root, is_root=True)
    return re.sub(r"\s+", " ", "".join(parts)).strip()


def scrape_about(slug: str) -> list[dict[str, Any]]:
    page = fetch_with_retry(f"{BASE_URL}/{slug}/about")
    if page.status != 200:
        return []
    article = page.css("article.book-intro")
    if not article:
        return []
    art = article[0]
    h2 = art.css("h2")
    title = clean_ws(h2[0].get_all_text()) if h2 else "Introduction"

    paragraphs: list[str] = []
    for p in art.css("p"):
        parts: list[str] = []

        def walk(node: Any, is_root: bool = False) -> None:
            tag = getattr(node, "tag", None)
            if not isinstance(tag, str):
                if node.text:
                    parts.append(node.text)
                return
            if tag == "sup":
                sup_txt = clean_ws("".join(node.itertext()))
                if sup_txt:
                    parts.append(f" <mn>[{sup_txt}]</mn>")
                if not is_root and node.tail:
                    parts.append(node.tail)
                return
            is_italic = tag in ("i", "em")
            if is_italic:
                parts.append("<i>")
            if node.text:
                parts.append(node.text)
            for child in node:
                walk(child)
            if is_italic:
                parts.append("</i>")
            if not is_root and node.tail:
                parts.append(node.tail)

        walk(p._root, is_root=True)
        txt = re.sub(r"\s+", " ", "".join(parts)).strip()
        if txt:
            paragraphs.append(txt)

    notes: list[dict[str, Any]] = []
    fn_sec = art.css("section.footnotes li, section.footnotes p")
    for idx, li in enumerate(fn_sec, start=1):
        raw = extract_inline_html(li).replace("↩", "").strip()
        if raw:
            notes.append({"marker": idx, "text": raw})

    if not paragraphs and not notes:
        return []

    return [
        {
            "title": title,
            "text": "\n\n".join(paragraphs),
            "default": True,
            "notes": notes,
        }
    ]


def parse_chapter(
    slug: str, ch_num: int
) -> tuple[dict[str, Any], list[dict[str, Any]], str | None]:
    page = fetch_with_retry(f"{BASE_URL}/{slug}/{ch_num}")

    book_title: str | None = None
    if ch_num == 1:
        ph = page.css("p.printhead span.printhead-title span.ed-spelling")
        if ph:
            book_title = clean_ws(ph[0].get_all_text())

    summary = ""
    arg_el = page.css("p.argument span.ed-spelling")
    if not arg_el:
        arg_el = page.css("p.argument")
    if arg_el:
        summary = extract_inline_html(arg_el[0])

    verses: list[dict[str, Any]] = []
    for v_el in page.css("p.verse"):
        v_id = v_el.attrib.get("id", "")
        m = re.match(r"v(\d+)", v_id)
        if not m:
            continue
        v_num = int(m.group(1))

        reader_el = v_el.css("span.ed-reader")
        if not reader_el:
            reader_el = v_el.css("span.ed-spelling")
        v_text = extract_reader_text(reader_el[0]) if reader_el else ""

        verse_obj: dict[str, Any] = {
            "verse": v_num,
            "text": v_text,
        }

        if v_el.css("a.anote"):
            verse_obj["has_annotation"] = True

        cross_refs: list[dict[str, str]] = []
        xrefs: list[str] = []
        notes: list[dict[str, str]] = []

        for aside in v_el.css("aside.vnote"):
            aside_cls = aside.attrib.get("class", "")
            is_left = "vnote-left" in aside_cls

            for xref_el in aside.css("span.xref"):
                xt = clean_ws(xref_el.get_all_text())
                if xt:
                    xrefs.append(xt)

            for item in aside.css("span.vnote-item"):
                item_cls = item.attrib.get("class", "")
                gloss_el = item.css("span.ed-spelling")
                if not gloss_el:
                    gloss_el = item.css("span.gloss")
                if not gloss_el:
                    continue
                g_text = extract_inline_html(gloss_el[0])
                if not g_text:
                    continue

                if "vnote-head" in item_cls:
                    notes.append({"text": g_text, "kind": "head"})
                elif "vnote-concordance" in item_cls:
                    notes.append({"text": g_text, "kind": "concordance"})
                elif "vnote-lectionary" in item_cls:
                    notes.append({"text": g_text, "kind": "lectionary"})
                elif is_left:
                    cross_refs.append({"text": g_text})
                else:
                    notes.append({"text": g_text, "kind": "gloss"})

        if cross_refs:
            verse_obj["cross_refs"] = cross_refs
        if xrefs:
            verse_obj["xrefs"] = xrefs
        if notes:
            verse_obj["notes"] = notes

        verses.append(verse_obj)

    chapter_obj: dict[str, Any] = {
        "chapter": ch_num,
        "verses": verses,
        "summary": summary,
    }

    annotations: list[dict[str, Any]] = []
    part_counts: dict[int, int] = {}
    for ann_el in page.css("section#annotations div.annotation"):
        p_el = ann_el.css("p")
        if not p_el:
            continue
        p0 = p_el[0]
        aref = p0.css("a.aref")
        if not aref:
            continue
        v_num_str = clean_ws(aref[0].get_all_text())
        if not v_num_str.isdigit():
            continue
        v_num = int(v_num_str)
        part_counts[v_num] = part_counts.get(v_num, 0) + 1

        ed_sp = p0.css("span.ed-spelling")
        if not ed_sp:
            continue
        sp0 = ed_sp[0]

        lemma_el = sp0.css("span.alemma")
        title = extract_inline_html(lemma_el[0]) if lemma_el else ""
        ann_text = extract_inline_html(sp0, skip_classes={"alemma"})

        ann_notes: list[dict[str, Any]] = []
        marker = 1
        for am_div in ann_el.css("div.amargin.ed-spelling"):
            for item in am_div.css("span.amargin-item"):
                nt = extract_inline_html(item)
                if nt:
                    ann_notes.append({"marker": marker, "text": nt})
                    marker += 1

        annotations.append(
            {
                "verse": v_num,
                "part": part_counts[v_num],
                "title": title,
                "text": ann_text,
                "notes": ann_notes,
            }
        )

    return chapter_obj, annotations, book_title


def discover_books() -> list[str]:
    page = fetch_with_retry(BASE_URL)
    slugs: list[str] = []
    seen: set[str] = set()
    for a in page.css("a"):
        href = a.attrib.get("href", "")
        m = re.match(r"^/read/([a-z0-9-]+)$", href)
        if m:
            slug = m.group(1)
            if slug != "lectionary" and slug not in seen:
                seen.add(slug)
                slugs.append(slug)
    return slugs


def scrape_book(slug: str) -> tuple[str, int, int, int]:
    out_slug = SLUG_MAP.get(slug, slug)
    book_page = fetch_with_retry(f"{BASE_URL}/{slug}")
    h1 = book_page.css("h1")
    short_title = clean_ws(h1[0].get_all_text()) if h1 else out_slug.replace("-", " ").title()

    chapters: set[int] = set()
    for a in book_page.css("a"):
        href = a.attrib.get("href", "")
        m = re.match(rf"^/read/{re.escape(slug)}/(\d+)$", href)
        if m:
            chapters.add(int(m.group(1)))

    if not chapters:
        chapters = {1}

    intros = scrape_about(slug)

    chapters_map: dict[int, dict[str, Any]] = {}
    annotations_map: dict[int, list[dict[str, Any]]] = {}
    book_title = short_title

    with ThreadPoolExecutor(max_workers=8) as pool:
        futures = {pool.submit(parse_chapter, slug, ch): ch for ch in sorted(chapters)}
        for fut in as_completed(futures):
            ch = futures[fut]
            ch_obj, anns, bt = fut.result()
            chapters_map[ch] = ch_obj
            if anns:
                annotations_map[ch] = anns
            if ch == 1 and bt:
                book_title = bt

    book_data = {
        "book": out_slug,
        "book_title": book_title,
        "short_title": short_title,
        "hebrew_title": None,
        "intros": intros,
        "chapters": [chapters_map[ch] for ch in sorted(chapters)],
    }

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    with open(OUT_DIR / f"{out_slug}.json", "w", encoding="utf-8") as f:
        json.dump(book_data, f, ensure_ascii=False, indent=2)

    if annotations_map:
        ann_dir = OUT_DIR / out_slug / "annotations"
        ann_dir.mkdir(parents=True, exist_ok=True)
        for ch, anns in sorted(annotations_map.items()):
            with open(ann_dir / f"{ch:03d}.json", "w", encoding="utf-8") as f:
                json.dump({"chapter": ch, "annotations": anns}, f, ensure_ascii=False, indent=2)

    total_verses = sum(len(c["verses"]) for c in book_data["chapters"])
    total_anns = sum(len(a) for a in annotations_map.values())
    return out_slug, len(chapters), total_verses, total_anns


def main() -> None:
    slugs = discover_books()
    print(f"Discovered {len(slugs)} books on {BASE_URL}")

    total_ch = 0
    total_v = 0
    total_a = 0
    for idx, slug in enumerate(slugs, start=1):
        out_slug, ch_cnt, v_cnt, a_cnt = scrape_book(slug)
        total_ch += ch_cnt
        total_v += v_cnt
        total_a += a_cnt
        print(f"[{idx:2d}/{len(slugs)}] {out_slug:24s} -> {ch_cnt:3d} ch, {v_cnt:4d} verses, {a_cnt:3d} annotations")

    print(f"\nAll done! {len(slugs)} books, {total_ch} chapters, {total_v} verses, {total_a} annotations saved to {OUT_DIR}")


if __name__ == "__main__":
    main()
