---
name: handoff
description: Use when a vault, orchestrator, Obsidian, or planning session needs to hand off or spin off work to a repo, Orca worktree, external execution session, or another agent - especially to spawn a handoff session from a long-running orchestrator without polluting its context.
---

# Handoff

## Overview

The orchestrator (vault or main planning session) is the control tower; execution happens in the target repo, worktree, or spawned session. The handoff brief is the interface between them. When you hand off from a long-running orchestrator, do the handoff-building work off to the side (a forked-context subagent) so the orchestrator's own context stays clean - see Clean Dispatch below.

## When to Use

Use when work begins in a vault/orchestrator session and becomes repo edits, tests, commits, PRs, package operations, Orca worktree work, another execution session, or a task that references superpowers specs/plans across sessions.

Do not use for single vault edits, note grooming, or direct Q&A.

## Core Rules

1. **Orchestrator = planner.** Run it from the vault root (or the main coordinating session). Write task notes/briefs; do not do multi-step repo implementation inline.
1a. **Clean dispatch from an orchestrator - keep the parent context clean.** When handing off from a long-running orchestrator/main session (e.g. reviewing the week and spinning off "implement feature X"), do **not** author the brief or run Orca inline - that pollutes the orchestrator with handoff-building context. Instead dispatch a **forked-context subagent** that inherits the orchestrator's context, authors the brief, spawns the Orca session, and returns **only a terse pointer** (worktree/terminal handle + brief path). The orchestrator surfaces that pointer and keeps coordinating, uncluttered. See Clean Dispatch below. (Skip the subagent only for a trivial one-off handoff where inline work adds no meaningful context.)
2. **The handoff gets spawned for you - do not hand Olle a command to run.** The whole point of a handoff is that it is *invoked* via Orca (`orca worktree create ... --agent` for repo work, or `orca terminal create ... --command "cd <checkout> && <agent>"` for live-machine work), seeded with the brief, and the created session reported back. Under Clean Dispatch the forked subagent does this spawning; otherwise the orchestrator does it directly. Giving Olle a copy-paste `read <brief>` command is an **anti-pattern** — only acceptable when Olle explicitly says he will start it himself. If you catch yourself writing "open a session and run…" for Olle, stop and dispatch it instead.
3. **Execution session = repo/worktree.** Workers start in the target checkout or worktree, never in the vault.
3. **Brief before dispatch.** Include repo/path, plan/spec path, acceptance, and return protocol. If the repo is ambiguous, ask or list candidates; do not guess.
3a. **Propose-first is the default; direct execution is opt-in.** The dispatched session must first produce a short plan/outline and check in with Olle for approval **before** creating final artifacts (agendas, docs, code, PRs). Only run straight through to finished output when Olle explicitly asks for it (“just do it”, “execute”, “autonomous”, “no need to check with me”). Never put “execute it fully” in the dispatch prompt unless direct execution was specified.
3b. **Task artifacts land on the task, not the Wiki.** A dispatched session's output is **transient** (see the `durable`/`transient` distinction in `obsidian-vault-assistant`), so the dispatch prompt must say where output goes; default is “write the result into the task note.”
4. **Plans/specs are external.** From inside the target repo, resolve `superpowers-store plans` / `superpowers-store specs`; pass absolute paths. Do not assume repo `docs/` contains plans.
5. **Orca owns Orca repos.** For Orca-managed repos, resolve the registered Orca repo, then use `orca worktree create` / `orca worktree rm`, not raw `git worktree`.
6. **Orca dispatch is the default execution surface** — you spawn it (per Rule 2). For repo work, create a new Orca worktree under the correct registered repo with an agent prompt pointing at the brief. Only fall back to a non-Orca worktree or existing-session handoff when Orca genuinely does not fit.
6a. **Worktree vs live session.** A worktree isolates a *repo checkout* — use it for repo edits/tests/PRs. For work that mutates **live machine state or global config** (e.g. installing a global CLI/daemon, editing live `~/.pi/agent` symlinked from a config repo), a worktree checkout is the *wrong* isolation because the running system reads the main checkout, not the worktree. Dispatch a **fresh agent session in the real checkout** instead: `orca terminal create --command "cd <checkout> && <agent>" --json`, `orca terminal wait --for tui-idle`, then `orca terminal send` the brief prompt.
7. **Non-Orca worktrees are repo-local.** Use `<repo-root>/.worktrees/`, ensure it is gitignored, and never use the old global superpowers worktree location.

## Clean Dispatch (orchestrator hygiene)

Use this whenever the handoff originates from a long-running orchestrator/main session and you want the parent to stay uncluttered. The forked subagent does all the handoff-building work; the parent only sees the returned pointer.

Dispatch a **forked-context** subagent (via the `pi-subagents` / `subagent` tool) with a task like:

> Fork of this orchestrator context. Follow the `handoff` skill. Author a handoff brief for: `<the tangent/feature to spin off>`, drawing the relevant Goal/Context/Acceptance from this session. Write the brief to the vault handoffs dir (`.../Oek Vault/Logs/handoffs/YYYY-MM-DD-<slug>.md`). Then spawn the execution session via Orca (worktree for isolated repo work, or a fresh session in the real checkout for live/global-config work per Rule 6a), seed it with the brief, and set the spawned session to propose-first unless told otherwise. Return ONLY a terse pointer: the created worktree/terminal handle, the brief path, and the vault writeback needed. Do not paste the full brief or transcript back.

Rules for clean dispatch:
- **Context = fork**, so the subagent knows what "feature X" and the surrounding decisions are without the orchestrator dumping them into a task string.
- The subagent is the one that runs `orca ...` and writes files - that keeps those tool calls out of the parent transcript.
- The parent's only new context is the subagent call + its terse result. Surface that pointer to Olle and continue coordinating.
- The spawned execution session still follows every rule below (brief contract, propose-first default, worktree-vs-live 6a, vault writeback).

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
| Approval mode | `propose-first` (default) or `direct-execution` (only when Olle specified it) |
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
  --prompt "Read <absolute-brief-path>. Work from this Orca worktree. Propose a short plan/outline and check in for approval BEFORE producing final artifacts (unless the brief says direct-execution). Write task artifacts (prep/agendas/notes) into the task note body, not the Wiki. Acceptance: <observable condition>. Return files changed, tests run, PR/worktree status, blockers, and vault updates needed." \
  --json
```

Use `id:<repoId>` after matching the task's absolute repo path to `orca repo list --json`. If no registered repo matches, add it with `orca repo add --path ...` or ask before dispatch. Do not pass a guessed repo selector.

Live-machine / global-config work (fresh agent session in the real checkout — NOT a worktree, per Rule 6a):

```bash
orca terminal create --title <task-slug> --command "cd /abs/checkout && <agent>" --json
orca terminal wait --terminal <handle> --for tui-idle --timeout-ms 120000 --json
orca terminal send --terminal <handle> --text "Handoff: read <absolute-brief-path>, propose a plan, and check in before making changes." --enter --json
```

Report the created terminal handle back into the task note (`worktree:` field is fine for the pointer). `<agent>` defaults to **`pi`** (just another pi session) — use `claude`/`codex` only if the brief calls for it.

Vault writeback after Orca dispatch:

```yaml
status: this-week   # or backlog — do NOT invent a status; keep the task's real commitment level
blocked: "dispatched to Orca session"   # set/append only if the task is now waiting on that session/person; else leave empty
repo: /absolute/path/to/repo
handoff: "[[YYYY-MM-DD-<slug>]]"
worktree: <orca-worktree-id>
```

The vault has no `waiting` status — `blocked` is a flag, not a status (see `obsidian-vault-assistant`). Leave `status` as the task's true commitment (`this-week`/`backlog`) and use the `blocked:` field for the blocker/owner. If the task note uses a different existing field layout, preserve it and add the same facts without inventing nested `handoff.*` schemas.

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

## Approval mode
propose-first (default) — outline a plan and check in for approval before producing final artifacts. Use direct-execution only when Olle specified it.

## Return protocol
Report files changed, tests run, PR/worktree status, blockers, and vault updates needed.
```

## Common Mistakes

Non-obvious traps (the inverses of the Core Rules are omitted):

| Mistake | Correct behavior |
|---|---|
| Passing `docs/.../plan.md` | Pass absolute `superpowers-store` path — repo `docs/` does not hold plans |
| Passing a repo path directly as if it were an Orca id | Match `orca repo list --json`, then use `--repo id:<repoId>` |
| Creating an Orca worktree without prompt/brief | Prompt the agent to read the absolute brief path |
| Global superpowers worktree dir | Use `<repo-root>/.worktrees/` for non-Orca |
| Reporting only “done” | Include tests, files changed, PR/worktree, and vault updates needed |
| Handing Olle a copy-paste `read <brief>` command | You spawn the session via Orca yourself (Rule 2); only hand off a command if Olle said he'll start it |
| Creating a worktree for live-config / global-install work | Use a fresh agent session in the real checkout (Rule 6a) — a worktree checkout is the wrong isolation |
