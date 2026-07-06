# Consumed skills

Third-party skills I use, recorded here for reproducibility. **Not vendored** —
the files stay under their upstream tools' management. This is the manifest;
`bootstrap.sh` runs the `npx` rows automatically.

## Via `npx skills` (canonical store: `~/.agents/skills`)

| Skill(s) | Source | Install |
| --- | --- | --- |
| `grilling`, `grill-me`, `loop-me`, `writing-great-skills`, `improve-codebase-architecture` | [`mattpocock/skills`](https://github.com/mattpocock/skills) | `npx skills add mattpocock/skills --skill grilling --skill grill-me --skill loop-me --skill writing-great-skills --skill improve-codebase-architecture -g -y` |
| `google-agents-cli-*` (adk-code, deploy, eval, observability, publish, scaffold, workflow) | [`google/agents-cli`](https://github.com/google/agents-cli) | `npx skills add google/agents-cli -g -y` |
| `terraform-skill` | [`antonbabenko/terraform-skill`](https://github.com/antonbabenko/terraform-skill) | `npx skills add antonbabenko/terraform-skill -g -y` |
| `find-skills` | [`vercel-labs/skills`](https://github.com/vercel-labs/skills) | `npx skills add vercel-labs/skills --skill find-skills -g -y` |

Update all: `npx skills update -g`. List: `npx skills list -g`.

Notes:
- `loop-me` lives in mattpocock's `in-progress/` folder — experimental, pinned
  to upstream `main`; expect it to shift across updates.
- `npx skills update <name>` has had a bug ([vercel-labs/skills#915](https://github.com/vercel-labs/skills/issues/915))
  that pulled in unrelated skills — prefer `update -g` (all).

## Via pi packages (canonical: `~/.pi/agent/settings.json`)

Native pi packages — installed with `pi install`, updated with `pi update --all`.

| Package | Provides | Install |
| --- | --- | --- |
| `superpowers` | brainstorming, tdd, systematic-debugging, writing-plans, using-git-worktrees, subagent-driven-development, … | `pi install git:github.com/obra/superpowers` |
| `pi-subagents` | `subagent` tool (chain/parallel/async/forked/resume) — companion superpowers' subagent skills need | `pi install npm:pi-subagents` |

Notes:
- superpowers ships a `pi` manifest + extension that injects the
  `using-superpowers` bootstrap at session start and after compaction; skills
  are scoped to the package, not dumped into `~/.agents/skills`.
- Without `pi-subagents`, superpowers' subagent skills degrade to sequential
  execution in the current session.

## Via Claude Code plugins (marketplace: `anthropics/claude-plugins-official`)

Managed by Claude Code's `/plugin` system, not `npx`. Reproduce inside Claude
Code, not via `bootstrap.sh`.

| Plugin | Provides | Reproduce |
| --- | --- | --- |
| `superpowers` | same as the pi package above (Claude Code uses the plugin, pi uses the package) | `/plugin install superpowers@claude-plugins-official` |
| `frontend-design` | frontend-design | `/plugin install frontend-design@claude-plugins-official` |
