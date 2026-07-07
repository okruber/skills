---
name: obsidian-vault-assistant
description: Use when managing the OEK Obsidian vault: capture, inbox sweep, task refinement, weekly planning, source ingest, wiki query/lint, dreams, or vault-to-repo handoff prep.
---

# OEK Vault Assistant

## Overview

The vault session is Olle's personal control tower. Keep day-to-day productivity separate from the wiki/LLM knowledge layer: tasks start from `Inbox.md`, `Task Dashboard.base`, and `Task System Runbook.md`; knowledge work lives under `Wiki/` (raw captures in `Wiki/Sources/`, curated pages in `Wiki/`).

Vault path, always quoted:

```bash
"/Users/ollekruber/Library/Mobile Documents/iCloud~md~obsidian/Documents/Oek Vault"
```

## Start of Any Vault Conversation

1. Read `.pi/memory.md`.
2. If `last-swept` is not today, run the ambient sweep in this order:
   - classify plain bullets in `Inbox.md`;
   - create/update task notes only when warranted;
   - surface `Logs/dreams/Pending.md` proposals for approval;
   - flag stale backlog/blocked items for triage;
   - update `last-swept`.
3. If `last-review` is ≥ 7 days old, offer a weekly review.
4. Announce changes in one compact line, then answer the user's request.

Use the actual current date. Never silently promote work into `this-week` or `done`.

## Daily Task System

Human-facing surfaces:

| Surface | File | Purpose |
|---|---|---|
| Capture | `Inbox.md` | frictionless raw bullets, links, todos; no metadata required |
| Plan/act | `Task Dashboard.base` | daily surface = `Refine`, `This Week`; plus a `Backlog` admin view for planning reference |
| Rules | `Task System Runbook.md` | lifecycle, triage, dreaming, delegation notes |

`Task Dashboard.base` is the only task surface. The old `Agenda.base` / `Ideas & Knowledge.base` were retired to `Archive/` on 2026-07-07.

Task notes stay one-note-per-task in `Tasks/` for automation, search, dreaming, and future delegation. **Name each file by its readable title** (e.g. `Tenderdesk — MVP.md`), not a slug — the dashboard shows `file.name` as the clickable link into the note, so the filename *is* the human-facing task name. Strip Obsidian/OS-illegal characters (`\ / : * ? " < > | # ^ [ ]`) from the filename (replace `/` with `-`); keep the exact phrasing (with punctuation) in the `title` property.

**Title format: `Prefix — Action phrase`.**
- **Prefix** = the most-specific named project if one exists, else the domain. Controlled vocabulary: `Arrive` (client work/infra not under a named project), `Builder Platform` (aka Vibe Platform), `Tenderdesk`, `imeto` (own company: partnerships, recruiting, marketing, stakeholders), `Decksmith`, `Research` (personal R&D, tooling, learning, the vault/dreaming system), `Personal` (life admin). Separator is an em-dash ` — ` (colons/pipes are filename-illegal). Add a new prefix only when a project genuinely warrants its own group.
- **Action phrase**: imperative verb first (`Ask`, `Build`, `Clarify`, `Investigate`, `Set up`, `Reach out`, `Write up`, `Review`, `Draft`, `Decide`, `Adopt`, `Message`), sentence case, no trailing period, ≤ ~70 chars. Turn raw thoughts/questions into an action (`Clarify…`, `Decide whether…`, `Investigate…`).
- **No metadata in the title.** Timing → `review_after`; blocker/delegation → `blocked`; priority → `size`/`context`; rationale/detail → `context`/`next_action`/`acceptance`. Never bake "after vacation", "pushed to next week", "low priority", "delegated to X" into the name.

### Lifecycle

Allowed task statuses:

```text
refine | backlog | this-week | done | dropped
```

Meaning:

| Status | Meaning | Who moves it there |
|---|---|---|
| `refine` | vague, ambiguous, dream output, or needs clarification | assistant may create; Olle chooses next state |
| `backlog` | real but not committed this week | Olle, or explicit migration/grooming choice |
| `this-week` | the committed now/next shortlist (what Olle is actively working) | Olle only after first migration |
| `done` | complete | Olle only |
| `dropped` | intentionally abandoned | Olle only; assistant may suggest |

**Blocked is a flag, not a status.** A committed item that can't move right now keeps its `status` (usually `this-week`) and carries a `blocked:` field naming the blocker/owner (e.g. `blocked: "DNS PR review — separate team"`, `blocked: "delegated to Nikhil"`). Empty `blocked` = active. This keeps blocked-but-committed work visible on This Week instead of hidden in a separate view. The assistant may set/clear `blocked` for explicit handoffs/blockers; it must not change `status` to signal blocking.

Vague items go to `refine`, not backlog. Backlog is inventory, not a daily surface; surface stale backlog items through review/dream recommendations.

### Task frontmatter shape

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

Small tasks can stay list-like. Bigger human or agent-candidate tasks should include why/context/links and a useful `next_action`. The filename should equal the readable title (see above), not an auto-generated slug.

**YAML safety:** always double-quote any frontmatter value containing a colon-space (`: `), a leading `#`/`[`/`{`, or wikilinks (e.g. `next_action: "At the check-in: ..."`). Unquoted colons break the whole frontmatter block, which makes Obsidian drop the note's `status` and it silently disappears from every dashboard view.

### Inbox classification

- Raw link/reference → pending ingest recommendation; do not auto-ingest in bulk.
- Clear task → create a task note, usually `status: refine` unless Olle explicitly chooses `backlog` or `this-week`.
- Vague task/idea → `status: refine` with open questions.
- Ambition/reflection → `Wiki/Ambitions & Reflections.md`.
- Noise → confirm/drop; never delete notes silently.

## Refinement and Dreaming

Refinement is a lightweight “grill me” loop: ask only the questions needed to clarify outcome, next action, constraints, links, and whether it is human/delegable.

Olle may skip clarification. Skipped items stay eligible for future refinement.

Dreaming may suggest drops, merges, stale backlog triage, agent candidates, simulated plans, preference memories, and connections. Dream outputs return through `Refine` or explicit recommendations; never hide new daily views.

Future memory systems (`https://mem0.ai/`, `https://remnic.ai/`) are notes only. Do not integrate them unless explicitly asked.

## Handoffs

The vault session scopes; execution happens elsewhere. For any multi-step repo task, use the `vault-to-repo-handoffs` skill.

Minimum vault-side action:

1. Ensure the task note has repo/path/context/acceptance or ask for the missing fields.
2. Write a brief in `Logs/handoffs/YYYY-MM-DD-<slug>.md`.
3. Recommend an execution mode: Orca worktree, non-Orca worktree, repo session, or subagent.
4. Set the `blocked` field (not a status) only when an explicit external handoff/blocker exists; clear it when unblocked.

Future agent delegation target is Orca (`https://www.onorca.dev/`). Do not implement autonomous delegation in this skill.

## Knowledge Layer

Raw sources are immutable after capture:

| Layer | Path | Owner | Rule |
|---|---|---|---|
| Raw sources | `Wiki/Sources/` | Olle/assistant capture | preserve original material |
| Wiki | `Wiki/` | assistant-maintained | summaries, entities, concepts, syntheses |
| Templates | `Wiki/Templates/` | Olle | note/task/daily-note scaffolds |
| Logs | `Logs/` | assistant-maintained | ingest/query/lint/dream/handoff traces |

**Wiki is durable reference only — not a bin for task byproducts.** The test: *"in six months, when I ask 'what do I know about X?', do I want this to surface?"* Yes → Wiki. "Only meaningful for this one task/meeting" → it is a **transient task artifact** and belongs **in the task note body** (or `Logs/` for traces), never as a `Wiki/` page. Concretely: meeting agendas, prep, checklists, per-task working notes stay with the Task; durable understanding distilled from the work goes to the Wiki. Wiki pages carry `type/` frontmatter and are listed in `Wiki/index.md`; if a would-be page is dated-and-disposable, it fails both tests — keep it out of `Wiki/`.

A URL is a bookmark until materialized. For source ingest:

1. Capture source into `Wiki/Sources/` with provenance.
2. Discuss/read key takeaways.
3. Create/update `Wiki/` pages and bidirectional wikilinks.
4. Update `Wiki/index.md` and `Wiki/log.md` if present.
5. Flag contradictions instead of smoothing them away.

Query flow: read `Wiki/index.md`, follow only relevant pages, answer with citations, and offer to file durable synthesis back into the wiki.

## Lint

Run:

```bash
python3 "$HOME/.agents/skills/obsidian-vault-assistant/tools/lint.py" "/Users/ollekruber/Library/Mobile Documents/iCloud~md~obsidian/Documents/Oek Vault"
```

Report orphans, broken links, untyped notes, duplicates, and obvious contradictions. Apply fixes only with approval.

## Natural Language Triggers

| User says | Do |
|---|---|
| “What’s on my plate?” | Read `Task Dashboard.base` and summarize `Refine`, `This Week` counts/items |
| “Sweep/tidy inbox” | Classify `Inbox.md`; move filed bullets out of inbox |
| “Refine this” | Ask clarifying questions; update the task note |
| “Plan this week” | Browse `Backlog`; pull items into `This Week` only by Olle choice |
| “Hand this off” | Use `vault-to-repo-handoffs`; write brief |
| “Ingest/read/save this” | Capture source, then ingest deliberately |
| “What do I know about X?” | Query `Wiki/` via index and relevant pages |
| “Lint/health check” | Run lint and report |
| “Run/review a dream” | Surface dream proposals; apply only approved changes |

## Hard Rules

- Quote the vault path.
- Never delete notes; archive instead.
- `Inbox.md` capture stays frictionless.
- `Task Dashboard.base` daily surface = `Refine`, `This Week`; `Backlog` is an admin/reference view for planning, not daily navigation. It is the sole task surface.
- Only Olle moves tasks into `this-week`, `done`, or `dropped`.
- Assistant may create `refine`, suggest backlog grooming, and set/clear the `blocked` flag for explicit handoffs/blockers.
- Nothing vague silently becomes backlog.
- Keep day-to-day tasks separate from the wiki/LLM knowledge track.
- Transient task artifacts (agendas, prep, checklists, per-task notes) live in the task note or `Logs/`, never as `Wiki/` pages; `Wiki/` is durable reference only.
