import re
import sys
import xml.etree.ElementTree as ET

# Dictionary of replacements for all 267 content gaps in Matthew
# Gaps are ordered 1 to 267 (skipping the 20 facsimile duplicate-page gaps)
replacements = {
    1: '2',                                      # 2. Reg. 7.
    2: 'e',                                      # Natiuitie
    3: '2',                                      # Os. 11, 2.
    4: 'n',                                      # vnction
    5: 'B',                                      # B. Sacrament
    6: 'n',                                      # Plin. li. 20.
    7: '3',                                      # Esther 1, 13. 14.
    8: '2',                                      # Amb. 1. Off. c. 12.
    9: '28',                                     # Aug. ep. 28.
    10: '7',                                     # pag. 711.
    11: 'u',                                     # de cuſtod. virg. (with de eu -> de cu fix)
    12: 'and',                                   # fathers and reaſon.
    13: '<foreign xml:lang="grc">Μετανοεῖν</foreign>',
    14: '<foreign xml:lang="grc">Μετάνοια</foreign>',
    15: '<foreign xml:lang="grc">μετάνοιαν</foreign>',
    16: '8',                                     # See Hebr. 9, 8.
    17: 't',                                     # to prepare
    18: 'e',                                     # Galilee.
    19: 'a',                                     # Igna. ep. 5.
    20: 'e',                                     # de Quadrag.
    21: 'c',                                     # ad Marcel. adu. Montanum.
    22: 'n',                                     # Contemne not Lent
    23: 'ma',                                    # de Quadrageſima, of Lent
    24: '2',                                     # Petil. li. 2. c.
    25: '51',                                    # c. 51. to. 7.
    26: 'a',                                     # thou adore
    27: 'L',                                     # Latrîa. Dulia.
    28: '<foreign xml:lang="grc">λατρεύσεις</foreign>',
    29: 'u',                                     # Ciuit. c. 1.
    30: 'c',                                     # Conc. Nic. 2.
    31: 'f',                                     # perfite:
    32: '2',                                     # 27 Aduoutrie
    33: '3',                                     # 31 Diuorce
    34: '33',                                    # 33 Swearing
    35: 'h',                                     # hel.
    36: '2',                                     # Exo. 21, 24.
    37: 'may',                                   # malefactours may ſuffer
    38: '<foreign xml:lang="grc">Μισθὸς</foreign>',
    39: 'F',                                     # cont. Fauſt. c. 17.
    40: '3',                                     # in Pſ. 30.
    41: 'ly i',                                  # truely iuſt
    42: '3',                                     # Heb. 13,
    43: '1',                                     # 1.
    44: '32',                                    # 32. Excepting the cauſe
    45: 't',                                     # aduoutrie.
    46: '32',                                    # 32. Committeth aduontrie.]
    47: '8',                                     # Io. 18. Act. 23.
    48: '9',                                     # 19 Their end alſo
    49: '<foreign xml:lang="grc">τὸν ἐπιούσιον</foreign>',
    50: 'c',                                     # li. perf. iuſt. c. 8.
    51: '8',                                     # 8.
    52: '<foreign xml:lang="grc">τὸν ἐπιούσιον</foreign>',
    53: 'a',                                     # duas ep.
    54: 'c',                                     # li. 1. c. 14.
    55: 'I',                                     # Iud. 20, 26.
    56: 'Ioel',                                  # Ioel. 2, 15.
    57: '8',                                     # 8. Euery one that aſketh.]
    58: '7',                                     # Ro. 16, 17.
    59: '5',                                     # Luc. 9, 59.
    60: 'n',                                     # Dathan and his complices
    61: '2',                                     # Preph. li. 2. c. 19. 20.
    62: '8',                                     # 8. Not worthy.]
    63: 'e',                                     # Hierom ſayth
    64: '8',                                     # Socrat. li. 1. c. 8.
    65: '8',                                     # Aug. ep. 80.
    66: '8',                                     # 8. To men.)
    67: '7',                                     # Euſeb. li. 7 c. 14. hiſt.
    68: 'i',                                     # Iulian the Apoſtata
    69: '8',                                     # 28. Do you beleeue that I can.]
    70: '8',                                     # 38. Pray therfore.)
    71: '3',                                     # See Act. 13, 2.
    72: '2',                                     # 2.
    73: ':',                                     # what to speake: for ″ it shal
    74: 't',                                     # houſe toppes.
    75: 'r',                                     # farthing:
    76: '6',                                     # noui Teſt. 1556.
    77: '6',                                     # Socrat. li. 6 c. 14.
    78: '1',                                     # Aug. li. 1 de Bapt. c. 19.
    79: 'ir',                                    # feele their owne
    80: '<foreign xml:lang="grc">μετάνοια</foreign>',
    81: '<foreign xml:lang="grc">οἱ ἐν μετανοίᾳ ὄντες</foreign>',
    82: '<foreign xml:lang="grc">τοὺς μετανοοῦντας</foreign>',
    83: '3',                                     # Mt. 18, 3.
    84: '2',                                     # 22 His caſting out
    85: '1',                                     # Lu. 6, 1.
    86: 'e',                                     # Felic.
    87: 'o',                                     # Manichæo.
    88: '1',                                     # Ion. 2, 1.
    89: '1',                                     # Iulij 10.
    90: 'i',                                     # ioyning
    91: '5',                                     # Ep. 58.
    92: 'i',                                     # euident
    93: '2',                                     # 32. Nor in the world to come.]
    94: '8',                                     # 48. Who is my mother.]
    95: 'e',                                     # Nette
    96: 's',                                     # ſeruants
    97: '6',                                     # 6 Sunday after the Epiphanie.
    98: '*',                                     # * in Samaria
    99: '6',                                     # Aug. de Fid. & Op. c. 16.
    100: '2',                                    # 2. Theſ. 2, 15.
    101: '13',                                   # doctrine: 13 and Peter
    102: 'a',                                    # ſaluation
    103: 's',                                    # deceaſe
    104: '8',                                    # 18. And I ſay to thee.]
    105: '8',                                    # 18. Thou art Peter.]
    106: '4',                                    # Cyril. li. 4 c. 12
    107: 'c',                                    # hunc locum
    108: 'u',                                    # waues
    109: '</note> <note place="margin">* ',       # separating the two notes
    110: '8',                                    # Ep. 89.
    111: '8',                                    # 18. Rocke.]
    112: '8',                                    # 18. Build my Church.]
    113: '5',                                    # Io. 21, 15.
    114: 'cr',                                   # De vtil. cred. c. 17.
    115: '3',                                    # Greg. li. 4. ep. 32. ind. 11.
    116: '2',                                    # Eſa. 22, 22
    117: 'f',                                    # cheefe
    118: '21',                                   # Apoc. 21.
    119: '2',                                    # 22 and then againe
    120: 'n',                                    # and
    121: 'c',                                    # inculcate
    122: '2',                                    # Exo. 3, 2.
    123: 'o',                                    # Hilarionis
    124: '7',                                    # q. 75. to. 4.
    125: '23',                                   # wo to come. 23 and ſhevving
    126: 'm',                                    # contemned
    127: '1',                                    # li. 1. c. 17.
    128: '16',                                   # Mat. 16, 19.
    129: 'pœnit',                                # Li. 1. de pœnit. c. 2.
    130: '<foreign xml:lang="grc">χωροῦσι</foreign>',
    131: 'f',                                    # Aug. de fid, & op.
    132: 'o',                                    # votiue
    133: ' n',                                   # De nupt. & concupiſ.
    134: 'v',                                    # votiue
    135: 'e',                                    # S. Iames
    136: 'ij',                                   # Maij. 6.
    137: 'ſa',                                   # ſame life
    138: 'ni',                                   # virginit. c. 26.
    139: 're ele',                               # Feware elect.] -> Few are elect.]
    140: 'beleeue',                              # for men beleeue not
    141: '27.',                                  # Mt. 16, 27.
    142: '28',                                   # 28. As the ſonne of man.]
    143: '4',                                    # Io. 13, 14.
    144: '18',                                   # 18 He curſeth alſo
    145: 'c',                                    # curſeth
    146: 'f',                                    # fruitles leafe tree
    147: '✝',                                    # verse start
    148: '<g ref="char:halfcross">⊢</g>',          # end of reading: Prophet. ⊢
    149: 't',                                    # colt.]
    150: ': ',                                   # obtaine or no: but on Gods part
    151: 'k',                                    # Mark. 11, 22.
    152: 's',                                    # Haeretikes runne
    153: 'r',                                    # They ranne
    154: '46',                                   # 46 and ſo he putteth
    155: 's',                                    # Sectes
    156: '″',                                    # made a ″ mariage
    157: '″',                                    # ſent his ″ ſeruants
    158: '″',                                    # vvaies, ″ one to his farme
    159: '<g ref="char:halfcross">⊢</g>',          # fevv elect. ⊢
    160: '″',                                    # are Caeſars, ″ to Caeſar
    161: '″',                                    # maried: but are ″ as the Angels
    162: '″',                                    # liuing. ″ And the multitudes hearing
    163: '✝',                                    # ✝ On theſe tvvo
    164: '3',                                    # hom. 38.
    165: '1',                                    # 21. To Caeſar.)
    166: 'b',                                    # hab. Virg.
    167: '″',                                    # ſaying, ″ Vpon the chaire
    168: '″',                                    # Al things therfore ″ vvhatſoeuer
    169: '″',                                    # And they ″ loue the firſt places
    170: 'r',                                    # your
    171: 'r',                                    # your
    172: '″',                                    # Neither * be ye called ″ maiſters
    173: '<g ref="char:halfcross">⊢</g>',          # ſhal be exalted. ⊢
    174: '″',                                    # But vvo to you ″ Scribes
    175: '″',                                    # praying long prayers
    176: '″',                                    # hel ″ double more
    177: '″',                                    # altar that ″ ſanctifieth
    178: '″',                                    # ſvveareth by it and ″ by him
    179: 'n',                                    # gnat
    180: '`',                                    # `they are ful
    181: '″',                                    # outvvardly in deede ″ appeare
    182: '″',                                    # and ″ garniſh
    183: '<g ref="char:halfcross">⊢</g>',          # name of our Lord. ⊢
    184: 'i',                                    # prouiding
    185: '″',                                    # there ſhal ″ not be left
    186: '″',                                    # vvhat ſhal be ″ the ſigne
    187: '″',                                    # Bevvare that no man ″ ſeduce
    188: '″',                                    # ſaying, ″ I am Chriſt
    189: '⸬',                                    # And many ⸬ falseprophets
    190: '″',                                    # And because ″ iniquitie
    191: '<g ref="char:halfcross">⊢</g>',          # he ſhal be ſaued. ⊢
    192: '″',                                    # kingdom ″ ſhal be preached
    193: '″',                                    # ſee ″ the abomination
    194: '″',                                    # daies ″ ſhal be ſhortened
    195: '″',                                    # ſhal ſhevv ″ great ſignes
    196: '″',                                    # behold ″ in the cloſets
    197: '″',                                    # And ″ immediatly after
    198: '<g ref="char:halfcross">⊢</g>',          # ſhal not paſſe. ⊢
    199: 'r',                                    # houre
    200: '3',                                    # Euſeb. li. 3. c. 6.
    201: 'quòd',                                 # Mt. 16. Li. adu. Gentes quòd Chriſtus ſit Deus
    202: 'r',                                    # Chryſoſtome
    203: '″',                                    # ten ″ virgins
    204: '″',                                    # their ″ lampes
    205: 'e',                                    # take
    206: 'e',                                    # bridegrome
    207: 'gh',                                   # midnight
    208: 'eth',                                  # cometh
    209: '″',                                    # receiued mine ovvne ″ vvith vſurie
    210: '″',                                    # that alſo vvhich ″ he ſeemeth to haue
    211: '″',                                    # before him, and ″ he ſhal ſeparate
    212: 'c',                                    # annot. c. 20, 23.
    213: '″',                                    # hungred, and ″ you gaue me
    214: 'r',                                    # anſvwer
    215: '″',                                    # left hand, ″ Get ye avvay
    216: '″',                                    # hungred, and ″ you gaue me not
    217: 'n',                                    # Virgins.]
    218: 'h',                                    # hath them
    219: 'o',                                    # ointmēt
    220: 'n',                                    # denied
    221: '″',                                    # whereto is ″ this vvaſt?
    222: '″',                                    # vvrought a ″ good vvorke
    223: '″',                                    # you: but ″ me you haue not
    224: 'we',                                   # Hereby we learne
    225: '″',                                    # vvith his ″ tvvelue Diſciples
    226: '″',                                    # IESVS ″ tooke bread
    227: '″',                                    # and ″ bleſſed
    228: '″',                                    # Take ye, and eate: ″ THIS IS
    229: '″',                                    # THIS IS ″ MY BODY
    230: '″',                                    # And taking the chalice, ″ he gaue thankes
    231: '″',                                    # THIS IS ″ MY BLOVD
    232: '″',                                    # fruite of the vine, ″ vntil that day
    233: '″',                                    # neuertheleſſe ″ not as I vvil
    234: '″',                                    # came to him one ″ vvenche
    235: '″',                                    # Then he began ″ to curſe
    236: '8',                                    # Ambroſ li. 2 Off. c. 28.
    237: '2',                                    # 26. He tooke bread.)
    238: 'e',                                    # elements
    239: 'm',                                    # Concomitantiam
    240: 'r',                                    # our Aduerſaries
    241: '6',                                    # Mat. 26.
    242: '6',                                    # 26.
    243: '<foreign xml:lang="grc">εὐλογεῖν</foreign>',
    244: '<foreign xml:lang="grc">εὐλόγησεν αὐτοὺς</foreign>',
    245: '1',                                    # 1. Cor. 10.
    246: '<foreign xml:lang="grc">τὸν ἄρτον εὐχαριστηθέντα</foreign>',
    247: 'æ',                                    # S. Irenæe
    248: 'æ',                                    # gratiæ
    249: 'æ',                                    # actæ
    250: 'i',                                    # Nic. act. 6
    251: '<foreign xml:lang="grc">ἐκχυνόμενον</foreign>',
    252: '<foreign xml:lang="grc">κλώμενον</foreign>',
    253: '<foreign xml:lang="grc">διδόμενον</foreign>',
    254: '4',                                    # Io. 4.
    255: '3',                                    # 39. Not as I wil.)
    256: 'o',                                    # De orat.
    257: '1',                                    # Do. nu. 15.
    258: '5',                                    # ep. 53.
    259: 'i',                                    # in Euang.
    260: '2',                                    # Retract. c. 21.
    261: '″',                                    # condemned, ″ repenting him
    262: '″',                                    # ſaying, ″ I am innocent
    263: '″',                                    # vvhy haſt thou forſaken me? ″ And certaine
    264: 'e',                                    # Zebedee.
    265: 'n',                                    # Sabbatum ſan-ctum
    266: '18',                                   # appointed by the women) 18 and ſendeth them
    267: '✝',                                    # verse 19: ✝ going therfore teach ye al nations
}

def backfill(xml_path):
    print(f"Reading {xml_path}...")
    with open(xml_path, 'r', encoding='utf-8') as f:
        content = f.read()

    m_start = content.find('<div n="Matthew" type="gospel">')
    m_end = content.find('<div n="Mark" type="gospel">')

    if m_start == -1 or m_end == -1:
        print("Error: Matthew div boundary not found!")
        sys.exit(1)

    matthew_xml = content[m_start:m_end]

    # Find all gaps
    gap_regex = re.compile(r'<gap\b[^>]*>.*?</gap>', re.DOTALL)
    all_gaps = list(gap_regex.finditer(matthew_xml))
    print(f"Total gaps in Matthew: {len(all_gaps)}")

    dup_gaps = [g for g in all_gaps if 'reason="duplicate"' in g.group(0)]
    content_gaps = [g for g in all_gaps if 'reason="duplicate"' not in g.group(0)]

    print(f"Duplicate page gaps: {len(dup_gaps)} (preserved)")
    print(f"Content gaps to replace: {len(content_gaps)}")

    if len(content_gaps) != 267:
        print(f"Error: expected 267 content gaps, found {len(content_gaps)}")
        sys.exit(1)

    if len(replacements) != 267:
        print(f"Error: replacement dictionary has {len(replacements)} items, expected 267")
        sys.exit(1)

    new_matthew = matthew_xml
    # Replace in reverse order so character offsets of earlier gaps remain valid
    for idx in range(len(content_gaps), 0, -1):
        g = content_gaps[idx - 1]
        start, end = g.span()
        repl = replacements[idx]
        new_matthew = new_matthew[:start] + repl + new_matthew[end:]

    # Fix associated typos/anomalies identified in audit:
    # 1. Gap 11: "de e" + "u" -> "de cu" ("de euſtod." -> "de cuſtod.")
    new_matthew = new_matthew.replace('de euſtod.', 'de cuſtod.')

    # 2. Gap 25: "10. 7." was misread for "to. 7." (tome 7)
    new_matthew = new_matthew.replace('c. 51. 10. 7.', 'c. 51. to. 7.')

    # 3. Gap 139: "Feware elect.]" -> "Few are elect.]"
    new_matthew = new_matthew.replace('Feware elect.]', 'Few are elect.]')

    # Construct full XML
    full_new = content[:m_start] + new_matthew + content[m_end:]

    # Update revisionDesc in teiHeader
    rev_change = """         <change>
            <date>2026-11</date>
            <label>Janvier</label>Audited Gospel of Matthew (pp. 31-113); backfilled all 267 content gaps (17 polytonic Greek passages in &lt;foreign xml:lang="grc"&gt;, 250 illegible words, letters, and print markers supplied); preserved 20 microfilm duplicate page placeholders; normalized to Unicode NFC</change>
      </revisionDesc>"""
    if '</revisionDesc>' in full_new and 'Audited Gospel of Matthew' not in full_new:
        full_new = full_new.replace('      </revisionDesc>', rev_change)

    import unicodedata
    full_new = unicodedata.normalize('NFC', full_new)

    # Validate well-formedness with ElementTree
    try:
        ET.fromstring(full_new.encode('utf-8'))
        print("XML successfully parsed by ElementTree! Well-formedness verified.")
    except Exception as e:
        print(f"XML parsing ERROR: {e}")
        sys.exit(1)

    with open(xml_path, 'w', encoding='utf-8') as f:
        f.write(full_new)

    print(f"Successfully backfilled Matthew in {xml_path}")

if __name__ == '__main__':
    target = sys.argv[1] if len(sys.argv) > 1 else 'sources/eebo-tcp/A16049.xml'
    backfill(target)
