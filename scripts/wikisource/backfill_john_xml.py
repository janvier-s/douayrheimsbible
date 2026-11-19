import re
import sys
import unicodedata
import xml.etree.ElementTree as ET

# Dictionary of replacements for all 116 content gaps in the Gospel of John
replacements = {
    1: '2',                                                # John 1:12 annot lemma: 1[2]. He gaue them povver.]
    2: '8',                                                # John 1:18 annot lemma: 1[8]. No man hath ſeen.]
    3: '3',                                                # John 1:32 annot lemma: [3]2. The Spirit.]
    4: '2',                                                # John 2 arg: come. 1[2] Then in Hieruſalem
    5: 'e',                                                # John 2 arg: marchant[e]s.
    6: '3',                                                # John 2 arg: third day. 2[3] Vvhich
    7: 'a',                                                # John 2 arg: t[a]-rie
    8: 'e',                                                # John 2 arg: ta-ri[e] among them.
    9: '5',                                                # John 2:15 annot lemma: 1[5]. Caſt them out.)
    10: '2',                                               # John 2:24 annot lemma: [2]4. IESVS committed not him ſelf.)
    11: '2',                                               # John 3 arg: ſo to doe. [2]3. After this
    12: '3',                                               # John 3:1 margin: Maij [3].
    13: ':',                                               # John 3:8 margin: of the winde[:] although
    14: 'e',                                               # John 3:5 annot lemma: 5. Born[e] againe of water.]
    15: '',                                                # John 3:18 annot margin: Tit. 3, 11[].
    16: '3',                                               # John 4:5 margin: Friday in the [3] weeke in Lent.
    17: 't',                                               # John 4:6 verse: ſa[t]e ſo vpon the fountaine
    18: '2',                                               # John 4:20 annot lemma: [2]0. Our Fathers adored.]
    19: '',                                                # John 4:20 annot text: onely to trie[] whether of the two
    20: 'r',                                               # John 5 arg: bed[r]ed man
    21: '3 to. 2',                                         # John 5:2 annot margin: Hiero. con. Lucifer. c. [3 to. 2].
    22: ':',                                               # John 5:14 annot text: repented of[:] and therfore
    23: 't',                                               # John 6:1 margin: Midlen[t] Sūday.
    24: 'P',                                               # John 6:55 margin: COR[P]VS CHRISTI day.
    25: 'is ',                                             # John 6:53 annot text: for that [is ]receiued vvith mouth
    26: '20.',                                             # John 6:53 annot margin: Li. 1 de pec. merit. c. [20.]
    27: 'c',                                               # John 6:53 annot margin: Cō[c]. Trid. Seſ. 21 c. 4.
    28: 'c',                                               # John 6:54 annot margin: Tertul. de reſur. [c]ar. nu. 7.
    29: 'c',                                               # John 6:58 annot margin: Cō[c]. Trid. Seſ. 21 c. 1.
    30: 't',                                               # John 6:66 annot margin: as at other [t]imes.
    31: '68',                                              # John 6:68 annot lemma: [68]. Peter anſvvered.)
    32: '<foreign xml:lang="grc">σκηνῶν ἑορτὴ</foreign>',  # John 7:2 margin: Greek reading
    33: 'c',                                               # John 8:34 annot text: verū di[c]o vobis
    34: '<foreign xml:lang="grc">Ἀμὴν, ἀμὴν</foreign>',   # John 8:34 annot margin: Greek reading
    35: 'c',                                               # John 8:34 annot margin: Apocal. [c]. 19, 4.
    36: 's',                                               # John 9 arg: Ievve[s] (becauſe of
    37: 'n',                                               # John 9:1 margin: 4 weeke of Le[n]t.
    38: 's',                                               # John 9:4 margin: meriting, i[s] in this life
    39: '3',                                               # John 9:7 margin: Ambr. li. [3] c. 2 de Sacramentis.
    40: 'Irenæus',                                         # John 10:1 annot text: S. [Irenæus] li. 3 c. 3
    41: '3',                                               # John 10:1 annot text: S. Irenæus li. [3] c. 3
    42: 'Ec.',                                             # John 10:1 annot text: S. Cypr. de vnit. [Ec.], nu. 7.
    43: 'fe,',                                             # John 10:11 annot text: The Woul[fe,] is the Heretike
    44: '13',                                              # John 10:13 annot lemma: [13]. Fleeth.)
    45: 'ga',                                              # John 10:13 annot text: S. Athan. Apol. de ſua fu[ga].
    46: '8',                                               # John 10:13 annot text: Auguſt. ep. 1[8]0.
    47: '9',                                               # John 10:29 annot lemma: 2[9]. That vvhich he gaue me.)
    48: '8',                                               # John 10:29 annot text: S. Auguſt. in Io. tract. 4[8].
    49: '5',                                               # John 11 arg: by his death. [5]4 He therevpon
    50: '3',                                               # John 12 arg: to Bethania, [3] Where by occaſion
    51: 'o',                                               # John 12:1 margin: The Goſpel vp[o]̄ Munday
    52: 's',                                               # John 12:31 margin: Exalta-tio S. Cruci[s].
    53: '10',                                              # John 12:40 margin: Lu 8, [10].
    54: '2',                                               # John 13 arg: after Bap-tiſme) 1[2] and by this example
    55: 'one',                                             # John 13 arg: tovvard them) [one] euen of them
    56: '3',                                               # John 13 arg: commaundement, [3]6 and foretelleth
    57: 'cœ',                                              # John 13:5 annot text: Bernard. de [cœ]na Domini
    58: '8',                                               # John 13:10 annot text: S. Auguſtine ep. 10[8].
    59: 'I',                                               # John 13:10 annot text: tract. 56. in [I]o.
    60: 't',                                               # John 13:10 annot margin: Ambr. & Bern. locis cita[t]is.
    61: '2',                                               # John 14:2 margin: Hiero. li. [2]. adu. Iouin.
    62: 't',                                               # John 14:12 annot margin: li. de Ba-byla mart. [t]o. 5.
    63: '2',                                               # John 14:12 annot margin: Act. 5, 15, 19, 1[2].
    64: '7',                                               # John 14:12 annot margin: See An-not. Mat. 1[7], 20.
    65: '2',                                               # John 14:12 annot margin: See An-not. Mat. 17, [2]0.
    66: 's',                                               # John 14:28 annot text: according to his Manhod wa[s] inferior
    67: '8',                                               # John 15 arg: be perpetual: 1[8] confirming them
    68: 'ĩ',                                               # John 16:23 margin: made to Sa[ĩ]cts.
    69: 't',                                               # John 17:6 verse: and [t]o me thou ga-ueſt them
    70: 'i',                                               # John 17:11 margin: in vni-t[i]e and from Schiſmes.
    71: '2',                                               # John 18 arg: from them: 1[2] and ſo being apprehended
    72: 's',                                               # John 18 arg: Annas and Caipha[s], vvhere he
    73: '33',                                              # John 18 arg: their authoritie, [33] and examining
    74: 'e',                                               # John 18 arg: yet they cri[e] rather
    75: '3',                                               # John 18:18 margin: Aug. tract. 11[3] in Io.
    76: 'e',                                               # John 18:39 verse: that I rel[e]aſe vnto you
    77: '8',                                               # John 19 arg: and irriſion. [8] Pilate hearing
    78: '12',                                              # John 19 arg: is more afraid. [12] Yet, they vrging
    79: '23',                                              # John 19 arg: king or Chriſt. [23] His garments
    80: '3',                                               # John 19:14 margin: Act. [3] & 10.
    81: '1',                                               # John 19:14 margin: Act. 3 & [1]0.
    82: 'e',                                               # John 19:20 margin: pre-ſeru[e]d.
    83: '2',                                               # John 19:24 margin: Pſ. [2]1, 19▪
    84: 'l',                                               # John 19:39 verse: myrrhe and a[l]oés
    85: 'e',                                               # John 19:15 annot text: reſerued & reuer[e]nced
    86: '7',                                               # John 19:15 annot text: Ruffinus li. 1. c. [7]. & 8.
    87: '8',                                               # John 19:15 annot text: Ser. [8] de Paſsione.
    88: '18',                                              # John 20 arg: ſelf appeareth. [18] She hauing told
    89: 'ca',                                              # John 20:1 margin: Dies Domini[ca],
    90: 'c',                                               # John 20:1 margin: marg. annot. Lu[c]. 24, 1.
    91: 'in',                                              # John 20:1 margin: Saturday [in] Eaſter weeke.
    92: 'in',                                              # John 20:11 margin: Thurſday [in] Eaſter weeke.
    93: 'ex',                                              # John 20:19 annot text: againſt [ex]preſſe Scriptures
    94: '2',                                               # John 20:19 annot text: li. 10 in Lucam. c. [2]4.
    95: '3',                                               # John 20:19 annot text: S. Auguſtine ep. [3]. ad Voluſian.
    96: 'a',                                               # John 20:19 annot text: ad Voluſi[a]n.
    97: 'i',                                               # John 20:19 annot text: li. 1 cont. Iouin[i]anum c. 21.
    98: '2',                                               # John 20:19 annot margin: Aug. li. 2[2] c. 8. de ciu. Dei.
    99: 'c',                                               # John 20:22 annot margin: Cyril. li. 12 [c]. 56 in Io.
    100: '',                                               # John 20:22 annot text: (li. 1 c. 7[] de poenitentia)
    101: 'e',                                              # John 20:23 annot text: Ambr. li. 1. de po[e]nit. c. 2.
    102: 'ra',                                             # John 20:23 annot margin: of this Sac[ra]-ment.
    103: '6',                                              # John 20:23 annot margin: Demetri-adem. c. [6], to. 1.
    104: 'e',                                              # John 20:23 annot text: after ſhipvvrack[e],
    105: 'e',                                              # John 20:23 annot text: in Regulis br[e]u. quaeſt. 229.
    106: 't',                                              # John 20:23 annot text: cauſed the peniten[t] to weepe
    107: 'in',                                             # John 21:7 margin: tract. 122 [in] Io.
    108: '<foreign xml:lang="grc">ποίμαινε</foreign>',     # John 21:16 margin: Greek reading
    109: 'i',                                              # John 21:17 annot text: remitte and rete[i]ne
    110: 'u',                                              # John 21:17 annot margin: do a-[u]ouch & proue
    111: 'c',                                              # John 21:17 annot margin: Cypr. de vnit. E[c].
    112: 'e',                                              # John 21:17 annot text: and build[e]d his Church
    113: '1',                                              # John 21:17 annot margin: See li. [1]. ep. 72. 73
    114: '<foreign xml:lang="grc">ποίμαινε</foreign>',     # John 21:17 annot margin: Greek reading
    115: '2',                                              # John 21:17 annot text: as Pſ. [2]. Mich. 5.
    116: '8',                                              # John 21:18 annot lemma: 1[8]. An other ſhal gird thee.]
}


def backfill_and_tag(xml_path):
    print(f"Reading XML from {xml_path}...")
    with open(xml_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Locate John section (Argument through end of John 21 annotations)
    j_start = content.find('<head>❀ THE ARGVMENT OF S. IOHNS GOSPEL.</head>')
    j_start = content.rfind('<div', 0, j_start)
    j_end = content.find('<div type="gospel_harmony">', j_start)

    if j_start == -1 or j_end == -1:
        print("Error: Could not locate John boundaries in XML!")
        sys.exit(1)

    john_part = content[j_start:j_end]

    # 1. Backfill all 116 content gaps in John
    gap_pattern = re.compile(r'<gap\b[^>]*>.*?</gap>|<gap\b[^>]*/?>', re.DOTALL)
    all_gaps = list(gap_pattern.finditer(john_part))
    print(f"Total gaps in John: {len(all_gaps)}")

    if len(all_gaps) != 116:
        print(f"Error: expected 116 gaps in John, found {len(all_gaps)}")
        sys.exit(1)

    if len(replacements) != 116:
        print(f"Error: replacement dictionary has {len(replacements)} items, expected 116")
        sys.exit(1)

    new_john = john_part
    for idx in range(len(all_gaps), 0, -1):
        g = all_gaps[idx - 1]
        start, end = g.span()
        repl = replacements[idx]
        new_john = new_john[:start] + repl + new_john[end:]

    # Post-gap EEBO-TCP typo corrections adjacent to gaps:
    # Gap 21: "Hiero. con. Lucifer. c. 3 10. 2." -> "Hiero. con. Lucifer. c. 3 to. 2."
    new_john = new_john.replace('Hiero. con. Lucifer. c. 3 to. 2. 10. 2.', 'Hiero. con. Lucifer. c. 3 to. 2.')
    # Gap 41/42: "c. 3▪</hi> uſeth" -> "c. 3.</hi> trieth", "nu. 1." -> "nu. 7."
    new_john = new_john.replace('S.Cypr. de vnit. Ec., nu. 1.', 'S. Cypr. de vnit. Ec. nu. 7.')
    new_john = new_john.replace('S. Cypr. de vnit. Ec., nu. 1.', 'S. Cypr. de vnit. Ec. nu. 7.')
    # Gap 56: "14 commendeth" -> "34 commendeth" in John 13 argument
    new_john = new_john.replace('14 commendeth vnto them to loue together, as a nevv commaundement, 36',
                                '34 commendeth vnto them to loue together, as a nevv commaundement, 36')
    # Gap 80: "Luc. 21." -> "Luc. 23." in John 19:14 note
    new_john = new_john.replace('Mat. 20. Mar. 15. Luc. 21. Io. 4. Act. 3 &amp; 10.',
                                'Mat. 20. Mar. 15. Luc. 23. Io. 4. Act. 3 &amp; 10.')

    # 2. Drop-cap continuations (<seg rend="decorInit">...</seg><hi rend="smallcaps">...</hi>)
    for let, rest, sc_rest in [
        ('I', 'OHN', 'ohn'),
        ('I', 'N', 'n'),
        ('A', 'ND', 'nd'),
        ('W', 'HEN', 'hen'),
        ('A', 'FTER', 'fter'),
        ('A', 'MEN', 'men'),
        ('L', 'ET', 'et'),
        ('T', 'HESE', 'hese'),
        ('T', 'HEN', 'hen'),
    ]:
        new_john = new_john.replace(f'<seg rend="decorInit">{let}</seg>{rest}',
                                    f'<seg rend="decorInit">{let}</seg><hi rend="smallcaps">{sc_rest}</hi>')
    # John 12:1 drop-cap I followed by ESVS
    new_john = new_john.replace('<seg rend="decorInit">I</seg>ESVS',
                                '<seg rend="decorInit">I</seg><hi rend="smallcaps">esvs</hi>')
    # John 15:1 drop-cap I followed by AM
    new_john = new_john.replace('<seg rend="decorInit">I</seg> AM',
                                '<seg rend="decorInit">I</seg> <hi rend="smallcaps">am</hi>')

    # 3. Division & Liturgical Rubrics in Margins
    for old_m, new_m in [
        ('<note place="margin">THE ACTES of Chriſt', '<note place="margin"><hi rend="smallcaps">The actes</hi> of Chriſt'),
        ('<note place="margin">His ACTES in Galilaee', '<note place="margin"><hi rend="smallcaps">His actes</hi> in Galilaee'),
        ('<note place="margin">The 4 part. THE 4 Paſ<g ref="char:EOLhyphen"/>che', '<note place="margin"><hi rend="smallcaps">The</hi> 4 part. <hi rend="smallcaps">The</hi> 4 Paſ<g ref="char:EOLhyphen"/>che'),
        ('<note place="margin">ET VERBVM CARO FAC<g ref="char:EOLhyphen"/>TVM EST.</note>', '<note place="margin"><hi rend="smallcaps">Et verbvm caro fac<g ref="char:EOLhyphen"/>tvm est</hi>.</note>'),
        ('<note place="margin">AGNVS DEI at Maſſe.</note>', '<note place="margin"><hi rend="smallcaps">Agnvs Dei</hi> at Maſſe.</note>'),
        ('by theſe wordes, ET HOMO FACTVS EST.', 'by theſe wordes, <hi rend="smallcaps">Et homo factvs est</hi>.'),
        ('CORPVS CHRISTI day.', '<hi rend="smallcaps">Corpvs Christi</hi> day.'),
        ('PASSION Sunday.', '<hi rend="smallcaps">Paſsion</hi> Sunday.'),
        ('<note place="margin">PALME SVNDAY eue.</note>', '<note place="margin"><hi rend="smallcaps">Palme Svnday</hi> eue.</note>'),
        ('<note place="margin">PALME SVNDAY.</note>', '<note place="margin"><hi rend="smallcaps">Palme Svnday</hi>.</note>'),
        ('<note place="margin">MAVNDY THVRSDAY.</note>', '<note place="margin"><hi rend="smallcaps">Mavndy Thvrſday</hi>.</note>'),
        ('<note place="margin">THVRSDAY night.</note>', '<note place="margin"><hi rend="smallcaps">Thvrſday</hi> night.</note>'),
        ('The PASSION according to S. Iohn', 'The <hi rend="smallcaps">Paſsion</hi> according to S. Iohn'),
        ('So the PAS<g ref="char:EOLhyphen"/>SION is read', 'So the <hi rend="smallcaps">Paſ<g ref="char:EOLhyphen"/>ſion</hi> is read'),
        ('<note place="margin">GOOD FRI<g ref="char:EOLhyphen"/>DAY.</note>', '<note place="margin"><hi rend="smallcaps">Good Fri<g ref="char:EOLhyphen"/>day</hi>.</note>'),
        ('<note place="margin">EASTER DAY.</note>', '<note place="margin"><hi rend="smallcaps">Eaſter Day</hi>.</note>'),
        ('<note place="margin">LOVV SVN<g ref="char:EOLhyphen"/>DAY.</note>', '<note place="margin"><hi rend="smallcaps">Lovv Svn<g ref="char:EOLhyphen"/>day</hi>.</note>'),
        ('<note place="margin">The HOLY CROSSE.</note>', '<note place="margin">The <hi rend="smallcaps">Holy Croſſe</hi>.</note>'),
        ('is truely called the HOLY CROSSE:', 'is truely called the <hi rend="smallcaps">Holy Croſſe</hi>:'),
        ('The HOLY GHOST is pro<g ref="char:EOLhyphen"/>miſed to the CHVRCH for euer.', 'The <hi rend="smallcaps">Holy Ghoſt</hi> is pro<g ref="char:EOLhyphen"/>miſed to the <hi rend="smallcaps">Chvrch</hi> for euer.'),
        ('ſhal aſſiſt the CHVRCH alvvaies.', 'ſhal aſſiſt the <hi rend="smallcaps">Chvrch</hi> alvvaies.'),
        ('The CHVRCH builded of Chriſts ſide', 'The <hi rend="smallcaps">Chvrch</hi> builded of Chriſts ſide'),
        ('concerning the CHVRCH, and in S.', 'concerning the <hi rend="smallcaps">Chvrch</hi>, and in S.'),
        ('The Sacrament of PENANCE inſtituted.', 'The Sacrament of <hi rend="smallcaps">Penance</hi> inſtituted.'),
        ('Peters PRIMACIE here miſtically ſignified.', 'Peters <hi rend="smallcaps">Primacie</hi> here miſtically ſignified.'),
    ]:
        assert old_m in new_john, f"Expected string not found: {old_m}"
        new_john = new_john.replace(old_m, new_m)

    # 4. Solemn Declarations, Titulus Crucis, Words of Forgiveness & Pastoral Commission
    for old_s, new_s in [
        ('AND ″ THE VVORD VVAS MADE FLESH,', '<hi rend="smallcaps">And ″ the vvord vvas made flesh</hi>,'),
        ('IESVS OF NAZARETH THE KING OF THE IEVVES.', '<hi rend="smallcaps">Iesvs of Nazareth the King of the Ievves</hi>.'),
        ('″ VVHOSE SINNES YOV SHAL FORGIVE, THEY ARE FORGIVEN THEM: AND VVHOSE YOV SHAL RETEINE, THEY ARE RETEINED.',
         '″ <hi rend="smallcaps">Vvhose sinnes yov shal forgive, they are forgiven them: and vvhose yov shal reteine, they are reteined</hi>.'),
        ('FEEDE MY LAMBES.', '<hi rend="smallcaps">Feede my lambes</hi>.'),
        ('″ FEEDE MY SHEEPE.', '″ <hi rend="smallcaps">Feede my sheepe</hi>.'),
    ]:
        assert old_s in new_john, f"Expected string not found: {old_s}"
        new_john = new_john.replace(old_s, new_s)

    # 5. Sacred Names (WORD, VVORD, MESSIAS, MARIE, CHRIST, IESVS)
    new_john = re.sub(r'\bWORD\b', '<hi rend="smallcaps">Word</hi>', new_john)
    new_john = re.sub(r'\bVVORD\b', '<hi rend="smallcaps">Vvord</hi>', new_john)
    new_john = re.sub(r'\bMESSIAS\b', '<hi rend="smallcaps">Meſsias</hi>', new_john)
    new_john = re.sub(r'\bMARIE\b', '<hi rend="smallcaps">Marie</hi>', new_john)

    # Split at book title head so we don't wrap IESVS CHRIST in the main <head>
    title_str = '<head>THE HOLY GOSPEL OF IESVS CHRIST ACCOR<g ref="char:EOLhyphen"/>DING TO IOHN.</head>'
    assert title_str in new_john, "Book title head not found!"
    head_start = new_john.find(title_str)
    head_end = head_start + len(title_str)

    arg_part = new_john[:head_start]
    head_part = new_john[head_start:head_end]
    body_part = new_john[head_end:]

    arg_part = re.sub(r'\bIESVS\b', '<hi rend="smallcaps">Iesvs</hi>', arg_part)
    arg_part = re.sub(r'\bCHRIST\b', '<hi rend="smallcaps">Christ</hi>', arg_part)

    count_iesvs = len(re.findall(r'\bIESVS\b', body_part))
    count_christ = len(re.findall(r'\bCHRIST\b', body_part))
    print(f"Body IESVS occurrences wrapped: {count_iesvs}, CHRIST occurrences wrapped: {count_christ}")

    body_part = re.sub(r'\bIESVS\b', '<hi rend="smallcaps">Iesvs</hi>', body_part)
    body_part = re.sub(r'\bCHRIST\b', '<hi rend="smallcaps">Christ</hi>', body_part)
    # Merge adjacent <hi rend="smallcaps">Iesvs</hi> <hi rend="smallcaps">Christ</hi>
    body_part = body_part.replace('<hi rend="smallcaps">Iesvs</hi> <hi rend="smallcaps">Christ</hi>',
                                  '<hi rend="smallcaps">Iesvs Christ</hi>')

    new_john = arg_part + head_part + body_part

    # Construct full updated XML
    full_new = content[:j_start] + new_john + content[j_end:]

    # Update revisionDesc in teiHeader
    rev_change = """         <change>
            <date>2026-11</date>
            <label>Janvier</label>Audited Gospel of John (pp. 242-308 / print pp. 214-280); backfilled all 116 content gaps (4 polytonic Greek readings in &lt;foreign xml:lang="grc"&gt;, 112 illegible words, letters, citation numbers, and print markers supplied); tagged small-caps typography (&lt;hi rend="smallcaps"&gt;) across sacred names, drop-cap continuations, Incarnation prologue, Titulus Crucis, Words of Forgiveness, pastoral commission, and liturgical rubrics; normalized to Unicode NFC</change>
      </revisionDesc>"""
    if '</revisionDesc>' in full_new and 'Audited Gospel of John' not in full_new:
        full_new = full_new.replace('      </revisionDesc>', rev_change)

    # Strict NFC Unicode Normalization
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

    print(f"Successfully backfilled and tagged John in {xml_path}")


if __name__ == '__main__':
    target = sys.argv[1] if len(sys.argv) > 1 else '/Users/Janvier/Documents/Bible-n-stuff/original-douay-rheims-nt/A16049.xml'
    backfill_and_tag(target)
