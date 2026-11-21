"""Per-book settings from books.json (spec §8): starting a book is data, not code.
Patches the print needs at a page or verse (code-shaped) are in overrides.py.

Keys of a book in books.json (only `first` and `last` are required):
  first, last       first and last wiki page of the book
  ornaments         emit woodcut initials, headpieces, tailpieces (owner: off for now)
  golden            generate.py reproduces the committed pages byte for byte (tests/test_golden.py)
  ocr               OCR the alignment reads: "tesseract" (default) or "transkribus"; WS_OCR overrides.
                    Matthew was done with Tesseract and its pages stay as they are; Transkribus reads
                    the print better from Mark on.
  title_end         last line of the book title on its first page
                    ("THE HOLY GOSPEL / OF IESVS CHRIST ACCOR- / DING TO ...")
  argument_page     wiki page of the book's Argument, printed before chapter 1
                    (generated when it is the first page asked for)
  argument_intros   intros printed as the Argument, in print order (default [0]; Romans: [1, 0],
                    the General Argument of the Epistles, then its own)
  argument_roman    the Argument is set in roman with italic quotations (the data's <i> is italic);
                    Mark's, Luke's and John's are italic
  first_head_cha    the first page's head prints the chapter beside the page number
                    (mark 115: "CHA. I." … "87")
  scripture_pages   number of scripture pages (excluding end-matter tables/creed) for book alignment
  running           [verso, recto] running heads. Matthew's recto heads (pages 33-113) and title
                    (page 31) print a single W sort, not vv. Luke read on pdf 163, 164; John on
                    pdf 245, 246; Mark on 1/2, 5/1, 16/1.
  holy_week         {"first", "last", "skip"}: "HOLY" beside the page number, "weeke." under it,
                    top outer corner, from wiki page first to last except the skip pages (checked on
                    the scans; Luke and John read on the head corners of every page, Mark on every page)
"""
from typing import NamedTuple

from . import sources


class Book(NamedTuple):
    name: str
    first: int
    last: int
    ornaments: bool = False
    golden: bool = False
    ocr: str = 'tesseract'
    title_end: str | None = None
    argument_page: int | None = None
    argument_intros: tuple = (0,)
    argument_roman: bool = False
    first_head_cha: bool = False
    scripture_pages: int | None = None
    running: tuple | None = None
    holy_week: tuple | None = None  # (first, last, frozenset of skipped pages)


KEYS = set(Book._fields) - {'name'}


def from_dict(name, d):
    """A Book from its books.json entry; an unknown key is an error, not ignored."""
    unknown = set(d) - KEYS
    if unknown:
        raise ValueError(f'books.json {name}: unknown key(s) {sorted(unknown)}; known: {sorted(KEYS)}')
    d = dict(d)
    if 'argument_intros' in d:
        d['argument_intros'] = tuple(d['argument_intros'])
    if 'running' in d:
        d['running'] = tuple(d['running'])
    if 'holy_week' in d:
        hw = d['holy_week']
        d['holy_week'] = (hw['first'], hw['last'], frozenset(hw.get('skip', [])))
    return Book(name, **d)


def books(repo=None):
    return {name: from_dict(name, d) for name, d in sources.load_books(repo).items()}


def book(name, repo=None):
    return from_dict(name, sources.load_books(repo)[name])


def argument_pages(name, repo=None):
    """Wiki pages the book's Argument takes before chapter 1: 0 without one, 2 when one word is split
    across its two pages (John), else one per page break in the print (Acts 3, Romans 5) or 1."""
    from .overrides import ARGUMENT_BREAKS, ARGUMENT_SPLIT
    if book(name, repo).argument_page is None:
        return 0
    return 2 if name in ARGUMENT_SPLIT else len(ARGUMENT_BREAKS.get(name, [])) + 1
