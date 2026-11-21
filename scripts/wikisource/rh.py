"""The one entry point for the 1582 Rhemes NT Wikisource tools.

python3 -I scripts/wikisource/rh.py <command> [args...]
"""
import importlib
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

# command -> (module in rhemes/, argv put before the user's arguments)
COMMANDS = {
    'generate': ('generate', []),        # REPO BOOK FIRST OUT [MAXP] [--ornaments]
    'lint': ('lint', []),                # PAGES_DIR [--only …] [--skip …] [--quiet]
    'triage': ('triage', []),            # [BOOK…] [--detail KIND] [--accept BOOK KIND] …
    'diff xml': ('xmldiff', []),         # BOOK [out.tsv]
    'diff ocr': ('ocrdiff', []),         # BOOK OUT_DIR
    'reconcile': ('reconcile', []),      # diff|ladder|adopt|write|verify BOOK …
    'status': ('reconcile', ['status']), # [--write]
    'fetch': ('wikifetch', []),          # FIRST-LAST OUT_DIR [--index …]
    'live-check': ('livecheck', []),     # [PAGES…] [--all-overwritten] [--pending]
    'post': ('wikipost', []),            # FIRST-LAST [--post] [--summary …] …
    'ocr-split': ('transkribus', []),    # STRIP_DIR XML_DIR [OUT]
    'crops': ('cropsheet', []),          # MARKDIFF.json OUT.jpg A-B [filter]
    'ornaments': ('ornaments', []),      # detect|clean|sheet|dedupe|commons|review OUT … (needs numpy/scipy)
    'fix check': ('fixes', ['check']),   # [BOOK…] [--repo R] [--fixes D]
    'fix apply': ('fixes', ['apply']),   # BOOK [--write] [--only ID,…] [--repo R] [--fixes D]
    'fix propose-diff': ('fixderive', []),  # xml REV_A REV_B --out DIR [--repo XML_REPO]
}


def resolve(argv):
    """(module, argv for its main) for a command line, or None."""
    if len(argv) >= 2 and f'{argv[0]} {argv[1]}' in COMMANDS:
        mod, lead = COMMANDS[f'{argv[0]} {argv[1]}']
        return mod, lead + argv[2:]
    if argv and argv[0] in COMMANDS:
        mod, lead = COMMANDS[argv[0]]
        return mod, lead + argv[1:]
    return None


def main(argv):
    r = resolve(argv)
    if not r:
        print(__doc__ + '\ncommands:\n' + '\n'.join(f'  {c}' for c in COMMANDS))
        return 2
    mod, args = r
    from rhemes.lock import LockHeld
    try:
        return importlib.import_module(f'rhemes.{mod}').main(args)
    except LockHeld as e:
        print(e, file=sys.stderr)
        return 3


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
