---
name: obsidian-vault-assistant
description: Use when managing the OEK Obsidian vault: capture, inbox sweep, task refinement, weekly planning, source ingest, wiki query/lint, dreams, or vault-to-repo handoff prep.
---

# OEK Vault Assistant

## Overview

The vault session is Olle's personal control tower. Keep day-to-day productivity separate from the wiki/LLM knowledge layer: tasks start from `Inbox.md`, `Task Dashboard.base`, and `Task System Runbook.md`; knowledge work lives under `Sources/` and `Knowledge/`.

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
   - flag stale backlog/waiting items for triage;
   - update `last-swept`.
3. If `last-review` is ≥ 7 days old, offer a weekly review.
4. Announce changes in one compact line, then answer the user's request.

Use the actual current date. Never silently promote work into `this-week`, `focus`, or `done`.

## Daily Task System

Human-facing surfaces:

| Surface | File | Purpose |
|---|---|---|
| Capture | `Inbox.md` | frictionless raw bullets, links, todos; no metadata required |
| Plan/act | `Task Dashboard.base` | exactly three views: `Refine`, `This Week`, `Focus` |
| Rules | `Task System Runbook.md` | lifecycle, triage, dreaming, delegation notes |

Legacy/admin surfaces: `Agenda.base` and `Ideas & Knowledge.base`. Do not use them for daily navigation.

Task notes stay one-note-per-task in `Tasks/` for automation, search, dreaming, and future delegation.

### Lifecycle

Allowed task statuses:

```text
refine | backlog | this-week | focus | waiting | done | dropped
```

Meaning:

| Status | Meaning | Who moves it there |
|---|---|---|
| `refine` | vague, ambiguous, dream output, or needs clarification | assistant may create; Olle chooses next state |
| `backlog` | real but not committed this week | Olle, or explicit migration/grooming choice |
| `this-week` | weekly shortlist | Olle only after first migration |
| `focus` | now/next work pulled from this week | Olle only |
| `waiting` | blocked or handed off | assistant may set for explicit handoff/blocker |
| `done` | complete | Olle only |
| `dropped` | intentionally abandoned | Olle only; assistant may suggest |

Vague items go to `refine`, not backlog. Backlog is inventory, not a daily surface; surface stale backlog items through review/dream recommendations.

### Task frontmatter shape

```yaml
type: Task
title: <short title>
status: refine | backlog | this-week | focus | waiting | done | dropped
size: small | bigger
agent_candidate: false
created: YYYY-MM-DD
last_reviewed:
review_after:
repo:
links:
context:
outcome:
next_action:
acceptance:
```

Small tasks can stay list-like. Bigger human or agent-candidate tasks should include why/context/links and a useful `next_action`.

### Inbox classification

- Raw link/reference → pending ingest recommendation; do not auto-ingest in bulk.
- Clear task → create a task note, usually `status: refine` unless Olle explicitly chooses `backlog`, `this-week`, or `focus`.
- Vague task/idea → `status: refine` with open questions.
- Ambition/reflection → `Ambitions & Reflections.md`.
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
4. Set `status: waiting` only when an explicit external handoff/blocker exists.

Future agent delegation target is Orca (`https://www.onorca.dev/`). Do not implement autonomous delegation in this skill.

## Knowledge Layer

Raw sources are immutable after capture:

| Layer | Path | Owner | Rule |
|---|---|---|---|
| Raw sources | `Sources/` | Olle/assistant capture | preserve original material |
| Wiki | `Knowledge/` | assistant-maintained | summaries, entities, concepts, syntheses |
| Logs | `Logs/` | assistant-maintained | ingest/query/lint/dream/handoff traces |

A URL is a bookmark until materialized. For source ingest:

1. Capture source into `Sources/` with provenance.
2. Discuss/read key takeaways.
3. Create/update `Knowledge/` pages and bidirectional wikilinks.
4. Update `index.md` and `log.md` if present.
5. Flag contradictions instead of smoothing them away.

Query flow: read `Knowledge/index.md`, follow only relevant pages, answer with citations, and offer to file durable synthesis back into the wiki.

## Lint

Run:

```bash
python3 "$HOME/.agents/skills/obsidian-vault-assistant/tools/lint.py" "/Users/ollekruber/Library/Mobile Documents/iCloud~md~obsidian/Documents/Oek Vault"
```

Report orphans, broken links, untyped notes, duplicates, and obvious contradictions. Apply fixes only with approval.

## Natural Language Triggers

| User says | Do |
|---|---|
| “What’s on my plate?” | Read `Task Dashboard.base` and summarize `Refine`, `This Week`, `Focus` counts/items |
| “Sweep/tidy inbox” | Classify `Inbox.md`; move filed bullets out of inbox |
| “Refine this” | Ask clarifying questions; update the task note |
| “Plan this week” | Work from `This Week`; pull to `Focus` only by Olle choice |
| “Hand this off” | Use `vault-to-repo-handoffs`; write brief |
| “Ingest/read/save this” | Capture source, then ingest deliberately |
| “What do I know about X?” | Query `Knowledge/` via index and relevant pages |
| “Lint/health check” | Run lint and report |
| “Run/review a dream” | Surface dream proposals; apply only approved changes |

## Hard Rules

- Quote the vault path.
- Never delete notes; archive instead.
- `Inbox.md` capture stays frictionless.
- `Task Dashboard.base` has only `Refine`, `This Week`, `Focus`.
- `Agenda.base` / `Ideas & Knowledge.base` are legacy/admin only.
- Only Olle moves tasks into `this-week`, `focus`, `done`, or `dropped`.
- Assistant may create `refine`, suggest backlog grooming, and set `waiting` for explicit handoffs/blockers.
- Nothing vague silently becomes backlog.
- Keep day-to-day tasks separate from the wiki/LLM knowledge track.
