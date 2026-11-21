"""The fixes ledger: every data fix is one record in wikisource/1582-rhemes-nt/fixes/<book>.jsonl.

    rh.py fix check [BOOK…] [--repo R] [--fixes D]
    rh.py fix apply BOOK [--write] [--only ID,…] [--repo R] [--fixes D]

A record (keys in this order; the last five optional):
    id, target, loc, old, new, odr_old, odr_new, evidence, date, note, allow, superseded_by
- target ⊆ odr-original, odr, xml. old/new apply to every target but odr, which uses
  odr_old/odr_new when given. loc is "<book> <rest>": for JSON targets rest is a loc.py loc
  (with #key a value entry: old/new are JSON values, null = key absent); for xml the scope
  is the book's span (xmlspan) and loc is informational.
- allow: ["FEATURE:loss|shift", …], the decided fidelity change; note gives the reason.
- superseded_by: a later id in the file, or "git <hash>": later changed, skipped.
States per target: pending (old once in scope), applied (old absent, new present), conflict.
apply is a dry run unless --write; with --write it takes the data lock, recomputes every
state, and writes nothing unless every selected entry is pending or applied and passes the
fidelity check (odr-original and xml targets).
"""
import json
import re
import unicodedata
import xml.etree.ElementTree as ET
from dataclasses import dataclass, field
from pathlib import Path

from . import fidelity, loc as locmod, paths, sources, xmlspan
from .lock import data_lock

KEYS = ('id', 'target', 'loc', 'old', 'new', 'odr_old', 'odr_new', 'evidence', 'date', 'note', 'allow', 'superseded_by')
REQUIRED = ('id', 'target', 'loc', 'old', 'new', 'evidence', 'date')
STORES = ('odr-original', 'odr', 'xml')
ROOTS = {'odr-original': 'static/data/odr-original', 'odr': 'static/data/odr'}


class LedgerError(ValueError):
    pass


@dataclass(frozen=True)
class Entry:
    id: str
    target: tuple
    loc: str
    old: object
    new: object
    evidence: str
    date: str
    odr_old: object = None
    odr_new: object = None
    note: str = None
    allow: tuple = None
    superseded_by: str = None

    @classmethod
    def from_dict(cls, d):
        unknown = set(d) - set(KEYS)
        missing = [k for k in REQUIRED if k not in d]
        if unknown or missing:
            raise ValueError(f'unknown keys {sorted(unknown)}; missing keys {missing}')
        kw = dict(d)
        kw['target'] = tuple(kw['target'])
        if kw.get('allow') is not None:
            kw['allow'] = tuple(kw['allow'])
        return cls(**kw)

    def to_dict(self):
        out = {}
        for k in KEYS:
            v = getattr(self, k)
            if k in REQUIRED or v is not None:
                out[k] = list(v) if isinstance(v, tuple) else v
        return out

    @property
    def book(self):
        return self.loc.split(' ', 1)[0]

    @property
    def rest(self):
        return self.loc.split(' ', 1)[1] if ' ' in self.loc else ''

    @property
    def is_value(self):
        return '#' in self.rest

    def pair(self, store):
        """(old, new) for one target."""
        if store == 'odr' and self.odr_new is not None:
            return (self.odr_old if self.odr_old is not None else self.old), self.odr_new
        if store == 'odr' and self.odr_old is not None:
            return self.odr_old, self.new
        return self.old, self.new


def dumps(entry):
    return json.dumps(entry.to_dict(), ensure_ascii=False, separators=(',', ':'))


def write_ledger(path, entries):
    Path(path).write_text(''.join(dumps(e) + '\n' for e in entries))


def _strings(v):
    if isinstance(v, str):
        yield v
    elif isinstance(v, dict):
        for x in v.values():
            yield from _strings(x)
    elif isinstance(v, (list, tuple)):
        for x in v:
            yield from _strings(x)


def validate(entry, ids_seen, book=None, all_ids=None):
    """Problems with one entry (an empty list when it is well formed)."""
    p = []
    e = entry
    if e.id in ids_seen:
        p.append(f'duplicate id {e.id}')
    b = book or e.book
    if not re.fullmatch(r'[a-z0-9-]+', e.id or '') or not e.id.startswith(b + '-'):
        p.append(f'id {e.id!r} must be {b}-<slug> (a-z, 0-9, -)')
    if e.book != b:
        p.append(f'loc {e.loc!r}: book is not {b}')
    if not e.target or any(t not in STORES for t in e.target) or len(set(e.target)) != len(e.target):
        p.append(f'target {list(e.target)}: use {", ".join(STORES)}')
    if 'odr' in e.target and len(e.target) > 1 and e.odr_new is None:
        p.append('odr with another target needs odr_new')
    if not re.fullmatch(r'\d{4}-\d\d-\d\d', e.date or ''):
        p.append(f'date {e.date!r}: use YYYY-MM-DD')
    for s in _strings([e.old, e.new, e.odr_old, e.odr_new, e.loc, e.note]):
        if unicodedata.normalize('NFC', s) != s:
            p.append(f'not NFC: {s[:40]!r}')
            break
    if not e.is_value:
        for t in e.target or ():
            old, new = e.pair(t)
            if not isinstance(old, str) or not isinstance(new, str) or not old:
                p.append(f'{t}: old and new must be strings, old non-empty')
            elif old == new:
                p.append(f'{t}: old == new')
            elif old in new:
                p.append(f'{t}: old inside new (a re-run would apply it again); widen the context')
    if e.allow is not None:
        for a in e.allow:
            m = re.fullmatch(r'(\w+):(loss|shift)', a)
            if not m or m.group(1) not in fidelity.FEATURES:
                p.append(f'allow {a!r}: use FEATURE:loss|shift')
        if not (e.note or '').strip():
            p.append('allow needs a note giving the reason')
    sb = e.superseded_by
    if sb is not None and not sb.startswith('git ') and all_ids is not None and sb not in all_ids:
        p.append(f'superseded_by {sb!r}: no such id in the file')
    return p


def load_ledger(book, root=None):
    path = Path(root or paths.FIXES) / f'{book}.jsonl'
    if not path.exists():
        return []
    entries, errs = [], []
    for i, line in enumerate(path.read_text().splitlines(), 1):
        if not line.strip():
            continue
        try:
            entries.append(Entry.from_dict(json.loads(line)))
        except ValueError as ex:
            errs.append(f'{path.name}:{i}: {ex}')
    all_ids = {e.id for e in entries}
    seen = set()
    for e in entries:
        errs += [f'{path.name} {e.id}: {x}' for x in validate(e, seen, book, all_ids)]
        seen.add(e.id)
    if errs:
        raise LedgerError('\n'.join(errs))
    return entries


class Ctx:
    """The data an apply works on: the repo's JSON stores and the XML, loaded lazily, edited in memory."""

    def __init__(self, repo=None, xml=None, lock=None):
        self.repo = Path(repo or paths.REPO)
        self.xml = Path(xml) if xml else sources.xml_path()
        self.lock = lock
        self._stores = {}
        self.touched = {}
        self._xml_text = None
        self._spans = None
        self.xml_dirty = False

    def store(self, name, book):
        key = (name, book)
        if key not in self._stores:
            self._stores[key] = locmod.load_store(self.repo / ROOTS[name], book)
        return self._stores[key]

    @property
    def xml_text(self):
        if self._xml_text is None:
            self._xml_text = self.xml.read_bytes().decode('utf-8')
        return self._xml_text

    def span(self, book):
        if self._spans is None:
            self._spans = {}
            for k, s, e in xmlspan.spans(self.xml_text):
                if k in self._spans:
                    raise ValueError(f'{k}: two spans in the XML')
                self._spans[k] = (s, e)
        if book not in self._spans:
            raise ValueError(f'{book}: no span in the XML')
        return self._spans[book]

    def xml_replace(self, book, old, new):
        s, e = self.span(book)
        scope = self.xml_text[s:e]
        i = scope.index(old)
        self._xml_text = self.xml_text[:s + i] + new + self.xml_text[s + i + len(old):]
        self.xml_dirty = True
        if any(t in old + new for t in ('<div', '</div', '<body', '</body', '<text', '</text')):
            self._spans = None
            return
        d = len(new) - len(old)
        self._spans = {k: ((a + d if a > s else a), (b + d if b > s or k == book else b))
                       for k, (a, b) in self._spans.items()}


def _target_state(entry, t, ctx):
    """(state, problem or None, locator) for one target."""
    old, new = entry.pair(t)
    if t == 'xml':
        try:
            s, e = ctx.span(entry.book)
        except ValueError as ex:
            return 'conflict', str(ex), None
        scope = ctx.xml_text[s:e]
        no, nn = scope.count(old), scope.count(new)
        where = f'in {entry.book}\'s XML span'
    else:
        try:
            st = ctx.store(t, entry.book)
            cont, key = locmod.resolve(st, entry.rest)
        except (ValueError, FileNotFoundError) as ex:
            return 'conflict', f'{t}: loc does not resolve ({ex})', None
        if entry.is_value:
            cur = cont.get(key, None)
            if cur == old:
                return 'pending', None, (cont, key)
            if cur == new:
                return 'applied', None, (cont, key)
            return 'conflict', f'{t}: value is {json.dumps(cur, ensure_ascii=False)[:60]}, neither old nor new', None
        val = cont.get(key)
        if not isinstance(val, str):
            return 'conflict', f'{t}: no text at {entry.rest}', None
        no, nn = val.count(old), val.count(new)
        where = f'at {entry.rest}'
        if no == 1:
            return 'pending', None, (cont, key)
    if no == 1:
        return 'pending', None, None
    if no == 0 and nn >= 1:
        return 'applied', None, None
    if no == 0:
        return 'conflict', f'{t}: neither old nor new {where}', None
    return 'conflict', f'{t}: old occurs {no}× {where}', None


def states(entry, ctx):
    if entry.superseded_by is not None:
        return {t: 'superseded' for t in entry.target}
    return {t: _target_state(entry, t, ctx)[0] for t in entry.target}


def _fidelity(entry, t):
    if t == 'odr':
        return []
    old, new = entry.pair(t)
    if entry.is_value:
        old, new = json.dumps(old, ensure_ascii=False), json.dumps(new, ensure_ascii=False)
    allowed = set(entry.allow or ())
    return [f'fidelity: {f.feature} {f.kind} {f.before}→{f.after} (add "allow":["{f.feature}:{f.kind}"] with a note)'
            for f in fidelity.compare(old, new) if f'{f.feature}:{f.kind}' not in allowed]


@dataclass
class Row:
    entry: Entry
    before: dict
    changed: list = field(default_factory=list)
    problems: list = field(default_factory=list)

    @property
    def state(self):
        v = set(self.before.values())
        if 'superseded' in v:
            return 'superseded'
        if self.problems or 'conflict' in v:
            return 'conflict'
        return 'pending' if 'pending' in v else 'applied'


@dataclass
class Report:
    rows: list
    written: bool = False

    def counts(self):
        c = {k: 0 for k in ('applied', 'pending', 'superseded', 'conflict')}
        for r in self.rows:
            c[r.state] += 1
        return c

    def summary(self):
        return '  '.join(f'{k} {v}' for k, v in self.counts().items())


def _run(entries, ctx):
    rows = []
    for e in entries:
        if e.superseded_by is not None:
            rows.append(Row(e, {t: 'superseded' for t in e.target}))
            continue
        row = Row(e, {})
        todo = []
        for t in e.target:
            st, prob, where = _target_state(e, t, ctx)
            row.before[t] = st
            if prob:
                row.problems.append(prob)
            if st == 'pending':
                fid = _fidelity(e, t)
                row.problems += fid
                if not fid:
                    todo.append((t, where))
        if not row.problems:
            for t, where in todo:
                old, new = e.pair(t)
                if t == 'xml':
                    ctx.xml_replace(e.book, old, new)
                else:
                    cont, key = where
                    if e.is_value:
                        if new is None:
                            cont.pop(key, None)
                        else:
                            cont[key] = new
                    else:
                        cont[key] = cont[key].replace(old, new, 1)
                    ctx.touched.setdefault((t, e.book), set()).add(_chapter_of(e.rest))
                row.changed.append(t)
        rows.append(row)
    return rows


def _chapter_of(rest):
    """'book' for book.json, else the annotation chapter number."""
    m = re.match(r'(\d+):\d+a\d+', rest)
    return int(m.group(1)) if m else 'book'


def _save(ctx):
    for (t, book), touched in ctx.touched.items():
        locmod.save_store(ctx.store(t, book), touched)
    if ctx.xml_dirty:
        ET.fromstring(ctx.xml_text.encode('utf-8'))
        ctx.xml.write_bytes(ctx.xml_text.encode('utf-8'))


def apply(entries, ctx, write=False):
    """Apply in file order, in memory; with write, under the lock, save only if nothing conflicts."""
    if not write:
        return Report(_run(entries, ctx))
    with data_lock(ctx.lock):
        ctx._stores, ctx.touched, ctx._xml_text, ctx._spans, ctx.xml_dirty = {}, {}, None, None, False
        rows = _run(entries, ctx)
        rep = Report(rows)
        if rep.counts()['conflict'] == 0 and any(r.changed for r in rows):
            _save(ctx)
            rep.written = True
        return rep


def _short(v, n=60):
    s = v if isinstance(v, str) else json.dumps(v, ensure_ascii=False)
    s = s.replace('\n', '⏎')
    return s if len(s) <= n else s[:n - 1] + '…'


def _opts(argv):
    o = {'write': False, 'only': None, 'repo': None, 'fixes': None, 'args': []}
    it = iter(argv)
    for a in it:
        if a == '--write':
            o['write'] = True
        elif a in ('--only', '--repo', '--fixes'):
            o[a[2:]] = next(it)
        else:
            o['args'].append(a)
    return o


def main(argv):
    if not argv or argv[0] not in ('check', 'apply'):
        print(__doc__)
        return 2
    cmd, o = argv[0], _opts(argv[1:])
    root = Path(o['fixes']) if o['fixes'] else paths.FIXES
    if cmd == 'check':
        books = o['args'] or sorted(p.stem for p in root.glob('*.jsonl'))
        bad = 0
        for b in books:
            rep = apply(load_ledger(b, root), Ctx(o['repo']))
            print(f'{b}: {rep.summary()}')
            for r in rep.rows:
                if r.state == 'conflict':
                    bad += 1
                    print(f'  {r.entry.id} conflict: {"; ".join(r.problems)}')
        return 1 if bad else 0
    if len(o['args']) != 1:
        print('usage: rh.py fix apply BOOK [--write] [--only ID,…]')
        return 2
    book = o['args'][0]
    entries = load_ledger(book, root)
    if o['only']:
        want = set(o['only'].split(','))
        entries = [e for e in entries if e.id in want]
    rep = apply(entries, Ctx(o['repo']), write=o['write'])
    for r in rep.rows:
        if r.state in ('pending', 'conflict'):
            for t in r.entry.target:
                old, new = r.entry.pair(t)
                print(f'{r.entry.id} {r.before.get(t)} {t}: {_short(old)} → {_short(new)}')
            for p in r.problems:
                print(f'    {p}')
    print(rep.summary() + ('  (written)' if rep.written else '' if o['write'] else '  (dry run)'))
    return 1 if rep.counts()['conflict'] else 0
