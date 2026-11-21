import json
import os
import subprocess
import sys
import xml.etree.ElementTree as ET

import pytest

from rhemes import fixes, paths

BOOK = {'book': 'tiny', 'intros': [{'title': 'THE ARGVMENT.', 'text': 'Iohn vvrote this Goſpel.'}],
        'chapters': [{'chapter': 1, 'summary': 'Of the vvord.', 'verses': [
            {'verse': 1, 'text': 'In the beginning vvas the vvord, and the vvord vvas vvith God.'},
            {'verse': 2, 'text': 'This vvas in the beginning vvith God.'}]}]}
ANN = {'chapter': 1, 'annotations': [{'verse': 1, 'title': 'The vvord.', 'text': ' The ſecond Perſon.', 'notes': [{'marker': 1, 'text': 'Aug.'}]}]}
BOOK_ODR = json.loads(json.dumps(BOOK).replace('vv', 'w').replace('ſ', 's'))
ANN_ODR = json.loads(json.dumps(ANN).replace('vv', 'w').replace('ſ', 's'))

XML = '''<TEI><teiHeader>h</teiHeader>
<text xml:lang="eng">
<front><div type="title_page">T</div></front>
<body>
<div type="argument">The argument of S. Matthewes Goſpel.</div>
<div n="Matthew" type="gospel"><div n="1" type="chapter"><p>vnique matthew <gap reason="illegible"><desc>•</desc></gap>ord and the common phrase</p></div></div>
<div type="argument">A2</div>
<div n="Mark" type="gospel"><div n="1" type="chapter"><p>the common phrase in mark</p></div></div>
</body>
</text>
</TEI>
'''


@pytest.fixture
def repo(tmp_path):
    for root, b, a, indent in (('odr-original', BOOK, ANN, None), ('odr', BOOK_ODR, ANN_ODR, 2)):
        d = tmp_path / 'static/data' / root
        (d / 'tiny/annotations').mkdir(parents=True)
        (d / 'tiny.json').write_text(json.dumps(b, ensure_ascii=False, indent=indent) + '\n')
        (d / 'tiny/annotations/001.json').write_text(json.dumps(a, ensure_ascii=False, separators=(',', ':')))
    (tmp_path / 'A16049.xml').write_bytes(XML.encode())
    return tmp_path


def ctx(repo):
    return fixes.Ctx(repo, repo / 'A16049.xml', lock=repo / 'lock')


def E(**kw):
    d = dict(id='tiny-1-1-a', target=['odr-original'], loc='tiny 1:1', old='vvas the vvord,', new='vvas the VVord,',
             evidence='test', date='2026-11-21')
    d.update(kw)
    return fixes.Entry.from_dict(d)


def orig(repo, rel='tiny.json'):
    return json.loads((repo / 'static/data/odr-original' / rel).read_text())


def test_states_text(repo):
    c = ctx(repo)
    assert fixes.states(E(), c) == {'odr-original': 'pending'}
    assert fixes.states(E(old='vvas the vvord, and', new='vvas the VVord, and'), c) == {'odr-original': 'pending'}
    assert fixes.states(E(old='nothing here', new='nor here'), c) == {'odr-original': 'conflict'}
    assert fixes.states(E(old='the vvord', new='the VVord'), c) == {'odr-original': 'conflict'}  # twice
    assert fixes.states(E(old='beginning was the', new='beginning vvas the'), c) == {'odr-original': 'applied'}


def test_states_value(repo):
    e = E(id='tiny-1-1a1-a', loc='tiny 1:1a1#star', old=None, new=True)
    c = ctx(repo)
    assert fixes.states(e, c) == {'odr-original': 'pending'}
    fixes.apply([e], c, write=True)
    assert orig(repo, 'tiny/annotations/001.json')['annotations'][0]['star'] is True
    assert fixes.states(e, ctx(repo)) == {'odr-original': 'applied'}


def test_apply_dry_run_writes_nothing(repo):
    p = repo / 'static/data/odr-original/tiny.json'
    before, mt = p.read_bytes(), p.stat().st_mtime_ns
    rep = fixes.apply([E()], ctx(repo), write=False)
    assert rep.counts()['pending'] == 1
    assert p.read_bytes() == before and p.stat().st_mtime_ns == mt


def test_apply_write_json(repo):
    e = E(target=['odr-original', 'odr'], odr_old='was the word,', odr_new='was the Word,')
    fixes.apply([e], ctx(repo), write=True)
    o = (repo / 'static/data/odr-original/tiny.json').read_text()
    m = (repo / 'static/data/odr/tiny.json').read_text()
    assert 'vvas the VVord, and' in o and '\n  ' not in o  # compact kept
    assert 'was the Word, and' in m and '\n  ' in m  # indent kept
    mt = (repo / 'static/data/odr/tiny.json').stat().st_mtime_ns
    rep = fixes.apply([e], ctx(repo), write=True)
    assert rep.counts()['applied'] == 1 and rep.counts()['pending'] == 0
    assert (repo / 'static/data/odr/tiny.json').stat().st_mtime_ns == mt


def test_apply_refuses_ambiguous_old(repo):
    rep = fixes.apply([E(old='the vvord', new='the VVord')], ctx(repo), write=True)
    assert rep.counts()['conflict'] == 1
    assert any('occurs 2×' in p for p in rep.rows[0].problems)
    assert 'VVord' not in (repo / 'static/data/odr-original/tiny.json').read_text()


def test_partial_targets(repo):
    e = E(target=['odr-original', 'odr'], odr_old='was the word,', odr_new='was the Word,')
    fixes.apply([E()], ctx(repo), write=True)  # odr-original only
    assert fixes.states(e, ctx(repo)) == {'odr-original': 'applied', 'odr': 'pending'}
    mt = (repo / 'static/data/odr-original/tiny.json').stat().st_mtime_ns
    rep = fixes.apply([e], ctx(repo), write=True)
    assert rep.rows[0].changed == ['odr']
    assert (repo / 'static/data/odr-original/tiny.json').stat().st_mtime_ns == mt


def test_write_all_or_nothing(repo):
    good = E()
    bad = E(id='tiny-1-2-a', loc='tiny 1:2', old='not there', new='at all')
    rep = fixes.apply([good, bad], ctx(repo), write=True)
    assert not rep.written
    assert 'VVord' not in (repo / 'static/data/odr-original/tiny.json').read_text()


def test_apply_fidelity_refuses(repo):
    e = E(id='tiny-1-1a1-a', loc='tiny 1:1a1', old='ſecond Perſon', new='ſecond Person')
    rep = fixes.apply([e], ctx(repo), write=True)
    assert not rep.written and any('ls' in p for p in rep.rows[0].problems)
    ok = E(id='tiny-1-1a1-a', loc='tiny 1:1a1', old='ſecond Perſon', new='ſecond Person', allow=['ls:shift'], note='round s as printed')
    rep = fixes.apply([ok], ctx(repo), write=True)
    assert rep.written
    assert 'ſecond Person' in (repo / 'static/data/odr-original/tiny/annotations/001.json').read_text()


def test_xml_bytes_outside_unchanged(repo):
    e = E(id='matthew-1-1-a', target=['xml'], loc='matthew 1:1', old='matthew <gap reason="illegible"><desc>•</desc></gap>ord',
          new='matthew vvord')
    fixes.apply([e], ctx(repo), write=True)
    after = (repo / 'A16049.xml').read_bytes()
    orig_b = XML.encode()
    i = orig_b.index(e.old.encode())
    assert after[:i] == orig_b[:i]
    assert after[i + len(e.new.encode()):] == orig_b[i + len(e.old.encode()):]
    ET.fromstring(after)


def test_xml_scope_is_book_span(repo):
    e = E(id='mark-1-1-a', target=['xml'], loc='mark 1:1', old='the common phrase in mark', new='the common phraſe in mark')
    assert fixes.states(e, ctx(repo)) == {'xml': 'pending'}
    e2 = E(id='mark-1-1-b', target=['xml'], loc='mark 1:1', old='the common phrase', new='the common phraſe')
    assert fixes.states(e2, ctx(repo)) == {'xml': 'pending'}  # also in matthew, but unique in mark


def test_validate_rejects_old_inside_new():
    probs = fixes.validate(E(old='vvord', new='vvord vvord'), set(), book='tiny')
    assert any('old inside new' in p for p in probs)


def test_validate_rejects_non_nfc():
    probs = fixes.validate(E(new='vpō'), set(), book='tiny')
    assert any('NFC' in p for p in probs)


def test_validate_basics():
    assert fixes.validate(E(), set(), book='tiny') == []
    assert any('duplicate id' in p for p in fixes.validate(E(), {'tiny-1-1-a'}, book='tiny'))
    assert any('odr_new' in p for p in fixes.validate(E(target=['odr-original', 'odr']), set(), book='tiny'))
    assert any('note' in p for p in fixes.validate(E(allow=['ls:shift']), set(), book='tiny'))
    assert any('book' in p for p in fixes.validate(E(loc='luke 1:1'), set(), book='tiny'))
    with pytest.raises(ValueError):
        fixes.Entry.from_dict({'id': 'x', 'bogus': 1})


def test_ledger_round_trip(tmp_path):
    e = E(note='n', allow=['ls:shift'])
    (tmp_path / 'tiny.jsonl').write_text(fixes.dumps(e) + '\n')
    assert fixes.load_ledger('tiny', tmp_path) == [e]
    assert list(json.loads(fixes.dumps(e))) == [k for k in fixes.KEYS if getattr(e, k) is not None]


def test_lock_held_message(repo, tmp_path):
    (repo / 'fixes').mkdir()
    (repo / 'fixes/tiny.jsonl').write_text(fixes.dumps(E()) + '\n')
    lock = tmp_path / 'held.lock'
    lock.mkdir()
    env = dict(os.environ, RHEMES_LOCK=str(lock), RHEMES_XML=str(repo / 'A16049.xml'))
    r = subprocess.run([sys.executable, '-I', str(paths.RH), 'fix', 'apply', 'tiny', '--write', '--repo', str(repo),
                        '--fixes', str(repo / 'fixes')], capture_output=True, text=True, env=env)
    assert r.returncode == 3, r.stderr[-800:]
    assert 'data lock held' in r.stdout + r.stderr and 'Traceback' not in r.stderr


# ---- whole-branch review (2026-11-21) ----

def test_write_all_or_nothing_across_json_and_xml(repo):
    good = E()
    bad_xml = E(id='matthew-1-1-a', target=['xml'], loc='matthew 1:1', old='vnique matthew', new='<hi>vnique matthew')
    before = (repo / 'static/data/odr-original/tiny.json').read_bytes()
    rep = fixes.apply([good, bad_xml], ctx(repo), write=True)
    assert not rep.written and rep.rows[1].state == 'conflict'
    assert any('does not parse' in p for p in rep.rows[1].problems)
    assert (repo / 'static/data/odr-original/tiny.json').read_bytes() == before
    assert fixes.apply([good, bad_xml], ctx(repo)).rows[1].state == 'conflict'  # the dry run says so too


def test_value_entry_on_xml_rejected():
    e = E(id='tiny-1-1-a', target=['xml'], loc='tiny 1:1#star', old=None, new=True)
    assert any('xml' in p for p in fixes.validate(e, set()))


def test_annotation_loc_checks_its_verse(repo):
    e = E(id='tiny-1-99a1-a', loc='tiny 1:99a1#star', old=None, new=True)
    assert fixes.states(e, ctx(repo)) == {'odr-original': 'conflict'}


def test_fidelity_sees_data_and_xml_markup():
    from rhemes import fidelity
    feats = lambda a, b: {f.feature for f in fidelity.compare(a, b)}  # noqa: E731
    assert 'italic' in feats('<hi>in ſide,</hi> 1.', 'in ſide, 1.')
    assert 'sc' in feats('<hi rend="smallcaps">Corpvs</hi>', 'Corpvs')
    assert 'sc' in feats('<sc>Iesvs</sc>', 'Iesvs')
    assert 'margin_note' in feats('a <mn>[1]</mn> b', 'a b')
    assert 'note_mark' in feats('a <na>[1]</na> <cr>[2]</cr> b', 'a <cr>[2]</cr> b')


def test_value_star_removal_is_a_loss(repo):
    e = E(id='tiny-1-1a1-a', loc='tiny 1:1a1/mn1#star', old=True, new=None)
    assert any('star' in p for p in fixes._fidelity(e, 'odr-original'))


def test_cli_ledger_error_is_a_message(tmp_path):
    (tmp_path / 'tiny.jsonl').write_text('{"id": "x"}\n')
    r = subprocess.run([sys.executable, '-I', str(paths.HERE / 'rh.py'), 'fix', 'check', 'tiny', '--fixes', str(tmp_path)],
                       capture_output=True, text=True)
    assert r.returncode == 1 and 'Traceback' not in r.stderr and 'tiny' in r.stderr + r.stdout


def test_repo_without_xml_refuses_xml_targets(repo, tmp_path):
    d = tmp_path / 'fx'
    d.mkdir()
    (d / 'matthew.jsonl').write_text(fixes.dumps(E(id='matthew-1-1-a', target=['xml'], loc='matthew 1:1',
                                                   old='vnique matthew', new='vniqve matthew')) + '\n')
    assert fixes.main(['apply', 'matthew', '--repo', str(repo), '--fixes', str(d), '--write']) == 2
    assert fixes.main(['apply', 'matthew', '--repo', str(repo), '--xml', str(repo / 'A16049.xml'), '--fixes', str(d)]) == 0


def test_forbidden_out_covers_repo_and_main_checkout(tmp_path):
    from rhemes.lock import lock_path
    assert fixes.forbidden_out(tmp_path / 'static/data/x.jsonl', repo=tmp_path)
    main = lock_path().parent.parent
    assert fixes.forbidden_out(main / 'static/data/x.jsonl')
    assert fixes.forbidden_out(paths.FIXES / 'x.jsonl')
    assert not fixes.forbidden_out(tmp_path / 'x.jsonl')
