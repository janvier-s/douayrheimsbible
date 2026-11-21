"""Lemma spans: a verse's `lemmas` are [start, length, part] offsets into its text (made by
scripts/build-odr-lemmas.ts, some placed by hand), and generate.py places ‖ from them. An edit
that changes the text's length moves every span after it, so each data writer shifts them
(shift) instead of rebuilding, which would undo the hand placements; the gate checks that
no span starts inside a word (misplaced). A span may end inside one: the builder's partial
matches do (muſtard ſeed|e), so an end there is no evidence of drift."""
import json
import re

from . import paths

_WORD = re.compile(r'[^\W_]', re.UNICODE)  # a letter or digit (ſ and macron letters included)


def shift(obj, key, old, new, a=0, z=None):
    """Keep obj's lemmas on their words after obj[key] went from old to new, where only
    old[a:z] changed (z defaults to the end). The changed letters are narrowed to what really
    differs; a span end before them stays, one after them moves by the change in length, and
    one inside them is kept inside the new letters."""
    delta = len(new) - len(old)
    if key != 'text' or not delta or not isinstance(obj, dict) or not obj.get('lemmas'):
        return
    z = len(old) if z is None else z
    while a < z and a < len(new) and old[a] == new[a]:
        a += 1
    while z > a and z + delta > a and old[z - 1] == new[z - 1 + delta]:
        z -= 1

    def move(x):
        return x if x <= a else x + delta if x >= z else min(x, z + delta)
    for lm in obj['lemmas']:
        s, e = move(lm[0]), move(lm[0] + lm[1])
        lm[0], lm[1] = s, e - s


def _inside(text, i):
    """True when offset i falls between two letters of one word."""
    return 0 < i < len(text) and bool(_WORD.match(text[i - 1])) and bool(_WORD.match(text[i]))


def misplaced(dirs=(paths.DATA_ODR, paths.DATA)):
    """'odr-original acts 10:47 [73, 30]: …' for each span that starts inside a word or runs past the text."""
    out = []
    for d in dirs:
        for f in sorted(d.glob('*.json')):
            if re.search(r'\s\d+\.json$', f.name):
                continue
            bj = json.loads(f.read_text())
            for ch in bj.get('chapters', []):
                for v in ch['verses']:
                    t = v.get('text', '')
                    for a, n, *_ in v.get('lemmas', []):
                        if a < 0 or n <= 0 or a + n > len(t) or _inside(t, a):
                            out.append(f'{d.name} {f.stem} {ch["chapter"]}:{v["verse"]} [{a}, {n}]: '
                                       f'{t[max(0, a - 8):a]}[{t[a:a + n]}]{t[a + n:a + n + 8]}')
    return out
