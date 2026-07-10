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

## Source ingest

A URL is a bookmark until materialized.

1. Capture the source into `Wiki/Sources/` with provenance. Login-gated, paywalled, or anti-bot pages (X threads, gated articles) → use the `web-capture` skill.
2. Discuss/read key takeaways.
3. Create/update `Wiki/` pages and bidirectional wikilinks.
4. Update `Wiki/index.md` and `Wiki/log.md` if present.
5. Flag contradictions instead of smoothing them away.

## Query

Read `Wiki/index.md`, follow only relevant pages, answer with citations, and offer to file durable synthesis back into the wiki.
