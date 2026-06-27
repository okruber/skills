#!/usr/bin/env bash
# Reproduce Olle's skill set on a fresh machine.
#
# - Consumed third-party skills are installed via the `skills` CLI into the
#   canonical store (~/.agents/skills) with per-agent symlinks.
# - Authored skills (this repo) are symlinked into the canonical store so this
#   git checkout stays the single source of truth.
#
# Claude Code plugins (superpowers, frontend-design) are NOT handled here —
# restore them with `/plugin` inside Claude Code. See consumed.md.
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

echo "==> Done. Verify with: npx skills list -g"
