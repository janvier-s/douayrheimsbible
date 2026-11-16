#!/usr/bin/env python3
"""Re-fetch one Sancta Clara Press chapter into the cached-scrape shape.

The cached scrape under
``~/Library/Mobile Documents/.../sancta-scrape/data/<book>/<chapter>.json``
was produced by the site's server-rendered chapter markup.  The same markup is
serialised into the Next.js RSC payload (``self.__next_f.push``).  This script
fetches a page politely, stitches and checks the RSC payload, and parses the
server-rendered ``.reading`` tree into exactly the cached shape::

    {headings, verses, annotations, book, chapter, source, attribution}

Usage::

    python scripts/audit/scrape_check.py isaias 1
    python scripts/audit/scrape_check.py isaie 1 --delay 4
    python scripts/audit/scrape_check.py --batch chapters.txt

Writes to ``~/facsimiles/handoff/scrape-refetch/<book>/<chapter>.json`` by
default.  It never writes to the iCloud cache or to the repository data.

Politeness: one request at a time, a 3-5 second gap between HTTP requests
(default 4), robots.txt checked before the page, a generic client name, no
login and no personal details.

The chapter text is public domain; the modern edition is (c) 2026 Sancta Clara
Press, CC BY 4.0.  Their robots.txt asks that the content not be used for
model training, so this is a reference/coverage audit only.
"""
from __future__ import annotations

import argparse
import html
import json
import re
import sys
import time
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.robotparser import RobotFileParser

from scrapling.fetchers import Fetcher
from scrapling.parser import Selector

BASE = "https://sanctaclarapress.com"
USER_AGENT = "ODR-coverage-audit/1.0"
ATTRIBUTION = (
    "The Original Douay-Rheims, a modern edition by Sancta Clara Press "
    "(sanctaclarapress.com), used under CC BY 4.0."
)
DEFAULT_OUT = Path.home() / "facsimiles" / "handoff" / "scrape-refetch"

# Repository slug -> live-site slug.
BOOK_SLUGS = {
    "isaie": "isaias",
    "jeremie": "jeremias",
    "malachie": "malachias",
}

ED = {"modern": "ed-spelling", "original": "ed-verbatim"}
CLAR_POP = re.compile(r'<span class="clar-pop".*?</span>', re.S)
TAGS = re.compile(r"<[^>]+>")
RSC_PUSH = re.compile(r'self\.__next_f\.push\(\[1,("(?:[^"\\]|\\.)*")\]\)', re.S)
# The live markup now renders printed cross-references as vnote items.  Keep
# them in the cached scrape's `xrefs` slot instead of counting them as notes.
CITATION = re.compile(
    r"""^
    (?:\[[A-Za-z]\]\s*)?
    (?:
      (?:[1-4]\.?\s*)?
      [A-Z][A-Za-z]{1,7}\.?\s*[.,:]?\s*\d+
    )
    (?:[\s.,;:·&]+(?:[1-4]\.?\s*)?[A-Z]{0,8}\.?\s*\d*)*
    \.?$
    """,
    re.X,
)

_last_request = 0.0
_robots = None


def live_slug(book: str) -> str:
    return BOOK_SLUGS.get(book, book)


def clean(text: str | None) -> str:
    return re.sub(r"\s+", " ", text or "").strip()


def plain_text(el) -> str:
    """Plain text of an element, excluding editorial clarification popovers."""
    if el is None:
        return ""
    raw = CLAR_POP.sub("", el.html_content)
    return clean(html.unescape(TAGS.sub("", raw)))


def clarifications(el) -> list[dict]:
    """Sancta's inline modern-spelling clarifications."""
    out = []
    for wrap in el.css(".clar-wrap"):
        term = wrap.css("button.clar")
        lat = wrap.css(".clar-lat")
        pop = wrap.css(".clar-pop")
        pop_text = clean(html.unescape(TAGS.sub("", pop[0].html_content))) if pop else ""
        latin = plain_text(lat[0]) if lat else ""
        gloss = (
            pop_text[len(latin):].lstrip(": ").strip()
            if latin and pop_text.startswith(latin)
            else pop_text
        )
        out.append(
            {
                "term": plain_text(term[0]) if term else "",
                "latin": latin,
                "gloss": gloss,
            }
        )
    return out


def edition_texts(el, prefix: str = "") -> dict:
    out = {}
    for name, cls in ED.items():
        hit = el.css(f"{prefix}.{cls}")
        out[name] = plain_text(hit[0]) if hit else ""
    return out


def margin_items(container) -> tuple[list[dict], list[str]]:
    """Notes inside a vnote aside, plus cross-references."""
    notes = []
    xrefs = [plain_text(x) for x in container.css(".xref")]
    for item in container.css(".vnote-item"):
        classes = item.attrib.get("class", "")
        kind = next(
            (
                c.replace("vnote-", "")
                for c in classes.split()
                if c.startswith("vnote-") and c != "vnote-item"
            ),
            "note",
        )
        entry = {"kind": kind, "modern": "", "original": ""}
        glosses = item.css(".gloss")
        for gloss in glosses:
            gloss_classes = gloss.attrib.get("class", "")
            for name, cls in ED.items():
                if cls in gloss_classes:
                    entry[name] = plain_text(gloss)
        if not glosses:
            entry["modern"] = entry["original"] = plain_text(item)
        label = clean(entry["modern"] or entry["original"])
        if label and CITATION.match(label):
            xrefs.append(label)
            continue
        notes.append(entry)
    return notes, xrefs


def extract_rsc(page_body: str | bytes) -> str:
    """Stitch the Next.js flight payload (``self.__next_f.push`` chunks).

    The payload is a React element tree, not a plain data object, so the
    chapter is read from the server-rendered ``.reading`` markup that the same
    tree describes.  The payload is still extracted and cross-checked so a
    markup change or an empty payload cannot pass silently.
    """
    if isinstance(page_body, bytes):
        page_body = page_body.decode("utf-8", "replace")
    parts = []
    for match in RSC_PUSH.finditer(page_body):
        try:
            parts.append(json.loads(match.group(1)))
        except json.JSONDecodeError:
            continue
    return "".join(parts)


def parse_chapter(page, book: str, chapter: int) -> dict:
    root_list = page.css(".reading")
    root = root_list[0] if root_list else page

    headings = []
    for paragraph in root.css("p"):
        classes = paragraph.attrib.get("class", "")
        if "verse" in classes.split():
            break
        if paragraph.css(f".{ED['modern']}") or paragraph.css(f".{ED['original']}"):
            headings.append(edition_texts(paragraph))

    # Lapide commentary is nested inside verse <p>s, which makes a normal HTML
    # parser drop later verses.  Cut the raw markup at each verse start and
    # parse each piece alone, exactly as the original scraper did.
    raw = page.body
    if isinstance(raw, bytes):
        raw = raw.decode("utf-8", "replace")
    starts = [
        m.start()
        for m in re.finditer(r'<p class="verse(?: para)?" id="v\d+"', raw)
    ]
    ann_at = raw.find('<section id="annotations"')
    stop = ann_at if ann_at > 0 else len(raw)
    verse_elements = []
    for start, end in zip(starts, starts[1:] + [stop]):
        found = Selector(raw[start:end]).css("p.verse")
        if found:
            verse_elements.append(found[0])

    verses = []
    for verse in verse_elements:
        match = re.match(r"v(\d+)", verse.attrib.get("id", ""))
        if not match:
            continue
        modern_el = verse.css(":scope > .ed-text.ed-spelling")
        entry = {
            "verse": int(match.group(1)),
            "modern": plain_text(modern_el[0]) if modern_el else "",
            "original": (
                plain_text(verse.css(":scope > .ed-text.ed-verbatim")[0])
                if verse.css(":scope > .ed-text.ed-verbatim")
                else ""
            ),
            "clarifications": clarifications(modern_el[0]) if modern_el else [],
            "para": "para" in verse.attrib.get("class", "").split(),
            "has_annotation": bool(verse.css("a.anote")),
            "margin": {"left": None, "right": None},
        }
        for side in ("left", "right"):
            aside = verse.css(f"aside.vnote-{side}")
            if aside:
                notes, xrefs = margin_items(aside[0])
                entry["margin"][side] = {"notes": notes, "xrefs": xrefs}
        verses.append(entry)

    annotations = []
    for annotation in page.css("section.annotations .annotation"):
        annotation_id = annotation.attrib.get("id", "")
        ref = annotation.css("a.aref")
        body = {}
        for name, cls in ED.items():
            hit = annotation.css(f":scope > p > .{cls}")
            if hit:
                el = hit[0]
                lemma = el.css(".alemma")
                body[name] = {
                    "lemma": plain_text(lemma[0]) if lemma else "",
                    "text": plain_text(el),
                }
            else:
                body[name] = {"lemma": "", "text": ""}
        margins = {
            "left": {"modern": [], "original": []},
            "right": {"modern": [], "original": []},
        }
        for side in ("left", "right"):
            for name, cls in ED.items():
                for box in annotation.css(f".amargin-{side}.{cls}"):
                    margins[side][name] = [plain_text(i) for i in box.css(".amargin-item")]
        annotations.append(
            {
                "id": annotation_id,
                "verse": (
                    int(plain_text(ref[0]))
                    if ref and plain_text(ref[0]).isdigit()
                    else None
                ),
                "modern": body["modern"],
                "original": body["original"],
                "margin": margins,
            }
        )

    return {
        "headings": headings,
        "verses": verses,
        "annotations": annotations,
        "book": book,
        "chapter": chapter,
        "source": f"{BASE}/read/{book}/{chapter}",
        "attribution": ATTRIBUTION,
    }


def load_robots() -> RobotFileParser:
    global _robots, _last_request
    if _robots is not None:
        return _robots
    request = Request(f"{BASE}/robots.txt", headers={"User-Agent": USER_AGENT})
    with urlopen(request, timeout=30) as response:
        body = response.read().decode("utf-8", "replace")
    parser = RobotFileParser()
    parser.set_url(f"{BASE}/robots.txt")
    parser.parse(body.splitlines())
    _robots = parser
    _last_request = time.monotonic()
    return parser


def polite_get(path: str, delay: float):
    """Fetch one path, waiting ``delay`` seconds after the previous request."""
    global _last_request
    robots = load_robots()
    if not robots.can_fetch(USER_AGENT, BASE + path):
        raise RuntimeError(f"robots.txt disallows {path} for {USER_AGENT}")
    wait = delay - (time.monotonic() - _last_request)
    if wait > 0:
        time.sleep(wait)
    response = Fetcher.get(
        BASE + path,
        headers={"User-Agent": USER_AGENT},
        timeout=60,
        stealthy_headers=False,
    )
    _last_request = time.monotonic()
    if response.status == 429 or response.status >= 500:
        time.sleep(delay * 3)
        response = Fetcher.get(
            BASE + path,
            headers={"User-Agent": USER_AGENT},
            timeout=60,
            stealthy_headers=False,
        )
        _last_request = time.monotonic()
    if response.status == 404:
        return None
    if response.status != 200:
        raise RuntimeError(f"{path}: HTTP {response.status}")
    return response


def fetch_chapter(book: str, chapter: int, delay: float) -> dict | None:
    slug = live_slug(book)
    page = polite_get(f"/read/{slug}/{chapter}", delay)
    if page is None:
        return None
    rsc = extract_rsc(page.body)
    data = parse_chapter(page, slug, chapter)
    rsc_verses = len(re.findall(r'"className":"verse(?: para)?"', rsc))
    if rsc and rsc_verses and rsc_verses != len(data["verses"]):
        print(
            f"warning: RSC has {rsc_verses} verse nodes, parsed {len(data['verses'])}",
            file=sys.stderr,
        )
    if not rsc:
        print("warning: no self.__next_f payload found", file=sys.stderr)
    return data


def write_chapter(data: dict, out_base: Path) -> Path:
    dest = out_base / data["book"] / f"{data['chapter']}.json"
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(json.dumps(data, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    return dest


def summary(data: dict) -> str:
    notes = 0
    for verse in data["verses"]:
        for side in ("left", "right"):
            margin = verse["margin"].get(side)
            if margin:
                notes += len(margin["notes"])
    return (
        f"{data['book']} {data['chapter']}: "
        f"{len(data['verses'])} verses, {notes} margin notes, "
        f"{len(data['annotations'])} annotations"
    )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("book", nargs="?", help="book slug, repository or live")
    parser.add_argument("chapter", nargs="?", type=int, help="chapter number")
    parser.add_argument(
        "--batch",
        type=Path,
        help="file of 'book chapter' lines, fetched one at a time",
    )
    parser.add_argument(
        "--out-base",
        type=Path,
        default=DEFAULT_OUT,
        help=f"output root (default: {DEFAULT_OUT})",
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=4.0,
        help="seconds between HTTP requests, 3-5 (default 4)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="parse and print without writing JSON",
    )
    args = parser.parse_args()

    if not 3 <= args.delay <= 5:
        parser.error("--delay must be between 3 and 5 seconds")

    jobs: list[tuple[str, int]] = []
    if args.batch:
        for line in args.batch.read_text(encoding="utf-8").splitlines():
            line = line.split("#", 1)[0].strip()
            if not line:
                continue
            fields = line.split()
            if len(fields) != 2:
                parser.error(f"bad batch line: {line!r}")
            jobs.append((fields[0], int(fields[1])))
    elif args.book and args.chapter:
        jobs.append((args.book, args.chapter))
    else:
        parser.error("give BOOK CHAPTER or --batch FILE")

    for book, chapter in jobs:
        data = fetch_chapter(book, chapter, args.delay)
        if data is None:
            print(f"{live_slug(book)} {chapter}: 404")
            continue
        print(summary(data))
        if not args.dry_run:
            print(f"  -> {write_chapter(data, args.out_base)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
