"""Old script names forward to the rhemes package (kept for one release; spec §4.3)."""
import importlib
import sys


def run(name, module, cmd=None):
    """Imported: the old module name becomes the package module itself. Run: print the new command, then run it."""
    mod = importlib.import_module(module)
    if name != '__main__':
        sys.modules[name] = mod
        return
    old = sys.argv[0].rsplit('/', 1)[-1]
    if cmd is None:
        sys.exit(f'{old} is a library now ({module}); run python3 -I scripts/wikisource/rh.py for the commands')
    print(f'{old} is now: python3 -I scripts/wikisource/rh.py {cmd}', file=sys.stderr)
    sys.exit(mod.main(sys.argv[1:]))
