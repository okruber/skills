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
5. **Orca owns Orca repos.** For Orca-managed repos, use `orca worktree create` / `orca worktree rm`, not raw `git worktree`.
6. **Non-Orca worktrees are repo-local.** Use `<repo-root>/.worktrees/`, ensure it is gitignored, and never use the old global superpowers worktree location.

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
orca worktree create --repo <repo-id> --name <task-slug> --agent <agent> --prompt "Read <brief-path> and <plan-path>."
```

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
## Plan/spec paths
## Context
## Acceptance
## Return protocol
```

## Common Mistakes

| Mistake | Correct behavior |
|---|---|
| Editing repo files from the vault session | Create a handoff/execution session |
| Passing `docs/.../plan.md` | Pass absolute `superpowers-store` path |
| Raw git worktrees for Orca repos | Use `orca worktree create` |
| Global superpowers worktree dir | Use `<repo-root>/.worktrees/` for non-Orca |
| Guessing repo from task title | Ask or require absolute path/id |
| Letting worker infer acceptance | Put acceptance in the brief |
| Reporting only “done” | Include tests, files changed, PR/worktree, and vault updates needed |
