"""Wikisource page generator v2: page breaks and paragraphs from the OCR.

python3 -I scripts/wikisource/generate.py <repo> <book> <first-wiki-page> <outdir> [max-pages]

Builds one token stream for the book from odr-original (headings, verses,
annotations), aligns the sancta-scan OCR of each page to it, cuts the stream
at the page starts and opens a paragraph wherever the print indents a line.
Also writes report.txt: alignment quality per page and macron candidates.
"""
import json, re, sys, difflib
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from ocrpages import book_pages  # noqa: E402

REPO, BOOK, FIRST, OUT = Path(sys.argv[1]), sys.argv[2], int(sys.argv[3]), Path(sys.argv[4])
MAXP = int(sys.argv[5]) if len(sys.argv) > 5 else 10 ** 6
DATA = REPO / 'static/data/odr-original'
RUNNING = {'matthew': ('THE GOSPEL', 'ACCORDING TO S. MATTHEVV.')}
# Marks in chapter summaries are not in the data yet: words to star, per chapter.
SUMMARY_STARS = {('matthew', 1): ['Abraham', 'Dauid. 18']}
ITALIC_REF = re.compile(r'^\s*(<i>)?\s*[0-9]?\.?\s*[A-Z][a-zæ]*\.\s*[0-9]')
ROMAN = ['', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIIII', 'XV',
         'XVI', 'XVII', 'XVIII', 'XIX', 'XX', 'XXI', 'XXII', 'XXIII', 'XXIIII', 'XXV', 'XXVI', 'XXVII', 'XXVIII']


SENT = re.compile(r'⟦[^⟧]*⟧')


def norm(w):
    w = SENT.sub('', w)
    w = re.sub(r'\{\{[^{}]*\}\}', '', w)
    w = w.lower().replace('ſ', 's').replace('f', 's').replace('vv', 'w').replace('u', 'v').replace('j', 'i')
    w = w.translate(str.maketrans('āēīōūñ', 'aeiovn'))
    return re.sub(r'[^a-zæœ]', '', w)


def margin(side, text):
    return f'{{{{MarginNote|margin={side}|margin-width=65|text={text}}}}}'


def finish(s):
    s = s.replace('ſ', 's').replace('⊢', '⊣')
    s = re.sub(r'<sc>(.*?)</sc>', r'\1', s)
    s = re.sub(r'</?i>', "''", s)
    return s.replace('<br>', '<br/>')


def tokens_of(text, **meta):
    """Splits rendered wikitext into word tokens; templates stick to the next word."""
    toks, depth, cur = [], 0, ''
    i = 0
    while i < len(text):
        if text.startswith('{{', i):
            depth += 1; cur += '{{'; i += 2; continue
        if text.startswith('}}', i) and depth:
            depth -= 1; cur += '}}'; i += 2; continue
        c = text[i]
        if c == ' ' and depth == 0:
            if cur and norm(cur):
                toks.append(cur); cur = ''
            elif cur:
                cur += ' '
        else:
            cur += c
        i += 1
    if cur.strip():
        if toks and not norm(cur):
            toks[-1] += cur  # trailing template or mark
        else:
            toks.append(cur)
    return [dict(text=t, norm=norm(t), **meta) for t in toks]


def build_stream(book, ann):
    S = []
    for chap in book['chapters']:
        ch = chap['chapter']
        if ch == 1:
            S += tokens_of('{{c|{{xx-larger|THE HOLY GOSPEL}}}} {{c|{{x-larger|OF IESVS CHRIST ACCOR-}}}} {{c|{{larger|DING TO MATTHEVV.}}}}', block=True, ch=ch, kind='title')
        side = (chap.get('summary_notes') or [{}])[0].get('text', '')
        head = ''
        if side and not ITALIC_REF.match(side):
            m = re.match(r'(\S+ \S+)(.*)', side)
            head = '{{MOUTER|{{sc|' + m.group(1).capitalize() + '}}' + m.group(2) + '}}'
        S += tokens_of(head + '{{c|{{larger|{{sc|Chap. ' + ROMAN[ch] + '.}}}}}}', block=True, ch=ch, kind='chap')
        s = re.sub(r'<na>\[\d+\]</na>\s*', '', chap.get('summary', '')).strip()
        for w in SUMMARY_STARS.get((BOOK, ch), []):
            s = s.replace(w, '* ' + w, 1)
        refs = [n['text'] for n in chap.get('summary_notes', []) if ITALIC_REF.match(n['text'])]
        pre = ''.join('{{MINNER|' + f"''{r}''" + '}}' for r in refs)
        if s:
            S += tokens_of(pre + "{{c|''" + finish(s) + "''}}", block=True, ch=ch, kind='summary')
        for v in chap['verses']:
            vt = tokens_of(finish(render_verse(v, ch)), ch=ch, kind='verse', verse=v['verse'])
            vt[0]['vstart'] = True
            for k, t in enumerate(vt):
                t['w'] = k
            if v['verse'] == 1:
                for t in vt[:14]:
                    t['nopara'] = True
            S += vt
        anns = ann.get(ch, [])
        if anns:
            S += tokens_of('{{c|{{larger|A N N O T A T I O N S}}}} {{c|{{sc|Chap. ' + ROMAN[ch] + '.}}}}', block=True, ch=ch, kind='annhead')
            for ai, a in enumerate(anns):
                at = tokens_of(finish(render_annotation(a)), ch=ch, kind='ann', ann=ai)
                at[0]['block'] = True
                S += at
    return S


def render_verse(v, ch):
    raw = v['text']
    for start in sorted({l[0] for l in v.get('lemmas', [])}, reverse=True):
        raw = raw[:start] + '‖ ' + raw[start:]
    refs = [r for r in v.get('cross_refs', []) if r.get('source') != 'sancta']
    notes = {n['label']: n for n in v.get('notes', [])}

    def cr(m):
        i = int(m.group(1)) - 1
        return f'⟦cr:{m.group(1)}⟧' + ('{{MINNER|' + f"''{refs[i]['text']}''" + '}}' if i < len(refs) else '') + '* '

    def na(m):
        n = notes.get(m.group(1))
        if not n:
            return ''
        tag = f'⟦na:{m.group(1)}⟧'
        if n.get('kind') in ('lectionary', 'head') or n.get('unmarked') or n.get('table_only'):
            return tag + '{{MOUTER|' + n['text'] + '}}'
        return tag + '{{MOUTER|∷ ' + n['text'] + '}}∷ '

    # A citation at the very end of the verse is printed in the margin with no * in the text.
    raw = re.sub(r'\s*<cr>\[(\d+)\]</cr>\s*$', lambda m: ' ' + cr(m).replace('* ', '').replace('⟦cr:', '⟦crend:'), raw)
    raw = re.sub(r'<cr>\[(\d+)\]</cr>\s*', cr, raw)
    raw = re.sub(r'<na>\[(\d+)\]</na>\s*', na, raw)
    lead = f'{{{{verse|chapter={ch}|verse={v["verse"]}}}}}' + ('' if v['verse'] == 1 else '† ')
    return lead + raw


def render_annotation(a):
    text = a['text'].strip()
    mns = list(enumerate(a.get('notes', [])))

    def mn(m):
        k, n = mns.pop(0) if mns else (None, None)
        if not n:
            return ''
        if n['text'].lstrip().startswith('<i>'):  # citations are set in italic
            return f'⟦mn:{k}⟧' + '{{MINNER|' + n['text'] + '}}' + ('* ' if n.get('star') else '')
        return f'⟦mn:{k}⟧' + '{{MOUTER|' + n['text'] + '}}'

    text = re.sub(r'<mn>[^<]*</mn>\s*', mn, text)
    return f"''{a['verse']}. {a['title']}''] {text}"


MARKDIFF = []
MACRON = []


def align(pages, S):
    """Returns the stream index where each page starts, plus paragraph starts."""
    idx = [i for i, t in enumerate(S) if t['norm']]
    words = [S[i]['norm'] for i in idx]
    starts, paras, quality = [], set(), []
    cur = 0
    for p in pages:
        W, Windent, Wmark, Wraw, Wline = [], [], [], [], []
        for li, line in enumerate(p['body']):
            first, pending = True, ''
            for w in line['words']:
                n = norm(w)
                lead = re.match(r'^[^A-Za-zſ]*', w).group(0)
                if len(n) < 2:
                    pending += w
                    continue
                marks = pending + lead
                flag = ('*' if '*' in marks else '') + ('‖' if re.search(r'["“”\'‘’]', marks) else '')
                W.append(n); Windent.append(line.get('indent') and first); Wmark.append(flag); Wraw.append(w)
                Wline.append(li)
                first, pending = False, ''
        hi = min(len(words), cur + len(W) * 2 + 150)
        lo = max(0, cur - 40)
        sm = difflib.SequenceMatcher(None, W, words[lo:hi], autojunk=False)
        blocks = [b for b in sm.get_matching_blocks() if b.size >= 3]
        if not blocks:
            starts.append(cur); quality.append(0.0); continue
        b0 = blocks[0]
        # Walk back from the first solid match over OCR words that still
        # resemble the stream (garbled but real), to find the page's first word.
        a, bb = b0.a, lo + b0.b
        while a > 0 and bb > (starts[-1] if starts else 0) and \
                difflib.SequenceMatcher(None, W[a - 1], words[bb - 1]).ratio() >= 0.6:
            a -= 1; bb -= 1
        starts.append(bb)
        for op, i1, i2, j1, j2 in sm.get_opcodes():
            if op == 'replace' and i2 - i1 == j2 - j1:
                for k in range(i2 - i1):
                    o, u = Wraw[i1 + k], words[lo + j1 + k]
                    on = norm(o.replace('6', 'o'))
                    for q in range(1, len(u)):
                        if u[q] in 'nm' and u[q - 1] in 'aeiov' and u[:q] + u[q + 1:] == on:
                            MACRON.append((len(starts) - 1, o, S[idx[lo + j1 + k]]['text'][-30:]))
        matched = sum(b.size for b in blocks)
        quality.append(matched / max(1, len(W)))
        seen_lines = set()
        for b in blocks:
            for k in range(b.size):
                ti = idx[lo + b.b + k]
                # The first word matched on an indented line opens the paragraph,
                # even when the OCR garbled the line's first word (often the †).
                ai = b.a + k
                li = Wline[ai]
                if li not in seen_lines:
                    seen_lines.add(li)
                    if p['body'][li].get('indent'):
                        sp = snap_para(S, ti)
                        if sp >= 0:
                            paras.add(sp)
                t = S[ti]
                pre = re.sub(r'\{\{[^{}]*(\{\{[^{}]*\}\}[^{}]*)*\}\}', '', SENT.sub('', t['text']))
                pre = re.match(r'^[^A-Za-zſ]*', pre).group(0)
                ours = ('*' if ('*' in pre or '∷' in pre) else '') + ('‖' if '‖' in pre else '')
                t['ocr'] = Wmark[b.a + k]
                if ours != Wmark[b.a + k]:
                    MARKDIFF.append(dict(page=len(starts) - 1, ch=t.get('ch'), verse=t.get('verse'), w=t.get('w'),
                                         ann=t.get('ann'), tags=re.findall(r'⟦([^⟧]*)⟧', t['text']),
                                         token=SENT.sub('', t['text'])[-40:], ocr=Wmark[b.a + k], ours=ours))
        last = blocks[-1]
        cur = lo + last.b + last.size
    # map word positions back to stream token indices
    starts = [idx[s] if s < len(idx) else len(S) for s in starts]
    if starts:
        starts[0] = 0  # the first page opens the book
    return starts, paras, quality


def snap_para(S, ti):
    """A print paragraph opens at a † (verse start) or, inside a verse, at a
    sentence start. Snap the first matched word of an indented line to the
    verse start when it is within two words of it; otherwise keep it only at a
    sentence start."""
    t = S[ti]
    if t['kind'] == 'verse' and t.get('w', 99) <= 4:
        return ti - t['w']
    prev = SENT.sub('', re.sub(r'\{\{(?:[^{}]|\{\{[^{}]*\}\})*\}\}', '', S[ti - 1]['text'])).strip() if ti else '.'
    return ti if re.search(r'[.:?!⊣]["’]*$', prev) or t['kind'] != 'verse' else -1


def move_bars(S):
    """The print's ‖ is not always at the catchword: follow the OCR when it sees
    the ‖ within two words of ours, in the same verse."""
    for i, t in enumerate(S):
        if t['kind'] != 'verse' or '‖' not in t['text'] or 'ocr' not in t or '‖' in t['ocr']:
            continue
        for d in (1, -1, 2, -2):
            j = i + d
            if 0 <= j < len(S) and S[j].get('verse') == t.get('verse') and S[j]['kind'] == 'verse' \
                    and '‖' in S[j].get('ocr', '') and '‖' not in S[j]['text']:
                t['text'] = t['text'].replace('‖ ', '', 1)
                m = re.match(r'^((?:⟦[^⟧]*⟧|\{\{(?:[^{}]|\{\{[^{}]*\}\})*\}\}|[*∷†] ?)*)', S[j]['text'])
                S[j]['text'] = S[j]['text'][:m.end()] + '‖ ' + S[j]['text'][m.end():]
                S[j]['ocr_bar_moved'] = True
                break


MANUAL_PARAS = {('matthew', 1): [[2, 0]], ('matthew', 5): [[3, 0]]}  # beside a drop cap (scans p. 31, 39)


def export_paragraphs(S, paras):
    """The print's paragraphs: chapter -> [[verse, word], ...], word 0 = verse start."""
    out = {}
    for i, t in enumerate(S):
        if t['kind'] != 'verse':
            continue
        manual = [t.get('verse'), t.get('w')] in MANUAL_PARAS.get((BOOK, t['ch']), [])
        if manual:
            paras.add(i)
        if (t.get('verse') == 1 and t.get('w') == 0) or manual or (i in paras and not t.get('nopara')):
            out.setdefault(str(t['ch']), []).append([t['verse'], t['w']])
    (OUT / 'paragraphs.json').write_text(json.dumps(out))


def main():
    book = json.loads((DATA / f'{BOOK}.json').read_text())
    ann = {}
    for f in sorted((DATA / BOOK / 'annotations').glob('*.json')):
        a = json.loads(f.read_text()); ann[a['chapter']] = a['annotations']
    S = build_stream(book, ann)
    pages = book_pages(BOOK)[:MAXP]
    OUT.mkdir(parents=True, exist_ok=True)
    starts, paras, quality = align(pages, S)
    (OUT / 'tokens.json').write_text(json.dumps(
        [dict(ch=t.get('ch'), verse=t.get('verse'), w=t.get('w'), ann=t.get('ann'), kind=t['kind'],
              tags=re.findall(r'⟦([^⟧]*)⟧', t['text']), ocr=t.get('ocr'))
         for t in S if t['kind'] in ('verse', 'ann')], ensure_ascii=False))
    move_bars(S)
    export_paragraphs(S, paras)
    OUT.mkdir(parents=True, exist_ok=True)
    report = []
    verso_t, recto_t = RUNNING[BOOK]
    for n, p in enumerate(pages):
        wiki = FIRST + n
        a, b = starts[n], (starts[n + 1] if n + 1 < len(starts) else len(S))
        printed = wiki - 28
        side_inner, side_outer = ('left', 'right') if wiki % 2 else ('right', 'left')
        chs = [t['ch'] for t in S[a:b] if t['kind'] == 'verse'] or [S[a]['ch'] if a < len(S) else 0]
        cha = f'CHA. {ROMAN[max(chs)]}.'
        header = (f'{{{{rh|{cha}|{recto_t}|{printed}}}}}' if wiki % 2 else f'{{{{rh|{printed}|{verso_t}|{cha}}}}}')
        if n == 0:
            header = f'{{{{rh|||{printed}}}}}'
        body = ''
        for i in range(a, b):
            t = S[i]
            sep = '' if i == a else (' ' if not (t.get('block') or (i in paras and not t.get('nopara'))) else '\n\n')
            if t.get('block') and t['kind'] in ('title', 'annhead') and i > a and S[i - 1]['kind'] == t['kind']:
                sep = '\n'
            body += sep + t['text']
        body = SENT.sub('', body)
        body = body.replace('{{MINNER|', '{{MarginNote|margin=' + side_inner + '|margin-width=65|text=')
        body = body.replace('{{MOUTER|', '{{MarginNote|margin=' + side_outer + '|margin-width=65|text=')
        catch = re.sub(r'\{\{(?:[^{}]|\{\{[^{}]*\}\})*\}\}|[‖∷*†]', '', SENT.sub('', S[b]['text'])).strip() if b < len(S) else ''
        sig = ''
        for line in p['text'].splitlines()[-6:]:
            m = re.match(r'^\s*([A-Z]{1,2})\s+([ivjl]{1,5})\b', line)
            if m:
                sig = m.group(1) + ' ' + m.group(2).replace('l', 'i')
        footer = f'{{{{rh||{sig}|{catch}}}}}' if (catch or sig) else ''
        (OUT / f'{wiki}.wiki').write_text('<noinclude><pagequality level="1" user="" />' + header +
                                          '</noinclude>' + body + '<noinclude>' + footer + '</noinclude>\n')
        report.append(f'{wiki} {p["src"]} ch{p["chapters"]} tokens {a}-{b} match {quality[n]:.0%}')
    report.append('\nMark differences (wiki page, ch:v, our token, OCR mark, our mark):')
    for d in MARKDIFF:
        report.append(f'  {FIRST + d["page"]} {d["ch"]}:{d["verse"]} …{d["token"]!r} ocr={d["ocr"] or "-"} ours={d["ours"] or "-"}')
    (OUT / 'markdiff.json').write_text(json.dumps(MARKDIFF, ensure_ascii=False, indent=0))
    report.append('\nMacron candidates (page, OCR, ours):')
    for i, raw, ours in MACRON:
        report.append(f'  {FIRST + i} ocr {raw!r}  ours …{ours!r}')
    (OUT / 'report.txt').write_text('\n'.join(report) + '\n')
    print('\n'.join(report[:40]))


main()
