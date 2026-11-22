#!/usr/bin/env python3
"""Scrape the Original 1611 KJV sidenote references into a notes sidecar.

Source: kingjamesbibleonline.org's "Original 1611 KJV" chapter pages, e.g.
https://www.kingjamesbibleonline.org/Genesis-Chapter-1_Original-1611-KJV/

Output: static/data/kjv-notes-1611/{odrSlug}/{chapter}.json, one file per
chapter that has sidenotes, in the same shape as static/data/kjv-notes:

    [{"verse": 1, "text": "Psal.33.6. and 136.5. ... Hebr.11.3."}, ...]

`text` is the complete sidenote line for that verse, in the site's original
1611 spelling, verbatim: scripture cross-references AND Hebr./Or. glosses are
both kept. Only HTML entities are decoded and whitespace is collapsed; no
spelling, punctuation or abbreviation is modernised or otherwise altered.

The site serves 200 for unknown book slugs (no h1.page-title) and for chapters
past a book's end (the last real chapter), so pages are validated against the
requested chapter number in that heading before being parsed. The page's
declared ISO-8859-1 encoding is wrong (the body is UTF-8), hence forced decode.

Scrapling lives in the dedicated venv, not system python:

    ~/.venvs/scrapling/bin/python scripts/scrape-kjv-notes-1611.py \
        --book genesis --chapter 1
    ~/.venvs/scrapling/bin/python scripts/scrape-kjv-notes-1611.py  # all books
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
from html import unescape
from pathlib import Path
from typing import Any

from scrapling.fetchers import Fetcher
from scrapling.parser import Selector

BASE_URL = "https://www.kingjamesbibleonline.org"
PROJECT_ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = PROJECT_ROOT / "static" / "data" / "kjv-notes-1611"
KJV_DATA_DIR = PROJECT_ROOT / "static" / "data" / "kjv"

# (site URL slug, ODR slug). Covers every book in static/data/kjv-notes.
# Protestant names map onto the ODR's Douay names (1 Samuel -> 1-kings, etc.).
BOOKS: list[tuple[str, str]] = [
    ("Genesis", "genesis"),
    ("Exodus", "exodus"),
    ("Leviticus", "leviticus"),
    ("Numbers", "numbers"),
    ("Deuteronomy", "deuteronomy"),
    ("Joshua", "josue"),
    ("Judges", "judges"),
    ("Ruth", "ruth"),
    ("1-Samuel", "1-kings"),
    ("2-Samuel", "2-kings"),
    ("1-Kings", "3-kings"),
    ("2-Kings", "4-kings"),
    ("1-Chronicles", "1-paralipomenon"),
    ("2-Chronicles", "2-paralipomenon"),
    ("Ezra", "1-esdras"),
    ("Nehemiah", "2-esdras"),
    ("Esther", "esther"),
    # The site keeps Esther's Greek additions as a separate Apocrypha book.
    # Its chapters 11-16 are ODR esther 11-16 (see SITE_CHAPTER_RANGES).
    ("Additions-to-Esther", "esther"),
    ("Job", "job"),
    ("Psalms", "psalms"),
    ("Proverbs", "proverbs"),
    ("Ecclesiastes", "ecclesiastes"),
    ("Song-of-Solomon", "canticle-of-canticles"),
    ("Isaiah", "isaie"),
    ("Jeremiah", "jeremie"),
    ("Lamentations", "lamentations"),
    ("Ezekiel", "ezechiel"),
    ("Daniel", "daniel"),
    ("Hosea", "osee"),
    ("Joel", "joel"),
    ("Amos", "amos"),
    ("Obadiah", "abdias"),
    ("Jonah", "jonas"),
    ("Micah", "micheas"),
    ("Nahum", "nahum"),
    ("Habakkuk", "habacuc"),
    ("Zephaniah", "sophonias"),
    ("Haggai", "aggeus"),
    ("Zechariah", "zacharias"),
    ("Malachi", "malachie"),
    ("Matthew", "matthew"),
    ("Mark", "mark"),
    ("Luke", "luke"),
    ("John", "john"),
    ("Acts", "acts"),
    ("Romans", "romans"),
    ("1-Corinthians", "1-corinthians"),
    ("2-Corinthians", "2-corinthians"),
    ("Galatians", "galatians"),
    ("Ephesians", "ephesians"),
    ("Philippians", "philippians"),
    ("Colossians", "colossians"),
    ("1-Thessalonians", "1-thessalonians"),
    ("2-Thessalonians", "2-thessalonians"),
    ("1-Timothy", "1-timothy"),
    ("2-Timothy", "2-timothy"),
    ("Titus", "titus"),
    ("Philemon", "philemon"),
    ("Hebrews", "hebrews"),
    ("James", "james"),
    ("1-Peter", "1-peter"),
    ("2-Peter", "2-peter"),
    ("1-John", "1-john"),
    ("2-John", "2-john"),
    ("3-John", "3-john"),
    ("Jude", "jude"),
    ("Revelation", "apocalypse"),
    # Apocrypha / deuterocanon. The site's 1/2 Esdras are the KJV Apocrypha
    # books, which ODR calls 3-esdras/4-esdras (Ezra/Nehemiah are 1/2-esdras).
    ("Tobit", "tobias"),
    ("Judith", "judith"),
    ("Wisdom-of-Solomon", "wisdom"),
    ("Ecclesiasticus", "ecclesiasticus"),
    ("Baruch", "baruch"),
    ("1-Esdras", "3-esdras"),
    ("2-Esdras", "4-esdras"),
    ("1-Maccabees", "1-machabees"),
    ("2-Maccabees", "2-machabees"),
    ("Prayer-of-Manasseh", "prayer-of-manasses"),
]

# Site books that the ODR kjv data folds into another book's chapter numbering.
# Each maps (site_slug, site_chapter) -> (odr_slug, odr_chapter).
SPECIAL_CHAPTERS: dict[tuple[str, int], tuple[str, int]] = {
    ("Susanna", 1): ("daniel", 13),
    ("Bel-and-the-Dragon", 1): ("daniel", 14),
    ("Letter-of-Jeremiah", 1): ("baruch", 6),
    ("Prayer-of-Azariah", 1): ("daniel", 3),
}
SPECIAL_BOOKS = {slug for slug, _ in SPECIAL_CHAPTERS}

# The ODR kjv data splices Azariah's 68 verses into Daniel 3 as verses 24-91,
# so the stand-alone Prayer of Azariah page's verses need shifting by 23.
VERSE_OFFSETS: dict[str, int] = {"Prayer-of-Azariah": 23}

# Site books whose own chapters overlap the ODR book's larger chapter list.
# The site follows the shorter Protestant canon; the extra ODR chapters come
# from SPECIAL_CHAPTERS (Daniel 13-14) or are Greek additions we do not scrape
# (Esther 11-16).
MAX_SITE_CHAPTERS: dict[str, int] = {
    "Daniel": 12,
    "Baruch": 5,
    "Esther": 10,
}

# Stand-alone site books whose chapter numbers are kept as-is in the ODR slug
# but differ from that slug's own local chapter list (here, the Greek additions
# to Esther, which the ODR kjv data folds into esther 11-16).
SITE_CHAPTER_RANGES: dict[str, list[int]] = {
    "Additions-to-Esther": list(range(11, 17)),
}


def chapter_url(site_slug: str, chapter: int) -> str:
    return f"{BASE_URL}/{site_slug}-Chapter-{chapter}_Original-1611-KJV/"


def fetch_page(site_slug: str, chapter: int, retries: int = 3) -> bytes | None:
    """Fetch one chapter page. Returns None when the page does not exist."""
    url = chapter_url(site_slug, chapter)
    last_error: Exception | None = None
    for attempt in range(retries):
        try:
            response = Fetcher.get(url)
            if response.status != 200:
                return None
            return response.body
        except Exception as exc:  # network hiccup / rate limit
            last_error = exc
            if attempt + 1 < retries:
                time.sleep(0.5 * (attempt + 1))
    print(f"  ! fetch failed ({last_error}): {url}", file=sys.stderr)
    return None


def parse_sidenotes(body: bytes, expected_chapter: int) -> dict[int, str] | None:
    """Return {verse: sidenote text}, or None if this is not the requested page.

    The site answers 200 both for unknown books (no heading) and for chapters
    past the end of a book (the last real chapter, with its own heading), so
    the heading must name the chapter we asked for.
    """
    html = body.decode("utf-8", errors="replace")
    selector = Selector(html)
    headings = selector.css("h1.page-title")
    if not headings:
        return None
    heading = headings[0].text.strip()
    if not re.search(rf"\bchapter\s+{expected_chapter}\s*$", heading, re.IGNORECASE):
        return None

    sections = selector.css("div.ref-section")
    if not sections:
        return {}

    notes: dict[int, str] = {}
    verse: int | None = None
    parts: list[str] = []

    def flush() -> None:
        nonlocal parts
        if verse is not None and parts:
            # lxml decodes &amp; but leaves named entities like &aelig; intact.
            text = unescape(re.sub(r"\s+", " ", "".join(parts)).strip())
            if text:
                notes[verse] = text
        parts = []

    # Within .ref-section each note is: <a name="vN"></a><sup class="vnum">N</sup>
    # <text><br>. Collect the tails until <br>, keeping the text exactly as
    # printed (lxml has already decoded HTML entities such as &amp;).
    for node in sections[0]._root.iter():
        tag = node.tag if isinstance(node.tag, str) else ""

        if tag == "br":
            flush()
            continue

        if tag == "a" and (node.get("name") or "").startswith("v"):
            flush()
            try:
                verse = int(node.get("name", "")[1:])
            except ValueError:
                verse = None
            continue

        if tag == "sup" and "vnum" in (node.get("class") or "").split():
            number = (node.text or "").strip()
            if number.isdigit() and verse is None:
                verse = int(number)
            # The sup itself holds the verse number, never note text.
        elif tag != "p":  # <p> is the "Sidenote References" section heading
            if node.text:
                parts.append(node.text)

        if node.tail:
            parts.append(node.tail)

    flush()
    return dict(sorted(notes.items()))


def chapter_numbers(site_slug: str, odr_slug: str) -> list[int]:
    """Chapters to request for a site book, up to the site's own canon length."""
    if site_slug in SITE_CHAPTER_RANGES:
        return SITE_CHAPTER_RANGES[site_slug]
    if site_slug in MAX_SITE_CHAPTERS:
        return list(range(1, MAX_SITE_CHAPTERS[site_slug] + 1))

    path = KJV_DATA_DIR / f"{odr_slug}.json"
    if not path.exists():
        return []
    chapters = json.loads(path.read_text(encoding="utf-8")).get("chapters", [])
    return [c["chapter"] for c in chapters if isinstance(c.get("chapter"), int)]


def scrape_book(
    site_slug: str,
    odr_slug: str,
    out_dir: Path,
    delay: float,
    collected: dict[Path, dict[int, str]],
    chapters: list[int] | None = None,
) -> tuple[int, int]:
    """Collect one book's sidenotes. Returns (source chapters, notes found).

    Files are written by main() once every source has been collected, so two
    site books that land in the same ODR chapter (e.g. Daniel 3 and the Prayer
    of Azariah) merge instead of overwriting each other.
    """
    targets: list[tuple[str, int, str, int]] = []
    if site_slug in SPECIAL_BOOKS:
        # These stand-alone apocryphal books are one chapter on the site and
        # land inside another ODR book's chapter numbering.
        chapters = [1]
    elif chapters is None:
        chapters = chapter_numbers(site_slug, odr_slug)
    for chapter in chapters:
        out_slug, out_chapter = SPECIAL_CHAPTERS.get((site_slug, chapter), (odr_slug, chapter))
        targets.append((site_slug, chapter, out_slug, out_chapter))

    written = 0
    verses = 0
    offset = VERSE_OFFSETS.get(site_slug, 0)
    for site, site_ch, out_slug, out_ch in targets:
        body = fetch_page(site, site_ch)
        if body is None:
            continue
        notes = parse_sidenotes(body, site_ch)
        if not notes:
            continue  # no page for this book/chapter, or no sidenotes

        bucket = collected.setdefault(out_dir / out_slug / f"{out_ch}.json", {})
        for verse, text in notes.items():
            target_verse = verse + offset
            if target_verse in bucket:
                bucket[target_verse] += " | " + text
            else:
                bucket[target_verse] = text
        written += 1
        verses += len(notes)
        if delay:
            time.sleep(delay)
    return written, verses


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--book", help="ODR slug to scrape (default: all books)")
    parser.add_argument("--chapter", type=int, help="single chapter (requires --book)")
    parser.add_argument("--out-dir", type=Path, default=OUT_DIR, help="output root")
    parser.add_argument("--delay", type=float, default=0.12, help="seconds between requests")
    parser.add_argument("--list-books", action="store_true", help="print the book map and exit")
    args = parser.parse_args()

    if args.list_books:
        for site_slug, odr_slug in BOOKS:
            print(f"{site_slug:24} -> {odr_slug}")
        for (site_slug, site_ch), (odr_slug, odr_ch) in SPECIAL_CHAPTERS.items():
            print(f"{site_slug} {site_ch} -> {odr_slug} {odr_ch}")
        return

    if args.chapter is not None and not args.book:
        parser.error("--chapter requires --book")

    book_map = {odr_slug: (site_slug, odr_slug) for site_slug, odr_slug in BOOKS}
    special_slugs = {odr for (_, odr) in SPECIAL_CHAPTERS.values()}
    missing = sorted({p.stem for p in KJV_DATA_DIR.glob("*.json")} - set(book_map) - special_slugs)
    if missing:
        print(f"! ODR books with no site mapping: {', '.join(missing)}", file=sys.stderr)

    if args.book:
        matching = [(site, odr) for site, odr in BOOKS if odr == args.book]
        matching += [(site, odr) for (site, _), (odr, _) in SPECIAL_CHAPTERS.items() if odr == args.book]
        if not matching:
            parser.error(f"unknown ODR book slug: {args.book}")
        targets = list(dict.fromkeys(matching))
    else:
        targets = BOOKS + [(site, odr) for (site, _), (odr, _) in SPECIAL_CHAPTERS.items()]

    collected: dict[Path, dict[int, str]] = {}
    for site_slug, odr_slug in targets:
        chapters = [args.chapter] if args.chapter is not None else None
        if args.chapter is not None and site_slug in SPECIAL_BOOKS:
            chapters = [1]  # special books have a single site chapter
        files, verses = scrape_book(site_slug, odr_slug, args.out_dir, args.delay, collected, chapters)
        if files:
            print(f"  {site_slug:22} -> {odr_slug:22} {files:3} chapters, {verses:4} notes")

    for destination, notes in collected.items():
        destination.parent.mkdir(parents=True, exist_ok=True)
        payload = [{"verse": verse, "text": notes[verse]} for verse in sorted(notes)]
        destination.write_text(
            json.dumps(payload, ensure_ascii=False, separators=(",", ":")),
            encoding="utf-8",
        )
    total_notes = sum(len(notes) for notes in collected.values())
    print(f"Wrote {len(collected)} chapter files, {total_notes} notes to {args.out_dir}")


if __name__ == "__main__":
    main()
