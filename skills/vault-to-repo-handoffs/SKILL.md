---
name: vault-to-repo-handoffs
description: Use when a vault, orchestrator, Obsidian, or planning session needs to hand off work to a repo, Orca worktree, external execution session, or another agent.
---

# Vault to Repo Handoffs

## Overview

The vault session is the control tower; repo work happens in the target repo or worktree. The handoff brief is the interface between them.

## When to Use

Use when work begins in a vault/orchestrator session and becomes repo edits, tests, commits, PRs, package operations, Orca worktree work, another execution session, or a task that references superpowers specs/plans across sessions.

Do not use for single vault edits, note grooming, or direct Q&A.

## Core Rules

1. **Vault session = planner.** Run it from the vault root. Write task notes/briefs; do not do multi-step repo implementation inline.
2. **Execution session = repo/worktree.** Workers start in the target checkout or worktree, never in the vault.
3. **Brief before dispatch.** Include repo/path, plan/spec path, acceptance, and return protocol. If the repo is ambiguous, ask or list candidates; do not guess.
4. **Plans/specs are external.** From inside the target repo, resolve `superpowers-store plans` / `superpowers-store specs`; pass absolute paths. Do not assume repo `docs/` contains plans.
5. **Orca owns Orca repos.** For Orca-managed repos, resolve the registered Orca repo, then use `orca worktree create` / `orca worktree rm`, not raw `git worktree`.
6. **Orca handoff default.** If Olle says “handoff to Orca,” create a new Orca worktree under the correct registered repo with an agent prompt pointing at the brief.
7. **Non-Orca worktrees are repo-local.** Use `<repo-root>/.worktrees/`, ensure it is gitignored, and never use the old global superpowers worktree location.

## Handoff Brief Contract

Required fields:

| Field | Content |
|---|---|
| Goal | One-sentence outcome |
| Task | One concrete next action |
| Source | Vault task note or request |
| Repo | Absolute repo path and/or Orca repo id |
| Plan/spec | Absolute `superpowers-store` paths, or `none` |
| Context | Decisions, links, constraints |
| Acceptance | Observable done condition |
| Execution mode | Orca worktree, non-Orca worktree, existing repo session, or subagent |
| Return protocol | What to report/update back in the vault |

## Commands

Resolve artifacts from the target repo:

```bash
cd "/absolute/path/to/repo"
plan_dir="$(superpowers-store plans)"
spec_dir="$(superpowers-store specs)"
```

Orca-managed repo:

```bash
orca status --json
orca repo list --json
# If absent: orca repo add --path "/absolute/path/to/repo" --json
orca worktree create \
  --repo id:<repoId> \
  --name <task-slug> \
  --agent codex \
  --prompt "Read <absolute-brief-path>. Execute from this Orca worktree. Acceptance: <observable condition>. Return files changed, tests run, PR/worktree status, blockers, and vault updates needed." \
  --json
```

Use `id:<repoId>` after matching the task's absolute repo path to `orca repo list --json`. If no registered repo matches, add it with `orca repo add --path ...` or ask before dispatch. Do not pass a guessed repo selector.

Vault writeback after Orca dispatch:

```yaml
status: this-week   # or backlog — do NOT invent a status; keep the task's real commitment level
blocked: "dispatched to Orca session"   # set/append only if the task is now waiting on that session/person; else leave empty
repo: /absolute/path/to/repo
handoff: "[[YYYY-MM-DD-<slug>]]"
worktree: <orca-worktree-id>
```

The vault has no `waiting` status — blocking is a flag, not a status. Never change `status` to signal a handoff; leave `status` as the task's true commitment (`this-week`/`backlog`) and use the `blocked:` field for the blocker/owner. If the task note uses a different existing field layout, preserve it and add the same facts without inventing nested `handoff.*` schemas.

Non-Orca repo:

```bash
cd "/absolute/path/to/repo"
mkdir -p .worktrees
grep -qxF '.worktrees/' .gitignore || printf '\n.worktrees/\n' >> .gitignore
git worktree add ".worktrees/<task-slug>" -b "<branch-name>" main
```

## Template

```markdown
# Handoff: <task title>
From: vault · Date: YYYY-MM-DD · Task note: <Tasks/slug.md>

## Goal
## Task
## Repo / execution cwd
Absolute path and Orca repo id when available.

## Plan/spec paths
## Context
## Acceptance
## Execution mode
Orca worktree under repo id:<repoId>, agent: codex.

## Return protocol
Report files changed, tests run, PR/worktree status, blockers, and vault updates needed.
```

## Common Mistakes

| Mistake | Correct behavior |
|---|---|
| Editing repo files from the vault session | Create a handoff/execution session |
| Passing `docs/.../plan.md` | Pass absolute `superpowers-store` path |
| Raw git worktrees for Orca repos | Use `orca worktree create` |
| Passing a repo path directly as if it were an Orca id | Match `orca repo list --json`, then use `--repo id:<repoId>` |
| Creating an Orca worktree without prompt/brief | Prompt the agent to read the absolute brief path |
| Inventing nested vault fields | Write `handoff:`, `worktree:`, `repo:` facts; set `blocked:` only if truly waiting |
| Changing `status` to `waiting` to signal a handoff | No `waiting` status exists; keep real `status`, use the `blocked:` flag |
| Global superpowers worktree dir | Use `<repo-root>/.worktrees/` for non-Orca |
| Guessing repo from task title | Ask or require absolute path/id |
| Letting worker infer acceptance | Put acceptance in the brief |
| Reporting only “done” | Include tests, files changed, PR/worktree, and vault updates needed |
