"""Every string in odr-original and odr is NFC (RULES §3.7) and writes the abbreviation stroke as a
macron, never a tilde (RULES §3.5). Both crept in from OCR before; this keeps them out."""
import json
import unicodedata

import pytest

from rhemes import paths


def _strings(o, path=()):
    if isinstance(o, str):
        yield path, o
    elif isinstance(o, dict):
        for k, v in o.items():
            yield from _strings(v, path + (k,))
    elif isinstance(o, list):
        for i, v in enumerate(o):
            yield from _strings(v, path + (i,))


def _problems(root):
    bad = []
    for f in sorted(root.rglob('*.json')):
        for path, s in _strings(json.loads(f.read_text(encoding='utf-8'))):
            if unicodedata.normalize('NFC', s) != s:
                bad.append(f'{f.relative_to(root)} {list(path)}: not NFC')
            elif '̃' in unicodedata.normalize('NFD', s):
                bad.append(f'{f.relative_to(root)} {list(path)}: tilde (write the macron U+0304)')
            elif '�' in s:
                bad.append(f'{f.relative_to(root)} {list(path)}: U+FFFD replacement character')
    return bad


@pytest.mark.parametrize('root', [paths.DATA, paths.DATA_ODR], ids=['odr-original', 'odr'])
def test_data_is_nfc_without_tildes(root):
    bad = _problems(root)
    assert not bad, f'{len(bad)} strings:\n' + '\n'.join(bad[:20])
