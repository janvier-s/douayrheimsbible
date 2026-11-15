#!/usr/bin/env python3
"""Scrape the 1611 KJV text from study.kingjamesbiblefellowship.com using Scrapling.

Outputs one JSON file per book in static/data/kjv-1611/<slug>.json matching the
shape of static/data/kjv/genesis.json, with supplied words tagged as <i>...</i>.
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

from scrapling.fetchers import Fetcher
from scrapling.parser import Selector

BASE_URL = "https://study.kingjamesbiblefellowship.com/bible/data"
OUT_DIR = Path(__file__).resolve().parent.parent / "static" / "data" / "kjv-1611"


def parse_js_assignment(body: bytes) -> Any:
    """Extract the JSON payload from a `self.VAR=...;` JS data file."""
    text = body.decode("utf-8", errors="replace").strip()
    eq_idx = text.rfind("]=")
    if eq_idx != -1:
        payload = text[eq_idx + 2 :]
    else:
        payload = text.split("=", 1)[1]
    return json.loads(payload.rstrip(";\r\n "))


def render_node(node: Any) -> str:
    """Recursively render an lxml HtmlElement into verse text with <i> tags."""
    tag = node.tag if isinstance(node.tag, str) else ""
    cls = node.attrib.get("class", "")

    # Skip marginal note caller buttons (*, †, ‖)
    if tag == "button" and "margin-note-caller" in cls:
        return node.tail or ""

    inner_parts: list[str] = []
    if node.text:
        inner_parts.append(node.text)
    for child in node:
        inner_parts.append(render_node(child))
    inner = "".join(inner_parts)

    if (tag == "em" and "supplied-word" in cls) or tag == "i":
        m = re.match(r"^(\s*)(.*?)(\s*)$", inner, re.DOTALL)
        assert m is not None
        lead, core, trail = m.groups()
        if core:
            inner = f"{lead}<i>{core}</i>{trail}"
        else:
            inner = f"{lead}{trail}"
    elif tag == "sup":
        # 1611 abbreviations like y<sup> e</sup> -> ye
        inner = inner.lstrip()

    tail = node.tail or ""
    return f"{inner}{tail}"


def html_to_tagged_text(html: str) -> str:
    """Parse verse HTML with Scrapling's Selector and tag supplied words with <i>."""
    sel = Selector(html)
    bodies = sel.css("body")
    if not bodies:
        return ""
    body = bodies[0]._root
    parts: list[str] = []
    if body.text:
        parts.append(body.text)
    for child in body:
        parts.append(render_node(child))
    text = "".join(parts)
    # Collapse runs of spaces introduced by leading spaces inside <em>/<span>
    text = re.sub(r" {2,}", " ", text)
    return text.strip()


def scrape_all() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    books_resp = Fetcher.get(f"{BASE_URL}/books.js")
    books = parse_js_assignment(books_resp.body)
    print(f"Found {len(books)} books")

    total_verses = 0
    total_supplied = 0
    mismatches: list[tuple[str, int, int, str, str]] = []

    for book in books:
        slug = book["slug"]
        resp = Fetcher.get(f"{BASE_URL}/books-1611/{slug}.js")
        data = parse_js_assignment(resp.body)

        chapters_out = []
        for ch in data["chapters"]:
            verses_out = []
            for v in ch["verses"]:
                html = v.get("html") or ""
                plain = re.sub(r" {2,}", " ", (v.get("text") or "").strip())
                tagged = html_to_tagged_text(html) if html else plain

                # Verify that stripping <i>...</i> matches the plain 1611 text
                stripped = re.sub(r"</?i>", "", tagged)
                if stripped != plain:
                    mismatches.append((slug, ch["chapter"], v["verse"], plain, stripped))

                total_verses += 1
                total_supplied += tagged.count("<i>")
                verses_out.append({"verse": v["verse"], "text": tagged})
            chapters_out.append({"chapter": ch["chapter"], "verses": verses_out})

        out_obj = {"book": data["name"], "chapters": chapters_out}
        out_path = OUT_DIR / f"{slug}.json"
        out_path.write_text(
            json.dumps(out_obj, ensure_ascii=False, separators=(",", ":")),
            encoding="utf-8",
        )

    print(f"Scraped {len(books)} books, {total_verses} verses, {total_supplied} <i> supplied-word spans.")
    print(f"Mismatches vs plain text: {len(mismatches)}")
    for m in mismatches[:10]:
        print("  MISMATCH:", m[0], f"{m[1]}:{m[2]}", "\n    plain:   ", repr(m[3]), "\n    stripped:", repr(m[4]))


if __name__ == "__main__":
    scrape_all()
