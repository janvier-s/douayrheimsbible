# Front matter (1582 Rhemes NT, PDF pp 1-30): eye-check of wikisource/1582-rhemes-nt/front-draft

Uncommitted, not posted. Partial pass: the items below were checked on crops; the rest is listed as open.

## Changed
- **ſaith (verb) vs faith (noun)**: 7 fixed to ſaith on crops (p13 x2, p15 x5, p20 x2; noun "Catholike faith" on p20 kept as f). All other "faith"/"ſaith" occurrences read in context (verb = ſaith, noun = faith).
- **w vs vv**: the print mixes a real w glyph and vv. Pages 5, 6, 8, 21, 26, 28 crops show real w in body text (12/12 samples agreed with Transkribus). Applied Transkribus's lowercase w where the draft had vv (aligned words only): p3 1, p4 5, p5 39, p6 29, p7 1, p8 14, p9 2, p10 5, p11 4, p12 5, p18 1, p21 52, p26 6, p28 9, p30 2; p22 (by crop) were/newely/who/whereof/we hope; p23 "away"; p14 "we appeale". Then 20 more unique residual words from the two agy runs (p4-12: allow, bestowed, knowing, hovv/knovv...). Capital "Vv" kept as vv (crop of "Vve adde", "Vvhere", "Vvhy" shows vv).
  Pages 7, 9-13, 15, 18, 29 are mostly vv in print (OCR agrees); not re-sampled.
- p1: cleering -> cleeting (print misprint kept).
- p2: q-acute on aliiq́ue and vitæq́ue (accent sits over q); double spaces removed.
- p10: "haue not taſt" -> "no", "opinions," -> "opinions.", "Annotations" -> "Annota ions" (print gap kept), margin "Bezaan not." -> "Beza annot." (not cropped).
- p19: normalised to NFC (Greek oxia, lint E-nfc).

## Open (not done)
- Macrons page by page, æ/ę beyond p2, margin note placement, restoring real hyphens (Sect-maisters etc.), page-end hyphenation.
- Layout pages 25, 26, 29, 30 (list, marks table, drop capital, rh header/footer); lint W-header warnings remain.
- p2: ſacratißima (print looks like ſ+ß; agy says ſacratiſsima), peritiſſimi, "probè." dot after è.
- p1: "commended" may carry a tilde over mm in the print; check.
- p14: Greek words, "truc"/"true", "Teſt. prin-ted"; p17 citations spacing; p23 "bel"/"hel"; p28 othervviſe vs othervvife (ſ/f); p27 "( ô".
- Unaligned vv words on pages with mixed glyphs may still be w (only OCR-aligned and agy-agreed words were changed).

## Second pass (agy gemini-4-argon-low)
- Targeted crops: p23 "firy bel" -> "hel"; p14 "truc text" -> "true text"; p2 peritiſſimi -> peritiſsimi (ſs, agy x3 agree); p1 "commended" has no macron (kept plain); p28 all five othervviſe confirmed ſ + vv; p27 print has spaces inside "( ô Heretike )" (left unspaced, lint rule); p2 ſacratißima kept (italic ß).
- Macron list per page (argon-low, 3 bands): applied where the draft had the plain form, then re-checked occurrence by occurrence on 3x crops. Macron kept only where the crop shows a bar: p9 childrē/queſtiōs/feruēt (1st), p11 begīning, p14 trāſlate (1st), p15 cōmodious, p16 none (both plain), p19 Teſtamēt (1st), graūt (2nd), p20 tranſlatiō (5th only), p21 vntrāſlated (2nd), p22 indifferēt (1st), p26 Theſſaloniās (1st). Plain restored on p11, 17, 21 (trāſlate), 22 (Proteſtāts), 27 (comitted).
- Still unresolved (occurrence counts disagree between OCR boxes and draft, left as the macron form): p5 indifferētly, p11 tranſlatiō, p13 cōcerning, p14 trāſlations, p25 Annotatiōs.
- agy listed macron words not found in the draft (draft spells them in full or differently): p4 Sāct/Aūcient/hādes/coūtries, p6 renoūcing, p8 nothīg/audiēce/circūſtances, p12 cōteine/Teſtamēt/Coūcels/iudgemēt/arrogāt, p13 cōmend/Commēded, p15 oftē/aūcient/mētioned, p20 Proteſtāts/cōdemne/accuſatiō, p23 cōmaundeth/cōtineri/cōmodities. Not applied: agy low also lists few words per page, so this is not a complete macron pass.
- Latin æ/œ in margin quotes (cœlo, Præfat, Epistolae/praeſentiam on p24) not yet compared.

## Third pass (agy argon-low + geometry scripts)
- Footers: agy read signature + catchword for all 30 pages (top/bottom strips). Added missing footers on 11, 14, 16-23, 25-30 as {{rh|||sig|catch}} or {{continues|catch}}. Catchwords already present matched agy on 3-10, 12, 13, 15. p24 has none.
- p27: "ued the Goſpel it ſelf..." is body text, not a running head (head removed); p28: the italic Vincentius line is a centred heading, not a running head. p26: "1 Epiſt." / "2 Epiſtle ... Theſſaloniās" macron moved to the 2nd; "Luther, Caluin" margin note moved beside "* Manichæus" (y position from OCR).
- Table pages: 25 and 26 layout looks right in the draft (p26 is a two-column list; draft lists left column then right).
- æ/œ: Latin italic cœlo/cœlis/cœleſtis (p14 x2, p20, p23) were cælo in the draft; agy argon-low read œ three times, crops are consistent with œ. p7 proœm, p8 ſæpè, p17 Præfat x2 fixed (agy). p1, p2, p10, p14 præeſſe, p15 Græc, p24 Latin quotes already matched.
- Hyphens: agy's hyphen lists are almost all syllable breaks (joined, correct). Real compounds checked on crops: Sect-maiſters (p10) and fellovv-tranſlators (p14) already hyphenated in the draft; Paſſeouer (p21) is one word.
- Margin-note placement: geometric check (note y vs the body word where the draft puts it). Only 4 unambiguous moves applied (p8 x2, p14 x1, p19 x1), NOT checked by eye. About 100 notes could not be matched automatically (first margin word not unique in the OCR or body OCR differs); many differ by 2-6 lines (p5, 6, 9, 17, 18, 20, 24) and are still open.

## Fourth pass: lint and margin notes
- p1: `<br />` -> `{{br}}` (agy flash-low edit); lint now reports 0 errors for E-ital/brace/margin/nfc/tag/sentinel.
- Margin notes: agy argon-low gave, per page, each note and the main-text line level with its first line (spot-checked by eye on p14: right). Each draft note was matched by text and moved to that line's first word (fuzzy match >= 0.8, distance >= 8 words; never inside another template). About 100 notes moved on p4-24, 28, 29, some by 100-250 words (p14: Teſt.printed note 255 words earlier in the draft). Only p14 was verified against the scan; the other pages rely on agy's reading of the line.
- Not moved: notes whose text matched more than one draft note (repeated Greek notes on p16, 20), notes agy could not read, p3-4 where the match failed; a few stacked notes may sit one line off.

## Fifth pass (agy argon-medium, one call per page, draft text vs scan)
- One call per page on p3-29 (macron differences + margin-note placement; only mismatches reported). 8 more notes moved (p6, 16, 18, 19, 27, 28, 29); p20 skipped (its two agy runs disagree by 400+ words, needs an eye check).
- Macron results were contradictory against the occurrence-by-occurrence crop checks (p5, 9, 11, 13, 20, 25) so none applied; p28 "Arīus" (agy: print plain) left, one reading only.

## Sixth pass (my own crops, one sheet per question)
- Macron occurrences read on one sheet: p11 tranſlation/tranſlators/trāſlation plain, only the last "tranſlatiō." has the bar; p14 only "tráſlations,but" has it (others plain); p25 first Annotations plain, second Annotatiōs has the bar; p9 queſtiōs and childrē (first occurrences) confirmed; p13 cōcerning confirmed once. p5 indifferētly: one occurrence confirmed, the second occurrence of the word in the draft was not located (left as is).
- p20 margin notes: read the margin strips of the scan and moved 9 notes (the Mat. 16 / Io. 20 / Iac. 2 / 1 Tim. 5 / 1 Io. 5 / Heb. block now sits level with quid ſolueris … in remunerationem; κεχαριτωμένη beside "as Apoc. 17"; ἡλκωμένος beside "do folow alſo"). The two top notes (D. Sand. Rocke, Proteſtāts) not verified: they sit above the strip I read.

## Seventh pass
- p5 second "indifferētly" is plain "indifferently" (crop); p28 "Arīus" is "Arîus" (circumflex, crop). p10 1 Cor. 2 / 2 Cor. 4 notes already on the right line. p16 "The vulgar Latin Tranſlatiō" moved to "the Greeke alſo, as they doe"; p28 "Of Caluin, of Iuel" moved to "the other plagues"; p27 note kept (between two lines, nearer the draft's). p20 top notes confirmed.
- Still open: p16 καινοφωνίας notes (2) and p23 "Act. 15." (stacked with 1 Cor. 11, 2 Theſ. 2 at "we adde the").
- Upload prompt for agy: docs/audits/front-upload-prompt.md

## Eighth pass: last open notes, and ours vs the proofread live pages (2-10)
- p16 καινοφωνίας and the Greek "Codex veronenſis ... ἑαυτοὺς" note are one contiguous margin block, left as is (καινοφωνίας already level with "and expounded them, agreable"). p23: Act. 15 moved to "Seniores, πρεσβυτέρους", 2 Theſ. 2 to "Præcepta, παραδόσεις", 1 Cor. 11 already at "falſe tranſlation".
- p9: queſtiōs/queſtions were swapped (OCR tile order vs draft order): now "hardeſt queſtiōs" (bar) and italic "Languiſhing about queſtions" (plain). Other occurrence-by-occurrence macron fixes (p11, 14, 20, 21, 22, 26) used the same tile order and were not re-verified against the draft order.
- Live (proofread level 3: p2-10) vs ours, word diff of 756 differences: long-s/case 493 (live is in modern s; ours keeps ſ on purpose); vv/w 160 (live has w throughout; ours follows the OCR/crop reading of each word); other 80; macron 5.
- The 80 "other" were judged by agy argon-medium against the scan: all are wording-identical; they differ only in where margin notes sit in the text flow, plus: p2 live has linguae/Academia/Theologia/PETRUS where the print has linguæ/Academiæ/Theologiæ/PETRVS (ours right, crops), p9 live "questions" vs our queſtiōs (see above).
- Margin-note placement on p9 checked by OCR y: Hiero. ep. 13 note (y 1279) is level with "he endeth," (y 1280) = ours; live puts it one line lower at "they vvill not". Ruff. and Euery notes likewise match ours. agy's "live" verdicts on these were wrong; ours is better.
- Conclusion: our drafts are at least as good as the proofread live pages on wording and placement; the real differences are deliberate (ſ, vv, ligatures, V caps). Do not post pages 2-10 over the live text without the user's review of the diffs (live is another editor's proofread work).

## Ninth pass: occurrence order re-check
- Re-matched every macron occurrence by its neighbouring words (OCR boxes vs draft) instead of by order: p9, p11, p21, p22, p26 were already right. p14: the bar is on "proteſt to trāſlate it, dare" (fixed; the other tranſlate plain). p20: the bar is in the left margin note ("more then in the tranſlatiō."), not in the body "your owne tranſlation" (both fixed).

## Posted (user-approved overwrite of the proofread pages)
- Pages 2-10 posted to en.wikisource (revs 16471757 ... 16471767, account Sokonok) over the level-3 pages; the first attempt with the tag reset to level 1 was refused (proofreadpage_notallowedtext), so the existing pagequality tag was kept. Edit summary: re-read against the scan (long s, vv/w, macrons, ligatures, V capitals, misprints kept, margin notes repositioned, heads/signatures/catchwords).
- Not posted: pages 1, 11-19, 29, 30 (newest live revision by other users, not covered by the approval), 20-28 (not on Wikisource yet; need --create). Drafts were copied to wikisource/1582-rhemes-nt/pages/1-30.wiki (uncommitted).

## Posted, rest of 1-30
- Pages 1, 11-19, 29, 30 edited over other users' text and 20-28 created (revs 16471770 ... 16471804, account Sokonok), same edit summary. Page status could not be changed (proofreadpage_notallowedtext), so existing pagequality tags were kept (p1 level 3; p16-19, 29, 30 level 0). New pages 20-28 are level 1.
- All of PDF pages 1-30 are now on en.wikisource. Drafts in wikisource/1582-rhemes-nt/pages/1-30.wiki and front-draft/ remain uncommitted.
