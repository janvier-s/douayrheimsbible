# Scriptorium bot-approval request (draft)

Draft only. Nothing here has been posted. Replace `<BotName>` (for example
`JanvierBot`) and `<Operator>` (your Wikisource username) before posting.

The posting tool, `scripts/wikisource/post.py`, is planned and not written yet. The
request describes it as planned. Write it, and test the dry run, before the trial edits.

## (a) The request

Post as a new section on
[Wikisource:Scriptorium](https://en.wikisource.org/wiki/Wikisource:Scriptorium),
logged in as `<Operator>` (not as the bot).

```wikitext
== Bot approval request: <BotName> ==

I would like approval for [[User:<BotName>|<BotName>]] (operator: [[User:<Operator>|<Operator>]]) to add the text of the Gospel of Matthew to [[Index:1582_Rhemes_New_Testament.pdf]].

'''Purpose.''' I have a transcription of the 1582 Rhemes New Testament in the original spelling. For Matthew it has been checked against the scans of this Index (the same printing): the text, the paragraph breaks, the margin citations, glosses and lectionary notes, the chapter summaries, the annotations, the running heads, ''w'' against ''vv'', long s, and the macrons in the margin notes. Pages 29–33 and 54 hold only raw OCR or nothing at the moment.

'''Scope.'''
* Namespace: Page: only. No Main namespace pages, no Index: changes, no transclusion.
* Pages: [[Page:1582_Rhemes_New_Testament.pdf/31]] to [[Page:1582_Rhemes_New_Testament.pdf/113]] (Matthew), about 83 edits.
* Status: every page goes up as "Not proofread" (level 1). The pages may still contain errors, and a person should proofread them against the scan.
* The bot will '''not''' edit a page that has a human edit or a status above "Not proofread". Those pages are skipped and listed for me to look at by hand.

'''Format.''' The pages follow the proofread preface, [[Page:1582_Rhemes_New_Testament.pdf/4]]: ſ is written s; u/v, vv and macrons (''cōmaunded'', ''vpō'') are kept as printed; the printed marks († * ∷ ‖) stay in the text. The text is kept as printed, including the printer's errors. Margin notes use <nowiki>{{MarginNote}}</nowiki> (citations in the inner margin, glosses and lectionary notes in the outer one), verse anchors use <nowiki>{{verse}}</nowiki>, and the header and footer hold <nowiki>{{rh}}</nowiki> running heads and the catchword. A sample page can be posted in my user space first if that helps.

'''Tool.''' A Python script using the MediaWiki API with a bot password. It does a dry run first, rendering each page through the read-only parse API so I can check it. It then posts with more than 65 seconds between edits and a clear edit summary, for example: ''Matthew text from a checked transcription of the 1582 Rhemes NT, not proofread''. It records each revision ID so I can find and fix any edit later.

'''Mode.''' Semi-automated. I start each run and watch it. I will stop at once on any complaint and answer comments myself.

'''Questions.'''
# Is "Not proofread" the right level, or would you prefer something else?
# Are the <nowiki>{{MarginNote}}</nowiki> layout and the conventions above acceptable for this Index?
# Later, I may ask to do the rest of the New Testament (Mark onward) the same way. I am not asking for that now. Would announcing each later batch in this thread be enough, or should each be a new request?

After a few days with no objection, I plan a slow trial run without a flag. If it goes well for a week, I will ask a bureaucrat for the flag. ~~~~
```

## (b) The bot's user page

Create `User:<BotName>` while logged in as the bot (or as `<Operator>`).

```wikitext
{{bot|<Operator>}}
This is a bot account run by [[User:<Operator>|<Operator>]].

'''Task:''' add the text of the 1582 Rhemes New Testament to [[Index:1582_Rhemes_New_Testament.pdf]], starting with the Gospel of Matthew (Page:…/31 to /113). Pages are posted as "Not proofread". The bot does not edit pages that a person has edited or proofread.

'''Approval:''' [[Wikisource:Scriptorium#Bot approval request: <BotName>|Scriptorium discussion]] (link to the archive once it is archived).

'''Edits:''' semi-automated, at least 65 seconds apart, watched by the operator.

'''To stop it:''' leave a message on [[User talk:<BotName>]] or [[User talk:<Operator>]]. The operator watches every run and will stop at once. In an emergency any administrator may block this account.
```

If `{{bot}}` does not exist on en.wikisource, drop that line; the text below it is enough.

## (c) Checklist

1. **Create the bot account** at Special:CreateAccount, logged out or from your own
   account. The name must contain "bot" (for example `JanvierBot`). Do not use your
   real name.
2. **Create the user page** `User:<BotName>` from (b). Add a line to your own user
   page saying you run `<BotName>`.
3. **Post the request** from (a) on Wikisource:Scriptorium, signed as `<Operator>`.
   Replace the placeholders first, and confirm the claim about pages 29–33 and 54 is
   still true, and what pages 34–113 hold now. Add the thread to your watchlist.
4. **Make a bot password**: log in as the bot, open Special:BotPasswords, create one
   (for example app name `post`) with only these grants:
   - Edit existing pages
   - Create, edit, and move pages

   The login name becomes `<BotName>@post`.

5. **Keep the password in a local file**, never in chat, git or the repo. For example:

   ```bash
   mkdir -p ~/.config/wikisource
   printf '%s\n' '<BotName>@post' '<the password>' > ~/.config/wikisource/bot-password
   chmod 600 ~/.config/wikisource/bot-password
   ```

   Give the agent only the path (`~/.config/wikisource/bot-password`). If the
   password is ever exposed, revoke it on Special:BotPasswords and make a new one.

6. **Wait 3–4 days.** Answer every comment yourself. If anyone objects, do not run
   the bot until it is settled.
7. **Trial run** (no flag): first the dry run (parse API only, no edits) and check
   the rendered pages. Then post a few pages, more than 1 minute apart, and check
   each on the wiki. Stop on any complaint.
8. **After about a week of good operation**, ask a bureaucrat for the bot flag
   (link to the thread and the trial edits), then finish the remaining pages.
9. Update `manifest.json` with each posted `revid` (the tool does this).
