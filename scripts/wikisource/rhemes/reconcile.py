"""Reconcile the committed Wikisource pages with generate.py (spec §4.1).

python3 -I scripts/wikisource/rh.py reconcile diff|ladder|adopt|write|verify BOOK ...
python3 -I scripts/wikisource/rh.py status [--write]
"""
import collections
import contextlib
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

from . import paths
from .sources import load_books, ocr_by_page
from . import sources
from .lock import data_lock, lock_path
from .jsonfmt import write_like
from .wikipost import norm

REPO, WS, PAGES, MANIFEST = paths.REPO, paths.WS, paths.PAGES, paths.MANIFEST
LIVE_BASE = '451fb582'  # the commit whose pages equal the live pages: all 800 pages including Back matter, lint fixes, pp. 474/771, and p. 307 posted 2026-11-24


def generate_book(book, out, ornaments=None):
    """Run generate.py for the book's books.json range into out; returns out."""
    cfg = load_books(REPO)[book]
    out = Path(out)
    cmd = [sys.executable, '-I', str(paths.RH), 'generate', str(REPO), book, str(cfg['first']), str(out)]
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
            if not c.exists():
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
    manifest = sources.manifest()
    with tempfile.TemporaryDirectory() as tmp:
        gen = generate_book(book, Path(tmp) / book)
        with data_lock(lock_path()):
            written = write_pages(book, gen, PAGES, manifest)
        print('written:', written)


def cmd_status(write=False):
    """With write, the whole read-mark-write holds the lock, so no other writer's change is lost."""
    with data_lock(lock_path()) if write else contextlib.nullcontext():
        manifest = json.loads(MANIFEST.read_text())
        if manifest.get('266', {}).get('revid') == 16474655:  # live revid by ShakespeareFan00 (audit 2026-11-20)
            manifest['266']['revid'] = 16475295
        changes = mark_status(PAGES, manifest)
        print(f'{len(changes)} status changes:', ' '.join(f'{n}:{s}' for n, s in sorted(changes.items())))
        print('changed pages:', sum(e.get('status') == 'changed' for e in manifest.values()))
        if write:
            write_like(MANIFEST, manifest)


def verify_decisions(decisions, pages):
    """Decisions whose winning form the page does not show at its place. pages: {n: wikitext};
    the word is looked for on its page and the next (it may cross the break), with at least two
    context words around it."""
    from . import ladder
    bad = []
    for d in decisions:
        if not d.winner:
            continue
        c = d.conflict
        want = ladder.core(c.committed if d.winner == 'committed' else c.generated)
        lose = ladder.core(c.generated if d.winner == 'committed' else c.committed)
        ctx_b = {ladder.fold(w) for w in c.before}
        ctx_a = {ladder.fold(w) for w in c.after}
        best = {want: -1, lose: -1}
        for n in (c.page, c.page + 1):
            ws = ladder.words(ladder._body(pages.get(n, '')))
            for i, w in enumerate(ws):
                k = ladder.core(w.replace(ladder.SC_MARK, ''))
                if k in best:
                    hits = len(ctx_b & {ladder.fold(x) for x in ws[max(0, i - 4):i]}) + \
                        len(ctx_a & {ladder.fold(x) for x in ws[i + 1:i + 5]})
                    best[k] = max(best[k], hits)
        # the winner must show with its context, and the loser must not sit at the place more surely
        if best[want] < min(2, len(ctx_b) + len(ctx_a)) or (want != lose and best[lose] > best[want]):
            bad.append(d)
    return bad


def cmd_verify(book):
    cfg = load_books(REPO)[book]
    pages = {n: (PAGES / f'{n}.wiki').read_text() for n in range(cfg['first'], cfg['last'] + 2) if (PAGES / f'{n}.wiki').exists()}
    bad = verify_decisions(load_decisions(book), pages)
    for d in bad:
        c = d.conflict
        print(f'  page {c.page}: {d.winner} {c.committed if d.winner == "committed" else c.generated} not shown ({d.evidence})')
    print(f'{book}: {len(bad)} decisions not shown on the pages')
    return bad


def cmd_ladder(book, overwrite=False):
    """Decide every letter-shape / spelling conflict of the book; write reconcile/BOOK.jsonl.

    Refuses (exit 1) when that file already holds decisions, unless overwrite: once the pages
    are written the conflicts are gone, so a rerun would replace the record with nothing.
    Holds the data lock throughout (it reads the data and writes the record).
    """
    out = WS / 'reconcile' / f'{book}.jsonl'
    with data_lock(lock_path()):
        if out.exists() and not overwrite:
            n = sum(1 for x in out.read_text().splitlines() if x.strip())
            if n:
                print(f'{out} has {n} recorded decisions; not replacing them (--overwrite to rerun the ladder anyway)')
                sys.exit(1)
        return _ladder(book, out)


def _ladder(book, out):
    from . import ladder
    cfg = load_books(REPO)[book]
    tokens = ladder.xml_tokens(sources.xml_text(), book)
    same_book = ladder.same_book_counts(tokens)
    # a book without Transkribus (Matthew) has Apple Vision in its place, as in diff ocr; neither counts for s against ſ
    tk, ts = ocr_by_page(book, 'transkribus') or ocr_by_page(book, 'vision'), ocr_by_page(book, 'tesseract')
    decisions, unaligned = [], []
    with tempfile.TemporaryDirectory() as tmp:
        gen = generate_book(book, Path(tmp) / book)
        for n in range(cfg['first'], cfg['last'] + 1):
            g = gen / f'{n}.wiki'
            c_path = PAGES / f'{n}.wiki'
            if not g.exists() or not c_path.exists():
                continue
            for c in ladder.conflicts(c_path.read_text(), g.read_text(), n, unaligned):
                decisions.append(ladder.decide(c, ladder.locate_xml(c, tokens),
                                               ladder.readings(tk.get(n), c.committed, c.generated, c.before, c.after, round_s=False),
                                               ladder.readings(ts.get(n), c.committed, c.generated, c.before, c.after),
                                               same_book))
    scans = WS / 'reconcile' / 'scan-readings.jsonl'
    if scans.exists():  # rung 4 words read on the facsimile (owner-approved collages)
        decisions = ladder.apply_readings(decisions, [json.loads(x) for x in scans.read_text().splitlines() if x.strip()])
    out.parent.mkdir(exist_ok=True)
    out.write_text(''.join(json.dumps(dict(page=d.conflict.page, committed=d.conflict.committed, generated=d.conflict.generated,
                                           before=d.conflict.before, after=d.conflict.after, rung=d.rung, winner=d.winner,
                                           evidence=d.evidence), ensure_ascii=False) + '\n' for d in decisions))
    for (rung, winner), k in sorted(collections.Counter((d.rung, d.winner) for d in decisions).items()):
        print(f'rung {rung} {winner or "unresolved":10} {k}')
    print(f'unaligned differences (not word for word): {len(unaligned)}')
    for d in decisions:
        if d.rung == 4 and not d.winner:
            print(f'  rung 4: page {d.conflict.page}: {d.conflict.committed} / {d.conflict.generated} ({d.evidence})')
    return decisions, unaligned


def load_decisions(book):
    from . import ladder
    out = []
    for line in (WS / 'reconcile' / f'{book}.jsonl').read_text().splitlines():
        r = json.loads(line)
        c = ladder.Conflict(r['page'], r['committed'], r['generated'], r['before'], r['after'])
        out.append(ladder.Decision(c, r['rung'], r['winner'], r['evidence']))
    return out


def cmd_adopt(book, argv):
    """Dry run unless --write: write the committed-wins readings into odr-original."""
    from . import fidelity
    from . import ladder
    ov = fidelity.parse_overrides(argv)
    decisions = load_decisions(book)
    if '--write' not in argv:
        import shutil as sh
        with tempfile.TemporaryDirectory() as tmp:
            files = []
            for f in sources.data_files(book, REPO):
                dst = Path(tmp) / f.relative_to(REPO)
                dst.parent.mkdir(parents=True, exist_ok=True)
                sh.copyfile(f, dst)
                files.append(dst)
            applied, unlocated = ladder.adopt(files, decisions, ov)
    else:
        with data_lock(lock_path()):
            applied, unlocated = ladder.adopt(sources.data_files(book, REPO), decisions, ov)
    print(f'{"applied" if "--write" in argv else "would apply"}: {len(applied)}; unlocated: {len(unlocated)}')
    for d, why in unlocated:
        print(f'  page {d.conflict.page}: {d.conflict.committed} / {d.conflict.generated}: {why}')


def main(argv=None):
    argv = sys.argv[1:] if argv is None else argv
    if not argv:
        sys.exit(__doc__)
    cmd, rest = argv[0], argv[1:]
    if cmd == 'diff':
        cmd_diff(rest[0], rest[rest.index('--jsonl') + 1] if '--jsonl' in rest else None)
    elif cmd == 'write':
        cmd_write(rest[0])
    elif cmd == 'ladder':
        cmd_ladder(rest[0], '--overwrite' in rest)
    elif cmd == 'adopt':
        cmd_adopt(rest[0], rest[1:])
    elif cmd == 'verify':
        sys.exit(1 if cmd_verify(rest[0]) else 0)
    elif cmd == 'status':
        cmd_status('--write' in rest)
    else:
        sys.exit(__doc__)

