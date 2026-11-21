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
    assert agyread.call_agy('gemini-4-argon-low', 'P', tmp_path) == [{'n': 1, 'reading': 'vvhich'}]
    assert seen['cmd'][:3] == ['agy', '--model', 'gemini-4-argon-low'] and str(tmp_path) in seen['cmd']
    monkeypatch.setattr(agyread.subprocess, 'run',
                        lambda cmd, **kw: subprocess.CompletedProcess(cmd, 0, 'not json', ''))
    with pytest.raises(agyread.AgyError):
        agyread.call_agy('m', 'P', tmp_path)


def test_changed_prompt_text_is_not_served_from_cache(fake_agy, tmp_path, monkeypatch):
    fake_agy['answers'] = [[{'n': 1, 'reading': 'a'}], [{'n': 1, 'reading': 'b'}]]
    agyread.read_batch(_items(1), 'm', 'plain', 1, tmp_path)
    monkeypatch.setitem(agyread.PROMPTS, 'plain', agyread.PROMPTS['plain'] + ' Take care.')
    assert agyread.read_batch(_items(1), 'm', 'plain', 1, tmp_path) == {'i0': 'b'}
