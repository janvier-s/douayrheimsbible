"""Mechanical 1611 supplied-word check: is each <i> word roman (supplied) or blackletter on the scan?

In the 1611 print supplied words are set in thin roman type inside a blackletter body. A 2px erosion
(MaxFilter 7 on a 3x upscale of the 1000px page) wipes out roman strokes and leaves blackletter.
survival = ink after erosion / ink before, per word box.

Words are located by aligning the verse words to the Tesseract word stream of each page
(~/facsimiles/kjv-1611/ocr/*.tsv); words between two aligned anchors are mapped 1:1 when the gap
has the same length on both sides. Boxes whose width does not fit the word length are rejected.

Usage: python3 -I scripts/kjv1611/supplied.py <data dir> <out.tsv> [slug ...]
Writes one row per located <i> word: slug ch v idx word ocr how surv wratio
"""
import csv, difflib, json, os, re, statistics, sys
from PIL import Image, ImageFilter

HOME = os.path.expanduser("~/facsimiles/kjv-1611")
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def page_books():
    src = open(os.path.join(ROOT, "scripts/kjv1611/fetch-pages.ts"), encoding="utf8").read()
    body = src[src.index("PAGE_BOOKS: Record"):]
    body = body[: body.index("\n};")]
    out = {}
    for m in re.finditer(r"^\t'?([a-z0-9-]+)'?: \[(.*?)\](?:,)?$|^\t'?([a-z0-9-]+)'?: \[$", body, re.M):
        pass
    # simple scan: key line followed by groups; first name of each group
    key = None
    for line in body.splitlines()[1:]:
        k = re.match(r"\t'?([a-z0-9-]+)'?: \[", line)
        if k:
            key = k.group(1)
            out[key] = []
        for g in re.findall(r"\['([^']+)'", line):
            out[key].append(g)
    return out


def fold(w):
    return re.sub(r"[ſfl]", "s", re.sub(r"[^a-zſ]", "", w.lower())).replace("v", "u").replace("j", "i")


def tokens(book):
    out = []
    for c in book["chapters"]:
        for v in c["verses"]:
            it, idx = False, 0
            for m in re.finditer(r"<i>|</i>|[^\s<>]+", v["text"]):
                t = m.group(0)
                if t == "<i>":
                    it = True
                    continue
                if t == "</i>":
                    it = False
                    continue
                if fold(t):
                    out.append(dict(ch=c["chapter"], v=v["verse"], idx=idx, w=t, it=it))
                    idx += 1
    return out


def ocr(f):
    rows = list(csv.DictReader(open(f"{HOME}/ocr/{f[:-5]}.tsv", encoding="utf8"), delimiter="\t", quoting=csv.QUOTE_NONE))
    full = int(rows[0]["width"])
    return full, [dict(t=r["text"], box=[int(r[k]) for k in ("left", "top", "width", "height")])
                  for r in rows if r["level"] == "5" and (r["text"] or "").strip() and float(r["conf"]) >= 0]


def features(img, box, sc, up=3):
    """(survival after 2px erosion, median horizontal ink run in px at `up`x, box height at 1x)"""
    l, t, w, h = [x * sc for x in box]
    c = img.crop((int(l), int(t), int(l + w) + 1, int(t + h) + 1))
    c = c.resize((round(c.width * up), round(c.height * up)), Image.LANCZOS).point(lambda v: 0 if v < 140 else 255)
    before = c.histogram()[0]
    if not before:
        return None
    surv = c.filter(ImageFilter.MaxFilter(7)).histogram()[0] / before
    px, runs = c.load(), []
    for y in range(c.height):
        run = 0
        for x in range(c.width):
            if px[x, y] == 0:
                run += 1
            elif run:
                runs.append(run); run = 0
        if run:
            runs.append(run)
    return surv, statistics.median(runs), h


def survival(img, box, sc):
    f = features(img, box, sc)
    return f[0] if f else None


def main(data, out, only):
    idx = json.load(open(f"{HOME}/pages/index.json"))
    books = page_books()
    rows = []
    for slug, groups in books.items():
        if only and slug not in only:
            continue
        if not os.path.exists(f"{data}/{slug}.json") or not groups:
            continue
        files = idx.get(f"book:{groups[0]}", [])   # main group only; apocryphal add-ons skipped
        T = tokens(json.load(open(f"{data}/{slug}.json", encoding="utf8")))
        done = set()
        for f in files:
            m = re.search(r"Chapter-(\d+)-(\d+)", f)
            if not m:
                continue
            a, b = int(m.group(1)), int(m.group(2))
            ids = [i for i, t in enumerate(T) if a <= t["ch"] <= b]
            if not any(T[i]["it"] for i in ids):
                continue
            full, O = ocr(f)
            sm = difflib.SequenceMatcher(None, [fold(T[i]["w"]) for i in ids], [fold(o["t"]) for o in O], autojunk=False)
            match, how = {}, {}
            blocks = [bl for bl in sm.get_matching_blocks() if bl.size]
            for bl in blocks:
                for k in range(bl.size):
                    match[ids[bl.a + k]] = O[bl.b + k]
                    how[ids[bl.a + k]] = "exact"
            for p, q in zip(blocks, blocks[1:]):          # equal-length gaps between anchors map 1:1
                ga, gb = q.a - (p.a + p.size), q.b - (p.b + p.size)
                if 0 < ga == gb <= 4:
                    for k in range(ga):
                        match[ids[p.a + p.size + k]] = O[p.b + p.size + k]
                        how[ids[p.a + p.size + k]] = "gap"
            img = Image.open(f"{HOME}/pages/{f}").convert("L")
            sc = img.width / full
            cw = [match[i]["box"][2] / len(fold(T[i]["w"])) for i in match if how[i] == "exact" and len(fold(T[i]["w"])) >= 3]
            pcw = statistics.median(cw) if cw else None
            for i in ids:
                t = T[i]
                if not t["it"] or i in done or i not in match:
                    continue
                o = match[i]
                wr = o["box"][2] / (len(fold(t["w"])) * pcw) if pcw else 0
                fe = features(img, o["box"], sc)
                if fe is None:
                    continue
                s, run, hh = fe
                # neighbours: nearest plain (non-italic) matched words in the same verse window, same line
                nb = []
                for d in (-3, -2, -1, 1, 2, 3):
                    j = i + d
                    if j in match and not T[j]["it"] and abs(match[j]["box"][1] - o["box"][1]) < o["box"][3]:
                        nf = features(img, match[j]["box"], sc)
                        if nf:
                            nb.append(nf)
                ns = statistics.median(x[0] for x in nb) if nb else 0
                nr = statistics.median(x[1] for x in nb) if nb else 0
                done.add(i)
                rows.append([slug, t["ch"], t["v"], t["idx"], t["w"], o["t"], how[i], f"{s:.3f}", f"{wr:.2f}",
                             f"{run:.1f}", f"{ns:.3f}", f"{nr:.1f}", len(nb)])
        n_it = sum(t["it"] for t in T)
        print(f"{slug}: italic {n_it} located {len(done)}", flush=True)
    with open(out, "w", encoding="utf8") as fh:
        fh.write("slug\tch\tv\tidx\tword\tocr\thow\tsurv\twratio\trun\tnsurv\tnrun\tnn\n")
        for r in rows:
            fh.write("\t".join(map(str, r)) + "\n")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2], set(sys.argv[3:]))
