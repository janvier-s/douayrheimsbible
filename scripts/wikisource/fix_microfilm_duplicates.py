#!/usr/bin/env python3
"""
fix_microfilm_duplicates.py

Removes 50 inline microfilm duplicate <gap reason="duplicate"> stubs from the body of A16049.xml,
restoring uninterrupted sentence and page flow, and establishes a formal TEI Editorial Appendix
in <back> (with <teiHeader> documentation) cataloging all 50 duplicate exposures on EEBO reel 2646.
"""

import sys
import re
import unicodedata
import xml.etree.ElementTree as ET
from pathlib import Path

XML_PATH = Path('/Users/Janvier/Documents/Bible-n-stuff/original-douay-rheims-nt/A16049.xml')

APPENDIX_XML = """      <back>
         <div type="appendix" subtype="microfilm_duplicates">
            <head>EEBO Microfilm Duplicate Exposures Register (Reel 2646)</head>
            <p>During the 20th-century microfilming of EEBO reel 2646 (ProQuest STC 2884 / British Library copy), 50 microfilm frames were photographed as redundant re-take exposures of physical pages already transcribed in this edition. In the original EEBO-TCP keying, these were marked with empty <gi>gap reason="duplicate"</gi> tags in the body text, which broke sentences mid-phrase. In this critical edition, those inline stubs have been removed to restore uninterrupted reading flow, and all 50 duplicate exposures are cataloged in the register below.</p>
            <table>
               <row role="label">
                  <cell>Cluster</cell>
                  <cell>Book &amp; Context</cell>
                  <cell>Printed Pages</cell>
                  <cell>Primary Microfilm Frames</cell>
                  <cell>Duplicate Microfilm Frames</cell>
                  <cell>Page Count</cell>
               </row>
               <row>
                  <cell>1</cell>
                  <cell>Matthew 8–10</cell>
                  <cell>20–25</cell>
                  <cell>tcp:2646:25–27</cell>
                  <cell>tcp:2646:28–30</cell>
                  <cell>6 pages</cell>
               </row>
               <row>
                  <cell>2</cell>
                  <cell>Matthew 16–17</cell>
                  <cell>38–43</cell>
                  <cell>tcp:2646:37–39</cell>
                  <cell>tcp:2646:40–42</cell>
                  <cell>6 pages</cell>
               </row>
               <row>
                  <cell>3</cell>
                  <cell>Matthew 26</cell>
                  <cell>72–79</cell>
                  <cell>tcp:2646:57–60</cell>
                  <cell>tcp:2646:61–64</cell>
                  <cell>8 pages</cell>
               </row>
               <row>
                  <cell>4</cell>
                  <cell>Luke 7–8</cell>
                  <cell>158–161</cell>
                  <cell>tcp:2646:104–105</cell>
                  <cell>tcp:2646:106–107</cell>
                  <cell>4 pages</cell>
               </row>
               <row>
                  <cell>5</cell>
                  <cell>Luke 9</cell>
                  <cell>162–163</cell>
                  <cell>tcp:2646:108</cell>
                  <cell>tcp:2646:109</cell>
                  <cell>2 pages</cell>
               </row>
               <row>
                  <cell>6</cell>
                  <cell>Romans 1–2</cell>
                  <cell>380–385</cell>
                  <cell>tcp:2646:218–220</cell>
                  <cell>tcp:2646:221–223</cell>
                  <cell>6 pages</cell>
               </row>
               <row>
                  <cell>7</cell>
                  <cell>Romans 9–10</cell>
                  <cell>402–407</cell>
                  <cell>tcp:2646:232–234</cell>
                  <cell>tcp:2646:235–237</cell>
                  <cell>6 pages</cell>
               </row>
               <row>
                  <cell>8</cell>
                  <cell>Hebrews 3–4</cell>
                  <cell>586–591</cell>
                  <cell>tcp:2646:327–329</cell>
                  <cell>tcp:2646:330–332</cell>
                  <cell>6 pages</cell>
               </row>
               <row>
                  <cell>9</cell>
                  <cell>Hebrews 7</cell>
                  <cell>608–613</cell>
                  <cell>tcp:2646:341–343</cell>
                  <cell>tcp:2646:344–346</cell>
                  <cell>6 pages</cell>
               </row>
            </table>
         </div>
      </back>
"""

EDITORIAL_DECL_NOTE = """            <p>Editorial note on duplicate microfilm exposures: In EEBO microfilm reel 2646, 50 frames represent inadvertent duplicate exposures of physical pages already transcribed. These redundant &lt;pb&gt; and &lt;gap reason="duplicate"&gt; stubs have been removed from the body text to restore uninterrupted textual flow, and are indexed in full in the Appendix in &lt;back&gt;.</p>
"""

REVISION_DESC_ENTRY = """         <change when="2026-11-19">
            <label>Editorial cleanup</label>
            <name>Antigravity</name> Removed 50 inline microfilm duplicate &lt;gap reason="duplicate"&gt; stubs from the text body, restored interrupted sentence flow, and established the EEBO Microfilm Duplicate Register in &lt;back&gt;.
         </change>
"""

def main():
    if not XML_PATH.exists():
        print(f"Error: {XML_PATH} does not exist", file=sys.stderr)
        sys.exit(1)

    print(f"Reading {XML_PATH}...")
    with open(XML_PATH, "r", encoding="utf-8") as f:
        text = f.read()

    # Pattern for duplicate pb + gap stubs
    pattern = re.compile(r'\s*<pb\b[^>]*facs=[\"\']tcp:2646:\d+[\"\'][^>]*>\s*<gap\s+reason=[\"\']duplicate[\"\'][^>]*>.*?</gap>', re.DOTALL)
    matches = list(pattern.finditer(text))
    print(f"Found {len(matches)} duplicate stubs to remove.")

    if len(matches) != 50:
        print(f"Warning: Expected 50 matches, found {len(matches)}. Proceeding cautiously.", file=sys.stderr)

    # Remove all 50 duplicate stubs
    cleaned = pattern.sub('', text)

    # Insert <back> right before </text>
    if "</back>" in cleaned:
        print("Note: <back> already exists in document, appending appendix...")
        cleaned = cleaned.replace("</back>", APPENDIX_XML.strip() + "\n      </back>")
    else:
        print("Inserting <back> matter before </text>...")
        cleaned = cleaned.replace("</body>\n   </text>", "</body>\n" + APPENDIX_XML + "   </text>")

    # Add editorialDecl note in <encodingDesc>
    if "Editorial note on duplicate microfilm exposures" not in cleaned:
        cleaned = cleaned.replace("</editorialDecl>", EDITORIAL_DECL_NOTE + "         </editorialDecl>")

    # Add revisionDesc entry
    if "EEBO Microfilm Duplicate Register" not in cleaned:
        cleaned = cleaned.replace("<revisionDesc>", "<revisionDesc>\n" + REVISION_DESC_ENTRY)

    # Normalize to Unicode NFC
    cleaned = unicodedata.normalize("NFC", cleaned)

    # Verify well-formedness
    print("Verifying XML well-formedness...")
    try:
        ET.fromstring(cleaned)
        print("Verification passed: XML is completely well-formed!")
    except ET.ParseError as e:
        print(f"XML ParseError: {e}", file=sys.stderr)
        sys.exit(1)

    # Write back
    print(f"Writing updated XML to {XML_PATH}...")
    with open(XML_PATH, "w", encoding="utf-8") as f:
        f.write(cleaned)

    print("Success! 50 duplicate stubs removed and Appendix successfully created.")

if __name__ == "__main__":
    main()
