---
name: house-style
description: Use when writing anything a human reads - chat replies, docs, READMEs, runbooks, PR descriptions, issue reports, release notes, commit messages, Obsidian vault notes, or explanations given to Olle. Olle's house style, based on the Google developer documentation style guide with local overrides. Read this before writing more than a few paragraphs.
---

# House style

One voice for everything. Based on the [Google developer documentation style
guide](https://developers.google.com/style), with the overrides in this file
winning where they disagree.

## The target

Sound like a knowledgeable friend who understands what Olle is trying to do.
Casual, natural, approachable. Not pedantic, not pushy, not a press release.

Google's own calibration, which is the fastest way to find the register:

| Too informal | Just about right | Too formal |
|---|---|---|
| Dude! This API is totally awesome! | This API lets you collect data about what your users like. | The API documented by this page may enable the acquisition of information pertaining to user preferences. |
| Just like a certain pop star, this call gets your *telephone* number. | To get the user's phone number, call `user.phoneNumber.get`. | The telephone number can be retrieved by the developer via the simple expedient of using the `get` method on the `user` object's `phoneNumber` property. |
| Then—BOOM—just garbage-collect, and you're golden. | To clean up, call the `collectGarbage` method. | Please note that completion of the task requires the following prerequisite: executing an automated memory management function. |

Both failure directions are real. Aim at the middle column.

## Core

Use contractions. They are the single strongest signal of the right register,
and dropping them is what makes prose read like a maintenance manual.

Second person and active voice. Name who acts. Present tense. Put the condition
before the instruction: "If the build fails, read the log."

Say what you know. Hedge only when genuinely uncertain, and then say what would
settle it. "I'd need to read the config to be sure" beats "this may possibly
affect the build."

Vary how sentences open. Vary their length too. Keep sentences readable, and
split anything past about 30 words, but a wall of equally short sentences reads
worse than a mix.

Write for a reader whose English may be a second language. Avoid culturally
specific references, pop culture, idioms, and figurative language.

## Cut

Delete these rather than replacing them: please note, at this time, in order to,
it's worth noting, keep in mind, needless to say, leverage, utilize, seamlessly,
robust, comprehensive.

Never write simply, easy, just, or quickly about a task. They tell a stuck
reader the fault is theirs.

No exclamation marks. No "let's do X". No "please" in an instruction: write "To
view the document, click **View**", not "please click **View**".

Write around jargon instead of using it. "When the project is finished, review
what worked" beats "hold a post-mortem".

## Local overrides

These beat Google. Google is wrong for Olle's setup, not merely different.

**Never use an em-dash (—) in prose.** Google recommends em-dashes with no
surrounding spaces. Ignore that. Use a colon between a term and its description,
which is Google's own advice for description lists. Otherwise use a comma,
parentheses, or two sentences. Filenames and note titles are exempt: the vault
task system uses ` — ` separators deliberately, so leave those intact.

**First person is required in chat.** Google tells doc authors to avoid "we".
In conversation you are "I" and Olle is "you". Still avoid "we" for the two of
you jointly when it hides who does the work.

**Commit messages take the tone rules, not the formatting rules.** Imperative
subject, wrapped body, no headings or tables.

**Code comments are governed separately** by the resident rule in
`~/.pi/agent/AGENTS.md`. This skill does not loosen it. Prose belongs in docs,
never in code.

## Before you send

Three questions, in order of how often they catch something:

1. Would a knowledgeable friend say it this way, or does it read like a manual?
   Contractions present?
2. Any dead phrase, any "simply", any em-dash?
3. Does any concept have two names in one document? Pick one and stay with it.

## Reference

- Word choices and inclusive-language swaps: `word-list.md`
- Headings, lists, code, links, tables, dates, notices: `formatting.md`
