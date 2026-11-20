import sys

import pytest

import wikipost

PAGE = '<noinclude><pagequality level="1" user="" />{{rh|||}}</noinclude>{text}<noinclude>{{rh|||}}</noinclude>'


class FakeWiki:
    edited = []
    live_pages = {}

    def login(self):
        return 'Bot@x'

    def live(self, n):
        return self.live_pages.get(n)

    def call(self, params, post=False):  # post-edit live lint check: nothing flagged
        return {'query': {'linterrors': [], 'pages': []}}

    def edit(self, n, text, summary, baserevid):
        FakeWiki.edited.append(n)
        return {'edit': {'newrevid': 100 + n}}


@pytest.fixture
def fake_env(tmp_path, monkeypatch):
    (tmp_path / 'pages').mkdir()
    (tmp_path / 'pages' / '1.wiki').write_text(PAGE.format(text='Passion'))
    (tmp_path / 'pages' / '2.wiki').write_text(PAGE.format(text='olde text'))
    (tmp_path / 'manifest.json').write_text('{}')
    FakeWiki.edited = []
    FakeWiki.live_pages = {
        1: {'text': PAGE.format(text='Pa{{ls}}{{ls}}ion'), 'revid': 7, 'user': 'Bot'},
        2: {'text': PAGE.format(text='old text'), 'revid': 8, 'user': 'Bot'},
    }
    monkeypatch.setattr(wikipost, 'Wiki', FakeWiki)
    monkeypatch.setattr(wikipost, 'ROOT', tmp_path)
    monkeypatch.setattr(wikipost.time, 'sleep', lambda s: None)
    monkeypatch.setattr(sys, 'argv', ['wikipost.py', '1-2', '--post', '--summary', 's'])
    return FakeWiki


def test_post_refuses_loss_and_continues(fake_env, capsys):
    wikipost.main()
    out = capsys.readouterr().out
    assert '1: REFUSED fidelity' in out and fake_env.edited == [2]


def test_post_override_allows(fake_env):
    sys.argv += ['--allow-shift', 'ls:1', '--reason', 'per XML']
    wikipost.main()
    assert fake_env.edited == [1, 2]


def test_dry_run_reports_refusal(fake_env, capsys):
    sys.argv[:] = ['wikipost.py', '1-2']
    wikipost.main()
    assert '1: REFUSED fidelity' in capsys.readouterr().out and fake_env.edited == []


def test_refusal_shows_where(fake_env, capsys):
    sys.argv[:] = ['wikipost.py', '1']
    wikipost.main()
    assert 'Pa{{ls}}{{ls}}ion → Passion' in capsys.readouterr().out
