#!/usr/bin/env python3
"""Three-way vote (modern note, 1609 note, scrape modern note) over the notes
matched by whole-note fuzzy matching rather than by their opening words.

Same vote and same edit logic as notefix.py: where the 1609 text and the scrape
agree against modern, modern is wrong and the scrape's wording is applied.  The
scrape's modern note is the donor, with the 1609 note as the witness, exactly as
in the first pass.

  python3 scripts/audit/vote_loose.py            # dry run, print samples
  python3 scripts/audit/vote_loose.py --apply    # edit the raw JSON in place
  python3 scripts/audit/vote_loose.py --min-score 0.6 --min-margin 0.1
"""
import sys, json, os, re, difflib, collections, argparse

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from match_notes import plain, sk, toks  # noqa: E402

TAGRE = re.compile(r'</?[a-z]+[^>]*>')
NONLAT = re.compile(r'[^\x00-ɏ -⁯]')


def sk2(w):
    return sk(w.replace('&', 'and'))


def sktoks(ws):
    L, ix = [], []
    for i, w in enumerate(ws):
        s = sk2(w)
        if s:
            L.append(s)
            ix.append(i)
    return L, ix


def find_seq(B, seq, start=0):
    n = len(seq)
    for p in range(start, len(B) - n + 1):
        if B[p:p + n] == seq:
            return p
    return -1


def pmap(raw):
    out, idx = [], []
    i = 0
    while i < len(raw):
        if raw[i] == '<':
            j = raw.find('>', i)
            if j != -1 and TAGRE.match(raw[i:j + 1]):
                out.append(' ')
                idx.append(i)
                i = j + 1
                continue
        out.append(raw[i])
        idx.append(i)
        i += 1
    return ''.join(out), idx


def bad(m, s):
    if re.search(r'\d', m + s):
        return True
    if re.search(r'[ÆæŒœ\[\]]', m + s) or (re.search(r'Ae|ae', m) and not re.search(r'Ae|ae', s)):
        return True
    if NONLAT.search(m + s):
        return True
    j = lambda x: re.sub(r'[^a-z]', '', x.lower().replace('&', 'and'))
    if j(m) == j(s):
        return True
    if re.search(r"\b(Aug|Hier|Chrys|Greg|Bern|Ber|Ambr|Cypr|Epiph|Orig|Tert|Theod|Theoph|Hom|lib|li|cap|chap|c|v|vers|pag|tom|Apoc|Reg|Par|Esd|Gen|Exo|Prov|Psal|Mt|Mr|Lu|Ioan|Act)\b\.?", m + ' ' + s):
        return True
    return False


def load_ours():
    out = {}
    for f in sorted(os.listdir(f'{ROOT}/static/data/odr')):
        if not f.endswith('.json'):
            continue
        book = f[:-5]
        of = f'{ROOT}/static/data/odr-original/{book}.json'
        if not os.path.exists(of):
            continue
        md, od = json.load(open(f'{ROOT}/static/data/odr/{f}')), json.load(open(of))
        och = {c['chapter']: c for c in od.get('chapters', [])}
        for ch in md.get('chapters', []):
            oc = och.get(ch['chapter'])
            if not oc:
                continue
            ov = {v['verse']: v for v in oc['verses']}
            for v in ch['verses']:
                on = {n['label']: n for n in ov.get(v['verse'], {}).get('notes', []) if n.get('label')}
                for n in v.get('notes', []):
                    if n.get('label') in on:
                        out[(book, ch['chapter'], v['verse'], n['label'])] = {
                            'modern': n['text'], 'original': on[n['label']]['text']}
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--apply', action='store_true')
    ap.add_argument('--min-score', type=float, default=0.55)
    ap.add_argument('--min-margin', type=float, default=0.05)
    ap.add_argument('--limit', type=int, default=120)
    ap.add_argument('--only', default=None,
                    help='comma separated hunk indices (1-based ranges allowed, e.g. 1-7,12)')
    ap.add_argument('--strict-margin', action='store_true',
                    help='require the margin even when the score is 1.0 (reproduces the first pass order)')
    args = ap.parse_args()
    only = None
    if args.only:
        only = set()
        for part in args.only.split(','):
            if '-' in part:
                a, b = part.split('-')
                only.update(range(int(a), int(b) + 1))
            else:
                only.add(int(part))

    ours = load_ours()
    rep = json.load(open(f'{ROOT}/scripts/audit/loose-matches.json'))
    matches = {}
    for m in rep['loose']:
        ok = (m['score'] >= args.min_score and m['margin'] >= args.min_margin)
        if not args.strict_margin:
            ok = m['score'] >= args.min_score and (m['score'] >= 0.8 or m['margin'] >= args.min_margin)
        if ok:
            matches[tuple(m['key'])] = m

    edits = collections.defaultdict(list)
    show = []
    skipped = collections.Counter()
    for k in sorted(matches):
        n = ours[k]
        mraw, oraw = n['modern'], n['original']
        M = []
        ps, idx = pmap(mraw)
        toks_ = [(mo.group(), idx[mo.start()], idx[mo.end() - 1] + 1)
                 for mo in re.finditer(r'\S+', ps)]
        M = [t[0] for t in toks_]
        O = plain(oraw).split()
        S = plain(matches[k]['scrape_modern']).split()
        if len(M) < 4 or len(O) < 4 or len(S) < 2:
            skipped['short'] += 1
            continue
        Ms, Mi = sktoks(M)
        Os, Oi = sktoks(O)
        Ss, Si = sktoks(S)
        sm = difflib.SequenceMatcher(None, Ms, Os, autojunk=False)
        for tag, i1, i2, j1, j2 in sm.get_opcodes():
            if tag == 'equal':
                continue
            L = Os[max(0, j1 - 2):j1]
            R = Os[j2:j2 + 2]
            p = find_seq(Ss, L) if L else 0
            if p < 0:
                skipped['no-left-context'] += 1
                continue
            p += len(L)
            q = find_seq(Ss, R, p) if R else len(Ss)
            if q < 0:
                skipped['no-right-context'] += 1
                continue
            sseg = Ss[p:q]
            oseg = Os[j1:j2]
            mseg = Ms[i1:i2]
            if abs(len(sseg) - len(oseg)) > max(1, len(oseg) * 0.3):
                skipped['length'] += 1
                continue
            if difflib.SequenceMatcher(None, sseg, oseg, autojunk=False).ratio() < 0.8:
                skipped['scrape-vs-1609'] += 1
                continue
            if ''.join(mseg) == ''.join(oseg) or ''.join(sseg) == ''.join(mseg):
                skipped['already-equal'] += 1
                continue
            mtxt = ' '.join(M[Mi[x]] for x in range(i1, i2))
            stxt = ' '.join(S[Si[x]] for x in range(p, q))
            if bad(mtxt, stxt):
                skipped['bad'] += 1
                continue
            mt = [toks_[Mi[x]] for x in range(i1, i2)]
            if mt:
                span = (mt[0][1], mt[-1][2])
            else:
                if i1 == 0:
                    skipped['no-span'] += 1
                    continue
                span = (toks_[Mi[i1 - 1]][2],) * 2
            show.append((k, tag, mtxt, stxt))
            edits[k].append((len(show), span, tag, mtxt, stxt, mraw))
    print(f'notes voted: {len(matches)}  notes with edits: {len(edits)}  '
          f'hunks: {len(show)}')
    print('skipped hunks:', dict(skipped))
    for idx, r in enumerate(show, 1):
        if only is not None and idx not in only:
            continue
        b, c, v, l = r[0]
        print(f'{idx:3d} {b[:14]} {c}:{v} {l} {r[1]} | [[{r[2][:70]}]] -> {r[3][:90]}')

    with open(f'{ROOT}/scripts/audit/loose-vote.json', 'w') as fh:
        json.dump([{'key': list(k), 'tag': t, 'modern': m, 'scrape': s}
                   for k, t, m, s in show], fh, ensure_ascii=False, indent=1)

    if only is not None:
        edits = {k: [h for h in lst if h[0] in only] for k, lst in edits.items()}
        edits = {k: v for k, v in edits.items() if v}

    if not args.apply:
        print('dry run; pass --apply to edit')
        return

    raw = {}
    failed = []
    for (b, c, v, l), lst in edits.items():
        f = f'{ROOT}/static/data/odr/{b}.json'
        t = lst[0][5]
        new = t
        for _, span, tag, mt, st, _ in sorted(lst, key=lambda x: -x[1][0]):
            a0, b0 = span
            if tag == 'insert':
                new = new[:a0] + ' ' + st + new[b0:]
            elif not st:
                new = re.sub(r'  +', ' ', new[:a0] + new[b0:])
            else:
                new = new[:a0] + st + new[b0:]
        if f not in raw:
            raw[f] = open(f, encoding='utf-8').read()
        done = False
        for ea in (False, True):
            o = json.dumps(t, ensure_ascii=ea)[1:-1]
            nn = json.dumps(new, ensure_ascii=ea)[1:-1]
            if raw[f].count('"' + o + '"') == 1:
                raw[f] = raw[f].replace('"' + o + '"', '"' + nn + '"')
                done = True
                break
        if not done:
            failed.append((b, c, v, l))
    for f, tx in raw.items():
        open(f, 'w', encoding='utf-8').write(tx)
    print('wrote', len(raw), 'files;', len(failed), 'failed', failed[:10])


if __name__ == '__main__':
    main()
