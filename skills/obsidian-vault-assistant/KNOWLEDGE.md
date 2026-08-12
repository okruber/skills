# Knowledge Layer

Disclosed reference for [`obsidian-vault-assistant`](SKILL.md). The `durable` vs `transient` distinction is defined in `SKILL.md`; this file covers the layers and flows.

## Layers

| Layer | Path | Owner | Rule |
|---|---|---|---|
| Raw sources | `Wiki/Sources/` | Olle/assistant capture | preserve original material, immutable after capture |
| Wiki | `Wiki/` | assistant-maintained | durable summaries, entities, concepts, syntheses |
| Templates | `Wiki/Templates/` | Olle | note/task/daily-note scaffolds |
| Logs | `Logs/` | assistant-maintained | ingest/query/lint/dream/handoff traces |

## Durable vs transient (the sorting test)

Wiki pages are **durable** reference only — not a bin for task byproducts. The test: *"in six months, when I ask 'what do I know about X?', do I want this to surface?"* Yes → Wiki. "Only meaningful for this one task/meeting" → it is a **transient** task artifact and belongs in the **task note body** (or `Logs/` for traces).

Concretely: meeting agendas, prep, checklists, and per-task working notes stay with the Task; durable understanding distilled from the work goes to the Wiki. Wiki pages carry `type/` frontmatter and are listed in `Wiki/index.md`; a dated-and-disposable would-be page fails the test — keep it out of `Wiki/`.

## Source ingest — the guided read

A URL is a bookmark until materialized. Olle pastes a link and says **guided read**. One link at a time.

0. **Check it is new.** Grep the url against `## Read` in `Reading Queue.md` and against `Wiki/Sources/`. A pointer post and its payload are different urls, so check both once resolved.
1. **Fetch and frame.** Capture the source into `Wiki/Sources/YYYY-MM-DD-<slug>.md` with provenance. The frontmatter must carry `URL:` on its own line, and `Via:` when the source was reached through a pointer. Login-gated, paywalled, or anti-bot pages (X threads, gated articles) → use the `web-capture` skill. Reply with one card: title and author, the url on its own line, rough length and read time, one or two sentences on what it is about, plus anything that changes how to read it (paywalled, images-only, third-hand, vendor writing about itself).
2. **Olle reads it** and pastes notes, ideas, questions.
3. **Reflect** on his notes.
4. **Distill.** A new `Wiki/` page, an edit to existing pages, or nothing. Wire bidirectional wikilinks, update `Wiki/index.md`, append one line to `Wiki/log.md`. Flag contradictions instead of smoothing them away.
5. **Close.** Append the url to `## Read` in `Reading Queue.md`, and remove its line from the link list if it was there. Do this for **every** outcome, including duds, duplicates and topical filings. A read that produces no capture leaves no other trace, which is how a source gets served twice.

Three rules, learned the hard way over ~34 reads (archived design log: `Archive/reading-queue-2026-08-12/`):

- **Do not narrate the article back.** Read it in full, because step 4 needs that, but the card frames the source and never expounds its argument. Olle reads the text.
- **Match the artifact to what the read yielded.** A small source folds into an existing page. Nothing is a valid outcome, and refining an existing page often beats adding a new one. Test before proposing an addition: does it change what he would do differently tomorrow?
- **Ask instead of classifying.** If it is unclear what a link is for, one question retrieves it. Why a link was saved is not recoverable from its text.

No triage passes, no themed batches, no tiering ceremony. `Reading Queue.md` is an unordered parking lot of links, not a pipeline.

## Query

Read `Wiki/index.md`, follow only relevant pages, answer with citations, and offer to file durable synthesis back into the wiki.
