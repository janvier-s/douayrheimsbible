"""Generate Wikisource Page: files for the 1582 Rhemes New Testament back matter (pp. 774–800).

Parses the TEI XML (the three back-matter divs: list_of_lectionary_readings, index, glossary +
errata table), resolves the 41 EEBO-TCP <gap> elements and scan-verified EEBO typos against
the 1582 facsimile scans (~/facsimiles/transkribus/pages/tables/pdf774.jpg..pdf800.jpg), and
writes NFC-normalised Wikisource pages 774.wiki..800.wiki.

Usage:
    python3 -I scripts/wikisource/rh.py backmatter [--out DIR] [--update-manifest]
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import unicodedata
import xml.etree.ElementTree as ET
from pathlib import Path

from . import paths, sources

TEI_NS = "http://www.tei-c.org/ns/1.0"
NS = {"t": TEI_NS}

WS_DIR = paths.WS

# Running headers per page (verified against pdf774.jpg..pdf800.jpg; p. 774 has none in print).
RUNNING_HEADERS: dict[int, str] = {
    774: "",
    775: "{{rh||{{sc|epistles and gospels.}}|}}",
    776: "{{rh||{{sc|a table of}}|}}",
    777: "{{rh||{{sc|epist. and gospels.}}|}}",
    800: "{{rh||{{sc|hard vvordes explicated.}}|}}",
}
for _p in range(778, 800):
    RUNNING_HEADERS[_p] = (
        "{{rh||{{sc|a table}}|}}" if _p % 2 == 0 else "{{rh||{{sc|of controversies.}}|}}"
    )

# Catchwords per page (verified against catchwords_all.jpg; empty string = no catchword in print).
CATCHWORDS: dict[int, str] = {
    774: "Friday",
    775: "The",
    776: "",
    777: "{{ls}}pirit",
    778: "",
    779: "",
    780: "213.",
    781: "''Com-''",
    782: "Deuotion",
    783: "our",
    784: "''Go{{ls}}pel''",
    785: "Their",
    786: "387.",
    787: "glorie.",
    788: "577.",
    789: "To",
    790: "See",
    791: "men",
    792: "",
    793: "Hieru-",
    794: "the",
    795: "577.",
    796: "auncient",
    797: "''no{{ls}}ter''",
    798: "tion",
    799: "''Domi-''",
    800: "",
}

# Pages where a complete entry ends at the foot and a new entry opens on the next page.
NOP_PAGES = {774, 775, 776, 781, 782, 784, 799}

# Scan-verified Errata table on page 800 (from pdf800.jpg).
# Columns: (page_str, fault_wikitext, correction_wikitext)
ERRATA_ROWS: list[tuple[str, str, str]] = [
    ("'''Pag.''' 8", "''1 Cor. 7.''", "''2 Cor. 7.''"),
    ("38", "Tetrach,", "Tetrarch."),
    ("42", "fifth vveeke,", "fir{{ls}}t vveeke."),
    ("78", "If the Sacrament,", "In the Sacrament."),
    ("148", "''Matth. 9,''", "''Matth. 19.''"),
    ("188", "Scandale,", "Scandals."),
    ("204", "''Ignat. ep. 5.''", "''ep.'' 7. Ibid. in 3 copies the Greeke {{ls}}et amis."),
    ("213", "''li. 39 de con{{ls}}en{{ls}}.''", "''li. 3.''"),
    ("215", "Eighteth yere,", "Eighth."),
    ("238", "Tran{{ls}}ub{{ls}}tantion,", "Tran{{ls}}ub{{ls}}tantiation."),
    ("409", "Cathec, 17.", "Catech. 18."),
    ("440", "Continencie,", "Incontinencie."),
    ("446", "{{lang|grc|ἃ ἐυλογοῦμεν}}", "{{lang|grc|ὃ ἐυλογοῦμεν.}}"),
    ("449", "Is it not novv,", "It is not novv."),
    ("552", "Beguile v,", "Beguile vs."),
    ("576", "''Eu{{ls}}ebius li. 5. c. 2,''", "''Theodorete.''"),
]


def _tag(el: ET.Element) -> str:
    return el.tag.split("}")[-1]


def _clean_ws(s: str) -> str:
    """Collapse internal whitespace while preserving intentional single spaces."""
    return re.sub(r"\s+", " ", s)


def _format_smallcaps_body(s: str) -> str:
    """Convert small-caps words inside body text (not titles) to {{sc|...}} where appropriate."""
    # Feast names and cross-references set in small caps in the 1582 print (outside major titles)
    sc_words = [
        ("THE 1. SVNDAY", "{{dropinitial|T}}{{sc|he}} 1. {{sc|svnday}}"),
        ("The CIRCVMCISION", "The {{sc|Circvmcision}}"),
        ("The EPIPHANIE", "The {{sc|Epiphanie}}"),
        ("PALME Sunday", "{{sc|Palme}} Sunday"),
        ("EASTER DAY", "{{sc|Easter day}}"),
        ("The ASCENSION day", "The {{sc|Ascension}} day"),
        ("VVHIT-SVNDAY", "{{sc|Vvhit-svnday}}"),
        ("TRINITIE Sunday", "{{sc|Trinitie}} Sunday"),
        ("CORPVS CHRISTI", "{{sc|Corpvs Christi}}"),
        ("The CONCEPTION", "The {{sc|Conception}}"),
        ("CANDLEMAS day", "{{sc|Candlemas}} day"),
        ("The ANNVNCIATION", "The {{sc|Annvnciation}}"),
        ("HOLY ROODE day", "{{sc|Holy Roode}} day"),
        ("The VISITATION", "The {{sc|Visitation}}"),
        ("The TRANSFIGVRATION", "The {{sc|Transfigvration}}"),
        ("The ASSVMPTION", "The {{sc|Assvmption}}"),
        ("The NATIVITIE", "The {{sc|Nativitie}}"),
        ("HOLY ROODE", "{{sc|Holy Roode}}"),
        ("ALHALOVVES day", "{{sc|Alhalovves}} day"),
        ("The DEDICATION", "The {{sc|Dedication}}"),
        ("CHVRCH HOLYDAY", "{{sc|Chvrch Holyday}}"),
        ("(See CHVRCH.)", "(See {{sc|Chvrch}}.)"),
        ("CROSSE.", "{{sc|Crosse}}."),
    ]
    for old, new in sc_words:
        s = s.replace(old, new)
    return s


def _render_errata_table() -> tuple[str, str]:
    heading = "{{c|{{larger|The faultes correcte thus.}}}}"
    lines = [
        "{| style='border-collapse: collapse; border: 1px solid #888; width: 100%;'",
    ]
    for idx, (pag, fault, corr) in enumerate(ERRATA_ROWS):
        lines.append("|-")
        w = "width: 90px; " if idx == 0 else ""
        lines.append(
            f"| style='{w}border: 1px solid #888; text-align: right; vertical-align: top; padding: 3px 8px;' | {pag}"
        )
        lines.append(
            f"| style='border: 1px solid #888; vertical-align: top; padding: 3px 8px;' | {fault}"
        )
        if idx == 0:
            lines.append(
                f"| style='border: 1px solid #888; vertical-align: middle; text-align: center; padding: 3px 8px;' rowspan='{len(ERRATA_ROWS)}' | '''Reade'''"
            )
        lines.append(
            f"| style='border: 1px solid #888; vertical-align: top; padding: 3px 8px;' | {corr}"
        )
    lines.append("|}")
    return heading, "\n".join(lines)


def _render_christmas_block() -> str:
    """Render the braced CHRISTMAS day at the first/second/third masse entry cleanly."""
    return "\n".join(
        [
            "{| style='border-collapse: collapse; border: 1px solid #888; width: 100%;'",
            "|-",
            "| style='width: 180px; border: 1px solid #888; vertical-align: middle; padding: 3px 8px;' rowspan='3' | ''{{sc|Christmas}}'' day at the",
            "| style='border: 1px solid #888; vertical-align: top; padding: 3px 8px;' | fir{{ls}}t ma{{ls}}{{ls}}e, Ep. 597. Go{{ls}}p. 139.",
            "|-",
            "| style='border: 1px solid #888; vertical-align: top; padding: 3px 8px;' | {{ls}}econd Ma{{ls}}{{ls}}e, Epi{{ls}}t. 598. Go{{ls}}p. 140.",
            "|-",
            "| style='border: 1px solid #888; vertical-align: top; padding: 3px 8px;' | third Ma{{ls}}{{ls}}e, Ep. 603. Go{{ls}}. 216.",
            "|}",
        ]
    )


class BackmatterParser:
    """Walk the three back-matter TEI divs and emit structured blocks per page (774..800)."""

    def __init__(self) -> None:
        self.page = 773
        # page -> list of block strings (each block separated by \n\n on the page)
        self.pages: dict[int, list[str]] = {p: [] for p in range(774, 801)}
        self.cur_buf: list[str] = []
        self.in_italic = False
        self._strip_next_ws = False

    def _flush(self) -> None:
        text = "".join(self.cur_buf).strip()
        self.cur_buf = []
        self._strip_next_ws = False
        if text and 774 <= self.page <= 800:
            self.pages[self.page].append(text)

    def _emit(self, s: str) -> None:
        if 774 <= self.page <= 800:
            if self._strip_next_ws:
                s = s.lstrip()
                if s:
                    self._strip_next_ws = False
            if s:
                self.cur_buf.append(s)

    def _next_page(self) -> None:
        was_italic = self.in_italic
        if was_italic:
            while self.cur_buf and not self.cur_buf[-1].strip():
                self.cur_buf.pop()
            if self.cur_buf:
                self.cur_buf[-1] = self.cur_buf[-1].rstrip()
            self._emit("''")
        self._flush()
        self.page += 1
        if was_italic and 774 <= self.page <= 800:
            self._emit("''")
            self._strip_next_ws = True

    def walk_inline(self, el: ET.Element, *, in_head: bool = False) -> None:
        tag = _tag(el)

        if tag == "pb":
            self._next_page()
            return

        if tag == "gap":
            raise RuntimeError(f"Unresolved <gap> on page {self.page}: {ET.tostring(el, encoding='unicode')}")

        if tag == "foreign":
            lang = el.attrib.get("{http://www.w3.org/XML/1998/namespace}lang", "grc")
            txt = "".join(el.itertext()).strip()
            self._emit(f"{{{{lang|{lang}|{txt}}}}}")
            return

        if tag == "g":
            ref = el.attrib.get("ref", "")
            if ref == "char:cmbAbbrStroke":
                self._emit("\u0304")
            elif ref in ("char:EOLhyphen", "char:EOLunhyphen"):
                # Join across XML line-break hyphen without inserting a space
                while self.cur_buf and not self.cur_buf[-1].strip():
                    self.cur_buf.pop()
                if self.cur_buf:
                    self.cur_buf[-1] = self.cur_buf[-1].rstrip()
                self._strip_next_ws = True
            elif ref == "char:punc":
                self._emit(".")
            elif ref == "char:leaf":
                self._emit("❧")
            elif el.text:
                self._emit(el.text)
            return

        if tag == "note":
            txt = "".join(self._extract_plain(el)).strip()
            if txt == "☞":
                # EEBO microfilm hand-drawn manicules; absent from the 1582 print scans.
                return
            # Page 774 left margin note: * The Epistles omitted...
            was_ital = self.in_italic
            if was_ital:
                self._emit("''")
            self._emit(f" *{{{{outside L|* ''{txt}''}}}} ")
            if was_ital:
                self._emit("''")
            return

        if tag == "seg" and el.attrib.get("rend") == "decorInit":
            ch = (el.text or "").strip()
            if ch == "T":
                # Handled together with 'THE 1. SVNDAY' in _format_smallcaps_body
                self._emit("T")
            elif ch == "A":
                self._emit("{{dropinitial|A}}")
            else:
                self._emit(f"{{{{dropinitial|{ch}}}}}")
            return

        if tag == "hi":
            # Avoid nesting italics if already italic
            if not self.in_italic:
                self._emit("''")
                self.in_italic = True
                self._walk_children(el, in_head=in_head)
                if self.in_italic:
                    self._emit("''")
                    self.in_italic = False
            else:
                self._walk_children(el, in_head=in_head)
            return

        self._walk_children(el, in_head=in_head)

    def _extract_plain(self, el: ET.Element) -> list[str]:
        out: list[str] = []
        if el.text:
            out.append(el.text)
        for c in el:
            t = _tag(c)
            if t == "g":
                ref = c.attrib.get("ref", "")
                if ref == "char:cmbAbbrStroke":
                    out.append("\u0304")
                elif ref == "char:punc":
                    out.append(".")
                elif ref not in ("char:EOLhyphen", "char:EOLunhyphen") and c.text:
                    out.append(c.text)
            else:
                out.extend(self._extract_plain(c))
            if c.tail:
                out.append(c.tail)
        return out

    def _walk_children(self, el: ET.Element, *, in_head: bool = False) -> None:
        if el.text:
            self._emit(el.text)
        for c in el:
            self.walk_inline(c, in_head=in_head)
            if c.tail:
                self._emit(c.tail)

    def _render_inline_str(self, el: ET.Element) -> str:
        """Render an element that stays on the current page into a single cleaned string."""
        saved_buf = self.cur_buf
        saved_ital = self.in_italic
        self.cur_buf = []
        self.in_italic = False
        self._walk_children(el, in_head=True)
        if self.in_italic:
            self.cur_buf.append("''")
            self.in_italic = False
        res = _clean_ws("".join(self.cur_buf)).strip()
        self.cur_buf = saved_buf
        self.in_italic = saved_ital
        return res

    def process_div(self, div: ET.Element) -> None:
        div_type = div.attrib.get("type", "")
        for child in div:
            ctag = _tag(child)
            if ctag == "pb":
                self._next_page()
            elif ctag == "head":
                h = self._render_inline_str(child)
                if div_type == "index":
                    self.pages[self.page].append("{{rule|100%}}")
                self.pages[self.page].append(f"{{{{c|{{{{larger|{h}}}}}}}}}")
            elif ctag == "list":
                self._process_list(child, div_type)
            elif ctag == "p":
                tbl = child.find("t:table", NS)
                if tbl is not None:
                    heading, table_wikitext = _render_errata_table()
                    self.pages[self.page].append(heading)
                    self.pages[self.page].append(table_wikitext)
                else:
                    self._flush()
                    self._walk_children(child)
                    self._flush()
            elif ctag == "closer":
                txt = self._render_inline_str(child)
                self.pages[self.page].append(f"{{{{c|{{{{x-larger|{txt}}}}}}}}}")

    def _process_list(self, lst: ET.Element, div_type: str) -> None:
        for child in lst:
            ctag = _tag(child)
            if ctag == "pb":
                self._next_page()
            elif ctag == "head":
                h = self._render_inline_str(child)
                if len(h) == 1 and h.isalpha():
                    self.pages[self.page].append(f"{{{{c|{h}}}}}")
                elif h.startswith("IN votiue"):
                    rest = h[len("IN "):]
                    self.pages[self.page].append(f"{{{{c|{{{{sc|In}}}} ''{rest}''}}}}")
                else:
                    self.pages[self.page].append(f"{{{{c|''{h}''}}}}")
            elif ctag == "item":
                # Special case: nested Christmas day list on p. 774
                if child.find("t:list", NS) is not None:
                    self._flush()
                    self.pages[self.page].append(_render_christmas_block())
                    continue
                self._flush()
                self._walk_children(child)
                self._flush()


def _fix_page_breaks(pages: dict[int, list[str]]) -> None:
    """Apply scan-verified page-break adjustments (hyphenated splits across pages)."""
    # 1. p. 779 -> p. 780: 'S. Auguſtines' splits as 'S. Augu-' / 'ſtines'
    p779_last = pages[779][-1]
    assert p779_last.endswith("S. Auguſtines"), f"Unexpected p.779 end: {p779_last[-40:]!r}"
    pages[779][-1] = p779_last[: -len("Auguſtines")] + "{{hws|Augu|Augu{{ls}}tines|title=Augustines}}"
    pages[780][0] = "{{hwe|{{ls}}tines|Augu{{ls}}tines|title=Augustines}} " + pages[780][0]

    # 2. p. 798 -> p. 799: 'iuſtification.' splits as 'iuſtifica-' / 'tion.'
    p798_last = pages[798][-1]
    assert p798_last.endswith("from iuſtification."), f"Unexpected p.798 end: {p798_last[-40:]!r}"
    pages[798][-1] = (
        p798_last[: -len("iuſtification.")]
        + "{{hws|iu{{ls}}tifica|iu{{ls}}tification|title=iustification}}"
    )
    pages[799][0] = "{{hwe|tion|iu{{ls}}tification|title=iustification}}. " + pages[799][0]


def _postprocess_block(block: str, page: int, is_table_or_heading: bool) -> str:
    """Normalise whitespace, typography, macrons, and long-s on a single block."""
    if block.startswith("{|") or block.startswith("{{rule"):
        return unicodedata.normalize("NFC", block)

    s = _clean_ws(block).strip()

    # Drop-cap adjustments for alphabetical sections in Table of Controversies (pp. 777–799)
    if page == 777 and "{{dropinitial|A}}BSOLVTION" in s:
        s = s.replace("{{dropinitial|A}}BSOLVTION", "{{dropinitial|A}}{{sc|bsolvtion}}")
    elif 779 <= page <= 799:
        # 2-line roman drop initials opening letter sections in the Table of Controversies
        m = re.match(r"^''([A-Z])([A-Z][a-zſ']+)", s)
        if m and m.group(1) in "BCDEHMNOPRSV":
            s = f"{{{{dropinitial|{m.group(1)}}}}}''{m.group(2)}" + s[m.end():]
        elif s.startswith("''VVidovvhod."):
            s = "{{dropinitial|V}}''Vidovvhod." + s[len("''VVidovvhod."):]
        elif s.startswith("''ZEale'' "):
            s = "{{dropinitial|Z}}Eale " + s[len("''ZEale'' "):]
        elif s.startswith("FAith."):
            s = "{{dropinitial|F}}Aith." + s[len("FAith."):]
        elif s.startswith("GOD, not author"):
            s = "{{dropinitial|G}}OD, not author" + s[len("GOD, not author"):]
        elif s.startswith("IESVS, in Engli"):
            s = "{{dropinitial|I}}ESVS, in Engli" + s[len("IESVS, in Engli"):]

    if not is_table_or_heading:
        s = _format_smallcaps_body(s)

    # Remove empty italic pairs '''' or '' '' created at boundaries
    s = re.sub(r"''\s*''", " ", s)
    # Remove stray spaces inside italics right before closing punctuation or after opening
    s = re.sub(r"''\s+([,.;:?!])", r"''\1", s)
    # Fix spacing around punctuation (W-space compliance)
    s = re.sub(r"\s+([,.;:?!\)])", r"\1", s)
    s = re.sub(r"\(\s+", "(", s)
    s = re.sub(r"  +", " ", s)

    # Convert literal ſ -> {{ls}}, keeping round s inside {{sc|...}}
    s = unicodedata.normalize("NFC", s)
    parts = re.split(r"(\{\{sc\|[^{}]*\}\})", s)
    out_parts = []
    for part in parts:
        if part.startswith("{{sc|"):
            out_parts.append(part.replace("ſ", "s"))
        else:
            out_parts.append(part.replace("ſ", "{{ls}}"))
    s = "".join(out_parts)

    # Final whitespace polish
    s = re.sub(r"\s+([,.;:?!\)])", r"\1", s)
    s = re.sub(r"  +", " ", s).strip()
    return unicodedata.normalize("NFC", s)


def _assemble_page(page: int, blocks: list[str]) -> str:
    rh = RUNNING_HEADERS[page]
    header = f'<noinclude><pagequality level="1" user="" />{{{{sidenotes begin}}}}{rh}</noinclude>'

    cleaned = []
    for b in blocks:
        is_special = b.startswith(("{{c|", "{|", "{{rule"))
        cb = _postprocess_block(b, page, is_special)
        if cb:
            cleaned.append(cb)

    body = "\n\n".join(cleaned)
    if page in NOP_PAGES:
        body += "\n{{nop}}"

    cw = CATCHWORDS[page]
    if cw:
        footer = f"<noinclude>{{{{continues|{cw}}}}}\n{{{{sidenotes end}}}}</noinclude>"
    else:
        footer = "<noinclude>{{sidenotes end}}</noinclude>"

    return unicodedata.normalize("NFC", header + body + footer + "\n")


def generate(xml_path: Path | None = None) -> dict[int, str]:
    if xml_path is None:
        xml_path = sources.xml_path()
    tree = ET.parse(xml_path)
    root = tree.getroot()
    body = root.find(".//t:body", NS)
    assert body is not None, "Missing TEI <body>"

    target_types = ("list_of_lectionary_readings", "index", "glossary")
    divs = [c for c in body if _tag(c) == "div" and c.attrib.get("type") in target_types]
    if [d.attrib.get("type") for d in divs] != list(target_types):
        raise RuntimeError(f"Expected divs {target_types}, found {[d.attrib.get('type') for d in divs]}")

    parser = BackmatterParser()
    for d in divs:
        parser.process_div(d)

    _fix_page_breaks(parser.pages)

    result: dict[int, str] = {}
    for p in range(774, 801):
        result[p] = _assemble_page(p, parser.pages[p])
    return result


def update_manifest(out_dir: Path, manifest_path: Path) -> None:
    manifest = json.loads(manifest_path.read_text())
    for p in range(774, 801):
        txt = (out_dir / f"{p}.wiki").read_text()
        sha1 = hashlib.sha1(txt.encode("utf-8")).hexdigest()
        ent = manifest.get(str(p), {})
        ent["sha1"] = sha1
        ent["source"] = "frozen"
        ent.setdefault("status", "pending")
        manifest[str(p)] = ent
    manifest_path.write_text(json.dumps(manifest, indent=1) + "\n", encoding="utf-8")


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--xml", type=Path, default=None, help="Path to TEI XML (defaults to sources.xml_path())")
    ap.add_argument("--out", type=Path, default=WS_DIR / "pages", help="Output pages directory")
    ap.add_argument(
        "--update-manifest",
        action="store_true",
        help="Add/update pages 774–800 in manifest.json with source: frozen",
    )
    args = ap.parse_args(argv)

    pages = generate(args.xml)
    args.out.mkdir(parents=True, exist_ok=True)
    for p, content in sorted(pages.items()):
        (args.out / f"{p}.wiki").write_text(content, encoding="utf-8")
    print(f"Wrote {len(pages)} back-matter pages ({min(pages)}–{max(pages)}) to {args.out}")

    if args.update_manifest:
        update_manifest(args.out, WS_DIR / "manifest.json")
        print(f"Updated {WS_DIR / 'manifest.json'} for pages 774–800 (source: frozen)")
    return 0


if __name__ == "__main__":
    main()
