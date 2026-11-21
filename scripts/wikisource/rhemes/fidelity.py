"""Print-feature fidelity guard for the 1582 Rhemes NT wiki pages.

Counts the features of the print that a careless edit tends to lose (long s, macrons,
vv, ligatures, italics, small caps...) or modern forms it tends to add (w, j, double
quotes), and compares two versions of a page. A drop in a guarded feature is a *loss*,
or a *shift* when its sibling rose by it (ſ→s, vv→w): both are refused unless an
override names the feature, the pages and a reason.

    count(text) -> Counter          compare(before, after) -> [Finding]
    parse_overrides(argv) -> Overrides
    refusals(page, before, after, ov) -> [message]
"""
import difflib
import re
import sys
import unicodedata
from collections import Counter
from typing import NamedTuple


class Feature(NamedTuple):
    name: str
    guard: str  # 'decrease' | 'increase' | 'info'
    sibling: str | None


class Finding(NamedTuple):
    feature: str
    kind: str  # 'loss' | 'shift'
    before: int
    after: int


class Overrides(NamedTuple):
    loss: list
    shift: list
    reason: str


_LETTER_BEFORE = r'(?<![^\W\d_])'
# name -> (guard, sibling, source, pattern); source 'plain' = print text, 'raw' = wikitext, 'body' = plain outside <noinclude>
_TABLE = {
    'ls': ('decrease', 's', 'plain', 'ſ'),
    's': ('info', None, 'plain', '[sS]'),
    'macron': ('decrease', None, 'nfd', '[\u0304\u0303]'),
    'ae': ('decrease', None, 'plain', '[æÆ]'),
    'oe': ('decrease', None, 'plain', '[œŒ]'),
    'etc': ('decrease', None, 'plain', '&c'),
    'vv': ('decrease', 'w', 'plain', 'vv|VV|Vv'),
    'w': ('increase', None, 'plain', '[wW]'),
    'v_initial': ('decrease', 'u_initial', 'plain', _LETTER_BEFORE + '[vV](?![vV])'),  # vv- is counted by vv
    'u_initial': ('info', None, 'plain', _LETTER_BEFORE + '[uU]'),
    'j': ('increase', None, 'plain', '[jJ]'),
    'dquote': ('increase', None, 'body', '["“”]'),
    'italic': ('decrease', None, 'raw', r"(?<!')''(?!')|<i>"),
    'sc': ('decrease', None, 'raw', r'\{\{sc\|'),
    'sup_bar': ('decrease', None, 'raw', r'\{\{sup\|‖\}\}'),
    'margin_note': ('decrease', None, 'raw', r'\{\{MarginNote\|'),
    'verse': ('decrease', None, 'raw', r'\{\{verse\|'),
    'dagger': ('decrease', None, 'plain', '†'),
    'quad': ('decrease', None, 'plain', '∷'),
    'star': ('decrease', None, 'plain', r'\*'),
    'tack': ('decrease', None, 'plain', '⊣'),
    'bar': ('decrease', None, 'plain', '‖'),
    'dropinitial': ('decrease', None, 'raw', r'\{\{dropinitial\|'),
    'size': ('decrease', None, 'raw', r'\{\{(?:x+-)?(?:larger|smaller|large|small)\|'),
}
FEATURES = {n: Feature(n, g, s) for n, (g, s, _, _) in _TABLE.items()}
_PATTERNS = {n: (src, re.compile(p)) for n, (_, _, src, p) in _TABLE.items()}

_NOINC = re.compile(r'<noinclude>.*?</noinclude>', re.S)
_FILE = re.compile(r'\[\[(?:File|Image):[^\]]*\]\]', re.I)
_ATTR = re.compile(r'\b[\w-]+="[^"]*"')
_TAG = re.compile(r'<[^>]*>')
_KEY = re.compile(r'\|\s*[A-Za-z][\w-]*\s*=')
_BARE_TEMPLATE = re.compile(r'\{\{[^|{}]*\}\}')
_TEMPLATE_NAME = re.compile(r'\{\{[^|{}]*\|')


def plain(text: str) -> str:
    """The print text of wikitext: template names, parameter keys, tags, attributes and files removed."""
    t = unicodedata.normalize('NFC', text).replace('{{ls}}', 'ſ')
    t = _FILE.sub(' ', t)
    t = _ATTR.sub(' ', t)
    t = _TAG.sub(' ', t)
    t = _KEY.sub('|', t)
    while _BARE_TEMPLATE.search(t):
        t = _BARE_TEMPLATE.sub(' ', t)
    t = _TEMPLATE_NAME.sub(' ', t)
    return t.replace('}}', ' ').replace('|', ' ')


def count(text: str) -> Counter:
    raw = unicodedata.normalize('NFC', text)
    p = plain(raw)
    src = {'raw': raw, 'plain': p, 'nfd': unicodedata.normalize('NFD', p), 'body': plain(_NOINC.sub(' ', raw))}
    return Counter({n: len(rx.findall(src[s])) for n, (s, rx) in _PATTERNS.items()})


def compare(before: str, after: str) -> list:
    a, b = count(before), count(after)
    out = []
    for f in FEATURES.values():
        if f.guard == 'decrease' and b[f.name] < a[f.name]:
            kind = 'shift' if f.sibling and b[f.sibling] > a[f.sibling] else 'loss'
            out.append(Finding(f.name, kind, a[f.name], b[f.name]))
        elif f.guard == 'increase' and b[f.name] > a[f.name]:
            out.append(Finding(f.name, 'loss', a[f.name], b[f.name]))
    return out


_FLAGS = ('--allow-loss', '--allow-shift', '--reason')


def _scope(spec: str) -> tuple:
    feature, _, pages = spec.strip().partition(':')
    if feature not in FEATURES:
        sys.exit(f'unknown fidelity feature {feature!r} (known: {", ".join(FEATURES)})')
    if pages in ('', '*'):
        return feature, 0, 10 ** 9
    first, _, last = pages.partition('-')
    try:
        return feature, int(first), int(last or first)
    except ValueError:
        sys.exit(f'bad page scope in {spec!r}: use FEATURE:*, FEATURE:n or FEATURE:a-b')


def parse_overrides(argv: list) -> Overrides:
    """--allow-loss/--allow-shift FEATURE:SCOPE[,...] (repeatable) and the --reason they require."""
    loss, shift, reason = [], [], ''
    for i, a in enumerate(argv):
        if a in _FLAGS:
            if i + 1 >= len(argv):
                sys.exit(f'{a} needs a value')
            v = argv[i + 1]
            if a == '--reason':
                reason = v.strip()
            else:
                (loss if a == '--allow-loss' else shift).extend(_scope(x) for x in v.split(',') if x.strip())
    if (loss or shift) and not reason:
        sys.exit('--allow-loss/--allow-shift need --reason "why this print feature may change"')
    return Overrides(loss, shift, reason)


def strip_override_args(argv: list) -> list:
    out, skip = [], False
    for a in argv:
        if skip:
            skip = False
        elif a in _FLAGS:
            skip = True
        else:
            out.append(a)
    return out


def override_args(argv: list) -> list:
    """Only the override flags and their values, to pass on to lint.py."""
    out = []
    for i, a in enumerate(argv):
        if a in _FLAGS:
            out += argv[i:i + 2]
    return out


# words (with {{ls}} inside them), template openers with their name, closers, tags, single marks
_TOKEN = re.compile(r'(?:\{\{ls\}\}|[^\s<>{}|=\[\]])+|\{\{[^{}|]*\|?|\}\}|<[^>]*>|\S')


def where(before: str, after: str, feature: str, limit: int = 3) -> list:
    """Up to `limit` 'old words → new words' changes that alter the count of `feature`."""
    a, b = _TOKEN.findall(before), _TOKEN.findall(after)
    out = []
    for op, i1, i2, j1, j2 in difflib.SequenceMatcher(None, a, b, autojunk=False).get_opcodes():
        if op == 'equal':
            continue
        old, new = ' '.join(a[i1:i2]), ' '.join(b[j1:j2])
        if count(old)[feature] != count(new)[feature]:
            out.append(f'{old[:60] or "∅"} → {new[:60] or "∅"}')
            if len(out) == limit:
                break
    return out


def refusals(page: int, before: str, after: str, ov: Overrides, with_where: bool = False) -> list:
    """Messages for the findings no override of the same kind covers on this page;
    with_where adds the first changed words that cause each."""
    out = []
    for f in compare(before, after):
        allowed = ov.loss if f.kind == 'loss' else ov.shift
        if not any(feat == f.feature and a <= page <= b for feat, a, b in allowed):
            msg = f'{f.feature} {f.kind} {f.before}→{f.after}'
            if with_where:
                msg += ' at: ' + ' | '.join(where(before, after, f.feature))
            out.append(msg)
    return out
