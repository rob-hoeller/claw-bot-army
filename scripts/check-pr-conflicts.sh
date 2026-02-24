#!/bin/bash
# check-pr-conflicts.sh
# Checks open PRs for merge conflicts with main. Auto-rebases and force-pushes if resolvable.
# Usage: ./scripts/check-pr-conflicts.sh [pr_number]

set -euo pipefail

WORKSPACE="/home/ubuntu/.openclaw/workspace"
GITHUB_REPO="rob-hoeller/claw-bot-army"

cd "$WORKSPACE"

GITHUB_TOKEN=$(cat ~/.git-credentials | grep github.com | head -1 | sed 's|https://[^:]*:\([^@]*\)@.*|\1|')
if [ -z "$GITHUB_TOKEN" ]; then
  echo "❌ No GitHub token found"
  exit 1
fi

git fetch origin main --quiet
git checkout main --quiet 2>/dev/null || true
git pull origin main --quiet 2>/dev/null || true

TARGET_PR="${1:-}"
RESOLVED=0
FAILED=0
CLEAN=0

if [ -n "$TARGET_PR" ]; then
  PRS=$(curl -s -H "Authorization: token $GITHUB_TOKEN" \
    "https://api.github.com/repos/$GITHUB_REPO/pulls/$TARGET_PR" | \
    jq -r '[{number: .number, branch: .head.ref, title: .title, mergeable: .mergeable}]')
else
  PRS=$(curl -s -H "Authorization: token $GITHUB_TOKEN" \
    "https://api.github.com/repos/$GITHUB_REPO/pulls?state=open&per_page=20" | \
    jq '[.[] | {number: .number, branch: .head.ref, title: .title, mergeable: .mergeable}]')
fi

PR_COUNT=$(echo "$PRS" | jq length)

if [ "$PR_COUNT" -eq 0 ]; then
  echo "✅ No open PRs to check."
  exit 0
fi

echo "🔍 Checking $PR_COUNT open PR(s) for merge conflicts..."
echo ""

for i in $(seq 0 $((PR_COUNT - 1))); do
  PR_NUM=$(echo "$PRS" | jq -r ".[$i].number")
  BRANCH=$(echo "$PRS" | jq -r ".[$i].branch")
  TITLE=$(echo "$PRS" | jq -r ".[$i].title")
  MERGEABLE=$(echo "$PRS" | jq -r ".[$i].mergeable")

  echo "── PR #$PR_NUM: $TITLE ($BRANCH)"

  if [ "$MERGEABLE" = "true" ]; then
    echo "   ✅ Clean — no conflicts"
    CLEAN=$((CLEAN + 1))
    continue
  fi

  git checkout "$BRANCH" --quiet 2>/dev/null
  git pull origin "$BRANCH" --quiet 2>/dev/null || true

  if git rebase main --quiet 2>/dev/null; then
    LOCAL_SHA=$(git rev-parse HEAD)
    REMOTE_SHA=$(git rev-parse "origin/$BRANCH" 2>/dev/null || echo "none")

    if [ "$LOCAL_SHA" != "$REMOTE_SHA" ]; then
      echo "   🔧 Rebased onto main — pushing..."
      if git push --force-with-lease origin "$BRANCH" 2>/dev/null; then
        echo "   ✅ Conflicts resolved and pushed"
        RESOLVED=$((RESOLVED + 1))
      else
        echo "   ❌ Push failed — manual intervention needed"
        FAILED=$((FAILED + 1))
      fi
    else
      echo "   ✅ Clean — already up to date"
      CLEAN=$((CLEAN + 1))
    fi
  else
    git rebase --abort 2>/dev/null || true
    echo "   ❌ CONFLICTS — cannot auto-resolve, needs manual fix"
    FAILED=$((FAILED + 1))
  fi
done

git checkout main --quiet 2>/dev/null || true

echo ""
echo "── Summary ──"
echo "  Clean: $CLEAN"
echo "  Auto-resolved: $RESOLVED"
echo "  Needs manual fix: $FAILED"

[ "$FAILED" -gt 0 ] && exit 1 || exit 0
