"""supplied.py on the Wikisource 1611 scans (~2000x3000 per page, 2x the kingjamesbibleonline pages).

Pages: ~/facsimiles/kjv-1611/ws-scans/img/NNN/p-XXX.jpg, extracted losslessly (pdfimages -j) from
File:BibleKJV1611-NNN.pdf on en.wikisource. OCR: ws-scans/ocr/NNN-p-XXX.tsv (Tesseract TSV, native coords).

The scans carry no book/chapter map (Wikisource transcludes only Genesis), so each page is located
by voting: rare word trigrams of its OCR are looked up in the whole verse stream (all books in print
order), the densest cluster of hits gives the region, and difflib aligns the page inside it.

Features are measured exactly as in supplied.py, with crops upscaled so the page is ~3000px wide
(the old 1000px x 3), so the thresholds keep their units but see real detail.

Usage: python3 -I scripts/kjv1611/supplied_hires.py <data dir> <out.tsv> [--map map.json]
Writes supplied.py's columns plus the page id, the word box and hratio (box height / page median).
"""
import collections, csv, difflib, glob, json, os, re, statistics, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from supplied import fold, tokens, page_books, features  # noqa: E402
from PIL import Image  # noqa: E402

WS = os.path.expanduser("~/facsimiles/kjv-1611/ws-scans")
TARGET_W = 3000


def stream(data):
    S = []
    for slug in page_books():
        if os.path.exists(f"{data}/{slug}.json"):
            for t in tokens(json.load(open(f"{data}/{slug}.json", encoding="utf8"))):
                t["slug"] = slug
                t["f"] = fold(t["w"])
                S.append(t)
    return S


def ocr(pid):
    rows = list(csv.DictReader(open(f"{WS}/ocr/{pid}.tsv", encoding="utf8"), delimiter="\t", quoting=csv.QUOTE_NONE))
    return [dict(t=r["text"], f=fold(r["text"]), box=[int(r[k]) for k in ("left", "top", "width", "height")])
            for r in rows if r["level"] == "5" and (r["text"] or "").strip() and float(r["conf"]) >= 0 and fold(r["text"])]


def fuzzy(a, b, floor=0.5):
    """Monotone 1:1 pairs (i, j) maximising summed character similarity; pairs below floor are not used."""
    sim = [[difflib.SequenceMatcher(None, x, y).ratio() for y in b] for x in a]
    n, m = len(a), len(b)
    D = [[0.0] * (m + 1) for _ in range(n + 1)]
    for i in range(n - 1, -1, -1):
        for j in range(m - 1, -1, -1):
            s = sim[i][j]
            D[i][j] = max(D[i + 1][j], D[i][j + 1], D[i + 1][j + 1] + s if s >= floor else 0)
    out, i, j = [], 0, 0
    while i < n and j < m:
        s = sim[i][j]
        if s >= floor and D[i][j] == D[i + 1][j + 1] + s:
            out.append((i, j)); i += 1; j += 1
        elif D[i][j] == D[i + 1][j]:
            i += 1
        else:
            j += 1
    return out


def locate(O, tri, span=2500):
    """Stream region [a, b) for the page, or None when the page holds no verse text."""
    hits = []
    for k in range(len(O) - 2):
        hits += tri.get((O[k]["f"], O[k + 1]["f"], O[k + 2]["f"]), [])
    if len(hits) < 8:
        return None
    hits.sort()
    best, lo = (0, 0, 0), 0
    for hi in range(len(hits)):
        while hits[hi] - hits[lo] > span:
            lo += 1
        if hi - lo + 1 > best[0]:
            best = (hi - lo + 1, lo, hi)
    n, lo, hi = best
    if n < 8:
        return None
    return max(0, hits[lo] - 150), hits[hi] + 150, n


def main(data, out, mapfile):
    S = stream(data)
    tri = collections.defaultdict(list)
    for k in range(len(S) - 2):
        tri[(S[k]["f"], S[k + 1]["f"], S[k + 2]["f"])].append(k)
    tri = {k: v for k, v in tri.items() if len(v) <= 3}
    pages = sorted(os.path.basename(f)[:-4] for f in glob.glob(f"{WS}/ocr/*.tsv"))
    pmap, rows, done = {}, [], set()
    last_end = -1   # last matched stream index of the previous mapped page
    for pid in pages:
        O = ocr(pid)
        loc = locate(O, tri)
        if not loc:
            continue
        a, b, nh = loc
        if a <= last_end <= b:    # pages run in print order: do not reach back into repeated formulae
            a = max(a, last_end - 60)
        ids = list(range(a, min(b, len(S))))
        sm = difflib.SequenceMatcher(None, [S[i]["f"] for i in ids], [o["f"] for o in O], autojunk=False)
        blocks = [bl for bl in sm.get_matching_blocks() if bl.size]
        # short blocks far from every other block are stray hits (running heads, summaries, margins)
        # (keep a short block only if it chains to a block of >= 4 words through gaps of <= 25 words)
        keep = [bl.size >= 4 for bl in blocks]
        for order in (range(1, len(blocks)), range(len(blocks) - 2, -1, -1)):
            for k in order:
                j = k - 1 if order.step == 1 else k + 1
                lo, hi = sorted((blocks[j], blocks[k]), key=lambda x: x.a)
                if keep[j] and not keep[k] and hi.a - (lo.a + lo.size) <= 25:
                    keep[k] = True
        blocks = [bl for bl, kp in zip(blocks, keep) if kp]
        match, how = {}, {}
        for bl in blocks:
            if bl.size < 2 and len(S[ids[bl.a]]["f"]) < 4:       # lone short matches are noise
                continue
            for k in range(bl.size):
                match[ids[bl.a + k]] = O[bl.b + k]; how[ids[bl.a + k]] = "exact"
        for p, q in zip(blocks, blocks[1:]):
            ga, gb = q.a - (p.a + p.size), q.b - (p.b + p.size)
            if 0 < ga == gb <= 4:
                for k in range(ga):
                    match[ids[p.a + p.size + k]] = O[p.b + p.size + k]; how[ids[p.a + p.size + k]] = "gap"
            elif 0 < ga <= 12 and 0 < gb <= 12:
                A = [ids[p.a + p.size + k] for k in range(ga)]
                for x, y in fuzzy([S[i]["f"] for i in A], [O[p.b + p.size + k]["f"] for k in range(gb)]):
                    match[A[x]] = O[p.b + p.size + y]; how[A[x]] = "fuzzy"
        if len(match) < 100:
            continue
        lo_i, hi_i = min(match), max(match)
        last_end = hi_i
        pmap[pid] = dict(start=[S[lo_i]["slug"], S[lo_i]["ch"], S[lo_i]["v"]], end=[S[hi_i]["slug"], S[hi_i]["ch"], S[hi_i]["v"]],
                         matched=len(match), ocr_words=len(O), trigram_hits=nh)
        if not any(S[i]["it"] and i in match for i in match):
            continue
        img = Image.open(f"{WS}/img/{pid[:3]}/{pid[4:]}.jpg").convert("L")
        up = TARGET_W / img.width
        cw = [match[i]["box"][2] / len(S[i]["f"]) for i in match if how[i] == "exact" and len(S[i]["f"]) >= 3]
        pcw = statistics.median(cw) if cw else None
        ph = statistics.median(match[i]["box"][3] for i in match if how[i] == "exact")
        fcache = {}

        def feat(i):
            if i not in fcache:
                fcache[i] = features(img, match[i]["box"], 1, up)
            return fcache[i]

        for i in sorted(match):
            t = S[i]
            if not t["it"] or i in done:
                continue
            o = match[i]
            wr = o["box"][2] / (len(t["f"]) * pcw) if pcw else 0
            fe = feat(i)
            if fe is None:
                continue
            s, run, _ = fe
            nb = []
            for d in (-3, -2, -1, 1, 2, 3):
                j = i + d
                if j in match and not S[j]["it"] and abs(match[j]["box"][1] - o["box"][1]) < o["box"][3]:
                    nf = feat(j)
                    if nf:
                        nb.append(nf)
            ns = statistics.median(x[0] for x in nb) if nb else 0
            nr = statistics.median(x[1] for x in nb) if nb else 0
            done.add(i)
            rows.append([t["slug"], t["ch"], t["v"], t["idx"], t["w"], o["t"], how[i], f"{s:.3f}", f"{wr:.2f}",
                         f"{run:.1f}", f"{ns:.3f}", f"{nr:.1f}", len(nb), pid, *o["box"], f"{o['box'][3] / ph:.2f}"])
        print(f"{pid}: {pmap[pid]['start']}..{pmap[pid]['end']} matched {len(match)}/{len(O)} italic rows {len(rows)}", flush=True)
    with open(out, "w", encoding="utf8") as fh:
        fh.write("slug\tch\tv\tidx\tword\tocr\thow\tsurv\twratio\trun\tnsurv\tnrun\tnn\tpage\tl\tt\tw\th\thratio\n")
        for r in rows:
            fh.write("\t".join(map(str, r)) + "\n")
    if mapfile:
        json.dump(pmap, open(mapfile, "w", encoding="utf8"), indent=1)
    n_it = sum(t["it"] for t in S)
    print(f"italic {n_it} located {len(done)}")


if __name__ == "__main__":
    args = sys.argv[1:]
    m = None
    if "--map" in args:
        k = args.index("--map"); m = args[k + 1]; del args[k:k + 2]
    main(args[0], args[1], m)
