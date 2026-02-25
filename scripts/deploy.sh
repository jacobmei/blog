#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "[ERROR] Not a git repository: $ROOT_DIR"
  exit 1
fi

if ! git remote get-url origin >/dev/null 2>&1; then
  echo "[ERROR] Git remote 'origin' is not set."
  exit 1
fi

BRANCH="$(git symbolic-ref --quiet --short HEAD || true)"
if [[ -z "$BRANCH" ]]; then
  echo "[ERROR] Detached HEAD. Please checkout a branch first."
  exit 1
fi

if [[ -n "${1:-}" ]]; then
  COMMIT_MSG="$1"
else
  COMMIT_MSG="deploy: update site ($(date '+%Y-%m-%d %H:%M:%S'))"
fi

echo "[1/4] Staging changes..."
git add -A

if git diff --cached --quiet; then
  echo "[INFO] No local changes to commit."
else
  echo "[2/4] Committing changes..."
  git commit -m "$COMMIT_MSG"
fi

echo "[3/4] Pulling latest remote with rebase..."
git pull --rebase origin "$BRANCH"

echo "[4/4] Pushing to origin/$BRANCH..."
git push origin "$BRANCH"

echo "[DONE] Deploy flow completed on branch '$BRANCH'."
