"""Folding, tokenising and wiki-text helpers shared by the tools (spec §4.3).

The folding functions differ on purpose: each comparison needs its own key, so they stay separate.
"""
import re
import unicodedata

# sentinels the generator puts in its token stream
SENT = re.compile(r'⟦[^⟧]*⟧')
# {{dropinitial|T|image=...|imgsize=...|fl={{verse|...}}}}: fl puts the verse number inside
# the floated cap; image is the print's woodcut (on Commons), T its alt text
DROPI = re.compile(r'\{\{dropinitial\|([^{}|]*)(?:\|(?:image|imgsize)=[^{}|]*)*(?:\|fl=\{\{[^{}]*\}\})?\}\}')

_FILE = re.compile(r'\[\[(?:File|Image):[^\]]*\]\]', re.I)
_ATTR = re.compile(r'\b[\w-]+="[^"]*"')
_TAG = re.compile(r'<[^>]*>')
_KEY = re.compile(r'\|\s*[A-Za-z][\w-]*\s*=')
_BARE_TEMPLATE = re.compile(r'\{\{[^|{}]*\}\}')
_TEMPLATE_NAME = re.compile(r'\{\{[^|{}]*\|')


def nfc(s):
    return unicodedata.normalize('NFC', s)


def ls_to_wiki(s):
    """Literal ſ (data, XML) to the page's {{ls}}."""
    return s.replace('ſ', '{{ls}}')


def wiki_to_ls(s):
    """The page's {{ls}} back to a literal ſ."""
    return s.replace('{{ls}}', 'ſ')


def fold_word(w):
    """Comparison key: no marks or punctuation, lower case, ſ→s, vv→w, v→u, j→i."""
    w = ''.join(ch for ch in unicodedata.normalize('NFD', w) if not unicodedata.combining(ch))
    w = w.lower().replace('ſ', 's').replace('vv', 'w').replace('v', 'u').replace('j', 'i')
    return re.sub(r'[^a-zæœ]', '', w)


def core(w):
    """The word without surrounding punctuation."""
    return re.sub(r'^[^\wſ]+|[^\wſ]+$', '', w or '')


def fold_chars(s):
    return s.replace('ſ', 's').replace('æ', 'ae').replace('œ', 'oe').replace('vv', 'w')


def fold_key(w):
    return re.sub(r'[^a-z0-9]', '', fold_chars(w))


def wiki_word_key(w):
    w = SENT.sub('', w)
    w = DROPI.sub(r'\1', w)  # the drop cap is still a letter of the word
    w = re.sub(r'\{\{sc\|([^{}]*)\}\}', r'\1', w)  # so are small caps
    w = re.sub(r'\{\{[^{}]*\}\}', '', w)
    w = w.lower().replace('ſ', 's').replace('f', 's').replace('vv', 'w').replace('u', 'v').replace('j', 'i')
    w = w.translate(str.maketrans('āēīōūñ', 'aeiovn'))
    return re.sub(r'[^a-zæœ]', '', w)


def wiki_to_plain(text: str) -> str:
    """The print text of wikitext: template names, parameter keys, tags, attributes and files removed."""
    t = wiki_to_ls(nfc(text)).replace('|align=float}}', '}}')
    t = _FILE.sub(' ', t)
    t = _ATTR.sub(' ', t)
    t = _TAG.sub(' ', t)
    t = _KEY.sub('|', t)
    while _BARE_TEMPLATE.search(t):
        t = _BARE_TEMPLATE.sub(' ', t)
    t = _TEMPLATE_NAME.sub(' ', t)
    return t.replace('}}', ' ').replace('|', ' ')


def pagequality_bare(t):
    return re.sub(r'<pagequality level="\d" user="[^"]*"\s*/>', '<pagequality />', t).rstrip('\n')


def pagequality_blank_user(t):
    """Live text with MediaWiki's per-save user="…" and trailing newline normalised away."""
    return re.sub(r'(<pagequality level="\d" )user="[^"]*"', r'\1user=""', t).rstrip('\n')
