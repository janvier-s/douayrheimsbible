"""Patches the print needs at a page, verse or note: per book, code-shaped (spec §8).
Plain per-book values are in books.json (config.py). Moved verbatim from generate.py."""

# The title lines as printed, where the title does not split at its last ' OF'.
ARGUMENT_TITLES = {('acts', 0): [('x-larger', 'THE ARGVMENT OF'), ('larger', 'THE ACTES OF THE APOSTLES.')],
                   ('romans', 1): [('x-larger', '❧ THE ARGVMENT OF THE'), ('larger', 'EPISTLES IN GENERAL.')],
                   ('romans', 0): [('larger', 'THE TIME VVHEN THE EPISTLE'), ('larger', 'TO THE ROMANES VVAS VVRITTEN,'),
                                   ('larger', "''and the Argument thereof.''")],
                   ('1-corinthians', 0): [('x-larger', '❧ THE ARGVMENT OF THE'),
                                          ('larger', 'FIRST EPISTLE TO THE'),
                                          ('larger', 'CORINTHIANS.')],
                   ('galatians', 0): [('x-larger', '❧ THE ARGVMENT OF THE'),
                                  ('larger', 'EPISTLE OF S. PAVL TO'),
                                  ('larger', 'THE GALATIANS.')],
                   ('ephesians', 0): [('x-larger', '❧ THE ARGVMENT OF THE'),
                                  ('larger', 'EPISTLE OF S. PAVL TO'),
                                  ('larger', 'THE EPHESIANS.')],
                   ('philippians', 0): [('x-larger', '❧ THE ARGVMENT OF THE'),
                                        ('larger', 'EPISTLE OF S. PAVL TO'),
                                        ('larger', 'THE PHILIPPIANS.')],
                   ('colossians', 0): [('x-larger', '❧ THE ARGVMENT OF THE'),
                                       ('larger', 'EPISTLE OF S. PAVL TO'),
                                       ('larger', 'THE COLOSSIANS.')],
                   ('1-thessalonians', 0): [('x-larger', '❧ THE ARGVMENT OF THE'),
                                            ('larger', 'FIRST EPISTLE OF S. PAVL TO'),
                                            ('larger', 'THE THESSALONIANS.')],
                   ('1-timothy', 0): [('x-larger', 'THE ARGVMENT OF THE'),
                                      ('larger', 'FIRST EPISTLE OF S. PAVL TO'),
                                      ('larger', 'TIMOTHEE.')]}

# Multi-page Arguments: the text that opens each following page (read on the scans, pdf314-316, pdf405-409).
ARGUMENT_BREAKS = {'acts': ['Gentiles, by the miniſterie', 'Ievves, and conſequently'],
                   'romans': ['beleeued him to be', 'any Catholike of this time.', 'Gal. 4. ſaying', 'may, and geuing no offence']}

# John's Argument is two scan pages (pdf242-243), the word Pas-sion broken at the page end:
# (letters before the break, the word that follows the broken one); the whole word is read from the data.
ARGUMENT_SPLIT = {'john': (3, 'beheaded')}

# Argument notes printed in the INNER margin (read on pdf242: "Iren. li. 2. c. 39." beside chap. 5, 1).
INNER_ARGUMENT_NOTES = {'Iren. li. 2. c. 39.'}

# Marks in chapter summaries are not in the data yet: words to star, per chapter.
# Matt 2-28 summaries were checked on the scans (round 10): they print no marks.
SUMMARY_STARS = {('matthew', 1): ['Abraham', 'Dauid. 18']}

# Words of a chapter's side heading the print sets in small caps besides its first words (read on the scans).
SIDE_SC = {('mark', 11): lambda x: x.replace(' the Holy ', ' the {{sc|Holy}} ', 1),
           ('john', 1): lambda x: x.replace('THE ACTES', '{{sc|The actes}}', 1),
           ('john', 5): lambda x: x.replace('THE ACTES', '{{sc|The actes}}', 1),
           ('john', 6): lambda x: x.replace('HIS ACTES', '{{sc|His actes}}', 1),
           ('john', 12): lambda x: x.replace('THE 4', '{{sc|The}} 4', 1),
           ('acts', 1): lambda x: x.replace('The 1. part.', '{{sc|The}} 1. part.', 1),
           ('acts', 2): lambda x: x.replace('The 2. part.', '{{sc|The}} 2. part.', 1),
           ('acts', 8): lambda x: x.replace('The 3. part.', '{{sc|The}} 3. part.', 1).replace('THE propagation', '{{sc|The propagation}}', 1),
           ('acts', 10): lambda x: x.replace('The 4. part.', '{{sc|The}} 4. part.', 1).replace('THE propagation', '{{sc|The propagation}}', 1),
           ('acts', 13): lambda x: x.replace('The 5 part.', '{{sc|The}} 5 part.', 1)}

# Annotation titles the print closes with ")" instead of "]" (read on the scans): (book, chapter, annotation index).
PAREN_TITLES = {*[('mark', 2, i) for i in range(6)], *[('mark', 3, i) for i in range(6)], ('mark', 6, 0), ('mark', 6, 5), ('mark', 7, 4), ('mark', 7, 5), ('mark', 9, 0), ('mark', 9, 1), ('mark', 9, 2),
                ('mark', 10, 0), ('mark', 10, 1), ('mark', 10, 2), ('mark', 10, 3), ('mark', 10, 4),
                ('mark', 12, 1), ('mark', 12, 2), ('mark', 12, 3),
                *[('luke', 13, i) for i in range(5)], ('luke', 14, 0),
                ('john', 1, 1), *[('john', 2, i) for i in range(6)], *[('john', 4, i) for i in range(2)],
                *[('john', 5, i) for i in range(4)], *[('john', 6, i) for i in range(5, 16)],
                *[('john', 10, i) for i in range(5)], *[('john', 12, i) for i in range(2)],
                *[('john', 13, i) for i in range(4)], *[('john', 14, i) for i in range(4)],
                ('john', 15, 1), ('john', 15, 3), ('john', 15, 4), ('john', 15, 5),
                *[('john', 16, i) for i in range(2)], *[('john', 17, i) for i in range(3)],
                *[('john', 19, i) for i in range(1, 4)], *[('john', 20, i) for i in range(4)],
                ('philippians', 2, 0), ('philippians', 2, 1), ('philippians', 2, 2), ('philippians', 2, 4),
                ('philippians', 3, 0), ('philippians', 3, 1), ('philippians', 3, 2),
                ('philippians', 4, 0), ('philippians', 4, 1), ('philippians', 4, 2),
                ('colossians', 1, 0),
                *[('colossians', 2, i) for i in range(7)],
                *[('colossians', 3, i) for i in range(2)]}

# Italic annotation notes the print sets in the OUTER margin, beside the side headings,
# though they look like citations: (book, chapter, annotation index, note index), checked
# on the scans. Greek words on page 107 (26:26 τὸν ἄρτον, 26:28 ἐκχυνόμενον); the Greek
# notes on pages 36, 44 and 58 do sit in the inner margin.
# Verse glosses the print sets in the INNER margin, beside the citations, though they carry
# the gloss mark ∷: (book, chapter, verse, note label), checked on the scans. Matt 1:16
# "∷ de qua." sits in the right (inner) margin of page 4 (wiki 32), not the outer.
INNER_NOTES = {('matthew', 1, 16, '1')}

OUTER_NOTES = {('matthew', 26, 5, 3), ('matthew', 26, 8, 0), ('john', 2, 3, 1), ('john', 2, 5, 0),
               ('john', 3, 0, 1), ('john', 3, 1, 0), ('john', 3, 1, 2), ('john', 4, 0, 1), ('john', 4, 0, 3),
               ('john', 4, 1, 1), ('john', 4, 1, 2), ('john', 6, 1, 1), ('john', 6, 1, 3), ('john', 6, 1, 5),
               ('john', 6, 2, 0), ('john', 6, 5, 1), ('john', 6, 7, 1), ('john', 6, 12, 0), ('john', 6, 12, 1),
               ('john', 6, 12, 3), ('john', 6, 13, 1), ('john', 6, 15, 1), ('john', 8, 0, 2),
               ('john', 10, 3, 1), ('john', 13, 1, 1), ('john', 20, 0, 1), ('john', 20, 0, 3),
               ('john', 20, 2, 1), ('john', 20, 2, 2), ('john', 20, 3, 2), ('john', 20, 3, 3),
               ('john', 21, 0, 1), ('john', 21, 0, 2), ('john', 21, 0, 4), ('john', 21, 0, 6), ('john', 21, 1, 0)}

# Citations with no * in the print (stored at the verse end) whose margin note the print sets
# beside an earlier word, on an earlier page: (book, chapter, verse) -> word.
# 27:35 'Pſ. 21, 19' beside 'They deuided' (109; the verse ends on 110).
CREND_AT = {('matthew', 27, 35): 24}

# Wiki-only ‖ fixes, checked on the scan: (from word, to word) per verse, None = no bar.
# 23:2 '‖ the chaire' (92); 25:34 has no ‖ in the print, 25:41 has '‖ Get' (101; the
# annotation title '34. Come ye, 41 get ye away' gives only the first).
# These stay out of the data on purpose: the site draws ‖ before each tinted lemma, and
# the lemma spans are right (the titles quote 'Chaire of Moyses' and 'Come ye'). A span
# in 25:41 would tint words whose click opens 25:41's annotations, of which there are none.
# 26:27 '‖ he gaue thankes' (103): the 26:26 'Bleſſed.' annotation covers both verbs;
# 26:75 '‖ he vvept bitterly' (106; the lemma is the title's 'Wept bitterly');
# 28:20 'vvith you ‖ al daies' (113; the title is 'With you al daies').
BARS = {('mark', 1, 12): [(9, 8)], ('mark', 1, 35): [(11, 10)], ('mark', 6, 9): [(8, 11)],
        ('matthew', 23, 2): [(3, 2)], ('matthew', 25, 34): [(14, None)], ('matthew', 25, 41): [(None, 14)],
        ('matthew', 26, 27): [(None, 4)], ('matthew', 26, 75): [(24, 23)],
        ('matthew', 28, 20): [(15, 17)]}

# Page starts the alignment gets wrong, each checked on the scan: the page's
# first words (normalised as in norm(), joined by spaces).
# '@annhead' / '@chap': the page opens with the ANNOTATIONS or CHAP. heading.
PAGE_STARTS = {('matthew', 37): 'salvation bvt it is', ('matthew', 39): 'it is written heretikes',
               ('matthew', 44): 'pvt on is not', ('matthew', 45): 'leade vs not s cypr',
               ('matthew', 57): 'lesser in the kingdom', ('matthew', 58): '@annhead',
               ('matthew', 66): 'avthor os evil tertvl', ('matthew', 69): '@chap', ('matthew', 71): '@annhead',
               ('matthew', 72): 'and there came to', ('matthew', 76): '@chap', ('matthew', 79): 'ones that beleeve in',
               ('matthew', 81): 'nativitie an angel sor', ('matthew', 84): '@chap', ('matthew', 86): 'nations avg de verb',
               ('matthew', 89): 'to lay hands vpon', ('matthew', 92): 'a man not attyred', ('matthew', 96): '@chap',
               ('matthew', 101): 'i sow not gather', ('matthew', 102): '@annhead',
               ('matthew', 107): 'thovgh now not only', ('matthew', 108): '@chap',
               ('matthew', 113): 'wil persvade him and',
               # Transkribus broke the lines of sancta 13/3, which pulls 152's start late
               ('mark', 120): '@annhead', ('mark', 123): '@chap', ('mark', 131): 'he blessed and brake', ('mark', 141): '@chap', ('mark', 144): '@annhead', ('mark', 149): 'shal receiue larger iudgement', ('mark', 151): 'be and vnles the lord', ('mark', 156): '@annhead', ('mark', 159): 'the prophet saying the law',
               ('mark', 152): 'sorraine sovldiars so shal',
               ('john', 246): 'the lambe os god', ('john', 247): 'vs in a sort', ('john', 248): '@chap', ('john', 250): 'to worke miracles',
               ('john', 253): '@chap', ('john', 257): '@chap',
               ('john', 261): 'to him there is a boy', ('john', 264): '@annhead', ('john', 267): 'schismatikes heretikes or apostataes',
               ('john', 270): '@chap', ('john', 273): '@chap', ('john', 276): '@chap', ('john', 277): 'os blinde men',
               ('john', 281): 'thersore walked no more', ('john', 286): 'to whom i shal reach',
               ('john', 287): 'directed by the holy ghost', ('john', 289): '@annhead', ('john', 290): 'i am the trve vine',
               ('john', 292): '@chap', ('john', 296): '@chap', ('john', 300): 'tooke his garments',
               ('john', 302): '@chap', ('john', 304): 'os the qvantitie space', ('john', 306): '@chap',
               ('john', 308): 'is he acknowledge',
               ('colossians', 566): '@annhead', ('colossians', 570): '@chap',
               ('1-thessalonians', 577): '@chap', ('1-thessalonians', 579): '@chap',
               ('1-timothy', 597): '@chap', ('1-timothy', 611): 'doctrine which is according'}

# Catchwords before a heading that the OCR garbles, checked on the scan.
# The book's last page has no next token: its catchword (the next book's first word) goes here too.
CATCHWORDS = {('john', 242): 'ſion', ('john', 243): 'THE', ('john', 245): 'the', ('john', 247): 'CHAP. II.', ('john', 249): 'to',
              ('john', 251): 'led.', ('john', 252): 'CHAP.', ('john', 253): 'band.', ('john', 254): 'haue', ('john', 256): 'AFTER', ('john', 259): 'that', ('john', 260): 'to',
              ('john', 263): 'ANNOT.', ('john', 264): 'nedly', ('john', 265): "''62. If''", ('john', 266): 'Schiſma-', ('john', 267): 'ueiled.', ('john', 269): 'AND', ('john', 270): '† Againe', ('john', 271): 'God',
              ('john', 272): 'CHAP.', ('john', 275): 'Amen,', ('john', 276): 'of', ('john', 277): "''1. Climeth''", ('john', 280): 'therfore',
              ('john', 284): 'per', ('john', 286): 'directed', ('john', 288): 'ANNOT.', ('john', 289): 'I AM', ('john', 291): 'Theſe',
              ('john', 293): "''13. The''", ('john', 294): '† I', ('john', 295): 'CHAP.', ('john', 297): '† {{sc|Iesvs}}',
              ('john', 301): 'AND', ('john', 305): 'CHAP.', ('john', 307): '(if', ('john', 308): 'THE',
              ('matthew', 75): 'Chap.', ('matthew', 95): 'Cha. XXIIII.', ('matthew', 101): 'ANNOT-',
              ('matthew', 107): 'Chap. XXVII.', ('matthew', 113): 'THE',
              ('mark', 114): 'THE', ('mark', 115): 'ſert.', ('mark', 119): 'ANNOT.', ('mark', 122): 'Chap. IIII.', ('mark', 127): 'vvith', ('mark', 129): 'rodias',
              ('mark', 130): 'he', ('mark', 140): 'Chap. X.', ('mark', 143): 'ANNOT', ('mark', 149): 'And', ('mark', 152): 'ring', ('mark', 155): 'ANNOT.', ('mark', 160): 'THE',
              ('luke', 161): 'THE', ('luke', 166): "''36. Eliſabeth''", ('luke', 172): "''20. He''",
              ('luke', 178): "''24. The''", ('luke', 196): "''21. To''", ('luke', 200): "''27. Bleſſed''",
              ('luke', 204): "''11. Be''", ('luke', 241): 'THE',
              ('acts', 316): 'THE', ('acts', 401): 'THE', ('romans', 407): 'Gal. 4.', ('romans', 409): 'THE', ('romans', 418): 'VVHAT', ('romans', 451): 'THE',
              ('1-corinthians', 452): 'THE', ('1-corinthians', 496): 'THE',
              ('2-corinthians', 521): 'THE',
              ('galatians', 522): 'THE', ('galatians', 539): 'THE',
              ('ephesians', 540): 'THE', ('ephesians', 552): 'THE',
              ('philippians', 553): 'THE', ('philippians', 554): 'ſo', ('philippians', 555): "''1. Bi{{ls}}hop.''",
              ('philippians', 560): 'Therfore', ('philippians', 562): 'THE',
              ('colossians', 563): 'THE', ('colossians', 565): 'ANNOT.', ('colossians', 566): 'FOR',
              ('colossians', 568): 'deceitfully', ('colossians', 569): 'CHAP.', ('colossians', 572): 'THE',
              ('1-thessalonians', 573): 'THE', ('1-thessalonians', 574): 'he',
              ('1-thessalonians', 575): 'are', ('1-thessalonians', 576): 'FOR',
              ('1-thessalonians', 577): 'uen', ('1-thessalonians', 578): 'CHAP.',
              ('1-thessalonians', 579): 'that', ('1-thessalonians', 580): 'THE',
              ('2-thessalonians', 581): 'concerning', ('2-thessalonians', 582): 'lying:',
              ('2-thessalonians', 583): 'magnus.', ('2-thessalonians', 584): 'the',
              ('2-thessalonians', 585): 'worship', ('2-thessalonians', 586): '9. In',
              ('2-thessalonians', 587): 'that', ('2-thessalonians', 588): 'vnquiet',
              ('2-thessalonians', 589): 'Religious', ('2-thessalonians', 590): 'THE',
              ('1-timothy', 591): 'THE', ('1-timothy', 595): "''4. Vvho''", ('1-timothy', 596): 'CHAP.',
              ('1-timothy', 600): 'apprehen{{ls}}ion', ('1-timothy', 601): 'exerci{{ls}}e',
              ('1-timothy', 603): "''5. Sanctified.''", ('1-timothy', 605): 'A Seniour',
              ('1-timothy', 607): 'Apo{{ls}}tle', ('1-timothy', 608): "''{{ls}}entence''",
              ('1-timothy', 610): 'ctrine', ('1-timothy', 611): 'ANNOT.',
              ('1-timothy', 612): "''effect,''", ('1-timothy', 613): 'THE',
              # printed catchwords longer than the first word of the next page, read on the scan
              ('matthew', 38): "''6. It is''", ('matthew', 44): "''13. Leade vs not:''", ('matthew', 91): "''11. A man''", ('matthew', 94): "''3. What''"}

# Words the print hyphenates across a page break: wiki page -> (first part, rest, whole word).
# Rendered {{hws|de|de{{ls}}ert.|title=desert.}} at the page end and {{hwe|{{ls}}ert.|de{{ls}}ert.}} at the next page's start.
SPLIT_WORDS = {('1-timothy', 610): ('do-', 'ctrine', 'doctrine'),
               ('1-thessalonians', 577): ('gi-', 'uen', 'giuen'),
               ('mark', 115): ('de', 'ſert.', 'deſert.'), ('mark', 127): ('forth', 'vvith', 'forthvvith'),
               ('mark', 129): ('He', 'rodias', 'Herodias'), ('mark', 152): ('hea', 'ring', 'hearing'),
               ('john', 251): ('fil', 'led.', 'filled.'), ('john', 253): ('huſ', 'band.', 'huſband.'),
               ('john', 264): ('vnlear', 'nedly', 'vnlearnedly'), ('john', 266): ('Schiſma', 'tikes,', 'Schiſmatikes,'),
               ('john', 267): ('mar', 'ueiled,', 'marueiled,'), ('john', 284): ('ſup', 'per,', 'ſupper,')}

# Paragraph starts the OCR misses, each checked on the scan (wiki page in brackets):
# beside a drop cap (31, 39, 56), on a page the OCR splits into two blocks (45), 10:40 (55),
# half indents inside a verse (12:39 'The vvicked' 60, 13:3 'Behold' 62), 13:19 (63),
# 13:47 (65; the OCR gives its indent to 13:45, which opens with the same words), 14:34 (68),
# 21:33 (88), 22:15 (90; the OCR gives its indent to 22:16), 23:16 (93) and 24:15 (96).
MANUAL_PARAS = {('matthew', 1): [[2, 0]], ('matthew', 5): [[3, 0]], ('matthew', 7): [[6, 0], [7, 0]],
                ('matthew', 10): [[40, 0]], ('matthew', 11): [[2, 0]], ('matthew', 12): [[39, 6]],
                ('matthew', 13): [[3, 10], [19, 0], [47, 0]], ('matthew', 14): [[34, 0]],
                ('matthew', 21): [[33, 0]], ('matthew', 22): [[15, 0]], ('matthew', 23): [[16, 0]],
                ('matthew', 24): [[15, 0]], ('mark', 4): [[3, 3]], ('mark', 5): [[35, 0]],
                ('mark', 8): [[22, 0]], ('mark', 9): [[38, 0]], ('mark', 11): [[15, 5]],
                ('mark', 12): [[13, 0], [35, 0], [41, 0]], ('mark', 13): [[32, 0]], ('mark', 15): [[33, 0]]}

# Paragraph starts the OCR reports where the scan has none: 13:45 (64), 19:5 and 19:8 (81),
# 22:16 (90, mid-line) are flush left; 26:2 (mid-line) and 26:3 (102) sit beside the drop cap.
NO_PARAS = {('matthew', 13): [[45, 0]], ('matthew', 19): [[5, 0], [8, 0]], ('matthew', 22): [[16, 0]],
            ('matthew', 26): [[2, 0], [3, 0]], ('mark', 4): [[3, 0]], ('mark', 6): [[50, 7]],
            ('mark', 7): [[26, 0], [27, 0]], ('mark', 9): [[3, 0]], ('mark', 13): [[33, 0]], ('mark', 15): [[36, 0]]}
