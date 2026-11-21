"""A16049.xml cut into per-book character spans, so a fix's `old` is looked up in its own book only.

spans(xml) partitions <text>'s content plus its closing tag: `front` runs from the end of <text …> to <body;
inside <body> each top-level <div starts a section: a book div gets its book key, an argument
the next book's key, any other section the previous key (`front` before the first book);
`back` runs from </body> through </text> (both tags included, so an insertion of <back> has
anchors), and exists even with no <back> element.
Neighbouring sections with the same key merge. Found on the raw text, never by parsing, so
offsets are offsets into the file's own characters.
"""
import re

from .xmldiff import BOOKN

_REV = {v: k for k, v in BOOKN.items()}
_BOOK_TYPES = ('gospel', 'book', 'epistle', 'prophecy', 'apocalypse')
_DIV = re.compile(r'<div\b[^>]*>|</div\s*>')
_ATTR = re.compile(r'(\w+)="([^"]*)"')


def book_key(div_type, n):
    if (div_type, n) in _REV:
        return _REV[(div_type, n)]
    return re.sub(r'[^a-z0-9]+', '-', n.lower()).strip('-')


def _top_divs(xml, start, end):
    """(offset, attrs) of each top-level <div between start and end."""
    out, depth = [], 0
    for m in _DIV.finditer(xml, start, end):
        if m.group(0).startswith('</'):
            depth -= 1
        else:
            if depth == 0:
                out.append((m.start(), dict(_ATTR.findall(m.group(0)))))
            if not m.group(0).endswith('/>'):
                depth += 1
    return out


def spans(xml):
    t = xml.index('<text')
    a = xml.index('>', t) + 1
    body = xml.index('<body', a)
    body_in = xml.index('>', body) + 1
    body_close = xml.index('</body>', body_in)
    b = xml.index('</text>', body_close)
    divs = _top_divs(xml, body_in, body_close)
    keys = []
    for i, (_, at) in enumerate(divs):
        if 'n' in at and at.get('type') in _BOOK_TYPES:
            keys.append(book_key(at['type'], at['n']))
        elif at.get('type') == 'argument':
            nxt = next((book_key(x['type'], x['n']) for _, x in divs[i + 1:]
                        if 'n' in x and x.get('type') in _BOOK_TYPES), None)
            keys.append(nxt)
        else:
            keys.append(None)
    raw = [('front', a, divs[0][0] if divs else body_close)]
    for i, (off, _) in enumerate(divs):
        key = keys[i] or raw[-1][0]
        stop = divs[i + 1][0] if i + 1 < len(divs) else body_close
        raw.append((key, off, stop))
    raw.append(('back', body_close, b + len('</text>')))
    out = []
    for k, s, e in raw:
        if out and out[-1][0] == k:
            out[-1] = (k, out[-1][1], e)
        else:
            out.append((k, s, e))
    return out


def span(xml, book):
    hits = [(s, e) for k, s, e in spans(xml) if k == book]
    if len(hits) != 1:
        raise ValueError(f'{book}: {len(hits)} spans in the XML')
    return hits[0]
