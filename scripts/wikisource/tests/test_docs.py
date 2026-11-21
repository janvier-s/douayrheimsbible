"""The Wikisource docs agree with the code: every lint code and fidelity feature maps to a rule
in RULES.md, every rule names what enforces it, and retired rules stay retired."""
import re
from pathlib import Path

import pytest

from rhemes import fidelity
from rhemes import lint

REPO = Path(__file__).resolve().parents[3]
WS = REPO / 'wikisource/1582-rhemes-nt'
RULES = WS / 'RULES.md'
DOCS = [RULES, WS / 'PLAYBOOK.md', WS / 'README.md', WS / 'BOOKS.md', REPO / 'AGENTS.md']
CODE = re.compile(r'`([EW]-[a-z-]+)`')
ENFORCED = re.compile(r'^Enforced by:(.*)$', re.M)


def lint_codes():
    return set(re.findall(r'^\s+([EW]-[a-z-]+)\s', lint.__doc__, re.M))


def index_rows():
    """[(name, kind, '§N.M')] from the table under '## Enforcement index'."""
    text = RULES.read_text().split('## Enforcement index', 1)
    if len(text) < 2:
        return []
    return re.findall(r'^\|\s*`([^`]+)`\s*\|\s*(lint|feature)\s*\|\s*(§\d+\.\d+)\s*\|', text[1], re.M)


def rule_blocks(text=None):
    """{'§N.M': text of the ### N.M block, up to the next ## or ### heading}; a repeated number is an error."""
    text = (RULES.read_text() if text is None else text).split('## Enforcement index', 1)[0]
    parts = re.split(r'^(#{2,3} .*)$', text, flags=re.M)
    blocks = {}
    for head, body in zip(parts[1::2], parts[2::2]):
        m = re.match(r'### (\d+\.\d+) ', head)
        if m:
            key = '§' + m.group(1)
            if key in blocks:
                raise ValueError(f'rule {key} appears twice')
            blocks[key] = body
    return blocks


PLAIN_ENFORCERS = {'generator', 'golden tests', 'wikipost', 'reconcile verify', 'books.json', 'ladder', 'review (no code)'}


def bad_enforcers(line):
    """Items of an Enforced by line that are neither a real lint code or feature nor a known enforcer."""
    known = lint_codes() | set(fidelity.FEATURES)
    bad = []
    for item in (s.strip() for s in line.split(',')):
        m = re.fullmatch(r'`([^`]+)`', item)
        if not (m.group(1) in known if m else item in PLAIN_ENFORCERS):
            bad.append(item)
    return bad


def section_refs(text):
    """Every §N or §N.M named in a text."""
    return set(re.findall(r'§\d+(?:\.\d+)?', text))


def enforced_lines(block):
    return [s.strip() for s in ENFORCED.findall(block)]


def test_every_lint_code_has_a_rule():
    missing = lint_codes() - {n for n, k, _ in index_rows() if k == 'lint'}
    assert not missing, sorted(missing)


def test_every_fidelity_feature_has_a_rule():
    missing = set(fidelity.FEATURES) - {n for n, k, _ in index_rows() if k == 'feature'}
    assert not missing, sorted(missing)


def test_index_names_only_real_codes():
    rows = index_rows()
    bad = [n for n, k, _ in rows if k == 'lint' and n not in lint_codes()]
    bad += [n for n, k, _ in rows if k == 'feature' and n not in fidelity.FEATURES]
    assert rows and not bad, bad


def test_index_sections_exist():
    blocks = rule_blocks()
    rows = index_rows()
    assert rows and not [s for _, _, s in rows if s not in blocks]


def test_index_matches_enforced_by():
    blocks = rule_blocks()
    rows = index_rows()
    assert rows
    for name, _, sec in rows:
        line = ' '.join(enforced_lines(blocks.get(sec, '')))
        assert f'`{name}`' in line, (name, sec)
    known = lint_codes() | set(fidelity.FEATURES)
    listed = {(n, s) for n, _, s in rows}
    for sec, block in blocks.items():
        for tok in re.findall(r'`([^`]+)`', ' '.join(enforced_lines(block))):
            if tok in known or CODE.fullmatch(f'`{tok}`'):
                assert (tok, sec) in listed, (tok, sec)


def test_every_rule_names_its_enforcer():
    blocks = rule_blocks()
    assert blocks
    for sec, block in blocks.items():
        lines = enforced_lines(block)
        assert len(lines) == 1 and lines[0], sec


def test_retired_rules_absent():
    retired = ['† verse start', 'bot approval', 'changed_since_post', 'only where the scan shows it', 'SIG_FIRST',
               '`.git/odr-data.lock`']
    for doc in DOCS:
        found = [r for r in retired if r in doc.read_text()]
        assert not found, (doc.name, found)


def test_agents_md_is_short():
    text = (REPO / 'AGENTS.md').read_text()
    section = text.split('\n## 1.', 1)[1].split('\n## 2.', 1)[0]
    assert len(section.splitlines()) <= 40
    assert 'RULES.md' in section and 'PLAYBOOK.md' in section


# ---- stricter checks (final review 2026-11-21) ---------------------------------------

def test_bad_enforcers_flags_unknown_items():
    assert bad_enforcers('tbd') == ['tbd']
    assert bad_enforcers('review') == ['review']
    assert bad_enforcers('`E-nope`, generator') == ['`E-nope`']
    assert bad_enforcers('`E-ital`, `ls`, generator, golden tests, wikipost, reconcile verify, books.json, ladder, review (no code)') == []


def test_every_rule_uses_known_enforcers():
    for sec, block in rule_blocks().items():
        assert not bad_enforcers(enforced_lines(block)[0]), sec


def test_duplicate_rule_heading_rejected():
    with pytest.raises(ValueError):
        rule_blocks('## 6. Data\n\n### 6.4 New\n\nx\n\n### 6.4 Old\n\nEnforced by: generator\n')


def test_section_refs_finds_rule_and_section_numbers():
    assert section_refs('see RULES §9.4, (RULES §7) and §1.1.') == {'§9.4', '§7', '§1.1'}


def test_every_section_reference_exists():
    text = RULES.read_text()
    known = set(rule_blocks()) | {'§' + n for n in re.findall(r'^## (\d+)\. ', text, re.M)}
    for doc in DOCS:
        missing = section_refs(doc.read_text()) - known
        assert not missing, (doc.name, sorted(missing))
