"""The OCR readers are in sources.py now; this name stays for the callers that import it."""
import sys

from . import sources

sys.modules[__name__] = sources
