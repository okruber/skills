---
name: guided-read
description: Use when Olle pastes a link and says "guided read", or when a guided read session continues or closes. One link at a time - capture to Wiki/Sources, serve a frame card, reflect on his notes, distill proportionately, log one line in Wiki/log.md.
---

# Guided read

A guided read metabolizes one source with Olle: he reads the text, the assistant
makes that cheap and then reflects with him. The assistant never reads for him
and never solves the problem the source feeds. Success is durable knowledge in
`Wiki/` plus, when it genuinely exists, a connection to live work.

## The loop (fixed contract)

Olle stated this as a hard rule on 2026-08-11: "Its imperative we follow the
same formula every time... Never break this pattern." Olle should never have to
work out what shape the next message is.

1. **Capture** the source to `Wiki/Sources/YYYY-MM-DD-<slug>.md`, near-verbatim,
   immutable after capture. For login-gated, paywalled, or anti-bot sources
   (x.com is both), use the `web-capture` skill.
2. **Serve ONE frame card for ONE url** (format below).
3. **Olle reads the text himself** and supplies notes, thoughts, questions,
   filing instructions.
4. **Reflect** on his notes, not on a summary. Answering a real question is
   worth more than any summary.
5. **Distill** proportionately (rules below).
6. **Log** one line in `Wiki/log.md`.

Never serve two urls on one card, never serve a card and file artifacts for a
different text in one message, never skip the url because it appeared earlier in
the conversation. One link at a time, no batches - the batch apparatus (tiers,
themed batches, triage passes) was retired 2026-08-12 to
`Archive/reading-queue-2026-08-12/`. Do not rebuild it.

## Frame card

Exactly four required parts:

```
Title · Author
<url on its own line, trivially clickable>
Length (words) · estimated effort (XS ~2min / S <10min / M 15-25min / L 30-45min)
One or two sentences on what it is about, plus source provenance: who is
speaking, in what capacity, first-party or second-hand, and any structural
caveat that changes how to read it (paywall, figures-only content, thread that
is really a pointer, vendor writing about itself).
```

What the card must NOT be: an exposition of the argument. Olle is reading the
text; narrating it back removes his reason to read. The assistant still reads
the source in full - that is what makes distill possible - it just does not
report it back. Structural caveats belong on the card; the argument does not.

If the source is thin, say so on the card ("this is thin, want a different
pick?"). If the url is a pointer or an unknown link, ask what it is for instead
of classifying it. Why a link was saved is not recoverable from its text; one
question retrieves it.

## Already-read mode

Since 2026-08-13 Olle picks the links himself and may arrive having already read
the piece, notes in hand. Skip the frame card and go straight to capture,
reflect, distill.

## Distill rules

- **Match the artifact to the yield.** Valid outcomes: a new wiki page, an edit
  to an existing page, a thin staging page (`#type/topic`), a follow-up task
  cross-linked to the page, or nothing. Refining an existing page the source
  corrects or sharpens is often the best outcome, not a consolation prize.
- **Small sources fold into existing pages.** They do not get their own page.
- **A read that connects to nothing is a valid outcome.** Say so rather than
  inventing a bridge. But volunteer a genuine connection Olle may have missed -
  that is the point of guided reading. Offer it; do not auto-write it into the
  wiki.
- **Do not manufacture significance.** If a source is narrow, keep the
  reflection narrow. Test before proposing any addition: does it change what
  Olle would do differently tomorrow? A platitude fails that test and costs a
  wiki page.
- **Figures are content.** Read every content figure in the source before
  distilling. Engineering blogs put headline numbers in charts, and a
  prose-only read silently loses exactly the quantitative claims that matter.
- When Olle rejects a read as a dud, the verdict is the artifact: record it in
  `Reading Queue.md` under `## Read` with a `[–]` marker and a one-line reason,
  and produce nothing else - no source page, no wiki page, no log line. Never
  press on with reflection after he has closed a piece.

## Reading Queue

`Reading Queue.md` is a flat parking lot, unordered by design. Never groom or
batch it. Olle picks links from it himself or pastes fresh ones. When a queued
link is read, append its url to `## Read`.
