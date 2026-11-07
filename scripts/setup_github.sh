#!/usr/bin/env bash
# One-time GitHub setup for milk-delivery-poc.
#
#   ./scripts/setup_github.sh            # private repository (default)
#   ./scripts/setup_github.sh --public   # public repository
#
# What it does (never deletes or overwrites anything):
#   1. Checks gh is logged in with repo + project scopes
#   2. Creates the GitHub repo from this folder and pushes main
#      (stops if a repo with this name already exists)
#   3. Runs bootstrap_github.py: labels, milestones, 8 M0 issues, develop branch,
#      branch protection (where the plan allows), Project board
#
# Note: branch protection on PRIVATE repos needs GitHub Pro/Team.
#       On the Free plan it only works on PUBLIC repos.
set -euo pipefail
cd "$(dirname "$0")/.."

VISIBILITY="--private"
[[ "${1:-}" == "--public" ]] && VISIBILITY="--public"
NAME="milk-delivery-poc"

command -v gh >/dev/null || { echo "Install the GitHub CLI first: https://cli.github.com"; exit 1; }
gh auth status >/dev/null 2>&1 || gh auth login --scopes repo,project
gh auth status 2>&1 | grep -q "project" || gh auth refresh --scopes repo,project

OWNER="$(gh api user --jq .login)"
echo "Authenticated as: $OWNER"

if gh repo view "$OWNER/$NAME" >/dev/null 2>&1; then
  echo "Repository $OWNER/$NAME already exists. Not overwriting it."
  echo "Inspect it, then run: python3 scripts/bootstrap_github.py $OWNER/$NAME"
  exit 1
fi

gh repo create "$NAME" $VISIBILITY \
  --description "Learning-first full-stack Milk Delivery POC (React, FastAPI, PostgreSQL, GCP)" \
  --source . --remote origin --push

python3 scripts/bootstrap_github.py "$OWNER/$NAME"

echo
echo "Done. Repository: https://github.com/$OWNER/$NAME"
echo "Details: scripts/bootstrap-result.json"
