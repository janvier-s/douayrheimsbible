from rhemes import fixderive, fixes

HEAD = '<TEI><teiHeader>{h}</teiHeader>\n<text xml:lang="eng">\n<front><div type="title_page">T</div></front>\n<body>\n'
TAIL = '</body>\n</text>\n</TEI>\n'
BEFORE = HEAD.format(h='old') + '''<div type="argument">The argument.</div>
<div n="Matthew" type="gospel">
<div n="1" type="chapter"><p><label type="milestone"><seg type="milestoneunit">verse </seg>1</label> the booke of <gap reason="illegible"><desc>•</desc></gap>he generation
<label type="milestone"><seg type="milestoneunit">verse </seg>2</label> THE the the the the the the end and a duplicate stub here</p></div>
</div>
<div type="argument">A2</div>
<div n="Mark" type="gospel"><div n="1" type="chapter"><p>Iohn vvas in the deſert <label type="milestone"><seg type="milestoneunit">verse </seg>4</label> preaching</p></div></div>
''' + TAIL
AFTER = HEAD.format(h='new') + '''<div type="argument">The argument.</div>
<div n="Matthew" type="gospel">
<div n="1" type="chapter"><p><label type="milestone"><seg type="milestoneunit">verse </seg>1</label> the booke of the generation
<label type="milestone"><seg type="milestoneunit">verse </seg>2</label> <hi rend="smallcaps">The</hi> the the the the the the end and here</p></div>
</div>
<div type="argument">A2</div>
<div n="Mark" type="gospel"><div n="1" type="chapter"><p>Iohn vvas in the deſert <label type="milestone"><seg type="milestoneunit">verse </seg>4</label> preaching penance</p></div></div>
''' + TAIL


def _apply(tmp_path, text, by_book):
    p = tmp_path / 'x.xml'
    p.write_bytes(text.encode())
    entries = [e for b in by_book for e in by_book[b]]
    rep = fixes.apply(entries, fixes.Ctx(tmp_path, p, lock=tmp_path / 'lock'), write=True)
    return p.read_bytes().decode(), rep


def _text(x):
    return x[x.index('<text'):]


def test_derive_round_trip_synthetic(tmp_path):
    out = fixderive.derive_xml(BEFORE, AFTER)
    assert set(out) == {'matthew', 'mark'}
    for b, es in out.items():
        seen = set()
        for e in es:
            assert fixes.validate(e, seen, b) == [], e
            seen.add(e.id)
    got, rep = _apply(tmp_path, BEFORE, out)
    assert rep.counts()['conflict'] == 0
    assert _text(got) == _text(AFTER)
    rep = fixes.apply([e for b in out for e in out[b]], fixes.Ctx(tmp_path, tmp_path / 'x.xml'))
    assert rep.counts() == {'applied': len(rep.rows), 'pending': 0, 'superseded': 0, 'conflict': 0}
    locs = {e.loc for e in out['matthew']}
    assert 'matthew 1:1' in locs and 'matthew 1:2' in locs
    assert [e.loc for e in out['mark']] == ['mark 1:4']


def test_derive_widens_to_unique():
    out = fixderive.derive_xml(BEFORE, AFTER)
    for e in out['matthew']:
        s, t = BEFORE.index('<div n="Matthew"'), BEFORE.index('<div type="argument">A2')
        assert BEFORE[s:t].count(e.old) == 1 or e.old not in BEFORE  # unique when applied in order
        assert e.old not in e.new


def test_derive_ids_avoid_existing():
    out = fixderive.derive_xml(BEFORE, AFTER, existing_ids={'mark-1-4-a'})
    assert [e.id for e in out['mark']] == ['mark-1-4-b']


def test_propose_diff_refuses_ledger_out(tmp_path):
    from rhemes import paths
    assert fixderive.main(['xml', 'ee79a5e', 'HEAD', '--out', str(paths.FIXES)]) == 2
