# AGENTS.md

Context for agents working in this repo. It holds **authored** agent skills;
see `README.md` for the layout and `consumed.md` for third-party references.

## Scope guard

- This repo contains only skills I author, under `skills/<name>/`.
- Third-party skills are **referenced, never vendored**. If asked to "add skill X"
  that lives upstream, add it to `consumed.md` (and `bootstrap.sh`) — do **not**
  copy its files into `skills/`.

## Editing skills

- A skill is `skills/<name>/SKILL.md` plus optional companion files in the same
  folder. This repo is the source of truth; it is symlinked into
  `~/.agents/skills` and read live by every agent, so edit here — not the
  installed copies under `~/.claude/skills` etc.
- Follow the **`writing-great-skills`** skill for how to write and structure a
  skill (invocation model, progressive disclosure, leading words, pruning).
  Invoke it; don't restate it here.

## Frontmatter

- `name`: kebab-case, must equal the directory name.
- `description`: model-facing with trigger phrasing when the skill should
  auto-fire. For skills only ever invoked by hand, set
  `disable-model-invocation: true` and make `description` a one-line human summary.

## After adding a new skill

1. Add `./skills/<name>` to `.claude-plugin/plugin.json`.
2. Run `./bootstrap.sh` to symlink it into the canonical store.
3. Commit.

## Notes

- Skills are used across Claude/omp, Codex, and Cursor — prefer tool-agnostic
  wording; where a tool must be named, Claude Code conventions are the default.
- No build or test step: skills are markdown. Verification = valid frontmatter
  and the skill shows up in `npx skills list -g`.
