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
# Usage:
#   ./bootstrap.sh                full setup (consumed skills + links + hook + pi packages)
#   ./bootstrap.sh --links-only   relink authored skills only (fast, idempotent, repairs drift)
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CANON="$HOME/.agents/skills"
CLAUDE="$HOME/.claude/skills"

# Symlink every authored skill into both stores and prune links left dangling by
# a rename/removal. Idempotent — safe to run any time to repair drift.
link_authored_skills() {
  echo "==> Linking authored skills into the canonical store"
  mkdir -p "$CANON" "$CLAUDE"
  for dir in "$REPO_DIR"/skills/*/; do
    [ -d "$dir" ] || continue
    name="$(basename "$dir")"
    ln -sfn "$REPO_DIR/skills/$name" "$CANON/$name"
    ln -sfn "../../.agents/skills/$name" "$CLAUDE/$name"
    echo "    linked $name"
  done
  for store in "$CANON" "$CLAUDE"; do
    [ -d "$store" ] || continue
    for link in "$store"/*; do
      [ -L "$link" ] || continue
      [ -e "$link" ] && continue
      case "$(readlink "$link")" in
        "$REPO_DIR/skills/"*|../../.agents/skills/*)
          rm -f "$link"; echo "    pruned dangling $(basename "$link")" ;;
      esac
    done
  done
}

# Install the post-commit hook so authoring/renaming a skill auto-registers it.
install_git_hook() {
  local hook="$REPO_DIR/.git/hooks/post-commit"
  [ -d "$REPO_DIR/.git/hooks" ] || return 0
  ln -sfn "../../hooks/post-commit" "$hook"
  echo "==> Installed post-commit hook (auto-relink on commit)"
}

if [ "${1:-}" = "--links-only" ]; then
  link_authored_skills
  echo "==> Done (links only)."
  exit 0
fi

echo "==> Installing consumed (third-party) skills via npx skills"
npx -y skills@latest add google/agents-cli -g -y
npx -y skills@latest add antonbabenko/terraform-skill -g -y
npx -y skills@latest add vercel-labs/skills --skill find-skills -g -y
npx -y skills@latest add mattpocock/skills \
  --skill grilling --skill grill-me --skill loop-me \
  --skill writing-great-skills --skill improve-codebase-architecture -g -y

link_authored_skills
install_git_hook

if command -v pi >/dev/null 2>&1; then
  echo "==> Installing consumed pi packages"
  pi install git:github.com/obra/superpowers
  pi install npm:pi-subagents
else
  echo "==> Skipping pi packages (pi not on PATH); see consumed.md"
fi

echo "==> Done. Verify with: npx skills list -g"
