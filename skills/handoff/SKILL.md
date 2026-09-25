---
name: handoff
description: Use when a vault, orchestrator, Obsidian, or planning session needs to hand off or spin off work to a repo, Orca worktree, external execution session, or another agent - spawning a visible Orca session that does research and implementation while you watch and can interject, not opaque background work.
---

# Handoff

## Overview

The orchestrator (vault or main planning session) is the control tower; execution happens in a **visible spawned session** - an Orca worktree or terminal running an agent - that does research *and* implementation while Olle watches and can interject from the first keystroke. The handoff brief is the interface between them.

A handoff's executor is **always a visible Orca session, never an async/background `subagent`.** A background subagent produces opaque, non-interruptible work and is the exact opposite of a handoff (see Common Mistakes). Keeping the orchestrator's context clean is a *secondary* concern, handled by opt-in Clean Dispatch below - it never replaces the visible working session.

## When to Use

Use when work begins in a vault/orchestrator session and becomes repo edits, tests, commits, PRs, package operations, Orca worktree work, another execution session, or a task that references superpowers specs/plans across sessions.

Do not use for single vault edits, note grooming, or direct Q&A.

## Core Rules

1. **Orchestrator = planner.** Run it from the vault root (or the main coordinating session). Write task notes/briefs; do not do multi-step repo implementation inline.
1a. **The executor is a visible Orca session Olle can watch - never a background subagent.** When you hand off, spawn a visible Orca session (worktree or terminal, per Rules 6/6a) seeded with the brief, and let *that* session do the research and implementation with Olle watching and free to interject. Do **not** run the work as an async/background `subagent` (`pi-subagents` worker) - that is opaque and non-interruptible, the opposite of what a handoff is for. Clean Dispatch (below) is an *opt-in* way to keep a long-running orchestrator's context clean by having a forked subagent *author the brief and spawn the visible session*; the forked subagent never becomes the executor.
2. **The handoff gets spawned for you - do not hand Olle a command to run.** The whole point of a handoff is that it is *invoked* via Orca (`orca worktree create`, then `orca terminal create ... --command "cd <worktree> && $agent_cmd"` for repo work, or `orca terminal create ... --command "cd <checkout> && $agent_cmd"` for live-machine work, where `$agent_cmd` comes from `oek-agent-command`), seeded with the brief, and the created session reported back. Under Clean Dispatch the forked subagent does this spawning; otherwise the orchestrator does it directly. Giving Olle a copy-paste `read <brief>` command is an **anti-pattern** — only acceptable when Olle explicitly says he will start it himself. If you catch yourself writing "open a session and run…" for Olle, stop and dispatch it instead.
3. **Execution session = repo/worktree.** Workers start in the target checkout or worktree, never in the vault.
3. **Brief before dispatch.** Include repo/path, plan/spec path, acceptance, and return protocol. If the repo is ambiguous, ask or list candidates; do not guess.
3a. **Propose-first is the default; direct execution is opt-in.** The dispatched session must first produce a short plan/outline and check in with Olle for approval **before** creating final artifacts (agendas, docs, code, PRs). Only run straight through to finished output when Olle explicitly asks for it (“just do it”, “execute”, “autonomous”, “no need to check with me”). Never put “execute it fully” in the dispatch prompt unless direct execution was specified.
3b. **Task artifacts land on the task, not the Wiki.** A dispatched session's output is **transient** (see the `durable`/`transient` distinction in `obsidian-vault-assistant`), so the dispatch prompt must say where output goes; default is “write the result into the task note.”
4. **Plans/specs are external.** From inside the target repo, resolve `superpowers-store plans` / `superpowers-store specs`; pass absolute paths. Do not assume repo `docs/` contains plans.
5. **Orca owns Orca repos.** For Orca-managed repos, resolve the registered Orca repo, then use `orca worktree create` / `orca worktree rm`, not raw `git worktree`.
6. **Orca dispatch is the default execution surface** — you spawn it (per Rule 2). For repo work, create a new Orca worktree under the correct registered repo, start the agent in it, and send it the brief. **Detect Orca robustly** — never conclude it is unavailable from `command -v orca` alone: the `/usr/local/bin/orca` shim is frequently a dangling AppTranslocation symlink even while Orca is installed and running. Probe `orca status --json`, and if the shim is missing use the app-bundle binary `/Applications/Orca.app/Contents/Resources/bin/orca` (see Detecting Orca). Only when the app itself is absent is Orca genuinely unavailable — and even then the fallback is another *visible* session (non-Orca worktree, or ask Olle), never a background subagent.
6a. **Worktree vs live session.** A worktree isolates a *repo checkout* — use it for repo edits/tests/PRs. For work that mutates **live machine state or global config** (e.g. installing a global CLI/daemon, editing live `~/.pi/agent` symlinked from a config repo), a worktree checkout is the *wrong* isolation because the running system reads the main checkout, not the worktree. Dispatch a **fresh agent session in the real checkout** instead: `orca terminal create --command "cd <checkout> && $agent_cmd" --json`, `orca terminal wait --for tui-idle`, then `orca terminal send` the brief prompt.
7. **Non-Orca worktrees are repo-local.** Use `<repo-root>/.worktrees/`, ensure it is gitignored, and never use the old global superpowers worktree location.

## Clean Dispatch (orchestrator hygiene)

**Opt-in, secondary.** Use this only when the handoff originates from a long-running orchestrator/main session and keeping the parent uncluttered is worth the indirection. It does **not** change the executor: the forked subagent only *authors the brief and spawns the visible Orca session*, then returns a pointer. The forked subagent must never execute the work itself or spawn an async/background worker as the executor. If Olle is actively watching and wants to see the handoff happen, skip Clean Dispatch and spawn the visible session directly.

Dispatch a **forked-context** subagent (via the `pi-subagents` / `subagent` tool) with a task like:

> Fork of this orchestrator context. Follow the `handoff` skill. Author a handoff brief for: `<the tangent/feature to spin off>`, drawing the relevant Goal/Context/Acceptance from this session. Write the brief to the vault handoffs dir (`.../Oek Vault/Logs/handoffs/YYYY-MM-DD-<slug>.md`). Then spawn the execution session via Orca (worktree for isolated repo work, or a fresh session in the real checkout for live/global-config work per Rule 6a), seed it with the brief, and set the spawned session to propose-first unless told otherwise. Return ONLY a terse pointer: the created worktree/terminal handle, the brief path, and the vault writeback needed. Do not paste the full brief or transcript back.

Rules for clean dispatch:
- **Context = fork**, so the subagent knows what "feature X" and the surrounding decisions are without the orchestrator dumping them into a task string.
- The subagent is the one that runs `orca ...` and writes files - that keeps those tool calls out of the parent transcript.
- The parent's only new context is the subagent call + its terse result. Surface that pointer to Olle and continue coordinating.
- The spawned execution session still follows every rule below (brief contract, propose-first default, worktree-vs-live 6a, vault writeback).
- The forked subagent's job **ends** at authoring the brief and spawning the visible session. It never runs the implementation and never becomes an async executor.

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

```bash
agent_cmd="$(/Users/ollekruber/Documents/Personal/oek/bin/oek-agent-command --purpose work)" || exit 1
orca terminal create --worktree id:<worktree-id> --title <task-slug> --command "cd <worktree-path> && $agent_cmd" --json
orca terminal wait --terminal <handle> --for tui-idle --timeout-ms 120000 --json
orca terminal send --terminal <handle> --text "Read <absolute-brief-path>. Work from this Orca worktree. Propose a short plan/outline and check in for approval BEFORE producing final artifacts (unless the brief says direct-execution). Write task artifacts (prep/agendas/notes) into the task note body, not the Wiki. Acceptance: <observable condition>. Return files changed, tests run, PR/worktree status, blockers, and vault updates needed." --enter --json
```

Link the session to its Oek task so it shows up in Oek's Needs you strip. The task ID is the `id` field in the source task note's frontmatter.

```bash
/Users/ollekruber/Documents/Personal/oek/bin/oek-link --task <task-id> --terminal <handle>
```

Live-machine or global-config work uses a fresh agent session in the real checkout, not a worktree (Rule 6a):

```bash
agent_cmd="$(/Users/ollekruber/Documents/Personal/oek/bin/oek-agent-command --purpose work)" || exit 1
orca terminal create --title <task-slug> --command "cd /abs/checkout && $agent_cmd" --json
orca terminal wait --terminal <handle> --for tui-idle --timeout-ms 120000 --json
orca terminal send --terminal <handle> --text "Handoff: read <absolute-brief-path>, propose a plan, and check in before making changes." --enter --json
/Users/ollekruber/Documents/Personal/oek/bin/oek-link --task <task-id> --terminal <handle>
```

Report the created terminal handle back into the task note body. The agent is `pi` with the resolved model preset. Use `claude` or `codex` in place of `$agent_cmd` only if the brief calls for it.

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
| Starting the agent without the brief | Send the absolute brief path with `orca terminal send` once the terminal is `tui-idle` |
| Global superpowers worktree dir | Use `<repo-root>/.worktrees/` for non-Orca |
| Reporting only “done” | Include tests, files changed, PR/worktree, and vault updates needed |
| Handing Olle a copy-paste `read <brief>` command | You spawn the session via Orca yourself (Rule 2); only hand off a command if Olle said he'll start it |
| Creating a worktree for live-config / global-install work | Use a fresh agent session in the real checkout (Rule 6a) — a worktree checkout is the wrong isolation |
| Running the handoff as an async/background `subagent` | The executor is always a **visible** Orca session Olle can watch and interject in; a background subagent is opaque and non-interruptible (Rule 1a) |
| Concluding Orca is unavailable because `command -v orca` is empty | The `/usr/local/bin/orca` shim can dangle (AppTranslocation); probe `orca status --json` / use the app-bundle binary before any fallback (Rule 6, Detecting Orca) |
| Dispatching without `oek-link` | Run `oek-link` after spawning so the session appears on its task in Oek |
| Starting the agent with `--agent` or a bare `pi` | Start it with `oek-agent-command` so it uses Olle's model preset |
