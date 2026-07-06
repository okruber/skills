#!/usr/bin/env bash
# Reproduce okruber's skill set on a fresh machine.
#
# - Consumed third-party skills are installed via the `skills` CLI into the
#   canonical store (~/.agents/skills) with per-agent symlinks.
# - Authored skills (this repo) are symlinked into the canonical store so this
#   git checkout stays the single source of truth.
#
# pi packages (superpowers, pi-subagents) are installed here when `pi` is on
# PATH. Claude Code plugins (superpowers, frontend-design) are NOT handled here
# — restore them with `/plugin` inside Claude Code. See consumed.md.
#
# Usage: ./bootstrap.sh
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CANON="$HOME/.agents/skills"
CLAUDE="$HOME/.claude/skills"

echo "==> Installing consumed (third-party) skills via npx skills"
npx -y skills@latest add google/agents-cli -g -y
npx -y skills@latest add antonbabenko/terraform-skill -g -y
npx -y skills@latest add vercel-labs/skills --skill find-skills -g -y
npx -y skills@latest add mattpocock/skills \
  --skill grilling --skill grill-me --skill loop-me \
  --skill writing-great-skills --skill improve-codebase-architecture -g -y

echo "==> Linking authored skills into the canonical store"
mkdir -p "$CANON" "$CLAUDE"
for dir in "$REPO_DIR"/skills/*/; do
  [ -d "$dir" ] || continue
  name="$(basename "$dir")"
  ln -sfn "$REPO_DIR/skills/$name" "$CANON/$name"
  ln -sfn "../../.agents/skills/$name" "$CLAUDE/$name"
  echo "    linked $name"
done

if command -v pi >/dev/null 2>&1; then
  echo "==> Installing consumed pi packages"
  pi install git:github.com/obra/superpowers
  pi install npm:pi-subagents
else
  echo "==> Skipping pi packages (pi not on PATH); see consumed.md"
fi

echo "==> Done. Verify with: npx skills list -g"
