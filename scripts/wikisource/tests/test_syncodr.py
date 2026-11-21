"""sync-odr: lists content and structure differences between odr and odr-original; writes nothing."""
import json

from rhemes import fixes, loc
from rhemes import syncodr


def _store(root, verses, anns=()):
    root.mkdir(parents=True, exist_ok=True)
    (root / 'tiny.json').write_text(json.dumps({'book': 'tiny', 'intros': [], 'chapters': [
        {'chapter': 1, 'summary': 'S.', 'verses': [dict(verse=i, **v) for i, v in enumerate(verses, 1)]}]}))
    (root / 'tiny/annotations').mkdir(parents=True, exist_ok=True)
    (root / 'tiny/annotations/001.json').write_text(json.dumps({'chapter': 1, 'annotations': list(anns)}))
    return loc.load_store(root, 'tiny')


def _pair(tmp, orig, odr, anns_o=(), anns_m=()):
    return _store(tmp / 'static/data/odr-original', orig, anns_o), _store(tmp / 'static/data/odr', odr, anns_m)


def _diffs(o, m, min_count=3):
    return syncodr.content_diffs(o, m, syncodr.spelling_pairs([(o, m)]), min_count)


def test_spelling_not_reported(tmp_path):
    o, m = _pair(tmp_path,
                 [{'text': 'And he came vvith the Iewes.'}, {'text': 'The Iewes ſay.'}, {'text': 'O Iewes, to day.'}],
                 [{'text': 'And he came with the Jews.'}, {'text': 'The Jews say.'}, {'text': 'O Jews, today.'}])
    assert _diffs(o, m) == []
    assert syncodr.spelling_pairs([(o, m)])[('iewes', 'iews')] == 3


def test_spell_key_folds_the_period(tmp_path):
    o, m = _pair(tmp_path,
                 [{'text': 'I can not ſtay, it ſhalbe ſo, ĩ the cōmaundement & the rest &c.'}],
                 [{'text': 'I cannot stay, it shall be so, in the commaundement and the rest etc.'}])
    assert _diffs(o, m) == []


def test_content_reported(tmp_path):
    o, m = _pair(tmp_path,
                 [{'text': 'He put forth his band to them.'}, {'text': 'And he said to them.'}, {'text': 'Go thy way.'}],
                 [{'text': 'He put forth his hand to them.'}, {'text': 'And said to them.'}, {'text': 'Go thy way now.'}])
    ds = _diffs(o, m)
    assert [(d.loc, d.orig_words, d.odr_words) for d in ds] == [
        ('tiny 1:1', ['band'], ['hand']), ('tiny 1:2', ['he'], []), ('tiny 1:3', [], ['now.'])]
    es = syncodr.propose(ds, o, m, taken=set(), date='2026-11-21')
    assert [e.target for e in es] == [('odr',)] * 3
    assert es[0].old == 'forth his hand to them.' and es[0].new == 'forth his band to them.'
    assert es[1].old == 'And said to' and es[1].new == 'And he said to'
    assert es[2].old == 'thy way now.' and es[2].new == 'thy way'
    assert all(e.note == 'modernise new before adding' and e.evidence == 'sync-odr: odr-original reading' for e in es)
    for e in es:  # each proposal applies to odr as it stands
        assert m.bj['chapters'][0]['verses'][int(e.rest.split(':')[1]) - 1]['text'].count(e.old) == 1


def test_structure_reported(tmp_path):
    ann = {'verse': 1, 'title': 'T', 'text': 'x <mn>[1]</mn> y <mn>[2]</mn>', 'notes': [{'marker': 1, 'text': 'a'}, {'marker': 2, 'text': 'b'}]}
    ann2 = dict(ann, text='x <mn>[1]</mn> y', notes=[{'marker': 1, 'text': 'a'}])
    o, m = _pair(tmp_path, [{'text': 'A <na>[1]</na> b.', 'notes': [{'label': '1', 'text': 'n'}]}], [{'text': 'A b.'}],
                 [ann], [ann2])
    got = syncodr.structure_diffs(o, m)
    assert any('1:1/note1' in s and 'only in odr-original' in s for s in got)
    assert any(s.startswith('tiny 1:1a1 ') and '<mn>' in s for s in got)
    assert any(s.startswith('tiny 1:1 ') and '<na>' in s for s in got)


def test_sync_odr_never_writes(tmp_path, capsys):
    o, m = _pair(tmp_path, [{'text': 'his band'}], [{'text': 'his hand'}])
    files = sorted((tmp_path / 'static/data').rglob('*.json'))
    before = {p: (p.stat().st_mtime_ns, p.read_bytes()) for p in files}
    out = tmp_path / 'proposals.jsonl'
    assert syncodr.main(['tiny', '--repo', str(tmp_path), '--out', str(out)]) == 0
    assert {p: (p.stat().st_mtime_ns, p.read_bytes()) for p in files} == before
    e, = [fixes.Entry.from_dict(json.loads(x)) for x in out.read_text().splitlines()]
    assert (e.old, e.new) == ('his hand', 'his band')
    assert 'tiny 1:1 | odr-original: band | odr: hand' in capsys.readouterr().out
