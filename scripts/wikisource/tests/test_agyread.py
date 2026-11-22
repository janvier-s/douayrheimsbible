"""agyread: crops, agy batches, the answer key, scoring and routing (agy itself is never called)."""
import csv
import os
from pathlib import Path

import pytest
from PIL import Image

from rhemes import agyread, ocrdiff, sources as O
from rhemes.transkribus import PAGE_W

REPO = Path(__file__).resolve().parents[3]


# ---------------------------------------------------------------- Task 1: kinds, crops, word boxes

def test_kinds():
    assert agyread.kinds('vvhich') == {'wvv'}
    assert agyread.kinds('ſhevved') == {'wvv', 'longs'}
    assert agyread.kinds('vpō') == {'macron'}
    assert agyread.kinds('Lord') == {'wording'}


def test_crop_pads_scales_and_maps_page_frame(tmp_path):
    """Boxes are in the PAGE_W frame: a page image twice that wide doubles them, then 1.4x."""
    (tmp_path / 'acts').mkdir()
    Image.new('L', (2 * PAGE_W, 3000), 255).save(tmp_path / 'acts/pdf314.jpg')
    im = agyread.crop('acts', 'pdf314', (100, 200, 60, 40), pages_dir=tmp_path)
    assert im.size == (round((60 + 2 * 40) * 2 * 1.4), round(0.7 * 40 * 2 * 1.4))  # the band 0.25-0.95 of h: one line


def test_crop_finds_argument_pages(tmp_path):
    (tmp_path / 'john-argument').mkdir()
    Image.new('L', (PAGE_W, 2000), 255).save(tmp_path / 'john-argument/pdf242.jpg')
    assert agyread.crop('john', 'pdf242', (100, 200, 60, 40), pages_dir=tmp_path).size[0] > 0


def test_crop_clamps_at_page_edge(tmp_path):
    (tmp_path / 'acts').mkdir()
    Image.new('L', (PAGE_W, 2000), 0).save(tmp_path / 'acts/pdf314.jpg')
    im = agyread.crop('acts', 'pdf314', (0, 0, 60, 40), pages_dir=tmp_path)
    assert im.size == (round((60 + 40) * 1.4), round(0.7 * 40 * 1.4))
    assert im.getextrema() == (0, 0)  # only page pixels, no padding fill


@pytest.mark.skipif(not os.environ.get('RH_AGY_SLOW') or not (O.TK / 'john/manifest.json').exists(),
                    reason='runs diff ocr on all of John (~4 min): set RH_AGY_SLOW=1; needs the John Transkribus split')
def test_word_boxes_match_the_findings_rows(tmp_path):
    """word_boxes and a fresh run() agree on page and box for every body row that has one."""
    ocrdiff.run('john', tmp_path)
    rows = [r for r in csv.DictReader(open(tmp_path / 'john-findings.tsv'), delimiter='\t')
            if r['cls'] in ('w_for_vv', 'vv_for_w', 'word') and r['box'] and ':' in r['loc']]
    wb = ocrdiff.word_boxes('john')
    hits = 0
    for r in rows:
        v = wb.get((r['loc'], r['data'], int(r['occ'])))
        if v and len(v['box']) == 4 and ' ' not in v['tk']:   # one OCR word: run() boxes the first only
            hits += 1
            assert (v['page'], ','.join(map(str, v['box']))) == (r['page'], r['box']), r
    assert hits >= 50



# ---------------------------------------------------------------- Task 2: agy batches and the cache

def _items(n, color=255):
    return [dict(id=f'i{k}', image=Image.new('L', (20, 10), (color + k) % 256)) for k in range(n)]


@pytest.fixture
def fake_agy(monkeypatch):
    """Replace call_agy: answers[k] is the list one call returns; calls records (model, prompt, files)."""
    state = dict(answers=[], calls=[])

    def call(model, prompt, image_dir):
        state['calls'].append((model, prompt, sorted(p.name for p in Path(image_dir).iterdir())))
        a = state['answers'].pop(0)
        if isinstance(a, Exception):
            raise a
        return a
    monkeypatch.setattr(agyread, 'call_agy', call)
    return state


def test_answers_matched_by_n_and_missing_is_none(fake_agy, tmp_path):
    fake_agy['answers'] = [[{'n': 2, 'reading': 'vpō'}, {'n': 1, 'reading': 'vvhich'}]]
    out = agyread.read_batch(_items(3), 'm', 'plain', 1, tmp_path)
    assert out == {'i0': 'vvhich', 'i1': 'vpō', 'i2': None}
    assert fake_agy['calls'][0][2] == ['01.png', '02.png', '03.png']
    fake_agy['answers'] = [[{'n': 1, 'reading': 'vnto'}]]          # the missing one is asked again, alone
    assert agyread.read_batch(_items(3), 'm', 'plain', 1, tmp_path)['i2'] == 'vnto'
    assert fake_agy['calls'][1][2] == ['01.png']


def test_readings_are_nfc(fake_agy, tmp_path):
    fake_agy['answers'] = [[{'n': 1, 'reading': 'vpō'}]]
    assert agyread.read_batch(_items(1), 'm', 'plain', 1, tmp_path) == {'i0': 'vpō'}


def test_cache_hit_skips_call(fake_agy, tmp_path):
    fake_agy['answers'] = [[{'n': 1, 'reading': 'vvhich'}]]
    agyread.read_batch(_items(1), 'm', 'plain', 1, tmp_path)
    assert agyread.read_batch(_items(1), 'm', 'plain', 1, tmp_path) == {'i0': 'vvhich'}
    assert len(fake_agy['calls']) == 1


def test_second_run_is_not_served_from_the_first(fake_agy, tmp_path):
    fake_agy['answers'] = [[{'n': 1, 'reading': 'a'}], [{'n': 1, 'reading': 'b'}]]
    agyread.read_batch(_items(1), 'm', 'plain', 1, tmp_path)
    assert agyread.read_batch(_items(1), 'm', 'plain', 2, tmp_path) == {'i0': 'b'}


def test_agy_error_is_not_cached(fake_agy, tmp_path):
    fake_agy['answers'] = [agyread.AgyError('exit 1'), [{'n': 1, 'reading': 'vvhich'}]]
    assert agyread.read_batch(_items(1), 'm', 'plain', 1, tmp_path) == {'i0': None}
    assert agyread.read_batch(_items(1), 'm', 'plain', 1, tmp_path) == {'i0': 'vvhich'}


def test_prompts_name_no_reading():
    assert set(agyread.PROMPTS) == {'plain', 'targeted'}
    for p in agyread.PROMPTS.values():
        assert not any(w in p for w in ('vvhich', 'vpō', 'ſhevved'))
    assert 'ſ' in agyread.PROMPTS['plain'] and 'vv' in agyread.PROMPTS['targeted']
    assert all('middle' in p for p in agyread.PROMPTS.values())


def test_read_all_batches_of_30(fake_agy, tmp_path):
    fake_agy['answers'] = [[{'n': k + 1, 'reading': 'x'} for k in range(n)] for n in (30, 30, 5) * 2]
    out = agyread.read_all(_items(65), 'm', 'plain', tmp_path)
    assert len(fake_agy['calls']) == 6
    assert out['i64'] == ['x', 'x']


def test_call_agy_parses_json_and_raises_on_failure(monkeypatch, tmp_path):
    import subprocess
    seen = {}

    def run(cmd, **kw):
        seen['cmd'] = cmd
        return subprocess.CompletedProcess(cmd, 0, '{"items": [{"n": 1, "reading": "vvhich"}]}', '')
    monkeypatch.setattr(agyread.subprocess, 'run', run)
    (tmp_path / '01.png').write_bytes(b'')
    assert agyread.call_agy('gemini-4-argon-low', 'P', tmp_path) == [{'n': 1, 'reading': 'vvhich'}]
    assert seen['cmd'][:3] == ['agy', '--model', 'gemini-4-argon-low'] and str(tmp_path) in seen['cmd']
    prompt = seen['cmd'][seen['cmd'].index('-p') + 1]
    assert str(tmp_path / '01.png') in prompt and 'Do not run any shell command' in prompt
    monkeypatch.setattr(agyread.subprocess, 'run',
                        lambda cmd, **kw: subprocess.CompletedProcess(cmd, 0, 'not json', ''))
    with pytest.raises(agyread.AgyError):
        agyread.call_agy('m', 'P', tmp_path)


def test_changed_prompt_text_is_not_served_from_cache(fake_agy, tmp_path, monkeypatch):
    fake_agy['answers'] = [[{'n': 1, 'reading': 'a'}], [{'n': 1, 'reading': 'b'}]]
    agyread.read_batch(_items(1), 'm', 'plain', 1, tmp_path)
    monkeypatch.setitem(agyread.PROMPTS, 'plain', agyread.PROMPTS['plain'] + ' Take care.')
    assert agyread.read_batch(_items(1), 'm', 'plain', 1, tmp_path) == {'i0': 'b'}


# ---------------------------------------------------------------- Task 3: key, scoring, trust

def _box(w, tk=None, ts=None):
    return dict(page='pdf1', box=(1, 2, 3, 4), tk=tk or w, ts=ts or w)


BOXES = {'john': {
    ('1:1', 'vvhich', 0): _box('vvhich', 'which', 'which'),     # OCR misread: a hard case once audited
    ('1:2', 'frō', 0): _box('frō'),
    ('1:3', 'ſelf', 0): _box('ſelf'),
    ('1:4', 'Lord', 0): _box('Lord'),
    ('1:5', 'vvhen', 0): _box('vvhen'),
    ('1:6', 'vvas', 1): _box('vvas'),                            # the audit said 'was', since respelled
}}
ROWS = {'john': [dict(cls='w_for_vv', loc='1:1', data='vvhich', occ='0'),
                 dict(cls='vv_for_w', loc='1:6', data='was', occ='1'),
                 dict(cls='missing', loc='1:4', data='Lord', occ='0')]}


def test_select_key_strata():
    key = agyread.select_key(BOXES, ROWS, n_hard=10, n_ordinary=10, seed=1)
    by = {(k['loc'], k['truth']): k for k in key}
    assert by[('1:1', 'vvhich')]['stratum'] == 'hard'
    assert by[('1:6', 'vvas')]['stratum'] == 'hard'           # found again by its folded form
    assert by[('1:2', 'frō')]['stratum'] == 'ordinary'
    assert ('1:4', 'Lord') not in by                            # no w/vv, macron or ſ: not ordinary; 'missing' is not hard
    assert by[('1:1', 'vvhich')]['kinds'] == ['wvv']
    assert by[('1:1', 'vvhich')]['id'] == 'john:pdf1:1,2,3,4'


def test_select_key_is_seeded_and_capped():
    a = agyread.select_key(BOXES, ROWS, n_hard=10, n_ordinary=2, seed=1)
    assert a == agyread.select_key(BOXES, ROWS, n_hard=10, n_ordinary=2, seed=1)
    assert sum(k['stratum'] == 'ordinary' for k in a) == 2


def test_kinds_of_an_item_include_the_ocr_form():
    """'from' printed, OCR 'frō': a reading frō must be scored as a macron error."""
    key = agyread.select_key({'john': {('1:1', 'from', 0): _box('from', 'frō', 'frō')}},
                             {'john': [dict(cls='word', loc='1:1', data='from', occ='0')]}, 5, 5, 1)
    assert key[0]['kinds'] == ['macron']


K1 = dict(id='a', truth='vvhich', kinds=['wvv'])


def _score(runs, item=K1):
    return agyread.score([item], {('m', 'plain'): {item['id']: runs}})[('m', 'plain', item['kinds'][0])]


def test_score_confidently_wrong():
    assert _score(['which', 'which']) == dict(n=1, agree=1, right=0, confidently_wrong=1)


def test_score_disagreement_is_not_confidently_wrong():
    assert _score(['vvhich', 'which']) == dict(n=1, agree=0, right=0, confidently_wrong=0)


def test_score_missing_reading_is_not_agreement():
    assert _score([None, None]) == dict(n=1, agree=0, right=0, confidently_wrong=0)


def test_score_compares_only_the_kind_feature():
    item = dict(id='b', truth='ſhevved,', kinds=['wvv', 'longs'])
    s = agyread.score([item], {('m', 'plain'): {'b': ['shevved', 'shevved']}})
    assert s[('m', 'plain', 'wvv')]['right'] == 1
    assert s[('m', 'plain', 'longs')]['confidently_wrong'] == 1


def test_score_macron_feature():
    item = dict(id='c', truth='incōtinent', kinds=['macron'])
    assert agyread.score([item], {('m', 'p'): {'c': ['incōtinent', 'incōtinent']}})[('m', 'p', 'macron')]['right'] == 1
    assert agyread.score([item], {('m', 'p'): {'c': ['incontinent'] * 2}})[('m', 'p', 'macron')]['confidently_wrong'] == 1
    assert agyread.score([item], {('m', 'p'): {'c': ['īncotinent'] * 2}})[('m', 'p', 'macron')]['confidently_wrong'] == 1


def test_trust_bar_edges():
    s = {('m', 'p', 'wvv'): dict(n=29, agree=29, right=29, confidently_wrong=0),
         ('m', 'p', 'macron'): dict(n=50, agree=49, right=49, confidently_wrong=0),
         ('m', 'p', 'longs'): dict(n=50, agree=49, right=48, confidently_wrong=0),
         ('m', 'p', 'wording'): dict(n=100, agree=100, right=99, confidently_wrong=1)}
    assert agyread.trusted(s) == {('m', 'p', 'macron')}


def test_row_without_occ_counts_only_when_unique_in_its_loc():
    boxes = {'mark': {('1:1', 'vvas', 0): _box('vvas'), ('1:1', 'vvas', 1): _box('vvas'), ('1:2', 'vvho', 0): _box('vvho')}}
    rows = {'mark': [dict(cls='w_for_vv', loc='1:1', data='vvas'), dict(cls='w_for_vv', loc='1:2', data='who')]}
    key = agyread.select_key(boxes, rows, 10, 0, 1)
    assert [(k['loc'], k['truth']) for k in key] == [('1:2', 'vvho')]


def test_ordinary_sample_is_even_across_kinds():
    boxes = {'john': {**{(f'1:{i}', f'vvas{i}', 0): _box(f'vvas{i}') for i in range(40)},
                      **{(f'2:{i}', f'frō{i}', 0): _box(f'frō{i}') for i in range(4)}}}
    key = agyread.select_key(boxes, {'john': []}, 0, 6, 1)
    assert sum('macron' in k['kinds'] for k in key) == 2 and len(key) == 6


def test_macron_words_count_even_when_the_ocr_misread_them():
    boxes = {'mark': {('1:1', 'incōtinent', 0): _box('incōtinent', 'incontinent', 'incétinent')}}
    key = agyread.select_key(boxes, {'mark': []}, 0, 3, 1)
    assert [(k['truth'], k['stratum']) for k in key] == [('incōtinent', 'hard')]


# ---------------------------------------------------------------- Task 4: open findings, routing, proposals

TRIAGE = [  # audit_book rows: (chapter, verse, kind, xml, json, json ctx, xml ctx); lower case, ~ = macron
    (1, 1, 'w/vv', 'vvhich', 'which', '', ''),
    (1, 2, 'macron', 'vpo~', 'vpon', '', ''),
    (1, 3, 'longs', 'ſelf', 'self', '', ''),
    (1, 4, 'w/vv', 'vvhen', 'when', '', ''),
    (1, 5, 'n-text', 'x', 'y', '', ''),
    (9, 1, 'w/vv', 'vvas', 'was', '', ''),
]
TBOX = {('1:1', 'which', 0): _box('which', 'vvhich', 'vvhich'),   # both OCRs side with the XML: settled
        ('1:2', 'vpon,', 0): _box('vpon,', 'vpo', 'vpo'),          # OCR drops macrons: open
        ('1:3', 'Self', 0): _box('Self', 'Self', 'felf'),           # OCRs disagree: open
        ('9:1', 'was', 0): _box('was', 'vvas', 'was')}              # outside the chapters asked for


def test_findings_from_keeps_only_open_ones_in_range():
    fs = agyread.findings_from('acts', TRIAGE, TBOX, (1, 5))
    got = {(f['loc'], f['data'], f['xml']): f for f in fs}
    assert set(got) == {('1:2', 'vpon,', 'vpō'), ('1:3', 'Self', 'ſelf'), ('1:4', 'when', 'vvhen')}
    assert got[('1:4', 'when', 'vvhen')]['box'] is None          # no word box: still listed, for Claude
    assert got[('1:2', 'vpon,', 'vpō')]['kinds'] == ['macron']
    assert got[('1:2', 'vpon,', 'vpō')]['id'] == 'acts:pdf1:1,2,3,4'


def _f(id_, data, xml, kinds, box=(1, 2, 3, 4)):
    return dict(id=id_, book='acts', loc='1:1', occ=0, data=data, xml=xml, tk='', ts='', page='pdf1', box=box, kinds=kinds)


USE = ('gemini-4-argon-low', 'targeted')
TRUST = {USE + ('wvv',), USE + ('macron',)}


def test_route_keeps_only_trusted_and_agreeing():
    fs = [_f('a', 'which', 'vvhich', ['wvv']), _f('b', 'vpon', 'vpō', ['macron']), _f('c', 'when', 'vvhen', ['wvv']),
          _f('d', 'Self', 'ſelf', ['longs']), _f('e', 'what', 'vvhat', ['wvv'], box=None), _f('g', 'who', 'vvho', ['wvv']),
          _f('h', 'whom', 'vvhō', ['macron', 'wvv'])]
    rd = {'a': ['vvhich', 'vvhich'], 'b': ['vpō', 'vpō'], 'c': ['vvhen', 'when'], 'd': ['ſelf', 'ſelf'],
          'g': [None, 'vvho'], 'h': ['vvhom', 'vvhom']}
    kept, claude = agyread.route(fs, rd, USE, TRUST)
    assert [(k['id'], k['reading']) for k in kept] == [('a', 'vvhich'), ('b', 'vpō')]
    assert {c['id']: c['reason'] for c in claude} == {
        'c': 'runs-disagree', 'd': 'untrusted-kind', 'e': 'no-box', 'g': 'no-reading', 'h': 'neither-side'}


def test_word_with_two_kinds_needs_both_trusted():
    kept, claude = agyread.route([_f('a', 'ſhewed', 'ſhevved', ['longs', 'wvv'])], {'a': ['ſhevved'] * 2}, USE, TRUST)
    assert kept == [] and claude[0]['reason'] == 'untrusted-kind'


def _repo(t, verse):
    for root in ('odr-original', 'odr'):
        _book_json(t / 'static/data' / root, 'acts', verse)


def _book_json(root, slug, verse):
    import json
    (root / slug / 'annotations').mkdir(parents=True)
    (root / f'{slug}.json').write_text(json.dumps({'book': slug, 'intros': [], 'chapters': [
        {'chapter': 1, 'summary': 'S.', 'verses': [{'verse': 1, 'text': verse}]}]}, ensure_ascii=False))
    (root / slug / 'annotations/001.json').write_text(json.dumps({'chapter': 1, 'annotations': []}))


def test_propose_writes_ledger_entry_with_agy_evidence(tmp_path):
    _repo(tmp_path, 'and he which came, which went.')
    k = dict(_f('a', 'which', 'vvhich', ['wvv']), occ=1, tk='which', ts='vvhich', reading='vvhich')
    es = agyread.propose(tmp_path, 'acts', [k], USE, date='2026-11-21')
    assert len(es) == 1
    e = es[0]
    assert e.loc == 'acts 1:1' and e.old == 'came, which went.' and e.new == 'came, vvhich went.'
    assert e.evidence.startswith('agy gemini-4-argon-low targeted 2026-11-21; XML vvhich; Transkribus/Tesseract which/vvhich')


def test_rerun_after_apply_proposes_nothing(tmp_path):
    _repo(tmp_path, 'and he vvhich came.')
    k = dict(_f('a', 'vvhich', 'vvhich', ['wvv']), reading='vvhich')
    assert agyread.propose(tmp_path, 'acts', [k], USE, date='2026-11-21') == []


def test_read_refuses_out_under_fixes(tmp_path, capsys):
    out = agyread.paths.REPO / 'wikisource/1582-rhemes-nt/fixes/x.jsonl'
    assert agyread.main(['read', 'acts', '--chapters', '1-1', '--use', 'm:plain', '--out', str(out)]) == 2
    assert not out.exists()


def test_longs_feature_ignores_case():
    assert agyread.FEATURE['longs']('Self') == agyread.FEATURE['longs']('self') != agyread.FEATURE['longs']('ſelf')
