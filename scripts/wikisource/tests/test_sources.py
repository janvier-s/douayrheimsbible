"""rhemes.sources: one loader per source, and one place that knows where A16049.xml is."""
import re
import subprocess
import sys
from pathlib import Path

import pytest

HERE = Path(__file__).resolve().parents[1]
DEFAULT_XML = Path.home() / 'Documents/Bible-n-stuff/original-douay-rheims-nt/A16049.xml'


def test_xml_path_env(monkeypatch, tmp_path):
    from rhemes import sources
    x = tmp_path / 'A16049.xml'
    x.write_text('<TEI/>')
    monkeypatch.setenv('RHEMES_XML', str(x))
    assert sources.xml_path() == x


def test_xml_path_default(monkeypatch):
    from rhemes import sources
    monkeypatch.delenv('RHEMES_XML', raising=False)
    assert sources.xml_path() == DEFAULT_XML


def test_xml_path_single_place():
    """A path to A16049.xml is written in sources.py and nowhere else in the package."""
    hits = [f'{p.name}:{i}' for p in (HERE / 'rhemes').glob('*.py') if p.name != 'sources.py'
            for i, line in enumerate(p.read_text().splitlines(), 1) if re.search(r'[\w-]+/A16049\.xml', line)]
    assert not hits, hits


@pytest.mark.skipif(not DEFAULT_XML.exists(), reason='NT repo XML not on this machine')
def test_triage_runs_without_sources_dir(tmp_path):
    """triage used to read sources/eebo-tcp/A16049.xml, which exists only in the main checkout."""
    r = subprocess.run([sys.executable, '-I', str(HERE / 'rh.py'), 'triage', 'mark'], cwd=tmp_path,
                       capture_output=True, text=True)
    assert r.returncode == 0, r.stderr[-800:]
    assert 'ERROR' not in r.stdout, [line for line in r.stdout.splitlines() if 'ERROR' in line][:3]


def test_data_files_and_ocr_by_page_live_in_sources():
    from rhemes import ladder, reconcile, sources
    assert not hasattr(ladder, 'book_files') and sources.data_files('mark')[0].name == 'mark.json'
    assert reconcile.ocr_by_page is sources.ocr_by_page


def test_ocrpages_is_sources():
    from rhemes import ocrpages, sources
    assert ocrpages.book_pages is sources.book_pages and ocrpages.TK == sources.TK and ocrpages.SCAN == sources.SCAN
