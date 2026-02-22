#!/bin/bash
# poll-merged-prs.sh
# Polls GitHub for recently merged PRs, updates Supabase feature cards,
# pulls main, and prunes merged branches.
#
# Designed to run via OpenClaw cron every 15 min.
# Outputs a summary for the agent to relay.

set -euo pipefail

WORKSPACE="/home/ubuntu/.openclaw/workspace"
STATE_FILE="/home/ubuntu/.openclaw/.last-merged-pr-check"
GITHUB_REPO="rob-hoeller/claw-bot-army"
SUPABASE_URL="https://lqlnflbzsqsmufjrygvu.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxxbG5mbGJ6c3FzbXVmanJ5Z3Z1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3NDgzNzQsImV4cCI6MjA4NjMyNDM3NH0.6HUGzcclNT5vfNAFnUUiMfTuFYT4QQ8l4VRMZOG8wdc"

# Get GitHub token
GITHUB_TOKEN=$(cat ~/.git-credentials | grep github.com | head -1 | sed 's|https://[^:]*:\([^@]*\)@.*|\1|')
if [ -z "$GITHUB_TOKEN" ]; then
  echo "❌ No GitHub token found in ~/.git-credentials"
  exit 1
fi

# Get last check timestamp (default: 30 min ago)
if [ -f "$STATE_FILE" ]; then
  LAST_CHECK=$(cat "$STATE_FILE")
else
  LAST_CHECK=$(date -u -d '30 minutes ago' +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -v-30M +%Y-%m-%dT%H:%M:%SZ)
fi

# Save current time as new checkpoint
date -u +%Y-%m-%dT%H:%M:%SZ > "$STATE_FILE"

# Fetch recently closed PRs (merged)
PRS=$(curl -s \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  "https://api.github.com/repos/${GITHUB_REPO}/pulls?state=closed&sort=updated&direction=desc&per_page=10")

# Filter to PRs merged after last check
MERGED_PRS=$(echo "$PRS" | jq -r --arg since "$LAST_CHECK" '
  [.[] | select(.merged_at != null and .merged_at > $since)] | 
  if length == 0 then empty else . end
' 2>/dev/null)

if [ -z "$MERGED_PRS" ] || [ "$MERGED_PRS" = "null" ]; then
  echo "✅ No new merged PRs since $LAST_CHECK"
  exit 0
fi

MERGE_COUNT=$(echo "$MERGED_PRS" | jq 'length')
echo "🔄 Found $MERGE_COUNT newly merged PR(s) since $LAST_CHECK"

UPDATED_FEATURES=0
PRUNED_BRANCHES=0

# Process each merged PR
echo "$MERGED_PRS" | jq -c '.[]' | while read -r PR; do
  PR_NUM=$(echo "$PR" | jq -r '.number')
  PR_TITLE=$(echo "$PR" | jq -r '.title')
  BRANCH=$(echo "$PR" | jq -r '.head.ref')
  MERGED_AT=$(echo "$PR" | jq -r '.merged_at')
  
  echo ""
  echo "📋 PR #${PR_NUM}: ${PR_TITLE}"
  echo "   Branch: ${BRANCH} | Merged: ${MERGED_AT}"
  
  # Update Supabase feature card by branch_name or pr_number
  # Try branch_name match first
  FEATURE_RESPONSE=$(curl -s -X PATCH \
    "${SUPABASE_URL}/rest/v1/features?or=(branch_name.eq.${BRANCH},pr_number.eq.${PR_NUM})" \
    -H "apikey: ${SUPABASE_ANON_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=representation" \
    -d "{\"status\": \"done\", \"pr_status\": \"merged\", \"pr_number\": ${PR_NUM}, \"completed_at\": \"${MERGED_AT}\"}" \
    2>/dev/null)
  
  FEATURE_COUNT=$(echo "$FEATURE_RESPONSE" | jq 'length' 2>/dev/null || echo "0")
  
  if [ "$FEATURE_COUNT" != "0" ] && [ "$FEATURE_COUNT" != "null" ]; then
    FEATURE_TITLES=$(echo "$FEATURE_RESPONSE" | jq -r '.[].title' 2>/dev/null)
    echo "   ✅ Updated $FEATURE_COUNT feature(s) to 'done': $FEATURE_TITLES"
    UPDATED_FEATURES=$((UPDATED_FEATURES + FEATURE_COUNT))
  else
    echo "   ℹ️  No matching feature card found for branch '${BRANCH}' or PR #${PR_NUM}"
  fi
  
  # Delete the remote branch if it still exists
  DELETE_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
    -X DELETE \
    -H "Authorization: token $GITHUB_TOKEN" \
    "https://api.github.com/repos/${GITHUB_REPO}/git/refs/heads/${BRANCH}" 2>/dev/null)
  
  if [ "$DELETE_RESPONSE" = "204" ]; then
    echo "   🗑️  Deleted remote branch: ${BRANCH}"
    PRUNED_BRANCHES=$((PRUNED_BRANCHES + 1))
  elif [ "$DELETE_RESPONSE" = "422" ]; then
    echo "   ℹ️  Remote branch already deleted: ${BRANCH}"
  else
    echo "   ⚠️  Could not delete remote branch (HTTP ${DELETE_RESPONSE}): ${BRANCH}"
  fi
done

# Pull latest main and prune local tracking refs
echo ""
echo "📥 Pulling main and pruning..."
cd "$WORKSPACE"
git checkout main 2>/dev/null || true
git pull origin main 2>/dev/null && echo "   ✅ main updated" || echo "   ⚠️ git pull failed"
git fetch --prune origin 2>/dev/null && echo "   ✅ Pruned stale remote refs" || true

# Clean up local branches that have been merged
STALE_LOCAL=$(git branch --merged main | grep -v '^\*' | grep -v 'main' | grep -v 'master' 2>/dev/null || true)
if [ -n "$STALE_LOCAL" ]; then
  echo "$STALE_LOCAL" | xargs git branch -d 2>/dev/null || true
  STALE_COUNT=$(echo "$STALE_LOCAL" | wc -l | tr -d ' ')
  echo "   🗑️  Deleted $STALE_COUNT merged local branch(es)"
fi

echo ""
echo "📊 Summary: $MERGE_COUNT PR(s) processed | Features updated: ~${UPDATED_FEATURES} | Branches pruned: ~${PRUNED_BRANCHES}"
