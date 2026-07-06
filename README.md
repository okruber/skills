# skills

okruber's authored agent skills, plus a reproducible manifest of the
third-party skills I consume.

## Model

One physical store — `~/.agents/skills` — serves every agent.

- **Authored** skills live in `skills/` (this repo) and are symlinked into the
  store, so edits here are instantly live everywhere. No reinstall.
- **Consumed** skills are never vendored. [`consumed.md`](consumed.md) records
  what I pull and the exact command to restore it.

```
  okruber/skills (git)        mattpocock/skills, google/agents-cli, … (upstream)
        │ symlink                          │ npx skills add / pi install
        ▼                                  ▼
                 ~/.agents/skills/<skill>   ← single source of truth
                          │ symlinks
        ┌─────────────────┼──────────────────┐
        ▼                 ▼                   ▼
  ~/.claude/skills   ~/.codex/skills    ~/.cursor/skills
```

**pi** reads `~/.agents/skills` natively — no per-agent symlink needed. This
repo is also a pi package (`pi` manifest in `package.json`), so a clean pi-only
machine can skip the store and `pi install git:github.com/okruber/skills`.
Claude/Codex/Cursor get their per-agent links from `bootstrap.sh`.

## Reproduce on a new machine

```bash
git clone git@github.com:okruber/skills.git ~/Documents/Personal/skills
cd ~/Documents/Personal/skills
./bootstrap.sh
```

`bootstrap.sh` installs the `npx`-managed consumed skills and links the authored
ones into the store. Package-based skills (superpowers, etc.) are restored
per their rows in [`consumed.md`](consumed.md).

## Update

- Consumed (npx): `npx skills update -g`
- Consumed (pi packages): `pi update --all`
- Consumed (Claude plugins): `/plugin` inside Claude Code
- Authored: edit under `skills/` and commit — live immediately via the symlink.

## Add an authored skill

1. Write `skills/<name>/SKILL.md` (follow the `writing-great-skills` skill).
2. Nothing to register — `.claude-plugin/plugin.json` lists skills explicitly,
   but `package.json`'s `pi` manifest globs `./skills`, so pi picks it up. Keep
   the plugin.json list current for Claude.
3. Run `./bootstrap.sh` to link it into the store, then commit.
