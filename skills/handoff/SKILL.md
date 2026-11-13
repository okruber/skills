---
name: handoff
description: Use when a vault, orchestrator, Obsidian, or planning session needs to hand off or spin off work to a repo, Orca worktree, external execution session, or another agent - spawning a visible Orca session that does research and implementation while you watch and can interject, not opaque background work.
---

# Handoff

## Overview

The orchestrator (vault or main planning session) is the control tower; execution happens in a **visible spawned session** - an Orca worktree or terminal running an agent - that does research *and* implementation while Olle watches and can interject from the first keystroke. The handoff brief is the interface between them.

A handoff's executor is **always a visible Orca session, never an async/background `subagent`.** A background subagent produces opaque, non-interruptible work and is the exact opposite of a handoff (see Common Mistakes).

## When to Use

Use when work begins in a vault/orchestrator session and becomes repo edits, tests, commits, PRs, package operations, Orca worktree work, another execution session, or a task that references superpowers specs/plans across sessions.

Do not use for single vault edits, note grooming, or direct Q&A.

## Core Rules

1. **Orchestrator = planner.** Run it from the vault root (or the main coordinating session). Write task notes/briefs; do not do multi-step repo implementation inline.
1a. **The executor is a visible Orca session Olle can watch - never a background subagent.** When you hand off, spawn a visible Orca session (worktree or terminal, per Rules 6/6a) seeded with the brief, and let *that* session do the research and implementation with Olle watching and free to interject. Do **not** run the work as an async/background `subagent` - that is opaque and non-interruptible, the opposite of what a handoff is for.
2. **The handoff gets spawned for you - do not hand Olle a command to run.** The whole point of a handoff is that it is *invoked* via Orca (`orca worktree create`, then `orca terminal create ... --command "cd <worktree> && $agent_cmd"` for repo work, or `orca terminal create ... --command "cd <checkout> && $agent_cmd"` for live-machine work, where `$agent_cmd` comes from `oek-agent-command`), seeded with the brief, and the created session reported back. The orchestrator does the spawning directly. Giving Olle a copy-paste `read <brief>` command is an **anti-pattern** — only acceptable when Olle explicitly says he will start it himself. If you catch yourself writing "open a session and run…" for Olle, stop and dispatch it instead.
3. **Execution session = repo/worktree.** Workers start in the target checkout or worktree, never in the vault.
3. **Brief before dispatch.** Include repo/path, plan/spec path, acceptance, and return protocol. If the repo is ambiguous, ask or list candidates; do not guess.
3a. **Plan once: where Olle approved the plan decides the approval mode.** If Olle approved a plan in this session for the work you dispatch, dispatch in `direct-execution` and put the approved plan in the brief. The dispatched session implements it and does not present a second plan. It asks Olle only when it hits a choice the plan does not cover. If no plan was approved, dispatch in `propose-first`: the dispatched session produces a short plan and checks in with Olle before it creates final artifacts (agendas, docs, code, PRs). Olle can also ask for direct execution in words such as “just do it” or “execute”. Once Olle approves, the same session carries out the work. It does not hand execution to another session or back to Olle.
3b. **Task artifacts land on the task, not the Wiki.** A dispatched session's output is **transient** (see the `durable`/`transient` distinction in `obsidian-vault-assistant`), so the dispatch prompt must say where output goes. The default is “post the result with `oek-return finding`”, which Oek appends to the task note body. Never tell a linked worker to edit the task note itself, because `oek-report` forbids it and the worker stalls on the conflict.
4. **Plans/specs are external.** From inside the target repo, resolve `superpowers-store plans` / `superpowers-store specs`; pass absolute paths. Do not assume repo `docs/` contains plans.
5. **Orca owns Orca repos.** For Orca-managed repos, resolve the registered Orca repo, then use `orca worktree create` / `orca worktree rm`, not raw `git worktree`.
6. **Orca dispatch is the default execution surface** — you spawn it (per Rule 2). For repo work, create a new Orca worktree under the correct registered repo, start the agent in it, and send it the brief. **Detect Orca robustly** — never conclude it is unavailable from `command -v orca` alone: the `/usr/local/bin/orca` shim is frequently a dangling AppTranslocation symlink even while Orca is installed and running. Probe `orca status --json`, and if the shim is missing use the app-bundle binary `/Applications/Orca.app/Contents/Resources/bin/orca` (see Detecting Orca). Only when the app itself is absent is Orca genuinely unavailable — and even then the fallback is another *visible* session (non-Orca worktree, or ask Olle), never a background subagent.
6a. **Worktree vs live session.** A worktree isolates a *repo checkout* — use it for repo edits/tests/PRs. For work that mutates **live machine state or global config** (e.g. installing a global CLI/daemon, editing live `~/.pi/agent` symlinked from a config repo), a worktree checkout is the *wrong* isolation because the running system reads the main checkout, not the worktree. Dispatch a **fresh agent session in the real checkout** instead: `orca terminal create --command "cd <checkout> && $agent_cmd" --json`, `orca terminal wait --for tui-idle`, then `orca terminal send` the brief prompt.
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
| Execution mode | Orca worktree, non-Orca worktree, or existing repo session |
| Approval mode | `direct-execution` when Olle approved the plan in the dispatching session (the brief carries the plan), else `propose-first` (Rule 3a) |
| Return protocol | What to report/update back in the vault |

## Commands

Resolve artifacts from the target repo:

```bash
cd "/absolute/path/to/repo"
plan_dir="$(superpowers-store plans)"
spec_dir="$(superpowers-store specs)"
```

Detecting Orca (do this before choosing the execution surface):

```bash
# `command -v orca` is unreliable — the /usr/local/bin/orca shim is often a
# dangling AppTranslocation symlink while Orca is installed and running.
orca="$(command -v orca || true)"
[ -x "$orca" ] || orca="/Applications/Orca.app/Contents/Resources/bin/orca"
"$orca" status --json   # app running => Orca is available; spawn a VISIBLE session
```

If `orca status` reports the app running, Orca is available regardless of the shim. If the app-bundle binary is missing too, Orca is genuinely absent — fall back to another *visible* session, never a background subagent.

Orca-managed repo:

```bash
orca status --json
orca repo list --json
# If absent: orca repo add --path "/absolute/path/to/repo" --json
orca worktree create --repo id:<repoId> --name <task-slug> --json
```

Use `id:<repoId>` after matching the task's absolute repo path to `orca repo list --json`. If no registered repo matches, add it with `orca repo add --path ...` or ask before dispatch. Do not pass a guessed repo selector.

Start the agent in the created worktree, then send it the brief. `oek-agent-command` prints the `pi` command with the model preset Olle last picked for work in Oek, or the configured default. When Olle names a model, add `--preset <id>`, for example `--preset sol`. The preset ids live in `oek_agent_models` in `/Users/ollekruber/Documents/Personal/oek/config/autopilot.config.json`. Stop if the command exits non-zero, because that means the preset is unknown.

Link the session to its Oek task so it shows up in Oek's Needs you strip. Linking also gives the session a return token, so the worker can report progress and propose state changes with oek-return. The task ID is the `id` field in the source task note's frontmatter. Run `oek-link` after `orca terminal wait` and before `orca terminal send`, so the token exists before the worker reads the brief.

```bash
agent_cmd="$(/Users/ollekruber/Documents/Personal/oek/bin/oek-agent-command --purpose work)" || exit 1
orca terminal create --worktree id:<worktree-id> --title <task-slug> --command "cd <worktree-path> && $agent_cmd" --json
orca terminal wait --terminal <handle> --for tui-idle --timeout-ms 120000 --json
/Users/ollekruber/Documents/Personal/oek/bin/oek-link --task <task-id> --terminal <handle>
orca terminal send --terminal <handle> --text "Read <absolute-brief-path>. Work from this Orca worktree. <approval sentence> Post task artifacts (prep/agendas/notes) to the task with oek-return finding, not to the Wiki. Acceptance: <observable condition>. Once Olle approves, carry out the work in this session. Load the oek-report skill, report progress to Oek as you work, and run oek-return finish only when the work is done or Olle ends the session. Return files changed, tests run, PR/worktree status, blockers, and vault updates needed." --enter --json
```

Live-machine or global-config work uses a fresh agent session in the real checkout, not a worktree (Rule 6a):

```bash
agent_cmd="$(/Users/ollekruber/Documents/Personal/oek/bin/oek-agent-command --purpose work)" || exit 1
orca terminal create --title <task-slug> --command "cd /abs/checkout && $agent_cmd" --json
orca terminal wait --terminal <handle> --for tui-idle --timeout-ms 120000 --json
/Users/ollekruber/Documents/Personal/oek/bin/oek-link --task <task-id> --terminal <handle>
orca terminal send --terminal <handle> --text "Handoff: read <absolute-brief-path>. <approval sentence> Once Olle approves, carry out the work in this session. Load the oek-report skill, report progress to Oek as you work, and run oek-return finish only when the work is done or Olle ends the session." --enter --json
```

The `<approval sentence>` follows Rule 3a:

- `direct-execution`: "Olle approved the plan in the brief. Implement it now without presenting a new plan, and ask only about choices the plan does not cover."
- `propose-first`: "Propose a short plan and check in for approval BEFORE producing final artifacts."

Report the created terminal handle back into the task note body. The agent is `pi` with the resolved model preset. Use `claude` or `codex` in place of `$agent_cmd` only if the brief calls for it.

Decisions Olle states in the spawned session: the worker records them with `oek-return decision` and his verbatim quote, in that session. A worker's own completion claim is never authority. See the `oek-report` skill.

Vault writeback after Orca dispatch: do not set `blocked` for a dispatch. An agent working on a task is not a blocker, and Oek shows the session on the task once `oek-link` has run. Leave `status` unchanged. Append the brief link and the worktree or terminal handle to the task note body. If `oek-link` fails, report its error to Olle and record the handle in the task note body.

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
direct-execution — Olle approved this plan in the dispatching session: <the approved plan or its absolute path>. Implement it without a new plan.
(or) propose-first — no plan is approved yet. Outline a plan and check in for approval before producing final artifacts.

## Return protocol
Post the result to the task with `oek-return finding`: files changed, tests run, PR/worktree status, blockers, and vault updates needed. Do not edit the task note file.
```

## Common Mistakes

Non-obvious traps (the inverses of the Core Rules are omitted):

| Mistake | Correct behavior |
|---|---|
| Passing `docs/.../plan.md` | Pass absolute `superpowers-store` path — repo `docs/` does not hold plans |
| Passing a repo path directly as if it were an Orca id | Match `orca repo list --json`, then use `--repo id:<repoId>` |
| Starting the agent without the brief | Send the absolute brief path with `orca terminal send` once the terminal is `tui-idle` |
| Global superpowers worktree dir | Use `<repo-root>/.worktrees/` for non-Orca |
| Reporting only “done” | Include tests, files changed, PR/worktree, and vault updates needed |
| Handing Olle a copy-paste `read <brief>` command | You spawn the session via Orca yourself (Rule 2); only hand off a command if Olle said he'll start it |
| Creating a worktree for live-config / global-install work | Use a fresh agent session in the real checkout (Rule 6a) — a worktree checkout is the wrong isolation |
| Running the handoff as an async/background `subagent` | The executor is always a **visible** Orca session Olle can watch and interject in; a background subagent is opaque and non-interruptible (Rule 1a) |
| Concluding Orca is unavailable because `command -v orca` is empty | The `/usr/local/bin/orca` shim can dangle (AppTranslocation); probe `orca status --json` / use the app-bundle binary before any fallback (Rule 6, Detecting Orca) |
| A return protocol that says to append or write the result into the task note | Say “post the result with `oek-return finding`”. A linked worker may not edit the task note, so the instruction conflicts with `oek-report` |
| Dispatching without `oek-link` | Run `oek-link` after spawning so the session appears on its task in Oek |
| A brief that ends without `oek-return finish` | The worker runs `finish` last, so the session closes and does not show as Unknown |
| Dispatching in propose-first after Olle approved the plan in this session | Dispatch in direct-execution with the approved plan in the brief, so Olle does not approve a second plan (Rule 3a) |
| A brief that says to finish when the plan is written | The worker finishes when the work is done. A plan check-in is a progress line, and the same session executes after approval |
| Starting the agent with `--agent` or a bare `pi` | Start it with `oek-agent-command` so it uses Olle's model preset |
