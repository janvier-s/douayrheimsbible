"""Turn supplied.py / supplied_hires.py output into fixes.tsv rows that drop <i> from words that are
blackletter on the scan.

1000px rule (supplied.py, calibrated 2026-11-22 on the 252 Wikisource-sweep extras and a 40-word scan sample):
exact OCR match, >=1 plain neighbour on the line, box width 0.6-1.6x the expected width,
survival / neighbour survival >= 0.5, median ink run >= 7px (3x scale).

Wikisource-scan rule (supplied_hires.py, ~2000px pages measured at 3000px; calibrated 2026-11-22 on the
252 wikisource-1611 removals (blackletter) and 501 human {{smaller}} marks of the pre-sweep pages (roman)):
>=1 plain neighbour, box width 0.7-1.35x, box height <= 1.4x the page median (two-line boxes), and
  blackletter: survival ratio >= 0.5 and median ink run / neighbours' run >= 0.85
  roman:       survival ratio <  0.2 and run ratio < 0.75
Any match type (exact, equal gap, fuzzy gap): the width window rejects merged boxes, and a gap/fuzzy
match whose OCR token is more than one letter longer than the word is not called blackletter.
Labels: blackletter 105/168 (0 roman calls), roman 148/311 (1 blackletter call); precision on 40-word
scan samples of new removals: 39/40 (the miss, a merged box, is now excluded); restorations: all roman.

Usage:
  python3 -I scripts/kjv1611/supplied_fixes.py <supplied.tsv> <data dir>  > rows.tsv
  python3 -I scripts/kjv1611/supplied_fixes.py --hires <hires.tsv> <base dir> <cur dir>  > rows.tsv
In --hires mode, base is a build without the scan-1611-erosion rows and cur the current build:
the output replaces all scan-1611-erosion rows, keeping each earlier removal unless the Wikisource
scan shows the word roman, and adding the words the Wikisource scan shows blackletter.
"""
import csv, json, re, sys, collections

sys.path.insert(0, __import__("os").path.dirname(__import__("os").path.abspath(__file__)))
from supplied import fold as FOLD, tokens  # noqa: E402

LORES = "supplied.py erosion test"
HIRES = "supplied_hires.py erosion test on the Wikisource scans"


def blackletter(r):
    return (r["how"] == "exact" and int(r["nn"]) > 0 and 0.6 <= float(r["wratio"]) <= 1.6
            and float(r["surv"]) / max(float(r["nsurv"]), 1e-3) >= 0.5 and float(r["run"]) >= 7)


def _hi(r):
    ok = int(r["nn"]) > 0 and 0.7 <= float(r["wratio"]) <= 1.35 and float(r["hratio"]) <= 1.4
    return ok, float(r["surv"]) / max(float(r["nsurv"]), 1e-3), float(r["run"]) / max(float(r["nrun"]), 1e-3)


def blackletter_hires(r):
    ok, s, rr = _hi(r)
    # a gap/fuzzy match whose OCR token is longer than the word is usually two words in one box
    merged = r["how"] != "exact" and len(FOLD(r["ocr"])) > len(FOLD(r["word"])) + 1
    return ok and not merged and s >= 0.5 and rr >= 0.85


def roman_hires(r):
    ok, s, rr = _hi(r)
    return ok and s < 0.2 and rr < 0.75


def read(tsv):
    return csv.DictReader(open(tsv, encoding="utf8"), delimiter="\t", quoting=csv.QUOTE_NONE)


def key(r):
    return (r["slug"], int(r["ch"]), int(r["v"]))


def emit(flag, data, test):
    """flag: {(slug, ch, v): set(idx)}; test(slug, ch, v, idx_set) -> reason tag. Prints one row per verse."""
    books = {}
    for (slug, ch, v), idxs in sorted(flag.items()):
        b = books.setdefault(slug, json.load(open(f"{data}/{slug}.json", encoding="utf8")))
        text = next(x["text"] for c in b["chapters"] if c["chapter"] == ch for x in c["verses"] if x["verse"] == v)
        edits, hits, hit_idx = [], [], set()   # one fixes.tsv row per verse, so later spans never see an earlier edit
        for m in re.finditer(r"<i>(.*?)</i>", text):
            before = re.sub(r"</?i>", "", text[: m.start()])
            n0 = sum(1 for t in re.findall(r"[^\s<>]+", before) if FOLD(t))
            words, k, parts, run, hit = m.group(1).split(" "), n0, [], [], []
            for w in words:
                drop = bool(FOLD(w)) and k in idxs
                if drop:
                    hit_idx.add(k)
                if FOLD(w):
                    k += 1
                if drop:
                    if run:
                        parts.append("<i>" + " ".join(run) + "</i>"); run = []
                    parts.append(w); hit.append(w)
                else:
                    run.append(w)
            if not hit:
                continue
            if run:
                parts.append("<i>" + " ".join(run) + "</i>")
            edits.append((m.start(), m.end(), " ".join(parts))); hits += hit
        if not edits:
            continue
        L, R = edits[0][0], edits[-1][1]
        while text.count(text[L:R]) > 1:
            L = max(0, L - 1); R = min(len(text), R + 1)
            while L > 0 and text[L - 1] != " ":
                L -= 1
            while R < len(text) and text[R] != " ":
                R += 1
        repl, pos = "", L
        for s0, e0, new in edits:
            repl += text[pos:s0] + new; pos = e0
        repl += text[pos:R]
        print("\t".join([slug, str(ch), str(v), text[L:R], repl,
                         f"{' '.join(hits)} blackletter on the 1611 scan, not roman: 1769 supplied words ({test(slug, ch, v, hit_idx)})",
                         "scan-1611-erosion"]))


def main(tsv, data):
    flag = collections.defaultdict(set)
    for r in read(tsv):
        if blackletter(r):
            flag[key(r)].add(int(r["idx"]))
    emit(flag, data, lambda *a: LORES)


def italics(data, slug, cache={}):
    if (data, slug) not in cache:
        cache[(data, slug)] = {(t["ch"], t["v"], t["idx"]) for t in tokens(json.load(open(f"{data}/{slug}.json", encoding="utf8"))) if t["it"]}
    return cache[(data, slug)]


def main_hires(tsv, base, cur):
    black, roman = set(), set()
    for r in read(tsv):
        k = (*key(r), int(r["idx"]))
        if blackletter_hires(r):
            black.add(k)
        elif roman_hires(r):
            roman.add(k)
    slugs = {k[0] for k in black} | {p[:-5] for p in __import__("os").listdir(base) if p.endswith(".json")}
    earlier, final = set(), set()
    for slug in sorted(slugs):
        b, c = italics(base, slug), italics(cur, slug)
        earlier |= {(slug, *x) for x in b - c}
        final |= {(slug, *x) for x in b - c if (slug, *x) not in roman}
        final |= {(slug, *x) for x in b if (slug, *x) in black}
    flag = collections.defaultdict(set)
    for slug, ch, v, i in final:
        flag[(slug, ch, v)].add(i)
    new = final - earlier
    emit(flag, base, lambda s, ch, v, idx: HIRES if any((s, ch, v, i) in new for i in idx) else LORES)
    print(f"earlier {len(earlier)} kept {len(earlier & final)} restored {len(earlier - final)} new {len(new)} total {len(final)}",
          file=sys.stderr)


if __name__ == "__main__":
    if sys.argv[1] == "--hires":
        main_hires(*sys.argv[2:5])
    else:
        main(sys.argv[1], sys.argv[2])
