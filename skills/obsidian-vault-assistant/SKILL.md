---
name: obsidian-vault-assistant
description: "Use when managing the OEK Obsidian vault: capture, inbox sweep, task refinement, weekly planning, source ingest, wiki query/lint, dreams, or vault-to-repo handoff prep."
---

# OEK Vault Assistant

## Overview

The vault session is Olle's personal **control tower**: it plans and scopes, execution happens elsewhere. Keep two tracks separate — day-to-day productivity (`Inbox.md`, `Task Dashboard.base`, `Tasks/`) and the wiki/LLM knowledge layer (`Wiki/`).

Two words run through everything below:

- **durable** — knowledge that survives the task; belongs in `Wiki/`. The test: *"in six months, when I ask 'what do I know about X?', do I want this to surface?"*
- **transient** — an artifact meaningful only for one task or meeting (agendas, prep, checklists, working notes); belongs in the **task note body** (or `Logs/` for traces), never in `Wiki/`.

Vault path, always quoted (this is the working directory for every vault action):

```bash
"/Users/ollekruber/Library/Mobile Documents/iCloud~md~obsidian/Documents/Oek Vault"
```

## Start of Any Vault Conversation

1. Read `.pi/memory.md`.
2. **Report the Due count and offer to run it.** Due = open task notes whose `review_after` has arrived. It is the first line of every vault session, before anything else. Empty means healthy; a number means that many items are waiting for a verdict.
3. If `last-swept` is not today, run the ambient sweep in this order:
   - classify plain bullets in `Inbox.md` (see Inbox classification);
   - create/update task notes only when warranted, each with a `review_after` date;
   - surface `Logs/dreams/Pending.md` proposals for approval;
   - update `last-swept`.
4. Announce changes in one compact line **carrying both numbers, intake and closures** ("filed 5, closed 0" is a legitimate report; omitting the second number is not).

Do not use a calendar signal to trigger a review. "Last review was N days ago" failed through a four-week vacation, because it only reports what was missed. The Due queue is state-based: time away makes it longer, never overdue in a way that can be missed.

Use the actual current date.

## Daily Task System

Human-facing surfaces:

| Surface | File | Purpose |
|---|---|---|
| Capture | `Inbox.md` | frictionless raw bullets, links, todos; no metadata required |
| Triage | `Task Dashboard.base` → `Due` | items whose `review_after` has arrived, oldest first. Empty = healthy. The only surface that removes things from the system |
| Plan/act | `Task Dashboard.base` | the sole task surface. Daily view = `Refine`, `This Week`; `Backlog` is an admin/reference view for planning, not daily navigation |
| Rules | `Task System Runbook.md` | lifecycle, triage, dreaming, delegation notes |

Task notes stay one-note-per-task in `Tasks/` for automation, search, dreaming, and delegation. Task-note mechanics — filename/title format, frontmatter shape, YAML safety — live in [`TASK-SYSTEM.md`](TASK-SYSTEM.md); read it before creating or editing a task note.

### Lifecycle

Statuses: `refine | backlog | this-week | done | dropped`.

**Every open note carries a `review_after` date.** Required on `refine`, `backlog`, and `this-week`; defaults are +7 days for refine and +30 for backlog. It is the only mechanism that returns an item to attention, and without it items rot silently. Registered as `date` in `.obsidian/types.json`, so keep it typed or the Due view stops matching.

**An item that surfaces in Due leaves with one of five verdicts:** act (`this-week`), delegate (handoff brief), question (stays `refine`, with the specific question written into the note), park (new `review_after` **and** a one-line reason), or close (`done`/`dropped`). "Read it and moved on" is not a verdict. The same park reason twice means propose the drop.

- **Only Olle** moves a task into `this-week`, `done`, or `dropped`.
- The **assistant** may create `refine` notes and suggest backlog grooming or drops.
- Vague items go to `refine`, not backlog. Backlog is inventory; surface stale items through review/dream recommendations.
- **`blocked` is a flag, not a status.** A committed item that can't move keeps its `status` (usually `this-week`) and carries a `blocked:` field naming the blocker/owner (e.g. `blocked: "DNS PR review — separate team"`). Empty = active. The assistant may set/clear `blocked` for explicit handoffs/blockers; never change `status` to signal blocking.

Full status meanings and the "who moves it" matrix are in [`TASK-SYSTEM.md`](TASK-SYSTEM.md).

### Inbox classification

- Raw link/reference → pending ingest recommendation; ingest deliberately, not in bulk.
- Clear task → create a task note, `status: refine` unless Olle chooses `backlog` or `this-week`.
- Vague task/idea → `status: refine` with open questions.
- Ambition/reflection → `Wiki/Ambitions & Reflections.md`.
- Noise → confirm, then archive; never delete silently.

## Refinement and Dreaming

Refinement is a lightweight "grill me" loop: ask only the questions needed to clarify outcome, next action, constraints, links, and whether it is human/delegable. Olle may skip clarification; skipped items stay eligible later.

Dreaming may suggest drops, merges, stale backlog triage, agent candidates, simulated plans, preference memories, and connections. Dream outputs return through `Refine` or explicit recommendations; never hide new daily views.

Future memory systems (`https://mem0.ai/`, `https://remnic.ai/`) are notes only — leave them un-integrated unless explicitly asked.

## Handoffs

The vault session scopes; execution happens elsewhere. For any multi-step repo task, use the `handoff` skill.

Minimum vault-side action:

1. Ensure the task note has repo/path/context/acceptance, or ask for the missing fields.
2. Write a brief in `Logs/handoffs/YYYY-MM-DD-<slug>.md`.
3. Recommend an execution mode: Orca worktree, non-Orca worktree, repo session, or subagent.
4. Set the `blocked` flag only when an explicit external handoff/blocker exists; clear it when unblocked.

Future agent delegation target is Orca (`https://www.onorca.dev/`); leave autonomous delegation unimplemented here.

## Knowledge Layer

`Wiki/` holds **durable** reference only. `Wiki/Sources/` keeps raw captures immutable after capture; curated pages live under `Wiki/`. **Transient** task byproducts stay on the task, never as `Wiki/` pages.

Ingest and query flows, the layer/ownership table, and the durable-vs-transient test detail live in [`KNOWLEDGE.md`](KNOWLEDGE.md). A URL is a bookmark until materialized — ingest deliberately. For login-gated, paywalled, or anti-bot sources, capture with the `web-capture` skill.

## Lint

```bash
python3 "$HOME/.agents/skills/obsidian-vault-assistant/tools/lint.py" "/Users/ollekruber/Library/Mobile Documents/iCloud~md~obsidian/Documents/Oek Vault"
```

Report orphans, broken links, untyped notes, duplicates, and obvious contradictions. Apply fixes only with approval.

## Natural Language Triggers

| User says | Do |
|---|---|
| "What's on my plate?" | Read `Task Dashboard.base`; summarize `Refine`, `This Week` counts/items |
| "Sweep/tidy inbox" | Classify `Inbox.md`; move filed bullets out of inbox |
| "Refine this" | Ask clarifying questions; update the task note |
| "Plan this week" | Browse `Backlog`; pull items into `This Week` only by Olle choice |
| "Hand this off" | Use `handoff`; write brief |
| "Ingest/read/save this" | Capture source, then ingest deliberately (see `KNOWLEDGE.md`) |
| "What do I know about X?" | Query `Wiki/` via index and relevant pages |
| "Lint/health check" | Run lint and report. Also report status counts, never-reviewed items, and items past `review_after` |
| "What's due?" | List the Due queue oldest first; take each item to one of the five verdicts |
| "Run/review a dream" | Surface dream proposals; apply only approved changes |

## Hard Rules

- Quote the vault path; archive instead of deleting; keep `Inbox.md` capture frictionless.
- Keep the day-to-day task track separate from the wiki/knowledge track.
