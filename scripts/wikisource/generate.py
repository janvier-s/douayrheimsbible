"""Wikisource page generator v2: page breaks and paragraphs from the OCR.

python3 -I scripts/wikisource/generate.py <repo> <book> <first-wiki-page> <outdir> [max-pages]

Builds one token stream for the book from odr-original (headings, verses,
annotations), aligns the sancta-scan OCR of each page to it, cuts the stream
at the page starts and opens a paragraph wherever the print indents a line.
Also writes report.txt: alignment quality per page and macron candidates.
"""
import json, os, re, sys, difflib
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
    s = re.sub(r'</?alt>', '', s)  # variant readings: the print's ` ' marks stay in the text
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
            # a verse-end citation printed beside an earlier line (it may be on another page)
            to = CREND_AT.get((BOOK, ch, v['verse']))
            if to is not None:
                m = next(re.search(r'⟦crend:\d+⟧\{\{MINNER\|[^{}]*\}\}', t['text']) for t in vt if '⟦crend:' in t['text'])
                for t in vt:
                    t['text'] = t['text'].replace(m.group(0), '')
                vt[to]['text'] = m.group(0) + vt[to]['text']
            if v['verse'] == 1:
                for t in vt[:14]:
                    t['nopara'] = True
            S += vt
        anns = ann.get(ch, [])
        if anns:
            S += tokens_of('{{c|{{larger|A N N O T A T I O N S}}}} {{c|{{sc|Chap. ' + ROMAN[ch] + '.}}}}', block=True, ch=ch, kind='annhead')
            for ai, a in enumerate(anns):
                at = tokens_of(finish(render_annotation(a, ch, ai)), ch=ch, kind='ann', ann=ai)
                at[0]['block'] = True
                S += at
    return S


def render_verse(v, ch):
    raw = v['text']
    for start in sorted({l[0] for l in v.get('lemmas', [])}, reverse=True):
        raw = raw[:start] + '‖ ' + raw[start:]
    refs = [r for r in v.get('cross_refs', []) if r.get('source') != 'sancta']
    notes = {n['label']: n for n in v.get('notes', [])}
    variants = set(re.findall(r'<na>\[(\d+)\]</na>\s*<alt>', raw))

    def cr(m):
        i = int(m.group(1)) - 1
        return f'⟦cr:{m.group(1)}⟧' + ('{{MINNER|' + f"''{refs[i]['text']}''" + '}}' if i < len(refs) else '') + '* '

    def na(m):
        n = notes.get(m.group(1))
        if not n:
            return ''
        tag = f'⟦na:{m.group(1)}⟧'
        # A variant reading (the note anchored to an <alt> span) is set in the inner
        # margin with no mark: the print's ` ' around the words are the mark
        # (checked on the scans: 14:3, 19:4, 23:25).
        if m.group(1) in variants:
            return tag + '{{MINNER|' + n['text'] + '}}'
        if n.get('kind') in ('lectionary', 'head') or n.get('unmarked') or n.get('table_only'):
            return tag + '{{MOUTER|' + n['text'] + '}}'
        return tag + '{{MOUTER|∷ ' + n['text'] + '}}∷ '

    # Citations at the very end of the verse are printed in the margin with no * in the text
    # (Matt 15:4 has two).
    def crend(m):
        return ' ' + ''.join(cr(c).replace('* ', '').replace('⟦cr:', '⟦crend:')
                             for c in re.finditer(r'<cr>\[(\d+)\]</cr>', m.group(0)))
    raw = re.sub(r'(?:\s*<cr>\[\d+\]</cr>)+\s*$', crend, raw)
    raw = re.sub(r'<cr>\[(\d+)\]</cr>\s*', cr, raw)
    raw = re.sub(r'<na>\[(\d+)\]</na>\s*', na, raw)
    lead = f'{{{{verse|chapter={ch}|verse={v["verse"]}}}}}' + ('' if v['verse'] == 1 else '† ')
    return lead + raw


# Italic annotation notes the print sets in the OUTER margin, beside the side headings,
# though they look like citations: (book, chapter, annotation index, note index), checked
# on the scans. Greek words on page 107 (26:26 τὸν ἄρτον, 26:28 ἐκχυνόμενον); the Greek
# notes on pages 36, 44 and 58 do sit in the inner margin.
OUTER_NOTES = {('matthew', 26, 5, 3), ('matthew', 26, 8, 0)}


def render_annotation(a, ch=None, ai=None):
    text = a['text'].strip()
    mns = list(enumerate(a.get('notes', [])))

    def mn(m):
        k, n = mns.pop(0) if mns else (None, None)
        if not n:
            return ''
        # citations are set in italic, some behind the print's margin star ("* <i>Act. 15</i>.")
        # or a letter keyed to the text ("a <i>Aug. Ser. de tēp. 251</i>", 15:9 on page 71)
        if re.match(r'\s*(?:\* |[a-z] )?<i>', n['text']) and (BOOK, ch, ai, k) not in OUTER_NOTES:
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
    prev_tail = None
    prev_catch = ''
    for p in pages:
        W, Windent, Wmark, Wraw, Wline, Wbox = [], [], [], [], [], []
        for li, line in enumerate(p['body']):
            first, pending = True, ''
            for w, box in zip(line['words'], line['boxes']):
                n = norm(w)
                lead = re.match(r'^[^A-Za-zſ]*', w).group(0)
                if len(n) < 2:
                    pending += w
                    continue
                # A mark glued to the end of the previous word ("And*") belongs to this one.
                if W and re.search(r'[*"“”]$', Wraw[-1]) and not pending:
                    pending = re.search(r'[*"“”]+$', Wraw[-1]).group(0)
                marks = pending + lead
                flag = ('*' if '*' in marks else '') + ('‖' if re.search(r'["“”\'‘’]', marks) else '')
                W.append(n); Windent.append(line.get('indent') and first); Wmark.append(flag); Wraw.append(w)
                Wbox.append((p['src'], box))
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
        # The previous page ends where its last solid match ends plus the OCR
        # words left after it; together with the walk-back that brackets the
        # start. Pick the position whose text best matches this page's first
        # OCR line (often badly read, but rarely unrecognisable as a whole).
        if starts and prev_tail is not None:
            # Compare letters only: the OCR glues words ("tAndvvhen") and drops
            # short ones, so word-by-word comparison misjudges the first line.
            first_raw = next((l['words'] for l in p['body'] if l['words']), [])
            fl = norm(''.join(first_raw))[:60]
            fl = re.sub(r'^[t]+(?=[a-z])', '', fl) if fl[:1] == 't' and not fl.startswith('th') else fl
            lo_c, hi_c = min(prev_tail, bb) - 6, max(prev_tail, bb) + 3
            best, best_r = bb, -1
            for pos in range(max(starts[-1] + 1, lo_c), min(len(words), hi_c + 1)):
                cand = ''.join(words[pos:pos + 25])[:len(fl)]
                r = difflib.SequenceMatcher(None, fl, cand, autojunk=False).ratio()
                # The previous page's catchword is this page's first word.
                if prev_catch and len(prev_catch) >= 2:
                    wd = words[pos]
                    if difflib.SequenceMatcher(None, prev_catch, wd).ratio() >= 0.75 or \
                            (len(prev_catch) >= 3 and (wd.endswith(prev_catch) or wd.startswith(prev_catch))):
                        r += 0.15
                if r > best_r + 0.02 or (abs(r - best_r) <= 0.02 and abs(pos - bb) < abs(best - bb)):
                    best, best_r = pos, r
            if best_r >= 0.5:
                bb = best
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
        if os.environ.get('WS_DEBUG') == p['src']:
            for b in blocks:
                print('block', b.a, b.size, 'lines', sorted({Wline[b.a + k] for k in range(b.size)}), W[b.a:b.a + b.size][:6])
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
                        # estimate the line's first word: back off over the OCR
                        # words before this match on the same line
                        lead = sum(1 for x in range(ai) if Wline[x] == li)
                        est = idx[max(0, lo + b.b + k - lead)]
                        sp = snap_para(S, est, ti)
                        if os.environ.get('WS_DEBUG'):
                            print('indent', p['src'], ' '.join(p['body'][li]['words'])[:40], '| est', S[est].get('ch'), S[est].get('verse'), S[est].get('w'), '| ti', S[ti].get('verse'), S[ti].get('w'), '->', sp if sp < 0 else (S[sp].get('verse'), S[sp].get('w')))
                        if sp >= 0:
                            paras.add(sp)
                t = S[ti]
                pre = re.sub(r'\{\{[^{}]*(\{\{[^{}]*\}\}[^{}]*)*\}\}', '', SENT.sub('', t['text']))
                pre = re.match(r'^[^A-Za-zſ]*', pre).group(0)
                ours = ('*' if ('*' in pre or '∷' in pre) else '') + ('‖' if '‖' in pre else '')
                t['ocr'] = Wmark[b.a + k]
                t['box'] = Wbox[b.a + k]
                if ours != Wmark[b.a + k]:
                    MARKDIFF.append(dict(page=len(starts) - 1, box=Wbox[b.a + k], ch=t.get('ch'), verse=t.get('verse'), w=t.get('w'),
                                         ann=t.get('ann'), tags=re.findall(r'⟦([^⟧]*)⟧', t['text']),
                                         token=SENT.sub('', t['text'])[-40:], ocr=Wmark[b.a + k], ours=ours))
        # An indented line with no solid match (glued or garbled OCR words):
        # place it from the next matched block and accept only a nearby verse start.
        for li, line in enumerate(p['body']):
            if not line.get('indent') or li in seen_lines:
                continue
            first = next((x for x in range(len(W)) if Wline[x] == li), None)
            nxt = next((b for b in blocks if b.a > first), None) if first is not None else None
            if nxt is None:
                continue
            est_w = lo + nxt.b - (nxt.a - first)
            if not (0 <= est_w < len(idx)):
                continue
            est = idx[est_w]
            # Glued OCR words make the line look shorter than it is, so the
            # estimate runs late: look back further than forward.
            for d in (0, -1, -2, 1, -3, -4, 2, -5, -6, -7, -8):
                j = est + d
                if 0 <= j < len(S) and S[j]['kind'] == 'verse' and S[j].get('w') == 0:
                    paras.add(j)
                    seen_lines.add(li)
                    break
        if os.environ.get('WS_DEBUG'):
            for li, line in enumerate(p['body']):
                if line.get('indent') and li not in seen_lines:
                    ws_ = [W[x] for x in range(len(W)) if Wline[x] == li]
                    print('UNMATCHED indent', p['src'], li, ws_[:10])
        last = blocks[-1]
        cur = lo + last.b + last.size
        prev_tail = cur + (len(W) - (last.a + last.size))
        prev_catch = norm(p.get('catch') or '')
    # map word positions back to stream token indices
    starts = [idx[s] if s < len(idx) else len(S) for s in starts]
    if starts:
        starts[0] = 0  # the first page opens the book
    return starts, paras, quality


def snap_para(S, est, ti):
    """A print paragraph opens at a † (verse start) or, rarely, at a sentence
    start inside a verse. Look around the estimated line start for the nearest
    verse start (within three words), else a sentence start (within one word of
    the first matched word); otherwise drop it."""
    def plain(t):
        return SENT.sub('', re.sub(r'\{\{(?:[^{}]|\{\{[^{}]*\}\})*\}\}', '', t['text'])).strip()
    for d in (0, 1, -1, 2, -2, 3, -3):
        j = est + d
        if 0 <= j < len(S) and S[j]['kind'] == 'verse' and S[j].get('w') == 0 and abs(j - ti) <= 10:
            return j
    for j in (est, ti):
        if S[j]['kind'] != 'verse':
            return j
        if j and re.search(r'[.:?!⊣]["’]*$', plain(S[j - 1])):
            return j
    return -1


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
    # ‖ positions checked on the scan that neither the lemmas nor the OCR give
    for i, t in enumerate(S):
        if t['kind'] != 'verse':
            continue
        for frm, to in BARS.get((BOOK, t['ch'], t['verse']), []):
            if t['w'] == frm:
                assert '‖ ' in t['text'], (t['ch'], t['verse'], t['text'])
                t['text'] = t['text'].replace('‖ ', '', 1)
            if t['w'] == to:
                m = re.match(r'^((?:⟦[^⟧]*⟧|\{\{(?:[^{}]|\{\{[^{}]*\}\})*\}\}|[*∷†] ?)*)', t['text'])
                t['text'] = t['text'][:m.end()] + '‖ ' + t['text'][m.end():]


# Citations with no * in the print (stored at the verse end) whose margin note the print sets
# beside an earlier word, on an earlier page: (book, chapter, verse) -> word.
# 27:35 'Pſ. 21, 19' beside 'They deuided' (109; the verse ends on 110).
CREND_AT = {('matthew', 27, 35): 24}


# Wiki-only ‖ fixes, checked on the scan: (from word, to word) per verse, None = no bar.
# 23:2 '‖ the chaire' (92); 25:34 has no ‖ in the print, 25:41 has '‖ Get' (101; the
# annotation title '34. Come ye, 41 get ye away' gives only the first).
# These stay out of the data on purpose: the site draws ‖ before each tinted lemma, and
# the lemma spans are right (the titles quote 'Chaire of Moyses' and 'Come ye'). A span
# in 25:41 would tint words whose click opens 25:41's annotations, of which there are none.
# 26:27 '‖ he gaue thankes' (103): the 26:26 'Bleſſed.' annotation covers both verbs;
# 26:75 '‖ he vvept bitterly' (106; the lemma is the title's 'Wept bitterly');
# 28:20 'vvith you ‖ al daies' (113; the title is 'With you al daies').
BARS = {('matthew', 23, 2): [(3, 2)], ('matthew', 25, 34): [(14, None)], ('matthew', 25, 41): [(None, 14)],
        ('matthew', 26, 27): [(None, 4)], ('matthew', 26, 75): [(24, 23)],
        ('matthew', 28, 20): [(15, 17)]}


# Page starts the alignment gets wrong, each checked on the scan: the page's
# first words (normalised as in norm(), joined by spaces).
# '@annhead' / '@chap': the page opens with the ANNOTATIONS or CHAP. heading.
PAGE_STARTS = {('matthew', 37): 'salvation bvt it is', ('matthew', 39): 'it is written heretikes',
               ('matthew', 44): 'pvt on is not', ('matthew', 45): 'leade vs not s cypr',
               ('matthew', 57): 'lesser in the kingdom', ('matthew', 58): '@annhead',
               ('matthew', 66): 'avthor os evil tertvl', ('matthew', 69): '@chap', ('matthew', 71): '@annhead',
               ('matthew', 72): 'and there came to', ('matthew', 76): '@chap', ('matthew', 79): 'ones that beleeve in',
               ('matthew', 81): 'nativitie an angel sor', ('matthew', 84): '@chap', ('matthew', 86): 'nations avg de verb',
               ('matthew', 89): 'to lay hands vpon', ('matthew', 92): 'a man not attyred', ('matthew', 96): '@chap',
               ('matthew', 101): 'i sow not gather', ('matthew', 102): '@annhead',
               ('matthew', 107): 'thovgh now not only', ('matthew', 108): '@chap',
               ('matthew', 113): 'wil persvade him and'}


# Signature marks. The NT is printed in gatherings of four leaves (eight pages); the first
# three rectos are signed X, X ij, X iij, and the fourth is unsigned. Gathering A starts at
# wiki page 29 (the NT title). The OCR misreads the numeral often (57 'D ij' for D iij), so
# the mark is computed, and the OCR only warns when it sees another letter. Checked on the
# scans for A-H (pages 31-89).
SIG_ALPHABET = 'ABCDEFGHIKLMNOPQRSTVXYZ'
SIG_FIRST = {'matthew': 29}


def signature(wiki):
    k = wiki - SIG_FIRST.get(BOOK, 10 ** 6)
    if k < 0 or k % 2 or k % 8 > 4:
        return ''
    g, n = divmod(k // 2, 4)
    letters = SIG_ALPHABET[g % 23] * (g // 23 + 1)
    letters = letters[0] + letters[1:].lower()
    return letters + ['', ' ij', ' iij'][n]


# Catchwords before a heading that the OCR garbles, checked on the scan.
# The book's last page has no next token: its catchword (the next book's first word) goes here too.
CATCHWORDS = {('matthew', 75): 'Chap.', ('matthew', 95): 'Cha. XXIIII.', ('matthew', 101): 'ANNOT-',
              ('matthew', 107): 'Chap. XXVII.', ('matthew', 113): 'THE'}


def apply_page_starts(S, starts):
    for n in range(1, len(starts)):
        want = PAGE_STARTS.get((BOOK, FIRST + n))
        if not want:
            continue
        lo, hi = max(0, starts[n] - 150), min(len(S), starts[n] + 150)
        if want.startswith('@'):  # the page opens with a heading block: '@annhead' or '@chap'
            heads = [i for i in range(lo, hi) if S[i]['kind'] == want[1:] and S[i - 1]['kind'] != want[1:]]
            if heads:
                starts[n] = min(heads, key=lambda i: abs(i - starts[n]))
                continue
            print(f'warning: page start override for {FIRST + n} not found near the estimate')
            continue
        want = want.split()
        cands = [i for i in range(lo, hi) if S[i]['norm'] == want[0]]
        for i in sorted(cands, key=lambda i: abs(i - starts[n])):
            got, j = [], i
            while len(got) < len(want) and j < len(S):
                if S[j]['norm']:
                    got.append(S[j]['norm'])
                j += 1
            if got == want:
                starts[n] = i
                break
        else:
            print(f'warning: page start override for {FIRST + n} not found near the estimate')


# Paragraph starts the OCR misses, each checked on the scan (wiki page in brackets):
# beside a drop cap (31, 39, 56), on a page the OCR splits into two blocks (45), 10:40 (55),
# half indents inside a verse (12:39 'The vvicked' 60, 13:3 'Behold' 62), 13:19 (63),
# 13:47 (65; the OCR gives its indent to 13:45, which opens with the same words), 14:34 (68),
# 21:33 (88), 22:15 (90; the OCR gives its indent to 22:16), 23:16 (93) and 24:15 (96).
MANUAL_PARAS = {('matthew', 1): [[2, 0]], ('matthew', 5): [[3, 0]], ('matthew', 7): [[6, 0], [7, 0]],
                ('matthew', 10): [[40, 0]], ('matthew', 11): [[2, 0]], ('matthew', 12): [[39, 6]],
                ('matthew', 13): [[3, 10], [19, 0], [47, 0]], ('matthew', 14): [[34, 0]],
                ('matthew', 21): [[33, 0]], ('matthew', 22): [[15, 0]], ('matthew', 23): [[16, 0]],
                ('matthew', 24): [[15, 0]]}

# Paragraph starts the OCR reports where the scan has none: 13:45 (64), 19:5 and 19:8 (81),
# 22:16 (90, mid-line) are flush left; 26:2 (mid-line) and 26:3 (102) sit beside the drop cap.
NO_PARAS = {('matthew', 13): [[45, 0]], ('matthew', 19): [[5, 0], [8, 0]], ('matthew', 22): [[16, 0]],
            ('matthew', 26): [[2, 0], [3, 0]]}


def export_paragraphs(S, paras):
    """The print's paragraphs: chapter -> [[verse, word], ...], word 0 = verse start."""
    out = {}
    for i, t in enumerate(S):
        if t['kind'] != 'verse':
            continue
        manual = [t.get('verse'), t.get('w')] in MANUAL_PARAS.get((BOOK, t['ch']), [])
        if manual:
            paras.add(i)
        if [t.get('verse'), t.get('w')] in NO_PARAS.get((BOOK, t['ch']), []):
            paras.discard(i)
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
    apply_page_starts(S, starts)
    (OUT / 'tokens.json').write_text(json.dumps(
        [dict(ch=t.get('ch'), verse=t.get('verse'), w=t.get('w'), ann=t.get('ann'), kind=t['kind'],
              tags=re.findall(r'⟦([^⟧]*)⟧', t['text']), ocr=t.get('ocr'), box=t.get('box'))
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
            sep = '' if i == a else (' ' if not (t.get('block') or (i in paras and t['kind'] == 'verse' and not t.get('nopara'))) else '\n\n')
            if t.get('block') and t['kind'] in ('title', 'annhead') and i > a and S[i - 1]['kind'] == t['kind']:
                sep = '\n'
            body += sep + t['text']
        body = SENT.sub('', body)
        body = body.replace('{{MINNER|', '{{MarginNote|margin=' + side_inner + '|margin-width=65|text=')
        body = body.replace('{{MOUTER|', '{{MarginNote|margin=' + side_outer + '|margin-width=65|text=')
        catch = re.sub(r'\{\{(?:[^{}]|\{\{[^{}]*\}\})*\}\}|[‖∷*†]', '', SENT.sub('', S[b]['text'])).strip() if b < len(S) else CATCHWORDS.get((BOOK, wiki), '')
        if b < len(S) and S[b]['kind'] in ('annhead', 'chap', 'title'):
            # the next page opens with a heading: take the print's catchword ("Annot-", "Chap.") from the OCR
            tail = [l for l in p['text'].splitlines() if l.strip()]
            catch = CATCHWORDS.get((BOOK, wiki)) or (tail[-1].split()[-1] if tail else '')
        sig = signature(wiki)
        for line in p['text'].splitlines()[-6:]:
            m = re.match(r'^\s*(?:\d{1,3}\s+)?([A-Z]{1,2})\s+([ivjl]{1,5})\b', line)
            if m and (not sig or m.group(1) != sig.split()[0]):
                print(f'warning: page {wiki}: OCR signature {m.group(1)} {m.group(2)}, computed {sig or "none"}')
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
