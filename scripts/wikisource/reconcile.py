"""Reconcile the committed Wikisource pages with generate.py (spec §4.1).

python3 -I scripts/wikisource/reconcile.py diff|ladder|adopt|write|status ...
"""
import collections
import difflib
import json
import re
import shutil
import subprocess
import sys
import tempfile
import unicodedata
from pathlib import Path
from typing import NamedTuple

sys.path.insert(0, str(Path(__file__).parent))
from generate import load_books  # noqa: E402
from jsonfmt import write_like  # noqa: E402
from wikipost import norm  # noqa: E402

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[1]
WS = REPO / 'wikisource/1582-rhemes-nt'
PAGES = WS / 'pages'
MANIFEST = WS / 'manifest.json'
LIVE_BASE = '494f0400'  # the commit whose pages equal the live pages (docs/audits/2026-11-20-live-vs-committed.md)


def generate_book(book, out, ornaments=None):
    """Run generate.py for the book's books.json range into out; returns out."""
    cfg = load_books(REPO)[book]
    out = Path(out)
    cmd = [sys.executable, '-I', str(HERE / 'generate.py'), str(REPO), book, str(cfg['first']), str(out)]
    if ornaments:
        cmd.append('--ornaments')
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode:
        raise RuntimeError(f'generate.py {book} failed:\n{r.stderr[-1500:]}')
    return out


class Diff(NamedTuple):
    page: int
    committed: str
    generated: str
    cls: str


MACRON = re.compile(r'([a-zA-Z])[\u0304\u0303]')
PARTS = re.compile(r'^(<noinclude>.*?</noinclude>)(.*)(<noinclude>.*?</noinclude>\n?)$', re.S)


def _macron_match(abbr, full):
    """abbr has a macron/titlo letter standing for a following n or m (cōmaunding = commaunding)."""
    d = unicodedata.normalize('NFD', abbr)
    if not MACRON.search(d):
        return False
    pat = ''
    for ch in d:
        if ch in '\u0304\u0303':
            pat += '[nm]?'
        else:
            pat += re.escape(ch)
    return re.fullmatch(pat, unicodedata.normalize('NFD', full)) is not None


def classify(c, g):
    """Class of one word-level difference between committed text c and generated text g."""
    both = c + g
    if 'image=' in both or '[[File:' in both:
        return 'ornament'
    if c.replace('{{ls}}', 's') == g.replace('{{ls}}', 's'):
        ss = ('{{ls}}{{ls}}' in c and '{{ls}}s' in g) or ('{{ls}}{{ls}}' in g and '{{ls}}s' in c)
        return 'ls:ss' if ss else 'ls:other'
    if _macron_match(c, g) or _macron_match(g, c):
        return 'macron'
    if re.sub(r'\s', '', c) == re.sub(r'\s', '', g):
        return 'space'
    for marker, cls in (('{{sc', 'sc'), ('{{lang|grc', 'greek'), ('{{hw', 'hw')):
        if marker in both:
            return cls
    return 'text'


def _ops(a, b):
    A, B = a.split(), b.split()
    for op, i1, i2, j1, j2 in difflib.SequenceMatcher(None, A, B, autojunk=False).get_opcodes():
        if op != 'equal':
            yield ' '.join(A[i1:i2]), ' '.join(B[j1:j2])


def word_diffs(committed, generated, page):
    """Word-level differences of one page; header and footer differences are classed head/foot."""
    mc, mg = PARTS.match(committed), PARTS.match(generated)
    if not (mc and mg):
        return [Diff(page, c, g, classify(c, g)) for c, g in _ops(committed, generated)]
    out = []
    for k, part in ((1, 'head'), (2, None), (3, 'foot')):
        for c, g in _ops(mc.group(k), mg.group(k)):
            out.append(Diff(page, c, g, 'ornament' if classify(c, g) == 'ornament' else part or classify(c, g)))
    return out


def write_pages(book, gen, pages, manifest, rng=None):
    """Copy generated pages that differ into pages/, inside the book's range, never a frozen page."""
    if rng is None:
        cfg = load_books(REPO)[book]
        rng = (cfg['first'], cfg['last'])
    written = []
    for n in range(rng[0], rng[1] + 1):
        src, dst = Path(gen) / f'{n}.wiki', Path(pages) / f'{n}.wiki'
        if not src.exists() or manifest.get(str(n), {}).get('source') == 'frozen':
            continue
        if not dst.exists() or dst.read_text() != src.read_text():
            shutil.copyfile(src, dst)
            written.append(n)
    return written


def mark_status(pages, manifest, base=LIVE_BASE):
    """status = changed when the page text differs from the live-equal commit base (pagequality ignored)."""
    changes = {}
    for key, ent in manifest.items():
        f = Path(pages) / f'{key}.wiki'
        if not f.exists():
            continue
        r = subprocess.run(['git', '-C', str(pages), 'show', f'{base}:./{key}.wiki'], capture_output=True, text=True)
        status = 'changed' if r.returncode or norm(r.stdout) != norm(f.read_text()) else 'posted'
        if ent.get('status') != status:
            ent['status'] = status
            changes[int(key)] = status
    return changes


def cmd_diff(book, jsonl=None):
    cfg = load_books(REPO)[book]
    with tempfile.TemporaryDirectory() as tmp:
        gen = generate_book(book, Path(tmp) / book)
        diffs, same = [], 0
        for n in range(cfg['first'], cfg['last'] + 1):
            c, g = PAGES / f'{n}.wiki', gen / f'{n}.wiki'
            if not g.exists():
                print(f'page {n}: not generated')
                continue
            d = word_diffs(c.read_text(), g.read_text(), n)
            same += not d
            diffs += d
    for cls, k in sorted(collections.Counter(d.cls for d in diffs).items()):
        print(f'{cls:10} {k}')
    print(f'identical {same}/{cfg["last"] - cfg["first"] + 1}')
    if jsonl:
        Path(jsonl).write_text(''.join(json.dumps(d._asdict(), ensure_ascii=False) + '\n' for d in diffs))


def cmd_write(book):
    manifest = json.loads(MANIFEST.read_text())
    with tempfile.TemporaryDirectory() as tmp:
        gen = generate_book(book, Path(tmp) / book)
        print('written:', write_pages(book, gen, PAGES, manifest))


def cmd_status(write=False):
    manifest = json.loads(MANIFEST.read_text())
    if manifest.get('266', {}).get('revid') == 16474655:  # live revid by ShakespeareFan00 (audit 2026-11-20)
        manifest['266']['revid'] = 16475295
    changes = mark_status(PAGES, manifest)
    print(f'{len(changes)} status changes:', ' '.join(f'{n}:{s}' for n, s in sorted(changes.items())))
    print('changed pages:', sum(e.get('status') == 'changed' for e in manifest.values()))
    if write:
        write_like(MANIFEST, manifest)


def main(argv):
    if not argv:
        sys.exit(__doc__)
    cmd, rest = argv[0], argv[1:]
    if cmd == 'diff':
        cmd_diff(rest[0], rest[rest.index('--jsonl') + 1] if '--jsonl' in rest else None)
    elif cmd == 'write':
        cmd_write(rest[0])
    elif cmd == 'status':
        cmd_status('--write' in rest)
    else:
        sys.exit(__doc__)


if __name__ == '__main__':
    main(sys.argv[1:])
