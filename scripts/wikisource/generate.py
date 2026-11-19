"""Wikisource page generator v2: page breaks and paragraphs from the OCR.

python3 -I scripts/wikisource/generate.py <repo> <book> <first-wiki-page> <outdir> [max-pages]

Builds one token stream for the book from odr-original (headings, verses,
annotations), aligns the sancta-scan OCR of each page to it, cuts the stream
at the page starts and opens a paragraph wherever the print indents a line.
Also writes report.txt: alignment quality per page and macron candidates.
"""
import unicodedata
import json, os, re, sys, difflib
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from ocrpages import book_pages  # noqa: E402

REPO, BOOK, FIRST, OUT = Path(sys.argv[1]), sys.argv[2], int(sys.argv[3]), Path(sys.argv[4])
MAXP = int(sys.argv[5]) if len(sys.argv) > 5 else 10 ** 6
DATA = REPO / 'static/data/odr-original'
# Matthew's recto heads (pages 33-113) and title (page 31) print a single W sort, not vv.
# Which OCR the alignment reads (WS_OCR overrides). Matthew was done with Tesseract and
# its pages stay as they are; Transkribus reads the print better from Mark on.
OCR_SOURCE = {'mark': 'transkribus', 'luke': 'transkribus', 'john': 'transkribus', 'acts': 'transkribus'}
# Last line of the book title on its first page ("THE HOLY GOSPEL / OF IESVS CHRIST ACCOR- / DING TO ...").
TITLE_END = {'matthew': 'DING TO MATTHEW.', 'mark': 'DING TO MARKE.', 'luke': 'DING TO LVKE.', 'john': 'DING TO IOHN.', 'acts': 'APOSTLES.'}
# Wiki page of the book's Argument, printed before chapter 1 (generated when it is the first page asked for).
ARGUMENT = {'mark': 114, 'luke': 161, 'john': 242, 'acts': 314}
# John's Argument is two scan pages (pdf242-243), the word Pas-sion broken at the page end:
# (first part, continuation, whole word, the text that follows it).
ARGUMENT_SPLIT = {'john': ('Pas', 'sion', 'Passion', 'beheaded')}
# Argument notes printed in the INNER margin (read on pdf242: "Iren. li. 2. c. 39." beside chap. 5, 1).
INNER_ARGUMENT_NOTES = {'Iren. li. 2. c. 39.'}
# First pages whose head prints the chapter beside the page number (mark 115: "CHA. I." … "87").
FIRST_HEAD_CHA = {'mark', 'luke', 'john', 'acts'}
RUNNING = {'matthew': ('THE GOSPEL', 'ACCORDING TO S. MATTHEW.'),
           'mark': ('THE GOSPEL', 'ACCORDING TO S. MARKE.'),
           'luke': ('THE GOSPEL', 'ACCORDING TO S. LVKE.'),  # read on pdf 163, 164
           'john': ('THE GOSPEL', 'ACCORDING TO S. IOHN.'),  # read on pdf 245, 246  # mark: read on 1/2, 5/1, 16/1
           'acts': ('THE ACTES', 'OF THE APOSTLES.')}
# Marks in chapter summaries are not in the data yet: words to star, per chapter.
# Matt 2-28 summaries were checked on the scans (round 10): they print no marks.
SUMMARY_STARS = {('matthew', 1): ['Abraham', 'Dauid. 18']}
ITALIC_REF = re.compile(r'^\s*(<i>)?\s*[0-9]?\.?\s*[A-Z][a-zæ]*\.\s*[0-9]')
ROMAN = ['', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIIII', 'XV',
         'XVI', 'XVII', 'XVIII', 'XIX', 'XX', 'XXI', 'XXII', 'XXIII', 'XXIIII', 'XXV', 'XXVI', 'XXVII', 'XXVIII']


SENT = re.compile(r'⟦[^⟧]*⟧')
# {{dropinitial|T|image=...|imgsize=...|fl={{verse|...}}}}: fl puts the verse number inside
# the floated cap; image is the print's woodcut (on Commons), T its alt text
DROPI = re.compile(r'\{\{dropinitial\|([^{}|]*)(?:\|(?:image|imgsize)=[^{}|]*)*(?:\|fl=\{\{[^{}]*\}\})?\}\}')
# Woodcut initials, headpieces and tailpieces on Commons, from ornaments.py commons:
# initial 'book/ch' -> file, letter, imgsize; headpiece/tailpiece book -> file, width.
_ORN = REPO / 'wikisource/1582-rhemes-nt/ornaments.json'
# WS_NO_ORNAMENTS=1 leaves them out (plain {{dropinitial|T}}), as the published pages are for now.
ORNAMENTS = json.loads(_ORN.read_text()) if _ORN.exists() and not os.environ.get('WS_NO_ORNAMENTS') else {}


def norm(w):
    w = SENT.sub('', w)
    w = DROPI.sub(r'\1', w)  # the drop cap is still a letter of the word
    w = re.sub(r'\{\{[^{}]*\}\}', '', w)
    w = w.lower().replace('ſ', 's').replace('f', 's').replace('vv', 'w').replace('u', 'v').replace('j', 'i')
    w = w.translate(str.maketrans('āēīōūñ', 'aeiovn'))
    return re.sub(r'[^a-zæœ]', '', w)


def margin(side, text):
    return f'{{{{MarginNote|margin={side}|margin-width=65|text={text}}}}}'


# Small caps. The data writes <sc>IESVS</sc>; the print sets a full capital and small
# capitals ("Iesvs", "Marie"; "This is Iesvs the king of the iewes"; "For this is my
# blovd"). Each word is wrapped in two private-use sentinels, which norm() drops, so
# alignment and page splitting see plain words; sc_wiki() turns them into {{sc|...}}
# per page, merging neighbours. The word after a verse-1 drop cap is full capitals.
SC0, SC1 = '', ''
SC_NAMES = {'iesvs', 'iesv', 'iesu', 'marie', 'christ'}


def sc_marks(s, dropcap=False):
    def span(m):
        prefix = SENT.sub('', re.sub(r'\{\{(?:[^{}]|\{\{[^{}]*\}\})*\}\}', '', s[:m.start()]))
        drop = dropcap and not re.search(r'[A-Za-zſ]', prefix)
        parts = re.split(r'(\{\{(?:[^{}]|\{\{[^{}]*\}\})*\}\}|⟦[^⟧]*⟧)', m.group(1))
        i = 0  # word index in the span, margin notes and sentinels skipped
        for k in range(0, len(parts), 2):
            out = []
            for w in parts[k].split(' '):
                mm = re.match(r'^([^\wſ]*)([\wſ]+)(.*)$', w)
                if not mm:
                    out.append(w)
                    continue
                core = mm.group(2)
                if (drop and i == 0) or not (core.isupper() or core.islower()):
                    out.append(w)  # the drop-cap word, or a mixed-case word ("For"): not small caps
                else:
                    low = core.lower()
                    if core.isupper() and (i == 0 or low in SC_NAMES):
                        low = low[0].upper() + low[1:]
                    out.append(mm.group(1) + SC0 + low + SC1 + mm.group(3))
                i += 1
            parts[k] = ' '.join(out)
        return ''.join(parts)
    return re.sub(r'<sc>(.*?)</sc>', span, s)


def sc_wiki(s):
    s = re.sub(SC1 + r'([^\w{}<>\n' + SC0 + SC1 + ']*)' + SC0, r'\1', s)
    return s.replace(SC0, '{{sc|').replace(SC1, '}}')


def drop_initial(s, ch=None):
    """The first letter of a chapter's verse 1 is a drop cap: {{dropinitial|T}}HEN. The verse
    number goes inside the float (fl=), or the floated cap lands before it: "T1AKE". With
    the chapter's woodcut on Commons, the cap is that image and the letter its alt text."""
    orn = ORNAMENTS.get('initial', {}).get(f'{BOOK}/{ch}')
    parts = re.split(r'(\{\{(?:[^{}]|\{\{[^{}]*\}\})*\}\}|⟦[^⟧]*⟧|<[^>]*>)', s)
    for k in range(0, len(parts), 2):
        m = re.search(r'[A-Za-zæœ]', parts[k])
        if m:
            fl = ''
            for j in range(1, k, 2):
                if parts[j].startswith('{{verse|'):
                    fl, parts[j] = '|fl=' + parts[j], ''
            img = ''
            if orn:
                if orn['letter'] != m.group(0).upper():
                    print(f'warning: {BOOK} {ch}: woodcut {orn["letter"]}, data starts {m.group(0)}')
                img = f"|image={orn['file']}|imgsize={orn['imgsize']}"
            parts[k] = parts[k][:m.start()] + '{{dropinitial|' + m.group(0) + img + fl + '}}' + parts[k][m.end():]
            break
    return ''.join(parts)


def finish(s, dropcap=False, ch=None):
    s = s.replace('ſ', 's').replace('⊢', '⊣')
    s = sc_marks(s, dropcap)
    if dropcap:
        s = drop_initial(s, ch)
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
            # trailing template or mark sticks to the word; a trailing number keeps its space ("c. 3")
            toks[-1] += (' ' if re.match(r"\s*(?:'')?\d", cur) else '') + cur
        else:
            toks.append(cur)
    return [dict(text=t, norm=norm(t), **meta) for t in toks]


def build_stream(book, ann):
    S = []
    for chap in book['chapters']:
        ch = chap['chapter']
        if ch == 1:
            hp = ORNAMENTS.get('headpiece', {}).get(BOOK)
            if BOOK == 'acts':
                title_wiki = '{{c|{{xx-larger|THE ACTES OF THE}}}} {{c|{{x-larger|APOSTLES.}}}}'
            else:
                title_wiki = '{{c|{{xx-larger|THE HOLY GOSPEL}}}} {{c|{{x-larger|OF IESVS CHRIST ACCOR-}}}} {{c|{{larger|' + TITLE_END[BOOK] + '}}}}'
            tt = tokens_of(title_wiki, block=True, ch=ch, kind='title')
            if hp:  # the woodcut band above the book title, riding on the title's first word
                tt[0]['text'] = f"{{{{c|[[File:{hp['file']}|{hp['width']}]]}}}}\n" + tt[0]['text']
            S += tt
        side = (chap.get('summary_notes') or [{}])[0].get('text', '')
        head = ''
        if side and not ITALIC_REF.match(side):
            # "THE THIRD part": both words in small caps; "THE fourth part": the lower-case word stays roman
            m = re.match(r'(\S+(?: [A-Z]{2,}\b)?)(.*)', finish(side))
            head = '{{MOUTER|{{sc|' + m.group(1).capitalize() + '}}' + SIDE_SC.get((BOOK, ch), lambda x: x)(m.group(2)) + '}}'
        S += tokens_of(head + '{{c|{{larger|{{sc|Chap. ' + ROMAN[ch] + '.}}}}}}', block=True, ch=ch, kind='chap')
        s = re.sub(r'<na>\[\d+\]</na>\s*', '', chap.get('summary', '')).strip()
        for w in SUMMARY_STARS.get((BOOK, ch), []):
            s = s.replace(w, '* ' + w, 1)
        refs = [n['text'] for n in chap.get('summary_notes', []) if ITALIC_REF.match(n['text'])]
        pre = ''.join('{{MINNER|' + f"''{finish(r)}''" + '}}' for r in refs)
        if s:
            S += tokens_of(pre + "{{c|''" + finish(s) + "''}}", block=True, ch=ch, kind='summary')
        for v in chap['verses']:
            vt = tokens_of(finish(render_verse(v, ch), dropcap=v['verse'] == 1, ch=ch), ch=ch, kind='verse', verse=v['verse'])
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
    tp = ORNAMENTS.get('tailpiece', {}).get(BOOK)
    if tp:  # the fleuron closing the book, after its last annotation
        S[-1]['text'] += f"\n\n{{{{c|[[File:{tp['file']}|{tp['width']}]]}}}}"
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
        # A blank citation is a bare * in the print with no margin note (Mark 12:38, 13:34): the star alone.
        return f'⟦cr:{m.group(1)}⟧' + ('{{MINNER|' + f"''{refs[i]['text']}''" + '}}' if i < len(refs) and refs[i]['text'].strip() else '') + '* '

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


# Words of a chapter's side heading the print sets in small caps besides its first words (read on the scans).
SIDE_SC = {('mark', 11): lambda x: x.replace(' the Holy ', ' the {{sc|Holy}} ', 1),
           ('john', 1): lambda x: x.replace('THE ACTES', '{{sc|The actes}}', 1),
           ('john', 5): lambda x: x.replace('THE ACTES', '{{sc|The actes}}', 1),
           ('john', 6): lambda x: x.replace('HIS ACTES', '{{sc|His actes}}', 1),
           ('john', 12): lambda x: x.replace('THE 4', '{{sc|The}} 4', 1)}

# Annotation titles the print closes with ")" instead of "]" (read on the scans): (book, chapter, annotation index).
PAREN_TITLES = {*[('mark', 2, i) for i in range(6)], *[('mark', 3, i) for i in range(6)], ('mark', 6, 0), ('mark', 6, 5), ('mark', 7, 4), ('mark', 7, 5), ('mark', 9, 0), ('mark', 9, 1), ('mark', 9, 2),
                ('mark', 10, 0), ('mark', 10, 1), ('mark', 10, 2), ('mark', 10, 3), ('mark', 10, 4),
                ('mark', 12, 1), ('mark', 12, 2), ('mark', 12, 3),
                *[('luke', 13, i) for i in range(5)], ('luke', 14, 0),
                ('john', 1, 1), *[('john', 2, i) for i in range(6)], *[('john', 4, i) for i in range(2)],
                *[('john', 5, i) for i in range(4)], *[('john', 6, i) for i in range(5, 16)],
                *[('john', 10, i) for i in range(5)], *[('john', 12, i) for i in range(2)],
                *[('john', 13, i) for i in range(4)], *[('john', 14, i) for i in range(4)],
                ('john', 15, 1), ('john', 15, 3), ('john', 15, 4), ('john', 15, 5),
                *[('john', 16, i) for i in range(2)], *[('john', 17, i) for i in range(3)],
                *[('john', 19, i) for i in range(1, 4)], *[('john', 20, i) for i in range(4)]}

# Italic annotation notes the print sets in the OUTER margin, beside the side headings,
# though they look like citations: (book, chapter, annotation index, note index), checked
# on the scans. Greek words on page 107 (26:26 τὸν ἄρτον, 26:28 ἐκχυνόμενον); the Greek
# notes on pages 36, 44 and 58 do sit in the inner margin.
OUTER_NOTES = {('matthew', 26, 5, 3), ('matthew', 26, 8, 0), ('john', 2, 3, 1), ('john', 2, 5, 0),
               ('john', 3, 0, 1), ('john', 3, 1, 0), ('john', 3, 1, 2), ('john', 4, 0, 1), ('john', 4, 0, 3),
               ('john', 4, 1, 1), ('john', 4, 1, 2), ('john', 6, 1, 1), ('john', 6, 1, 3), ('john', 6, 1, 5),
               ('john', 6, 2, 0), ('john', 6, 5, 1), ('john', 6, 7, 1), ('john', 6, 12, 0), ('john', 6, 12, 1),
               ('john', 6, 12, 3), ('john', 6, 13, 1), ('john', 6, 15, 1), ('john', 8, 0, 2),
               ('john', 10, 3, 1), ('john', 13, 1, 1), ('john', 20, 0, 1), ('john', 20, 0, 3),
               ('john', 20, 2, 1), ('john', 20, 2, 2), ('john', 20, 3, 2), ('john', 20, 3, 3),
               ('john', 21, 0, 1), ('john', 21, 0, 2), ('john', 21, 0, 4), ('john', 21, 0, 6), ('john', 21, 1, 0)}


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

    # the margin marker sits outside the text line: no space before it ahead of punctuation ("ground</i> <mn>[3]</mn>.")
    text = re.sub(r'\s+(<mn>[^<]*</mn>)(?=\s*[,.;:?!)])', r'\1', text)
    text = re.sub(r'<mn>[^<]*</mn>\s*', mn, text)
    close = ')' if (BOOK, ch, ai) in PAREN_TITLES else ']'
    return f"''{a['verse']}. {a['title']}''{close} {text}"


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
        # A short match far ahead of the last one is a stray phrase (often from a
        # page's chapter summary, which is not in the stream); it would drag the
        # cursor and every later page with it.
        kept = []
        for b in blocks:
            if kept and b.size < 5:
                k = kept[-1]
                if b.b - (k.b + k.size) > 3 * (b.a - (k.a + k.size)) + 60:
                    continue
            kept.append(b)
        blocks = kept
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
BARS = {('mark', 1, 12): [(9, 8)], ('mark', 1, 35): [(11, 10)], ('mark', 6, 9): [(8, 11)],
        ('matthew', 23, 2): [(3, 2)], ('matthew', 25, 34): [(14, None)], ('matthew', 25, 41): [(None, 14)],
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
               ('matthew', 113): 'wil persvade him and',
               # Transkribus broke the lines of sancta 13/3, which pulls 152's start late
               ('mark', 120): '@annhead', ('mark', 123): '@chap', ('mark', 131): 'he blessed and brake', ('mark', 141): '@chap', ('mark', 144): '@annhead', ('mark', 149): 'shal receiue larger iudgement', ('mark', 151): 'be and vnles the lord', ('mark', 156): '@annhead', ('mark', 159): 'the prophet saying the law',
               ('mark', 152): 'sorraine sovldiars so shal',
               ('john', 246): 'the lambe os god', ('john', 247): 'vs in a sort', ('john', 248): '@chap', ('john', 250): 'to worke miracles',
               ('john', 253): '@chap', ('john', 257): '@chap',
               ('john', 261): 'to him there is a boy', ('john', 264): '@annhead', ('john', 267): 'schismatikes heretikes or apostataes',
               ('john', 270): '@chap', ('john', 273): '@chap', ('john', 276): '@chap', ('john', 277): 'os blinde men',
               ('john', 281): 'thersore walked no more', ('john', 286): 'to whom i shal reach',
               ('john', 287): 'directed by the holy ghost', ('john', 289): '@annhead', ('john', 290): 'i am the trve vine',
               ('john', 292): '@chap', ('john', 296): '@chap', ('john', 300): 'tooke his garments',
               ('john', 302): '@chap', ('john', 304): 'os the qvantitie space', ('john', 306): '@chap',
               ('john', 308): 'is he acknowledge'}


# Signature marks. The NT is printed in gatherings of four leaves (eight pages); the first
# three rectos are signed X, X ij, X iij, and the fourth is unsigned. Gathering A starts at
# wiki page 29 (the NT title). The OCR misreads the numeral often (57 'D ij' for D iij), so
# the mark is computed, and the OCR only warns when it sees another letter. Checked on the
# scans for A-H (pages 31-89).
SIG_ALPHABET = 'ABCDEFGHIKLMNOPQRSTVXYZ'
SIG_FIRST = {'matthew': 29, 'mark': 29, 'luke': 29, 'john': 29}  # mark: checked M ij 119 … R ij 159 (8 signed pages)
# "HOLY" beside the page number, "weeke." under it, top outer corner (checked on the scans):
# (first wiki page, last wiki page, pages without it).
HOLY_WEEK = {'matthew': (86, 113, {95, 107}), 'mark': (144, 160, set()),
             'luke': (222, 237, {233, 234}), 'john': (282, 307, {289, 304, 305})}  # luke/john: read on the head corners of every page  # mark: on every page, checked


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
CATCHWORDS = {('john', 242): 'sion', ('john', 243): 'THE', ('john', 245): 'the', ('john', 247): 'CHAP. II.', ('john', 249): 'to',
              ('john', 251): 'led.', ('john', 252): 'CHAP.', ('john', 253): 'band.', ('john', 254): 'haue', ('john', 256): 'AFTER', ('john', 259): 'that', ('john', 260): 'to',
              ('john', 263): 'ANNOT.', ('john', 264): 'nedly', ('john', 265): "''62. If''", ('john', 266): 'Schisma-', ('john', 267): 'ueiled.', ('john', 269): 'AND', ('john', 270): '† Againe', ('john', 271): 'God',
              ('john', 272): 'CHAP.', ('john', 275): 'Amen,', ('john', 276): 'of', ('john', 277): "''1. Climeth''", ('john', 280): 'therfore',
              ('john', 284): 'per', ('john', 286): 'directed', ('john', 288): 'ANNOT.', ('john', 289): 'I AM', ('john', 291): 'These',
              ('john', 293): "''13. The''", ('john', 294): '† I', ('john', 295): 'CHAP.', ('john', 297): '† {{sc|Iesvs}}',
              ('john', 301): 'AND', ('john', 305): 'CHAP.', ('john', 307): '(if', ('john', 308): 'THE',
              ('matthew', 75): 'Chap.', ('matthew', 95): 'Cha. XXIIII.', ('matthew', 101): 'ANNOT-',
              ('matthew', 107): 'Chap. XXVII.', ('matthew', 113): 'THE',
              ('mark', 114): 'THE', ('mark', 115): 'sert.', ('mark', 119): 'ANNOT.', ('mark', 122): 'Chap. IIII.', ('mark', 127): 'vvith', ('mark', 129): 'rodias',
              ('mark', 130): 'he', ('mark', 140): 'Chap. X.', ('mark', 143): 'ANNOT', ('mark', 149): 'And', ('mark', 152): 'ring', ('mark', 155): 'ANNOT.', ('mark', 160): 'THE',
              ('luke', 161): 'THE', ('luke', 166): "''36. Elisabeth''", ('luke', 172): "''20. He''",
              ('luke', 178): "''24. The''", ('luke', 196): "''21. To''", ('luke', 200): "''27. Blessed''",
              ('luke', 204): "''11. Be''", ('luke', 241): 'THE',
              # printed catchwords longer than the first word of the next page, read on the scan
              ('matthew', 38): "''6. It is''", ('matthew', 44): "''13. Leade vs not:''", ('matthew', 91): "''11. A man''", ('matthew', 94): "''3. What''"}


# Words the print hyphenates across a page break: wiki page -> (first part, rest, whole word).
# Rendered {{hws|de|desert.}} at the page end and {{hwe|sert.|desert.}} at the next page's start.
SPLIT_WORDS = {('mark', 115): ('de', 'sert.', 'desert.'), ('mark', 127): ('forth', 'vvith', 'forthvvith'),
               ('mark', 129): ('He', 'rodias', 'Herodias'), ('mark', 152): ('hea', 'ring', 'hearing'),
               ('john', 251): ('fil', 'led.', 'filled.'), ('john', 253): ('hus', 'band.', 'husband.'),
               ('john', 264): ('vnlear', 'nedly', 'vnlearnedly'), ('john', 266): ('Schisma', 'tikes,', 'Schismatikes,'),
               ('john', 267): ('mar', 'ueiled,', 'marueiled,'), ('john', 284): ('sup', 'per,', 'supper,')}


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
                ('matthew', 24): [[15, 0]], ('mark', 4): [[3, 3]], ('mark', 5): [[35, 0]],
                ('mark', 8): [[22, 0]], ('mark', 9): [[38, 0]], ('mark', 11): [[15, 5]],
                ('mark', 12): [[13, 0], [35, 0], [41, 0]], ('mark', 13): [[32, 0]], ('mark', 15): [[33, 0]]}

# Paragraph starts the OCR reports where the scan has none: 13:45 (64), 19:5 and 19:8 (81),
# 22:16 (90, mid-line) are flush left; 26:2 (mid-line) and 26:3 (102) sit beside the drop cap.
NO_PARAS = {('matthew', 13): [[45, 0]], ('matthew', 19): [[5, 0], [8, 0]], ('matthew', 22): [[16, 0]],
            ('matthew', 26): [[2, 0], [3, 0]], ('mark', 4): [[3, 0]], ('mark', 6): [[50, 7]],
            ('mark', 7): [[26, 0], [27, 0]], ('mark', 9): [[3, 0]], ('mark', 13): [[33, 0]], ('mark', 15): [[36, 0]]}


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


def write_argument(book, wiki):
    """The Argument page before chapter 1 (mark 114), from the book's first intro. The print
    sets it in italic, with quotations in roman: the data's <i> spans are the roman ones.
    Its margin notes stand in the outer margin; a note starting with '*' prints a '*' in the text."""
    intro = book['intros'][0]
    notes = iter(n['text'] for n in intro.get('notes', []))  # in the order their markers appear in the text
    side = 'left' if wiki % 2 == 0 else 'right'

    def mark(m):
        t = next(notes)
        s = ('right' if side == 'left' else 'left') if t in INNER_ARGUMENT_NOTES else side
        return margin(s, finish(t)) + ('* ' if t.startswith('*') else '')

    paras = []
    # the four parts each start a printed line: paragraphs here (the linter allows no <br/>)
    for k, ptext in enumerate(re.split(r'\n\n|<br/?>', intro['text'])):
        ptext = re.sub(r'\s*<mn>([^<]*)</mn>\s*', lambda m: ' ⟦mn' + m.group(1) + '⟧', ptext.strip())
        out = ''
        for j, seg in enumerate(re.split(r'</?i>', ptext)):  # odd segments were <i>: roman in the print
            # margin marks at a run's edge stay outside the italic
            lead, core, trail = re.match(r'^((?:\s|⟦[^⟧]*⟧)*)(.*?)((?:\s|⟦[^⟧]*⟧)*)$', seg, re.S).groups()
            if core:
                core = core if j % 2 else f"''{core}''"
            out += lead + core + trail
        # a margin note inside an italic run: close the run around it
        parts = re.split(r'(⟦mn[^⟧]*⟧ ?)', out)
        for q in range(1, len(parts), 2):
            m = re.match(r'⟦mn([^⟧]*)⟧', parts[q])
            ital = len(re.findall(r"(?<!')''(?!')", ''.join(parts[:q]))) % 2
            parts[q] = ("''" if ital else '') + mark(m) + ("''" if ital else '')
        out = re.sub(r"(?<!')''''(?!')", '', ''.join(parts))
        out = re.sub(r"^''(\{\{dropinitial\|[^{}]*\}\})", r"\1''", finish(out, dropcap=(k == 0)))
        out = re.sub(r'\s+([),.;:])', r'\1', re.sub(r'\(\s+', '(', out))
        paras.append(re.sub(r'  +', ' ', out).strip())
    t1, t2 = re.match(r'(.* OF) (.*)', intro['title']).groups()
    body = f'{{{{c|{{{{x-larger|{t1}}}}}}}}}\n{{{{c|{{{{larger|{t2}}}}}}}}}\n\n' + '\n\n'.join(paras)
    sp = ARGUMENT_SPLIT.get(BOOK)
    pages = [body]
    if sp:  # the Argument runs over two scan pages, the second word broken across them
        first, cont, full, after = sp
        i = body.index(f'{full} {after}')
        pages = [body[:i] + '{{hws|' + first + '|' + full + '}}', '{{hwe|' + cont + '|' + full + '}}' + body[i + len(full):]]
        pages[1] = pages[1].replace('margin=left', 'margin=right')  # odd page: outer margin on the right
    for k, text in enumerate(pages):
        pg = wiki + k
        catch = CATCHWORDS.get((BOOK, pg), '')
        sig = signature(pg)
        footer = f'{{{{rh||{sig}|{catch}}}}}' if (sig or catch) else ''
        head = f'{{{{rh|{pg - 28}||}}}}' if k == 0 else f'{{{{rh|||{pg - 28}}}}}'  # k = 0 keeps the form of Mark's and Luke's published page
        text = re.sub(r'(?m)^(Whose excellencie [^\n]*)$', r'{{c|{{larger|\1}}}}', text)  # John: the print's centred heading
        (OUT / f'{pg}.wiki').write_text(unicodedata.normalize('NFC', '<noinclude><pagequality level="1" user="" />' + head +
                                        '</noinclude>' + sc_wiki(text) +
                                        '<noinclude>' + footer + '</noinclude>\n'))


def main():
    global FIRST
    book = json.loads((DATA / f'{BOOK}.json').read_text())
    if ARGUMENT.get(BOOK) == FIRST:
        OUT.mkdir(parents=True, exist_ok=True)
        write_argument(book, FIRST)
        FIRST += 2 if BOOK in ARGUMENT_SPLIT else 1
    ann = {}
    for f in sorted((DATA / BOOK / 'annotations').glob('*.json')):
        a = json.loads(f.read_text()); ann[a['chapter']] = a['annotations']
    S = build_stream(book, ann)
    pages = book_pages(BOOK, os.environ.get('WS_OCR') or OCR_SOURCE.get(BOOK, 'tesseract'))[:MAXP]
    OUT.mkdir(parents=True, exist_ok=True)
    starts, paras, quality = align(pages, S)
    apply_page_starts(S, starts)
    (OUT / 'tokens.json').write_text(json.dumps(
        [dict(ch=t.get('ch'), verse=t.get('verse'), w=t.get('w'), ann=t.get('ann'), kind=t['kind'], text=SENT.sub('', t['text']),
              tags=re.findall(r'⟦([^⟧]*)⟧', t['text']), ocr=t.get('ocr'), box=t.get('box'))
         for t in S if t['kind'] in ('verse', 'ann')], ensure_ascii=False))
    move_bars(S)
    export_paragraphs(S, paras)
    OUT.mkdir(parents=True, exist_ok=True)
    report = []
    verso_t, recto_t = RUNNING[BOOK]
    ital_carry = False
    for n, p in enumerate(pages):
        wiki = FIRST + n
        a, b = starts[n], (starts[n + 1] if n + 1 < len(starts) else len(S))
        printed = wiki - 28
        side_inner, side_outer = ('left', 'right') if wiki % 2 else ('right', 'left')
        chs = [t['ch'] for t in S[a:b] if t['kind'] == 'verse'] or [S[a]['ch'] if a < len(S) else 0]
        cha = f'CHA. {ROMAN[max(chs)]}.'
        hw = HOLY_WEEK.get(BOOK)
        num = printed
        if hw and hw[0] <= wiki <= hw[1] and wiki not in hw[2]:
            num = f'{printed} HOLY weeke.' if wiki % 2 else f'HOLY weeke. {printed}'
        header = (f'{{{{rh|{cha}|{recto_t}|{num}}}}}' if wiki % 2 else f'{{{{rh|{num}|{verso_t}|{cha}}}}}')
        if n == 0:
            fc = (cha if BOOK == 'mark' else cha.replace('CHA.', 'CHAP.')) if BOOK in FIRST_HEAD_CHA else ''
            header = f'{{{{rh|{fc}||{printed}}}}}' if wiki % 2 else f'{{{{rh|{printed}||{fc}}}}}'
        body = ''
        for i in range(a, b):
            t = S[i]
            sep = '' if i == a else (' ' if not (t.get('block') or (i in paras and t['kind'] == 'verse' and not t.get('nopara'))) else '\n\n')
            if t.get('block') and t['kind'] in ('title', 'annhead') and i > a and S[i - 1]['kind'] == t['kind']:
                sep = '\n'
            body += sep + t['text']
        body = SENT.sub('', body)
        sp = SPLIT_WORDS.get((BOOK, wiki))
        if sp:
            body += ' {{hws|' + sp[0] + '|' + sp[2] + '}}'
        sp = SPLIT_WORDS.get((BOOK, wiki - 1))
        if sp:
            m = re.match(r'^((?:\{\{(?:[^{}]|\{\{[^{}]*\}\})*\}\}|[*∷†‖] ?)*)' + re.escape(sp[2]), body)
            assert m, (wiki, body[:80])
            body = body[:m.end() - len(sp[2])] + '{{hwe|' + sp[1] + '|' + sp[2] + '}}' + body[m.end():]
        # italics are balanced per page (an unclosed '' breaks the page view): close at the page end, reopen on the next
        if ital_carry:
            body = "''" + body
        if len(re.findall(r"(?<!')''(?!')", body)) % 2:
            body += "''"
            ital_carry = True
        else:
            ital_carry = False
        body = body.replace('{{MINNER|', '{{MarginNote|margin=' + side_inner + '|margin-width=65|text=')
        body = body.replace('{{MOUTER|', '{{MarginNote|margin=' + side_outer + '|margin-width=65|text=')
        catch = re.sub(r'\{\{(?:[^{}]|\{\{[^{}]*\}\})*\}\}|[‖∷*†]', '', DROPI.sub(r'\1', SENT.sub('', S[b]['text']))).strip() if b < len(S) else CATCHWORDS.get((BOOK, wiki), '')
        if b < len(S) and S[b]['kind'] in ('annhead', 'chap', 'title'):
            # the next page opens with a heading: take the print's catchword ("Annot-", "Chap.") from the OCR
            tail = [l for l in p['text'].splitlines() if l.strip()]
            catch = CATCHWORDS.get((BOOK, wiki)) or (tail[-1].split()[-1] if tail else '')
        catch = CATCHWORDS.get((BOOK, wiki), catch)
        sig = signature(wiki)
        for line in p['text'].splitlines()[-6:]:
            m = re.match(r'^\s*(?:\d{1,3}\s+)?([A-Z]{1,2})\s+([ivjl]{1,5})\b', line)
            if m and (not sig or m.group(1) != sig.split()[0]):
                print(f'warning: page {wiki}: OCR signature {m.group(1)} {m.group(2)}, computed {sig or "none"}')
        if catch.count("''") % 2:
            catch += "''"  # the catchword is cut from the next page's start, which may open an italic
        if "''" in catch and not sig:
            footer = f'{{{{continues|{catch}}}}}'  # Wikisource's template for a footer catchword (as proofread on pp. 38, 44)
        else:
            footer = f'{{{{rh||{sig}|{catch}}}}}' if (catch or sig) else ''
        (OUT / f'{wiki}.wiki').write_text(unicodedata.normalize('NFC', '<noinclude><pagequality level="1" user="" />' + header +
                                          # the print's ‖ is a small raised mark; ″ read as quotes
                                          '</noinclude>' + sc_wiki(body).replace('‖', '{{sup|‖}}') + '<noinclude>' + sc_wiki(footer) + '</noinclude>\n'))
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
