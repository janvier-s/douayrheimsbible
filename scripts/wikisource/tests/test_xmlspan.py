import subprocess

import pytest

from rhemes import sources, xmlspan

SYN = '''<TEI><teiHeader>h</teiHeader>
<text xml:lang="eng">
<front>
<div type="title_page">T</div>
</front>
<body>
<div type="summary_of_New_Testament">S</div>
<div type="argument">A1</div>
<div n="Matthew" type="gospel"><div n="1" type="chapter">M</div></div>
<div type="argument">A2</div>
<div n="Mark" type="gospel"><div n="1" type="chapter">K</div></div>
<div type="gospel_harmony">H</div>
</body>
</text>
</TEI>
'''


def test_spans_partition():
    sp = xmlspan.spans(SYN)
    a = SYN.index('>', SYN.index('<text')) + 1
    b = SYN.index('</text>')
    assert sp[0][1] == a and sp[-1][2] == b
    assert ''.join(SYN[s:e] for _, s, e in sp) == SYN[a:b]
    assert [k for k, _, _ in sp] == ['front', 'matthew', 'mark', 'back']
    s, e = xmlspan.span(SYN, 'front')
    assert '>S<' in SYN[s:e]
    s, e = xmlspan.span(SYN, 'mark')
    assert '>H<' in SYN[s:e] and '>A2<' in SYN[s:e]
    s, e = xmlspan.span(SYN, 'back')
    assert SYN[s:e].strip() == ''


def test_book_key():
    assert xmlspan.book_key('book', 'Acts of the Apostles') == 'acts'
    assert xmlspan.book_key('epistle', '1 Corinthians') == '1-corinthians'


def _xml_repo():
    p = sources.xml_path()
    ok = p.exists() and subprocess.run(['git', '-C', str(p.parent), 'cat-file', '-e', 'ee79a5e'],
                                       capture_output=True).returncode == 0
    return p if ok else None


@pytest.mark.skipif(_xml_repo() is None, reason='needs the XML repo with history')
def test_spans_real_xml():
    p = _xml_repo()
    cur = p.read_bytes().decode('utf-8')
    old = subprocess.run(['git', '-C', str(p.parent), 'show', 'ee79a5e:A16049.xml'],
                         capture_output=True, check=True).stdout.decode('utf-8')
    for x in (cur, old):
        keys = [k for k, _, _ in xmlspan.spans(x)]
        assert len(keys) == len(set(keys))
        for b in ('front', 'matthew', 'mark', 'luke', 'john', 'acts', 'romans', 'back'):
            assert b in keys
    s, e = xmlspan.span(cur, 'back')
    assert '<back' in cur[s:e]
