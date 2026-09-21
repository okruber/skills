---
name: obsidian-vault-assistant
description: "Use when managing the OEK Obsidian vault: capture, task context, planning, source ingest, wiki query/lint, dreams, or vault-to-repo handoff prep."
---

# OEK Vault Assistant

The vault is Olle's control tower. Keep task operations separate from the `Wiki/` knowledge layer. Durable knowledge belongs in `Wiki/`; transient agendas, checklists, and working notes belong in the task body or `Logs/`.

Vault path, always quoted:

```bash
"/Users/ollekruber/Library/Mobile Documents/iCloud~md~obsidian/Documents/Oek Vault"
```

## Start of a vault conversation

1. Read `.pi/memory.md`.
2. Report the Oek Work surface: committed work first, then available work.
3. If `Inbox.md` has unprocessed capture, classify it and create schema-v2 `available` tasks only when warranted.
4. Report intake and closures compactly. Closures must reflect explicit actions already taken by Olle in Oek.

## Task contract

Read [`TASK-SYSTEM.md`](TASK-SYSTEM.md) before editing a task note.

- Statuses are `available | committed | done | dropped`.
- The assistant may capture, clarify, add context, and create an `available` task using `oek-task create-available`.
- Only an explicit Olle action in Oek may commit, release, close as done, or drop. Never infer these transitions from conversation, a handoff, an Explore run, or a worker result.
- `Work` is the daily action surface. `Explore` is non-committing.
- A worker result is evidence for review, not closure.
- `size`, `outcome`, and `next_action` are optional enrichment, not gates.
- `blocked` is context, not a lifecycle status.

For multi-step repo work, use the `handoff` skill: ensure the task has useful context, write a brief under `Logs/handoffs/`, recommend an execution mode, and surface returned results without changing lifecycle state.

## Inbox classification

- Raw link/reference → recommend deliberate source ingest.
- Clear or vague task → create `available`; put questions in context rather than inventing a refinement status.
- Ambition/reflection → `Wiki/Ambitions & Reflections.md`.
- Noise → confirm, then archive; never delete silently.

## Knowledge layer

`Wiki/` holds durable reference. `Wiki/Sources/` keeps raw captures immutable after capture. Transient task byproducts stay on the task. Read [`KNOWLEDGE.md`](KNOWLEDGE.md) for ingest/query rules; use `web-capture` for gated sources and `guided-read` when explicitly requested.

## Lint

```bash
python3 "$HOME/.agents/skills/obsidian-vault-assistant/tools/lint.py" "/Users/ollekruber/Library/Mobile Documents/iCloud~md~obsidian/Documents/Oek Vault"
```

The linter checks schema version, status, UUID presence and uniqueness, commitment and closure fields, dates, title/filename alignment, symlinks, managed frontmatter, structure, links, and the wiki layer. Migrated committed tasks with `revision_required: true` may lack commitment metadata and are informational. Apply fixes only with approval.

## Integrity rules

- Every task has `schema_version: 2`, a unique UUID `id`, an allowed status, and an aligned title/filename.
- `completed` and `review_after` are invalid legacy fields.
- Committed tasks carry commitment metadata, except migrated `revision_required` items awaiting human review.
- Done/dropped tasks carry a valid `closed` date.
- Symlinks are forbidden in managed vault content; frontmatter must remain parseable and singular.
- Root holds primitives only; no `Untitled` notes, zero-byte files, or subfolders in `Tasks/`.
- Quote the vault path, archive instead of deleting, and preserve vault/wiki separation.
