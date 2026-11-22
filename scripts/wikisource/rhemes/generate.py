"""Wikisource page generator v2: page breaks and paragraphs from the OCR.

python3 -I scripts/wikisource/rh.py generate <repo> <book> <first-wiki-page> <outdir> [max-pages]

Builds one token stream for the book from odr-original (headings, verses,
annotations), aligns the sancta-scan OCR of each page to it, cuts the stream
at the page starts and opens a paragraph wherever the print indents a line.
Also writes report.txt: alignment quality per page and macron candidates.
"""
import unicodedata
import json, os, re, sys, difflib
from pathlib import Path

from .sources import book_pages
from . import config, paths, sources, text
from .overrides import (ARGUMENT_TITLES, ARGUMENT_BREAKS, ARGUMENT_SPLIT, INNER_ARGUMENT_NOTES, SUMMARY_STARS,
                        SIDE_SC, PAREN_TITLES, OUTER_NOTES, INNER_NOTES, CREND_AT, BARS, PAGE_STARTS, CATCHWORDS, SPLIT_WORDS,
                        MANUAL_PARAS, NO_PARAS)

# Set by main(argv); the defaults let the module be imported (tests) without side effects.
REPO = paths.REPO
BOOK, FIRST, OUT, MAXP = '', 0, None, 10 ** 6
CFG = config.from_dict('', {'first': 0, 'last': 0})  # the book's books.json entry, set by main
DATA = REPO / 'static/data/odr-original'


load_books = sources.load_books
ITALIC_REF = re.compile(r'^\s*(<i>)?\s*[0-9]?\.?\s*[A-Z][a-zæ]*\.\s*[0-9]')
ROMAN = ['', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIIII', 'XV',
         'XVI', 'XVII', 'XVIII', 'XIX', 'XX', 'XXI', 'XXII', 'XXIII', 'XXIIII', 'XXV', 'XXVI', 'XXVII', 'XXVIII']


SENT = text.SENT
DROPI = text.DROPI
# Woodcut initials, headpieces and tailpieces on Commons, from ornaments.py commons:
# initial 'book/ch' -> file, letter, imgsize; headpiece/tailpiece book -> file, width.
# Off unless books.json sets "ornaments": true for the book or --ornaments is given (owner: off for now).
ORN_JSON = 'wikisource/1582-rhemes-nt/ornaments.json'
ORNAMENTS = {}


norm = text.wiki_word_key


def margin(side, text):
    return f'{{{{MarginNote|margin={side}|margin-width=65|text={text}}}}}'


# The sidenotes format (the default; books.json "sidenotes": false or [first, last] narrows it), after the validated 1610 Douai
# Old Testament pages (Page:1610_Douai_Old_Testament.pdf/336, /337): {{sidenotes begin}} …
# {{sidenotes end}} around the page, {{verse|chapter=ch|verse=v|align=float}}† at each verse with the
# print's dagger (the number floats in the left margin, as {{verseline}} sets it on the 1610 pages, but
# without {{verseline}}'s white background, which shows in dark mode; a chapter's first verse stays in
# its drop initial's fl=), and each note in {{outside L|…}} (left margin) or {{outside R|…}} (right,
# on the Page: and in the main namespace; the owner chose this over {{outside RL}}) right after its
# anchor in the text ("the * {{outside L|''Luc. 3, 31.''}} generation"). A note the print sets
# without an anchor (lectionary notes, headings, glosses like "Virginitie preferred") has none.
_NOTE_SENT = r'\{\{M(?:INNER|OUTER)\|(?:[^{}]|\{\{(?:[^{}]|\{\{[^{}]*\}\})*\}\})*\}\}'
RIGHT_NOTE = 'outside R'  # right on the Page: and in the main namespace (Template:Outside R)


def _positional(tpl_open, body, i):
    """Add 1= to the {{outside …|…}} opening at i when its text has a top-level '=' (it would
    otherwise be read as a named parameter)."""
    depth, j = 1, i + len(tpl_open)
    while j < len(body) and depth:
        if body.startswith('{{', j):
            depth, j = depth + 1, j + 2
        elif body.startswith('}}', j):
            depth, j = depth - 1, j + 2
        else:
            if depth == 1 and body[j] == '=':
                return True
            j += 1
    return False


def sidenotes_body(body, side_inner, side_outer):
    """The page body in the sidenotes format (see above); the MINNER/MOUTER sentinels resolved."""
    # the anchor (* or ∷) goes before its note, as the 1610 pages set it
    body = re.sub(rf'((?:{_NOTE_SENT} ?)+)([*∷]) ?',
                  lambda m: m.group(2) + ' ' + m.group(1).rstrip() + ' ', body)
    # the print's verse-start †; a chapter's first verse sits in its drop initial's fl= and has none
    body = re.sub(r'\{\{verse\|(chapter=\d+\|verse=\d+)\}\}(?!\}) ?', r'{{verse|\1|align=float}}† ', body)
    tpl = {'left': '{{outside L|', 'right': '{{' + RIGHT_NOTE + '|'}
    body = body.replace('{{MINNER|', tpl[side_inner]).replace('{{MOUTER|', tpl[side_outer])
    for t in ('{{outside L|', '{{' + RIGHT_NOTE + '|'):
        for i in reversed([m.start() for m in re.finditer(re.escape(t), body)]):
            if _positional(t, body, i):
                body = body[:i + len(t)] + '1=' + body[i + len(t):]
    body = _drop_opening(body)
    # a line opening with * or # would become a list
    return re.sub(r'(?m)^([*#])', r'<nowiki/>\1', body)


_DROP = re.compile(r'\{\{dropinitial\|([^{}|]+)\|fl=\{\{verse\|(chapter=\d+\|verse=\d+)\}\}\}\}')
_LEFT_NOTE = re.compile(r"\{\{outside L\|(?:[^{}]|\{\{(?:[^{}]|\{\{[^{}]*\}\})*\}\})*\}\} ?")
DROP_SPAN = 160  # print characters beside a drop initial (about its two lines in the reader's column)


def _drop_opening(body):
    """A chapter's opening: the verse number comes out of the drop initial's fl= into the margin
    ({{verse|…|align=float}} before the initial), and a left note anchored in the lines beside the
    initial is set before it, since a float after the initial is pushed right by its width."""
    def rep(m):
        rest = body[m.end():]
        end = rest.find('\n')
        para = rest if end < 0 else rest[:end]
        notes = []
        for n in _LEFT_NOTE.finditer(para):
            if len(' '.join(text.wiki_to_plain(para[:n.start()]).split())) > DROP_SPAN:
                break
            notes.append(n)
        kept = ''.join(n.group(0).rstrip() for n in notes)
        for n in reversed(notes):
            para = para[:n.start()] + para[n.end():]
        return (f'{{{{verse|{m.group(2)}|align=float}}}}{kept}{{{{dropinitial|{m.group(1)}}}}}', para, len(rest[:end]) if end >= 0 else len(rest))
    out, i = [], 0
    for m in _DROP.finditer(body):
        if m.start() < i:
            continue
        head, para, consumed = rep(m)
        out.append(body[i:m.start()] + head + para)
        i = m.end() + consumed
    return ''.join(out) + body[i:]


def sidenotes_page(wiki):
    s = CFG.sidenotes
    if isinstance(s, tuple):
        return s[0] <= wiki <= s[1]
    return bool(s)


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


RH = re.compile(r'\{\{rh\|((?:[^{}]|\{\{[^{}]*\}\})*)\}\}')
_CAPS = re.compile(r"[A-Z]{2,}[.,:;]?")
_ROMAN = re.compile(r"[IVXLC]+[.,:;]?")


def _rh_side(cell):
    """Runs of capital words become capitalized small caps; Roman numerals inside a run stay capitals."""
    toks, out, run = cell.split(' '), [], []
    for tok in toks + [None]:
        if tok is not None and (_CAPS.fullmatch(tok) and not (run and _ROMAN.fullmatch(tok)) or run and _ROMAN.fullmatch(tok)):
            run.append(tok if run and _ROMAN.fullmatch(tok) else tok[0] + tok[1:].lower())
            continue
        if run:
            out.append('{{sc|' + ' '.join(run) + '}}')
            run = []
        if tok is not None:
            out.append(tok)
    return ' '.join(out)


def rh_small_caps(text):
    """Running heads in small caps (owner 2026-11-21): the title in the middle all lowercase,
    the side words (CHA., HOLY) capitalized, Roman numerals kept as capitals."""
    def one(m):
        parts = re.split(r'\|(?![^{]*\}\})', m.group(1))
        if len(parts) != 3:
            return m.group(0)
        a, b, c = parts
        if re.search(r'[A-Z]{2}', b) and '{{' not in b:
            b = '{{sc|' + b.lower() + '}}'
        side = lambda x: x if '{{' in x else _rh_side(x)
        return '{{rh|' + side(a) + '|' + b + '|' + side(c) + '}}'
    return RH.sub(one, text)


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


to_ls = text.ls_to_wiki


# A run of all-caps words (2+ letters each) in running text or a margin note: the print's
# small capitals. Not a template name ({{MINNER|), a roman numeral or a heading word.
CAPS_RUN = re.compile(r"(?<![\w{])(?<!\{\{)([A-ZÆŒ]{2,}(?:[ ][A-ZÆŒ]{2,})*)(?![\wſ|])")
CAPS_SKIP = re.compile(r'^(?:[IVXLC]+|CHAP|CHA|ANNOT|ANNOTATIONS|SS)$')  # SS. (Saints): an abbreviation in capitals
GREEK = re.compile(r'[\u0370-\u03ff\u1f00-\u1fff](?:[^A-Za-z{}|\n\']*[\u0370-\u03ff\u1f00-\u1fff])?')


def caps_to_sc(s):
    """Wraps all-caps words in <sc>…</sc> for sc_marks (IESVS -> {{sc|Iesvs}}); <sc> spans and
    template names are left alone. No long-s is added inside: capitals have none (owner 2026-11-21)."""
    def run(m):
        words = m.group(1).split(' ')
        out, cur = [], []
        for w in words + [None]:
            if w is None or CAPS_SKIP.match(w):
                if cur:
                    out.append('<sc>' + ' '.join(cur) + '</sc>')
                    cur = []
                if w is not None:
                    out.append(w)
            else:
                cur.append(w)
        return ' '.join(out)
    parts = re.split(r'(<sc>.*?</sc>)', s)
    return ''.join(p if p.startswith('<sc>') else CAPS_RUN.sub(run, p) for p in parts)


def greek_lang(s):
    """Greek runs (first to last Greek letter) in {{lang|grc|…}}; italics and punctuation stay put."""
    return GREEK.sub(lambda m: '{{lang|grc|' + m.group(0) + '}}', s)


def tidy_space(s):
    """No space before ) , . ; : and none after ( (lint W-space); line breaks are kept."""
    return re.sub(r'  +', ' ', re.sub(r'\( +', '(', re.sub(r' +([),.;:])', r'\1', s)))


def finish(s, dropcap=False, ch=None, caps=True):
    s = s.replace('⊢', '⊣')
    s = sc_marks(caps_to_sc(s) if caps else s, dropcap)
    if dropcap:
        s = drop_initial(s, ch)
        # the rest of the drop-cap word, set in capitals: small caps ({{dropinitial|A}}ND -> {{sc|Nd}})
        s = re.sub(r'(\{\{dropinitial\|(?:[^{}]|\{\{[^{}]*\}\})*\}\})([A-Z]+)(?![a-zſ])',
                   lambda m: m.group(1) + '{{sc|' + m.group(2)[0] + m.group(2)[1:].lower() + '}}', s)  # its own span
    s = greek_lang(s)
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
                ch_note = (chap.get('summary_notes') or [{}])[0].get('text', '')
                title_wiki = '{{MOUTER|' + finish(ch_note) + '}}\n{{c|{{xx-larger|THE ACTES OF THE}}}}\n{{c|{{x-larger|APOSTLES.}}}}'
            elif BOOK == 'romans':
                ch_note = (chap.get('summary_notes') or [{}])[0].get('text', '')
                note_str = ('{{MOUTER|' + finish(ch_note) + '}}\n') if ch_note else ''
                title_wiki = note_str + '{{c|{{xx-larger|THE EPISTLE OF}}}}\n{{c|{{x-larger|PAVL THE APOSTLE}}}}\n{{c|{{larger|TO THE ROMANES.}}}}'
            else:
                title_wiki = '{{c|{{xx-larger|THE HOLY GOSPEL}}}}\n{{c|{{x-larger|OF IESVS CHRIST ACCOR-}}}}\n{{c|{{larger|' + CFG.title_end + '}}}}'
            tt = tokens_of(title_wiki, block=True, ch=ch, kind='title')
            if hp:  # the woodcut band above the book title, riding on the title's first word
                tt[0]['text'] = f"{{{{c|[[File:{hp['file']}|{hp['width']}]]}}}}\n" + tt[0]['text']
            S += tt
        if (BOOK == 'acts' or BOOK == 'romans') and ch == 1:
            side = (chap.get('summary_notes') or [{}, {}])[1].get('text', '') if BOOK == 'acts' else ''
        else:
            side = (chap.get('summary_notes') or [{}])[0].get('text', '')
        head = ''
        if side and not ITALIC_REF.match(side):
            # "THE THIRD part": both words in small caps; "THE fourth part": the lower-case word stays roman
            m = re.match(r'(\S+(?: [A-Z]{2,}\b)?)(.*)', finish(side, caps=False))  # the side head sets its own small caps (SIDE_SC)
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
    if BOOK == 'acts':
        trailer = (
            "\n\n{{c|{{smaller|The end of the Actes of the Apoſtles.}}}}\n"
            "{{c|{{smaller|Vvherevnto we ioyne for the readers behalfe, tvvo Tables of the tvvo cheefe Apoſtles, and a note of the reſt, as an abridgement of the ſaid booke, and a ſupply of ſome things not there mentioned.}}}}"
        )
        S[-1]['text'] += trailer
    tp = ORNAMENTS.get('tailpiece', {}).get(BOOK)
    if tp:  # the fleuron closing the book, after its last annotation
        S[-1]['text'] += f"\n\n{{{{c|[[File:{tp['file']}|{tp['width']}]]}}}}"
    return S


def render_verse(v, ch):
    raw = v['text']
    for start in sorted({l[0] for l in v.get('lemmas', [])}, reverse=True):
        if 0 < start < len(raw) and raw[start - 1].isalpha() and raw[start].isalpha() and not os.environ.get('WS_OLD_LEMMAS'):
            raise ValueError(f'ch {ch} v {v.get("verse")}: lemma at {start} starts inside a word: {raw[max(0, start - 10):start + 10]!r}')
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
        side = 'MINNER' if (BOOK, ch, v['verse'], m.group(1)) in INNER_NOTES else 'MOUTER'
        return tag + '{{' + side + '|∷ ' + n['text'] + '}}∷ '

    # Citations at the very end of the verse are printed in the margin with no * in the text
    # (Matt 15:4 has two).
    def crend(m):
        return ' ' + ''.join(cr(c).replace('* ', '').replace('⟦cr:', '⟦crend:')
                             for c in re.finditer(r'<cr>\[(\d+)\]</cr>', m.group(0)))
    raw = re.sub(r'(?:\s*<cr>\[\d+\]</cr>)+\s*$', crend, raw)
    raw = re.sub(r'<cr>\[(\d+)\]</cr>\s*', cr, raw)
    raw = re.sub(r'<na>\[(\d+)\]</na>\s*', na, raw)
    lead = f'{{{{verse|chapter={ch}|verse={v["verse"]}}}}} '
    return lead + raw






def render_annotation(a, ch=None, ai=None):
    text = a['text'].strip()
    # a note with "place": "before" is a margin heading beside the annotation's title (Matt 16:18 "PETER.")
    before = ''.join('{{MOUTER|' + n['text'] + '}}' for n in a.get('notes', []) if n.get('place') == 'before')
    mns = [(k, n) for k, n in enumerate(a.get('notes', [])) if n.get('place') != 'before']

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
    return f"{before}''{a['verse']}. {a['title']}''{close} {text}"


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










def footer(catch):
    """The page foot: the catchword in {{continues}} (Template:Continues); printer's signature
    marks are left out (owner's editorial decision, Help:Formatting conventions)."""
    if not catch:
        return ''
    if len(re.findall(r"(?<!')''(?!')", catch)) % 2:
        catch += "''"  # the catchword is cut from the next page's start, which may open an italic
    return '{{continues|' + catch + '}}'


def opens_para(S, i, paras):
    """Token i starts a new paragraph (a block, or a verse the print indents)."""
    t = S[i]
    return bool(t.get('block') or (i in paras and t['kind'] == 'verse' and not t.get('nopara'))
                or re.sub(r'^(?:⟦[^⟧]*⟧|\{\{M(?:INNER|OUTER)\|(?:[^{}]|\{\{[^{}]*\}\})*\}\}|\s)*', '', t['text'])
                .startswith('{{dropinitial'))  # a chapter's first verse, after any margin notes


def end_body(body, next_opens):
    """A paragraph that ends at the page foot gets {{nop}} on its own line (Help:Page breaks)."""
    return body + '\n{{nop}}' if next_opens else body






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
    roman = CFG.argument_roman
    body = ''
    for ii in CFG.argument_intros:
        body += ('\n\n' if body else '') + argument_body(book['intros'][ii], ii, roman)
    write_argument_pages(body, wiki)


def argument_body(intro, ii, roman):
    notes = iter(n['text'] for n in intro.get('notes', []))  # in the order their markers appear in the text

    def mark(m):
        t = next(notes)
        s = '\x02' if t in INNER_ARGUMENT_NOTES else '\x01'  # outer / inner: the page's parity decides
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
                core = core if (j % 2) != roman else f"''{core}''"
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
    lines = ARGUMENT_TITLES.get((BOOK, ii))
    if not lines:
        t1, t2 = re.match(r'(.* OF) (.*)', intro['title']).groups()
        lines = [('x-larger', t1), ('larger', t2)]
    head = '\n'.join(f'{{{{c|{{{{{size}|{line}}}}}}}}}' for size, line in lines)
    body = re.sub(r'<sup>([^<]*)</sup>', r'{{sup|\1}}', head + '\n\n' + '\n\n'.join(paras))
    # the word after a drop initial is set in capitals in the print (FTER, HE), not small capitals
    return re.sub(r'(\{\{dropinitial\|[^{}]*\}\})\{\{sc\|([^{}]*)\}\}', lambda m: m.group(1) + m.group(2).upper(), body)


def write_argument_pages(body, wiki):
    sp = ARGUMENT_SPLIT.get(BOOK)
    pages = [body]
    if sp:  # the Argument runs over two scan pages, the second word broken across them
        cut, after = sp
        m = re.search(r'(\S+) ' + re.escape(after), body)
        full, i = m.group(1), m.start()
        first, cont = full[:cut], full[cut:]
        clean_title = full.replace('ſ', 's')
        pages = [body[:i] + '{{hws|' + to_ls(first) + '|' + to_ls(full) + '|title=' + clean_title + '}}',
                 '{{hwe|' + to_ls(cont) + '|' + to_ls(full) + '|title=' + clean_title + '}}' + body[i + len(full):]]
    for snippet in ARGUMENT_BREAKS.get(BOOK, []):
        i = pages[-1].index(snippet)
        pages[-1:] = [pages[-1][:i].rstrip(' '), pages[-1][i:]]
    for k, text in enumerate(pages):
        pg = wiki + k
        outer = 'left' if pg % 2 == 0 else 'right'
        inner = 'right' if outer == 'left' else 'left'
        side = sidenotes_page(pg)
        if side:  # \x01 outer, \x02 inner: the sentinels sidenotes_body() resolves
            text = sidenotes_body(text.replace(margin('\x01', '')[:-2], '{{MOUTER|').replace(margin('\x02', '')[:-2], '{{MINNER|'), inner, outer)
        text = text.replace('\x01', outer).replace('\x02', inner)
        nxt = pages[k + 1].split()[0] if BOOK in ARGUMENT_BREAKS and k + 1 < len(pages) else ''
        foot = footer(CATCHWORDS.get((BOOK, pg), nxt))
        if side:
            head_open, foot = '{{sidenotes begin}}', (foot + '\n' if foot else '') + '{{sidenotes end}}'
        else:
            head_open = ''
        if k == len(pages) - 1 and BOOK in ARGUMENT_BREAKS:
            text += '\n{{nop}}'  # the next page opens a book
        left = pg % 2 == 0 or (k == 0 and BOOK in ('mark', 'luke'))  # Mark's and Luke's published first page
        head = f'{{{{rh|{pg - 28}||}}}}' if left else f'{{{{rh|||{pg - 28}}}}}'
        text = re.sub(r'(?m)^(Who[sſ]e excellencie [^\n]*)$', r'{{c|{{larger|\1}}}}', text)  # John: the print's centred heading
        (OUT / f'{pg}.wiki').write_text(unicodedata.normalize('NFC', '<noinclude><pagequality level="1" user="" />' + head_open + to_ls(rh_small_caps(head)) +
                                        '</noinclude>' + to_ls(sc_wiki(text)) +
                                        '<noinclude>' + to_ls(foot) + '</noinclude>\n'))


def main(argv):
    global REPO, BOOK, FIRST, OUT, MAXP, DATA, ORNAMENTS, CFG
    orn_flag = '--ornaments' in argv
    argv = [a for a in argv if a != '--ornaments']
    REPO, BOOK, FIRST, OUT = Path(argv[0]), argv[1], int(argv[2]), Path(argv[3])
    DATA = REPO / 'static/data/odr-original'
    cfg = load_books(REPO).get(BOOK, {})
    CFG = config.from_dict(BOOK, cfg or {'first': FIRST, 'last': 0})  # a book not in books.json: defaults
    MAXP = int(argv[4]) if len(argv) > 4 else None  # None: stop at books.json "last"
    orn = REPO / ORN_JSON
    ORNAMENTS = json.loads(orn.read_text()) if orn.exists() and (orn_flag or cfg.get('ornaments')) else {}
    book = json.loads((DATA / f'{BOOK}.json').read_text())
    if CFG.argument_page == FIRST:
        OUT.mkdir(parents=True, exist_ok=True)
        write_argument(book, FIRST)
        FIRST += config.argument_pages(BOOK, REPO)
    if CFG.running is None:  # the Argument needs none; the scripture pages do
        sys.exit(f"books.json {BOOK}: no 'running' ([verso, recto] running heads); add it before generating the scripture pages (PLAYBOOK 'Start a new book')")
    if MAXP is None:
        MAXP = cfg['last'] - FIRST + 1 if 'last' in cfg else 10 ** 6
    ann = {}
    for f in sorted((DATA / BOOK / 'annotations').glob('*.json')):
        a = json.loads(f.read_text()); ann[a['chapter']] = a['annotations']
    S = build_stream(book, ann)
    max_p = min(MAXP, CFG.scripture_pages or 10 ** 6)
    pages = book_pages(BOOK, os.environ.get('WS_OCR') or CFG.ocr)[:max_p]
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
    verso_t, recto_t = CFG.running
    ital_carry = False
    for n, p in enumerate(pages):
        wiki = FIRST + n
        a, b = starts[n], (starts[n + 1] if n + 1 < len(starts) else len(S))
        printed = wiki - 28
        side_inner, side_outer = ('left', 'right') if wiki % 2 else ('right', 'left')
        chs = [t['ch'] for t in S[a:b] if t['kind'] == 'verse'] or [S[a]['ch'] if a < len(S) else 0]
        cha = f'CHA. {ROMAN[max(chs)]}.'
        hw = CFG.holy_week
        num = printed
        if hw and hw[0] <= wiki <= hw[1] and wiki not in hw[2]:
            num = f'{printed} HOLY weeke.' if wiki % 2 else f'HOLY weeke. {printed}'
        header = (f'{{{{rh|{cha}|{recto_t}|{num}}}}}' if wiki % 2 else f'{{{{rh|{num}|{verso_t}|{cha}}}}}')
        if n == 0:
            fc = (cha if BOOK == 'mark' else cha.replace('CHA.', 'CHAP.')) if CFG.first_head_cha else ''
            header = f'{{{{rh|{fc}||{printed}}}}}' if wiki % 2 else f'{{{{rh|{printed}||{fc}}}}}'
        body = ''
        for i in range(a, b):
            t = S[i]
            sep = '' if i == a else ('\n\n' if opens_para(S, i, paras) else ' ')
            if t.get('block') and t['kind'] in ('title', 'annhead') and i > a and S[i - 1]['kind'] == t['kind']:
                sep = '\n'
            body += sep + t['text']
        body = tidy_space(SENT.sub('', body))
        sp = SPLIT_WORDS.get((BOOK, wiki))
        if sp:
            clean_title = sp[2].replace('ſ', 's')
            body += ' {{hws|' + to_ls(sp[0]) + '|' + to_ls(sp[2]) + '|title=' + clean_title + '}}'
        sp = SPLIT_WORDS.get((BOOK, wiki - 1))
        if sp:
            m = re.match(r'^((?:\{\{(?:[^{}]|\{\{[^{}]*\}\})*\}\}|[*∷†‖] ?)*)' + re.escape(sp[2]), body)
            assert m, (wiki, body[:80])
            clean_title = sp[2].replace('ſ', 's')
            body = body[:m.end() - len(sp[2])] + '{{hwe|' + to_ls(sp[1]) + '|' + to_ls(sp[2]) + '|title=' + clean_title + '}}' + body[m.end():]
        # italics are balanced per page (an unclosed '' breaks the page view): close at the page end, reopen on the next
        if ital_carry:
            body = "''" + body
        if len(re.findall(r"(?<!')''(?!')", body)) % 2:
            body += "''"
            ital_carry = True
        else:
            ital_carry = False
        body = end_body(body, b < len(S) and opens_para(S, b, paras))
        sidenotes = sidenotes_page(wiki)
        if sidenotes:
            body = sidenotes_body(body, side_inner, side_outer)
        body = body.replace('{{MINNER|', '{{MarginNote|margin=' + side_inner + '|margin-width=65|text=')
        body = body.replace('{{MOUTER|', '{{MarginNote|margin=' + side_outer + '|margin-width=65|text=')
        catch = re.sub(r'\{\{(?:[^{}]|\{\{[^{}]*\}\})*\}\}|[‖∷*†]', '', DROPI.sub(r'\1', SENT.sub('', S[b]['text']))).strip() if b < len(S) else CATCHWORDS.get((BOOK, wiki), '')
        if b < len(S) and S[b]['kind'] in ('annhead', 'chap', 'title'):
            # the next page opens with a heading: take the print's catchword ("Annot-", "Chap.") from the OCR
            tail = [l for l in p['text'].splitlines() if l.strip()]
            catch = CATCHWORDS.get((BOOK, wiki)) or (tail[-1].split()[-1] if tail else '')
        catch = CATCHWORDS.get((BOOK, wiki), catch)
        foot = footer(catch)
        if sidenotes:
            header = '{{sidenotes begin}}' + header
            foot = (foot + '\n' if foot else '') + '{{sidenotes end}}'
        (OUT / f'{wiki}.wiki').write_text(unicodedata.normalize('NFC', '<noinclude><pagequality level="1" user="" />' + to_ls(rh_small_caps(header)) +
                                          # the print's ‖ is a small raised mark; ″ read as quotes
                                          '</noinclude>' + to_ls(sc_wiki(body).replace('‖', '{{sup|‖}}')) + '<noinclude>' + to_ls(sc_wiki(foot)) + '</noinclude>\n'))
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

