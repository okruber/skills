# skills

okruber's personal agent skills, plus a reproducible record of the
third-party skills I consume.

Install everything with the open [`skills`](https://github.com/vercel-labs/skills)
CLI: `npx skills add okruber/skills`.

## Two layers

| Layer | Lives in | Managed by | Source of truth |
| --- | --- | --- | --- |
| **Authored** — skills I write | `skills/` (this repo, version-controlled) | me, via git | this repo |
| **Consumed** — third-party skills | nowhere in this repo — only *referenced* | their own tools | upstream repos ([`consumed.md`](consumed.md)) |

Consumed skills are **not vendored**. `consumed.md` records what I pull and the
exact command to restore it, so a fresh machine is reproducible without me
maintaining other people's code.

## The canonical store (model-agnostic)

Every agent reads its own skills directory, but all of them point at **one**
physical store, `~/.agents/skills`. The `skills` CLI writes real files there
once and symlinks each agent's dir at it — so one copy serves Claude/omp,
Codex, Cursor, and the rest, and one update refreshes them all.

```
  okruber/skills (git)            mattpocock/skills, google/agents-cli, ... (GitHub)
        |  symlink                       |  npx skills add
        v                                v
              ~/.agents/skills/<skill>   <-- single source of truth on disk
                        |  symlinks
        +---------------+----------------+
        v               v                v
  ~/.claude/skills  ~/.codex/skills  ~/.cursor/skills
```

Authored skills sit in the same store as a symlink back to this repo
(`~/.agents/skills/<name>` -> `skills/<name>`), so edits here are instantly
live in every agent.

## Reproduce on a new machine

```bash
git clone git@github.com:okruber/skills.git ~/Documents/Personal/skills
cd ~/Documents/Personal/skills
./bootstrap.sh
```

`bootstrap.sh` installs every consumed skill via `npx skills` and symlinks the
authored skills into the canonical store. Claude Code plugins (see
`consumed.md`) are restored separately with `/plugin`.

## Updating

- **Consumed (npx):** `npx skills update -g`
- **Consumed (Claude plugins):** `/plugin` inside Claude Code
- **Authored:** edit under `skills/` and commit — changes are live immediately
  via the symlink; no reinstall.

## Add a new authored skill

1. `mkdir -p skills/<name>` and write `skills/<name>/SKILL.md`.
2. Add `./skills/<name>` to `.claude-plugin/plugin.json`.
3. Run `./bootstrap.sh` (or symlink it by hand) to link it into the store.
4. Commit.
