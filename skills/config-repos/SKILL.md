---
name: config-repos
description: Use when editing any file under ~/.pi/agent/ or ~/.agents/skills/ - pi settings, models, themes, extensions, prompts, the global AGENTS.md, or an authored skill. Those trees are symlinks into two git repos, so an edit is live but unsaved until it is committed and pushed. Names the owning repo and the untracked paths that must never be added.
---

# Git-backed config and skills

## Why this matters

`~/.pi/agent/` and `~/.agents/skills/` contain symlinks into two personal git
repos. An edit there takes effect at once, and it is not saved. Without a commit
and a push the change is lost on any machine move or restore.

## Which repo owns the file

| You edited a file under | Owning repo | Remote |
| --- | --- | --- |
| `~/.pi/agent/` (settings, models, themes, extensions, prompts, `AGENTS.md`) | `~/Documents/Personal/pi-config` | `okruber/pi-config` |
| `~/.agents/skills/<name>` (authored skills only) | `~/Documents/Personal/skills` | `okruber/skills` |

## What to do

Close out the turn in the owning repo:

```bash
cd <repo> && git add -A && git commit -m "<message>" && git push
```

Tell Olle you pushed. If he does not want a commit yet, he says so. Otherwise
treat commit and push as the default close-out for a config or skill edit.

## Do not commit

- Consumed (third-party) skills in `~/.agents/skills`. Only symlinked authored
  skills belong to the skills repo. A real directory there is third-party.
- `~/.pi/agent/auth.json` and `~/.pi/agent/telegram.json`. These hold
  credentials.
- `~/.pi/agent/sessions/`, `npm/`, `git/`, `bin/`. These are machine-local.

## New authored skill

Create it under `~/Documents/Personal/skills/skills/<name>/SKILL.md`, then run
`~/Documents/Personal/skills/link-skill <name>` to register it in
`~/.agents/skills` and the Claude mirror.
