#!/usr/bin/env python3
"""
Scrape the modernized Douay-Rheims translation of Genesis (verses, annotations,
and marginal/foot notes) from sanctaclarapress.com using Scrapling, and save it
in a format matching static/data/odr/genesis.json under static/data/odr-sancta/.
"""

from __future__ import annotations

import json
import re
from concurrent.futures import ThreadPoolExecutor, as_completed
from html import unescape
from pathlib import Path
from typing import Any

from scrapling.fetchers import Fetcher
from scrapling.parser import Selector

BASE_URL = "https://sanctaclarapress.com/read/genesis"
OUT_DIR = Path(__file__).resolve().parent.parent / "static" / "data" / "odr-sancta"
ANNOTATIONS_DIR = OUT_DIR / "genesis" / "annotations"


def clean_ws(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def extract_reader_text(el: Selector) -> str:
    """Extract clean modernized reader text from a span.ed-reader element.

    Keeps the modernized button text inside .clar-wrap, drops .clar-pop tooltips,
    and preserves <i>...</i> tags.
    """
    html = el.html_content
    # Remove tooltip popups: <span class="clar-pop"...>...</span> (may contain nested spans/i)
    # Using a simple recursive/iterative removal via Selector/lxml node or regex on known structure:
    # Since lxml is underlying Scrapling, let's walk el._root!
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
    text = "".join(parts)
    # Fix dropcap newline/whitespace if any, collapse spaces
    text = re.sub(r"\s+", " ", text).strip()
    return text


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


def scrape_about() -> list[dict[str, Any]]:
    page = Fetcher.get(f"{BASE_URL}/about")
    article = page.css("article.book-intro")
    if not article:
        return []
    art = article[0]
    h2 = art.css("h2")
    title = clean_ws(h2[0].get_all_text()) if h2 else "The Argument of the Book of Genesis"

    paragraphs: list[str] = []
    for p in art.css("p"):
        # Replace <sup ...><a ...>N</a></sup> with <mn>[N]</mn>
        parts: list[str] = []

        def walk(node: Any) -> None:
            tag = getattr(node, "tag", None)
            if not isinstance(tag, str):
                if node.text:
                    parts.append(node.text)
                return
            if tag == "sup":
                sup_txt = clean_ws("".join(node.itertext()))
                if sup_txt:
                    parts.append(f" <mn>[{sup_txt}]</mn>")
                if node.tail:
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
            if node.tail:
                parts.append(node.tail)

        walk(p._root)
        txt = re.sub(r"\s+", " ", "".join(parts)).strip()
        if txt:
            paragraphs.append(txt)

    notes: list[dict[str, Any]] = []
    fn_sec = art.css("section.footnotes li, section.footnotes p")
    for idx, li in enumerate(fn_sec, start=1):
        # Remove back-ref arrow ↩
        raw = extract_inline_html(li)
        raw = raw.replace("↩", "").strip()
        if raw:
            notes.append({"marker": idx, "text": raw})

    return [
        {
            "title": title,
            "text": "\n\n".join(paragraphs),
            "default": True,
            "notes": notes,
        }
    ]


def parse_chapter(ch_num: int) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    page = Fetcher.get(f"{BASE_URL}/{ch_num}")

    # Chapter summary
    summary = ""
    arg_el = page.css("p.argument span.ed-spelling")
    if not arg_el:
        arg_el = page.css("p.argument")
    if arg_el:
        summary = extract_inline_html(arg_el[0])

    # Verses
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

    # Annotations
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

        ann_obj: dict[str, Any] = {
            "verse": v_num,
            "part": part_counts[v_num],
            "title": title,
            "text": ann_text,
            "notes": ann_notes,
        }
        annotations.append(ann_obj)

    return chapter_obj, annotations


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    ANNOTATIONS_DIR.mkdir(parents=True, exist_ok=True)

    print("Fetching book intro (/about)...")
    intros = scrape_about()

    chapters_map: dict[int, dict[str, Any]] = {}
    annotations_map: dict[int, list[dict[str, Any]]] = {}

    print("Fetching chapters 1..50...")
    with ThreadPoolExecutor(max_workers=6) as pool:
        futures = {pool.submit(parse_chapter, ch): ch for ch in range(1, 51)}
        for fut in as_completed(futures):
            ch = futures[fut]
            ch_obj, anns = fut.result()
            chapters_map[ch] = ch_obj
            if anns:
                annotations_map[ch] = anns
            print(f"  Chapter {ch:2d}: {len(ch_obj['verses']):2d} verses, {len(anns):2d} annotations")

    book_data = {
        "book": "genesis",
        "book_title": "THE BOOK OF GENESIS, IN HEBREW BERESITH.",
        "short_title": "Genesis",
        "hebrew_title": None,
        "intros": intros,
        "chapters": [chapters_map[ch] for ch in range(1, 51)],
    }

    genesis_path = OUT_DIR / "genesis.json"
    with open(genesis_path, "w", encoding="utf-8") as f:
        json.dump(book_data, f, ensure_ascii=False, indent=2)

    for ch, anns in sorted(annotations_map.items()):
        ann_path = ANNOTATIONS_DIR / f"{ch:03d}.json"
        with open(ann_path, "w", encoding="utf-8") as f:
            json.dump({"chapter": ch, "annotations": anns}, f, ensure_ascii=False, indent=2)

    total_verses = sum(len(c["verses"]) for c in book_data["chapters"])
    total_anns = sum(len(a) for a in annotations_map.values())
    print(f"\nDone! Saved {total_verses} verses across 50 chapters to {genesis_path}")
    print(f"Saved {total_anns} annotations across {len(annotations_map)} chapters to {ANNOTATIONS_DIR}")


if __name__ == "__main__":
    main()
