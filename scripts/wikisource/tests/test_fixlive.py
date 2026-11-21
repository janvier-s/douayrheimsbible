"""fix propose-live: another editor's change on a live page becomes a proposed ledger entry (offline)."""
import json

from rhemes import fixes, fixlive, loc

COMMITTED = ('<noinclude>{{rh|12|THE GOSPEL|ACCORDING TO S. MARKE.}}</noinclude>'
             'It is euident that he came.\nAnd the Phariſees ſaid nothing.\n<noinclude></noinclude>')
REV = {'revid': 4242, 'user': 'Some Editor', 'timestamp': '2026-11-20T10:00:00Z'}


def _store(tmp):
    root = tmp / 'static/data/odr-original'
    (root / 'tiny/annotations').mkdir(parents=True)
    (root / 'tiny.json').write_text(json.dumps({'book': 'tiny', 'intros': [], 'chapters': [{'chapter': 1, 'summary': 'S.', 'verses': [
        {'verse': 1, 'text': 'It is euident that he came.'}, {'verse': 2, 'text': 'And the Phariſees ſaid nothing.'}]}]}))
    return loc.load_store(root, 'tiny')


def test_live_word_change_placed(tmp_path):
    live = COMMITTED.replace('euident', 'euidēt')
    es, unplaced = fixlive.propose_live(12, live, COMMITTED, REV, _store(tmp_path), taken=set())
    assert unplaced == []
    e, = es
    assert e.loc == 'tiny 1:1' and e.target == ('odr-original',)
    assert 'euident' in e.old and e.new == e.old.replace('euident', 'euidēt')
    assert e.evidence == 'wikisource rev 4242 by Some Editor' and e.date == '2026-11-20'
    assert e.note == 'check against the scan; add odr/xml targets if they apply'


def test_live_ls_template_is_data_form(tmp_path):
    live = COMMITTED.replace('ſaid nothing', '{{ls}}aid nothing').replace('Phariſees', 'Pharisees')
    es, unplaced = fixlive.propose_live(12, live, COMMITTED, REV, _store(tmp_path), taken=set())
    e, = es
    assert e.loc == 'tiny 1:2' and 'Phariſees' in e.old and 'Pharisees' in e.new and unplaced == []


def test_live_one_sided_context(tmp_path):
    # "came." ends verse 1 and "And" begins verse 2: two-sided context spans two texts
    live = COMMITTED.replace('he came.', 'he cometh.')
    es, unplaced = fixlive.propose_live(12, live, COMMITTED, REV, _store(tmp_path), taken=set())
    e, = es
    assert e.loc == 'tiny 1:1' and (e.old, e.new) == ('he came.', 'he cometh.') and unplaced == []


def test_live_unplaced(tmp_path):
    live = COMMITTED.replace('MARKE.', 'MARK.')
    es, unplaced = fixlive.propose_live(12, live, COMMITTED, REV, _store(tmp_path), taken=set())
    assert es == [] and len(unplaced) == 1 and 'MARKE.' in unplaced[0]


def test_propose_live_cli_offline(tmp_path, monkeypatch, capsys):
    fetch = tmp_path / 'fetch'
    fetch.mkdir()
    (fetch / '12.wiki').write_text(COMMITTED.replace('euident', 'euidēt'))
    (fetch / 'revs.json').write_text(json.dumps({'12': REV}))
    _store(tmp_path)
    monkeypatch.setattr(fixlive, 'committed_page', lambda n: COMMITTED)
    monkeypatch.setattr(fixlive, 'book_of', lambda n, repo=None: 'tiny')
    out = tmp_path / 'p.jsonl'
    assert fixlive.main([str(fetch), '--repo', str(tmp_path), '--out', str(out)]) == 0
    e, = [fixes.Entry.from_dict(json.loads(x)) for x in out.read_text().splitlines()]
    assert e.loc == 'tiny 1:1'
