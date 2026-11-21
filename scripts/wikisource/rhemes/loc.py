"""Where a data fix points: the `loc` grammar of the book JSON and its annotation files.

A loc (without the book) is one of
    arg:N | arg:title | arg:N/nM                 an intro's text, the first intro's title, an intro note
    C:sum | C:sum/nM                             a chapter summary, a summary note (by marker)
    C:VaN | C:VaN:title | C:VaN/mnM              annotation N of chapter C (counted in the chapter), its title, a margin note
    C:V | C:V/noteL | C:V/crN                    a verse, a verse note (by label), a cross reference
optionally followed by #key, which selects another key of the same container (a value entry).

    load_store(root, book) -> Store    resolve(store, loc) -> (container, key)
    iter_locs(store) -> (loc, container, key) for every text    save_store(store, touched)
"""
import json
import re
from dataclasses import dataclass, field
from pathlib import Path

from .jsonfmt import write_like


@dataclass
class Store:
    root: Path
    book: str
    bj: dict
    anns: dict = field(default_factory=dict)


def load_store(root, book):
    root = Path(root)
    bj = json.loads((root / f'{book}.json').read_text())
    anns = {}
    for f in sorted((root / book / 'annotations').glob('*.json')):
        a = json.loads(f.read_text())
        anns[a['chapter']] = a
    return Store(root, book, bj, anns)


def save_store(store, touched):
    """Writes book.json (touched key 'book') and the touched annotation chapters; the caller holds the lock."""
    if 'book' in touched:
        write_like(store.root / f'{store.book}.json', store.bj)
    for c in sorted(t for t in touched if t != 'book'):
        write_like(store.root / store.book / 'annotations' / f'{c:03d}.json', store.anns[c])


def find_text(book_json, anns, loc):
    """(container, key) holding the text at loc."""
    m = re.fullmatch(r'arg:(\d+|title)', loc)
    if m:
        it = book_json['intros'][0 if m.group(1) == 'title' else int(m.group(1))]
        return it, 'title' if m.group(1) == 'title' else 'text'
    m = re.fullmatch(r'(\d+):sum(?:/n(.+))?', loc)
    if m:
        ch = book_json['chapters'][int(m.group(1)) - 1]
        if m.group(2):
            return next(n for n in ch['summary_notes'] if str(n.get('marker')) == m.group(2)), 'text'
        return ch, 'summary'
    m = re.fullmatch(r'(\d+):(\d+)a(\d+)(:title|/mn(.+))?', loc)
    if m:
        a = anns[int(m.group(1))]['annotations'][int(m.group(3)) - 1]
        if m.group(4) == ':title':
            return a, 'title'
        if m.group(5):
            return next(n for n in a['notes'] if str(n.get('marker')) == m.group(5)), 'text'
        return a, 'text'
    m = re.fullmatch(r'(\d+):(\d+)(?:/note(.+)|/cr(\d+))?', loc)
    if m:
        v = book_json['chapters'][int(m.group(1)) - 1]['verses'][int(m.group(2)) - 1]
        assert v['verse'] == int(m.group(2))
        if m.group(3):
            return next(n for n in v['notes'] if str(n.get('label')) == m.group(3)), 'text'
        if m.group(4):
            return v['cross_refs'][int(m.group(4)) - 1], 'text'
        return v, 'text'
    raise ValueError(loc)


def resolve(store, loc):
    """(container, key) at loc, with the #key suffix and intro notes (arg:N/nM); ValueError if it doesn't resolve."""
    base, _, hkey = loc.partition('#')
    try:
        m = re.fullmatch(r'arg:(\d+)/n(.+)', base)
        if m:
            it = store.bj['intros'][int(m.group(1))]
            cont, key = next(n for n in it['notes'] if str(n.get('marker')) == m.group(2)), 'text'
        else:
            cont, key = find_text(store.bj, store.anns, base)
    except (IndexError, KeyError, StopIteration, AssertionError, TypeError) as e:
        raise ValueError(f'{loc}: {type(e).__name__}') from None
    return (cont, hkey) if hkey else (cont, key)


def _unique(items, attr):
    vals = [str(x.get(attr)) for x in items]
    return [x for x, v in zip(items, vals) if vals.count(v) == 1]


def iter_locs(store):
    """(loc, container, key) for every addressable text, in a stable order."""
    bj = store.bj
    for i, it in enumerate(bj.get('intros', [])):
        if i == 0 and isinstance(it.get('title'), str):
            yield 'arg:title', it, 'title'
        if isinstance(it.get('text'), str):
            yield f'arg:{i}', it, 'text'
        for n in _unique(it.get('notes') or [], 'marker'):
            yield f'arg:{i}/n{n.get("marker")}', n, 'text'
    for ch in bj['chapters']:
        c = ch['chapter']
        if isinstance(ch.get('summary'), str):
            yield f'{c}:sum', ch, 'summary'
        for n in _unique(ch.get('summary_notes') or [], 'marker'):
            yield f'{c}:sum/n{n.get("marker")}', n, 'text'
        for idx, v in enumerate(ch['verses'], 1):
            if v['verse'] != idx:
                continue
            yield f'{c}:{idx}', v, 'text'
            for n in _unique(v.get('notes') or [], 'label'):
                yield f'{c}:{idx}/note{n.get("label")}', n, 'text'
            for k, cr in enumerate(v.get('cross_refs') or [], 1):
                if isinstance(cr, dict) and isinstance(cr.get('text'), str):
                    yield f'{c}:{idx}/cr{k}', cr, 'text'
        for k, a in enumerate((store.anns.get(c) or {}).get('annotations', []), 1):
            here = f'{c}:{a.get("verse")}a{k}'
            yield here, a, 'text'
            if isinstance(a.get('title'), str):
                yield here + ':title', a, 'title'
            for n in _unique(a.get('notes') or [], 'marker'):
                yield f'{here}/mn{n.get("marker")}', n, 'text'
