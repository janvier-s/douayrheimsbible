import re
import sys

def main():
    xml_path = 'sources/eebo-tcp/A16049.xml'
    with open(xml_path, 'r', encoding='utf-8') as f:
        content = f.read()

    front_end = content.find('</front>')
    if front_end == -1:
        print("Error: </front> not found")
        sys.exit(1)

    front_xml = content[:front_end]
    rest_xml = content[front_end:]

    # Map of gap replacements
    # We will identify gaps by index (1 to 86) and verify their context
    gap_regex = re.compile(r'<gap\b[^>]*>.*?</gap>', re.DOTALL)
    gaps = list(gap_regex.finditer(front_xml))
    print(f"Found {len(gaps)} gaps in front.")

    if len(gaps) != 86:
        print(f"Error: expected 86 gaps, found {len(gaps)}")
        sys.exit(1)

    # Dictionary of replacements for all 86 gaps
    # For Greek foreign gaps, we use <foreign xml:lang="grc">...</foreign>
    replacements = {
        1: 'e',                                      # vvere extant
        2: 'n',                                      # then before
        3: 'a',                                      # Lay mens
        4: 'laietie',                                # Hovv the laietie of
        5: ' c',                                     # Hiero. ep. 103 c. 6.
        6: 'a',                                      # De agone Christ. c. 33.
        7: 'o',                                      # erroneously
        8: 'ias',                                    # Iosias Simlerus (note: in xml it is Iost<gap> Sim lerus -> we can fix Iost<gap> to Iosias)
        9: 'c',                                      # Luc. 13.
        10: 'r',                                     # De doctr.
        11: 's',                                     # Many causes
        12: 's',                                     # rudenesse / rudenes
        13: '<foreign xml:lang="grc">προΐστασθαι</foreign>',
        14: '<foreign xml:lang="grc">ἐνεκαίνισεν</foreign>',
        15: 'c',                                     # Cochla. / Cochlae.
        16: 'a',                                     # authorit-
        17: 'te',                                    # -ate.
        18: 'truer',                                 # It is truer then
        19: '<foreign xml:lang="grc">πᾶν πνεῦμα ὃ λύει τὸν ἰησοῦν χριστὸν</foreign>',
        20: '<foreign xml:lang="grc">δικαιώματα</foreign>',
        21: '<foreign xml:lang="grc">καιρῷ</foreign>',
        22: '<foreign xml:lang="grc">εἰς ὑπόκρισιν</foreign>',
        23: 'p',                                     # Crispins
        24: "'",                                     # mark in Greek text thus '
        25: 'u',                                     # auncient
        26: '<foreign xml:lang="grc">διὰ τῶν ἀγαθῶν ἔργων</foreign>',
        27: '<foreign xml:lang="grc">εὐλογήσας αὐτά</foreign>',
        28: '<foreign xml:lang="grc">ἡλίκην ὕλην</foreign>',
        29: '<foreign xml:lang="grc">ἀπαρχὰς</foreign>',
        30: '<foreign xml:lang="grc">τὸ ὑμῶν ζῆλος</foreign>',
        31: '<foreign xml:lang="grc">κενοφωνίας</foreign>',
        32: '<foreign xml:lang="grc">καὶ τῆς δικαιοσύνης</foreign>',
        33: '<foreign xml:lang="grc">πυκνῇ</foreign>',
        34: '<foreign xml:lang="grc">πυγμῇ</foreign>',
        35: '<foreign xml:lang="grc">πρῶτος</foreign>',
        36: '<foreign xml:lang="grc">νῖκος</foreign>',
        37: '<foreign xml:lang="grc">νεῖκος</foreign>',
        38: '<foreign xml:lang="grc">ὃ ἐστι κοδράντης</foreign>',
        39: '<foreign xml:lang="grc">αὕτη ἐστιν ἔρημος</foreign>',
        40: '<foreign xml:lang="grc">τοῦ καινὰν</foreign>',
        41: 'o',                                     # An. Do.
        42: '<foreign xml:lang="grc">δικαιώματα</foreign>',
        43: '<foreign xml:lang="grc">παραδόσεις</foreign>',
        44: '<foreign xml:lang="grc">πρεσβυτέρους</foreign>',
        45: '<foreign xml:lang="grc">εἴδωλα</foreign>',
        46: 'v.',                                    # Luc. 22. v. 20.
        47: '2',                                     # 20.
        48: '<foreign xml:lang="grc">πέπεισμαι</foreign>',
        49: 'ſeſſ',                                  # Conc. Trid. sess. 4.
        50: 'œ',                                     # Poenitentiam
        51: 'œ',                                     # poenitentiam
        52: 'œ',                                     # poenitemini
        53: '<foreign xml:lang="grc">μετανοεῖτε</foreign>',
        54: 'un',                                    # habebuntur
        55: 'e',                                     # promeretur
        56: 'œ',                                     # poenitentia
        57: ' Ia',                                   # Mat. 16. Ia. 2. (in xml Mat. 16. la<gap>. 2.)
        58: 't',                                     # at the end
        59: 'o',                                     # circumcisio
        60: 'a',                                     # Gehenna
        61: 's',                                     # causes
        62: '<foreign xml:lang="grc">μὴ μετεωρίζεσθε</foreign>',
        63: '<foreign xml:lang="grc">τὰ ἐνόντα</foreign>',
        64: '<foreign xml:lang="grc">ἐν παντὶ</foreign>',
        65: '<foreign xml:lang="grc">λατρεύσεις</foreign>',
        66: '<foreign xml:lang="grc">προσήλυτος</foreign>',
        67: '<foreign xml:lang="grc">ἡ λατρεία</foreign>',
        68: '<foreign xml:lang="grc">ἀνακεφαλαιώσασθαι</foreign>',
        69: '<foreign xml:lang="grc">ἐχαρίτωσεν</foreign>',
        70: '<foreign xml:lang="grc">πανοπλίαν</foreign>',
        71: '<foreign xml:lang="grc">πρεσβυτέρους</foreign>',
        72: '<foreign xml:lang="grc">καταξιωθῆναι</foreign>',
        73: '<foreign xml:lang="grc">ἐκχυνόμενον</foreign>',
        74: '<foreign xml:lang="grc">παραδόσεις</foreign>',
        75: '<foreign xml:lang="grc">ποίμαινε</foreign>',
        76: '<foreign xml:lang="grc">τὸ ποτήριον ἐν τῷ αἵματί μου τὸ ἐκχυνόμενον</foreign>',
        77: '<foreign xml:lang="grc">ὃν δεῖ οὐρανὸν δέξασθαι</foreign>',
        78: ':',                                     # S. Paul:
        79: 't',                                     # al-tered
        80: 'r',                                     # altered
        81: '<foreign xml:lang="grc">ἀξίως τοῦ κυρίου εἰς πᾶσαν ἀρέσκειαν</foreign>',
        82: 'r',                                     # placuerunt
        83: 'eon',                                   # haereseon
        84: 'I',                                     # Iuel
        85: 's',                                     # potions
        86: 'eon',                                   # haereseon
    }

    # Perform substitutions from back to front so offsets don't change
    new_front = front_xml
    for idx in range(len(gaps), 0, -1):
        m = gaps[idx - 1]
        start, end = m.span()
        repl = replacements[idx]
        new_front = new_front[:start] + repl + new_front[end:]

    # Also fix typo anomalies connected to gaps:
    # Gap 8: "Ioſt" + "ias" -> "Ioſias" (replace "Ioſtias" with "Ioſias")
    new_front = new_front.replace('Ioſtias', 'Ioſias')
    # Gap 57: "la Ia. 2." -> "Ia. 2." (in xml "la" was misread "Ia")
    new_front = new_front.replace('la Ia. 2.', 'Ia. 2.')

    # Remove duplicated note on Page 19:
    # In XML:
    # <note place="margin">Againſt only faith.</note> in the Greeke, <hi>Bleſſed are they that doe his commaunde<g ref="char:EOLhyphen"/>ments. Rom. 8, 38. Certus ſum &amp;c.</hi>
    #                <note place="margin">Againſt only faith.</note>
    dup_note_pattern = re.compile(
        r'(<note place="margin">Againſt only faith\.</note>\s*in the Greeke,.*?Rom\. 8, 38\. Certus ſum &amp;c\.</hi>)'
        r'(\s*<note place="margin">Againſt only faith\.</note>)',
        re.DOTALL
    )
    if not dup_note_pattern.search(new_front):
        print("Warning: duplicated 'Againſt only faith.' pattern not found!")
    else:
        new_front = dup_note_pattern.sub(r'\1', new_front)
        print("Successfully removed duplicated 'Againſt only faith.' note on Page 19.")

    full_new = new_front + rest_xml

    # Check that XML is well-formed
    import xml.etree.ElementTree as ET
    try:
        ET.fromstring(full_new.encode('utf-8'))
        print("XML successfully parsed by ElementTree! Well-formedness verified.")
    except Exception as e:
        print(f"XML parsing ERROR: {e}")
        sys.exit(1)

    with open(xml_path, 'w', encoding='utf-8') as f:
        f.write(full_new)

    print(f"Successfully backfilled front matter in {xml_path}")

if __name__ == '__main__':
    main()
