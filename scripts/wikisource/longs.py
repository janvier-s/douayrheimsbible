"""Long s in odr-original annotation margin notes (annotations/*.json, notes[].text).

python3 -I scripts/wikisource/longs.py <repo> [--write] [--samples out.json]

The rule, outside HTML tags: a lowercase s followed by a letter becomes ſ, except
before f. A final s stays round; capitals, Greek and Hebrew are untouched.
- NT (1582): ſ also before h, k and b.
- OT (1609) margins: ſ before h too (the margin OCR reads fhould, punifhment,
  fheweth; the 1609 body text is mostly round there), round before k.
KEEP_ROUND lists the forms the scans print otherwise. Notes that already contain ſ
are skipped, so a rerun changes nothing; Matthew 1-20 was done by hand (c7a31e5d).
Abbreviations ending in s (Seſs., Theſs.) keep the round final s: check on a scan.
Applied in 0ffb97e0. Each file keeps its own JSON format (jsonfmt.write_like).
"""
import collections, json, re, sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from jsonfmt import write_like  # noqa: E402

REPO = Path(sys.argv[1])
WRITE = '--write' in sys.argv
SAMPLES = sys.argv[sys.argv.index('--samples') + 1] if '--samples' in sys.argv else None
D = REPO / 'static/data/odr-original'
_books = (REPO / 'src/lib/data/books.ts').read_text()
NT = {m.group(1) for m in re.finditer(r"slug: '([^']+)'[^}]*?testament: 'NT'", _books)}
assert len(NT) == 27, NT
LETTER = re.compile(r'[^\W\d_]')

# Forms the scans print with a round s where the rule gives ſ (Tesseract reads ſ as f,
# so a round s in the margin OCR is evidence). Keyed (book, chapter, verse).
KEEP_ROUND = {('job', 1, 1): ['English'], ('psalms', 50, 2): ['punishment'],
              # NT ſs before i: ſſ is the print's majority (19 of 24 in the OCR)
              ('2-corinthians', 2, 6): ['remiſsion'], ('2-corinthians', 2, 10): ['remiſsion'],
              ('colossians', 1, 24): ['paſsions'], ('james', 5, 14): ['Remiſsion']}


def longs(text, nt):
    keep = 'f' if nt else 'fk'
    out = []
    for part in re.split(r'(<[^>]*>)', text):
        if part.startswith('<'):
            out.append(part)
            continue
        chars = list(part)
        for k, c in enumerate(chars[:-1]):
            nx = chars[k + 1]
            if c == 's' and (nx == 'ſ' or (LETTER.match(nx) and nx.isascii()) or nx in 'āēīōūñæœ') \
                    and nx not in keep:
                chars[k] = 'ſ'
        out.append(''.join(chars))
    return ''.join(out)


stats, per, samples = collections.Counter(), collections.Counter(), []
for bookdir in sorted(p for p in D.iterdir() if (p / 'annotations').is_dir()):
    slug = bookdir.name
    nt = slug in NT
    for f in sorted((bookdir / 'annotations').glob('*.json')):
        a = json.loads(f.read_text())
        ch, changed = a['chapter'], False
        for an in a['annotations']:
            for n in an.get('notes', []):
                t = n['text']
                stats['notes'] += 1
                if slug == 'matthew' and ch <= 20:
                    stats['skip matt 1-20'] += 1
                    continue
                if 'ſ' in t:
                    stats['skip has ſ'] += 1
                    continue
                new = longs(t, nt)
                for w in KEEP_ROUND.get((slug, ch, an['verse']), []):
                    new = new.replace(longs(w.replace('ſ', 's'), nt), w)
                if new == t:
                    stats['no change'] += 1
                    continue
                stats['converted'] += 1
                stats['ſ added'] += new.count('ſ')
                per['NT' if nt else 'OT'] += 1
                samples.append((slug, ch, an['verse'], t, new))
                n['text'], changed = new, True
        if changed and WRITE:
            write_like(f, a)
print(dict(stats), dict(per), '(written)' if WRITE else '(dry run)')
if SAMPLES:
    Path(SAMPLES).write_text(json.dumps(samples, ensure_ascii=False, indent=0))
