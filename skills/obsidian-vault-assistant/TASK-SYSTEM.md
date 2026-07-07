# Task Note Mechanics

Disclosed reference for [`obsidian-vault-assistant`](SKILL.md). Read before creating or editing a task note in `Tasks/`.

## Filename and title

**Name each file by its readable title** (e.g. `Tenderdesk — MVP.md`), not a slug — `Task Dashboard.base` shows `file.name` as the clickable link, so the filename *is* the human-facing task name. Strip Obsidian/OS-illegal characters (`\ / : * ? " < > | # ^ [ ]`) from the filename (replace `/` with `-`); keep the exact phrasing in the `title` property.

**Title format: `Prefix — Action phrase`.**

- **Prefix** = the most-specific named project if one exists, else the domain. Controlled vocabulary: `Arrive` (client work/infra not under a named project), `Builder Platform` (aka Vibe Platform), `Tenderdesk`, `imeto` (own company: partnerships, recruiting, marketing, stakeholders), `Decksmith`, `Research` (personal R&D, tooling, learning, the vault/dreaming system), `Personal` (life admin). Separator is an em-dash ` — ` (colons/pipes are filename-illegal). Add a new prefix only when a project genuinely warrants its own group.
- **Action phrase**: imperative verb first (`Ask`, `Build`, `Clarify`, `Investigate`, `Set up`, `Reach out`, `Write up`, `Review`, `Draft`, `Decide`, `Adopt`, `Message`), sentence case, no trailing period, ≤ ~70 chars. Turn raw thoughts/questions into an action (`Clarify…`, `Decide whether…`, `Investigate…`).
- **No metadata in the title.** Timing → `review_after`; blocker/delegation → `blocked`; priority → `size`/`context`; rationale/detail → `context`/`next_action`/`acceptance`. Never bake "after vacation", "pushed to next week", "low priority", "delegated to X" into the name.

## Frontmatter shape

```yaml
type: Task
title: <short title>
status: refine | backlog | this-week | done | dropped
size: small | bigger
agent_candidate: false
created: YYYY-MM-DD
last_reviewed:
review_after:
blocked:
repo:
links:
context:
outcome:
next_action:
acceptance:
```

Small tasks can stay list-like. Bigger human or agent-candidate tasks should include why/context/links and a useful `next_action`.

**YAML safety:** always double-quote any frontmatter value containing a colon-space (`: `), a leading `#`/`[`/`{`, or wikilinks (e.g. `next_action: "At the check-in: ..."`). Unquoted colons break the whole frontmatter block, which makes Obsidian drop the note's `status` — it then silently disappears from every dashboard view.

## Status matrix

| Status | Meaning | Who moves it there |
|---|---|---|
| `refine` | vague, ambiguous, dream output, or needs clarification | assistant may create; Olle chooses next state |
| `backlog` | real but not committed this week | Olle, or explicit migration/grooming choice |
| `this-week` | the committed now/next shortlist (what Olle is actively working) | Olle only after first migration |
| `done` | complete | Olle only |
| `dropped` | intentionally abandoned | Olle only; assistant may suggest |

`blocked` is a flag, not a status — see the Lifecycle section in `SKILL.md`.
