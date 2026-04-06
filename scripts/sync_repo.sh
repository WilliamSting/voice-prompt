#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

DEFAULT_MESSAGE="chore: sync repository $(date '+%Y-%m-%d %H:%M:%S')"
COMMIT_MESSAGE="${1:-$DEFAULT_MESSAGE}"
REMOTE_URL="${2:-${GITHUB_REPO_URL:-}}"

echo "[sync] workspace: $ROOT_DIR"

if ! command -v git >/dev/null 2>&1; then
  echo "[sync] git is required but was not found."
  exit 1
fi

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "[sync] current directory is not a git repository."
  exit 1
fi

CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"

if [ -z "$CURRENT_BRANCH" ] || [ "$CURRENT_BRANCH" = "HEAD" ]; then
  echo "[sync] unable to determine the current branch."
  exit 1
fi

if ! git remote get-url origin >/dev/null 2>&1; then
  if [ -n "$REMOTE_URL" ]; then
    echo "[sync] adding origin: $REMOTE_URL"
    git remote add origin "$REMOTE_URL"
  else
    echo "[sync] no origin remote configured."
    echo "[sync] pass the repo URL as the second argument or set GITHUB_REPO_URL."
    echo "[sync] example: npm run sync:repo -- \"docs: first publish\" \"https://github.com/<user>/<repo>.git\""
    exit 1
  fi
fi

echo "[sync] checking for likely sensitive files in git status"
SENSITIVE_HITS="$(git status --short | rg '\.env|config\.json|ggml|api[_-]?key|secret|token' || true)"
if [ -n "$SENSITIVE_HITS" ]; then
  echo "[sync] found potentially sensitive paths:"
  echo "$SENSITIVE_HITS"
  echo "[sync] review them before syncing."
  exit 1
fi

echo "[sync] running release checks"
npm run build
npm run lint
cargo check --manifest-path src-tauri/Cargo.toml
python3 -m py_compile backend/process_voice_prompt.py

if [ -z "$(git status --short)" ]; then
  echo "[sync] no local changes to commit."
else
  echo "[sync] staging changes"
  git add -A
  echo "[sync] creating commit: $COMMIT_MESSAGE"
  git commit -m "$COMMIT_MESSAGE"
fi

echo "[sync] pushing branch: $CURRENT_BRANCH"
git push -u origin "$CURRENT_BRANCH"

echo "[sync] repository sync complete."
