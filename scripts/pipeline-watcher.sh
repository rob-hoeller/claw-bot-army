#!/bin/bash
# pipeline-watcher.sh
# Polls Supabase for features that need pipeline automation.
# Designed to run via OpenClaw cron every 60 seconds.
#
# Watches for:
# 1. Features in design_review → need Design + Build + QA pipeline
# 2. Features in approved → need PR creation
#
# Outputs actionable instructions for HBx to act on.

set -euo pipefail

WORKSPACE="/home/ubuntu/.openclaw/workspace"
ANON_KEY=$(grep NEXT_PUBLIC_SUPABASE_ANON_KEY "$WORKSPACE/dashboard/.env.local" | cut -d= -f2)
SUPA="https://lqlnflbzsqsmufjrygvu.supabase.co"
STATE_FILE="/home/ubuntu/.openclaw/.pipeline-watcher-state"

# Track features we've already flagged to avoid duplicate alerts
touch "$STATE_FILE"

ACTIONS=""

# 1. Check for features in design_review (need pipeline pickup)
DESIGN_FEATURES=$(curl -s "$SUPA/rest/v1/features?status=eq.design_review&select=id,title" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY")

DESIGN_COUNT=$(echo "$DESIGN_FEATURES" | jq 'length')

for i in $(seq 0 $((DESIGN_COUNT - 1))); do
  FID=$(echo "$DESIGN_FEATURES" | jq -r ".[$i].id")
  FTITLE=$(echo "$DESIGN_FEATURES" | jq -r ".[$i].title")
  
  # Skip if already flagged
  if grep -q "$FID:design" "$STATE_FILE" 2>/dev/null; then
    continue
  fi
  
  ACTIONS="${ACTIONS}🚀 **PICKUP NEEDED**: \"${FTITLE}\" is in Design Review — needs pipeline agent (Design → Build → QA → Review)\nFeature ID: ${FID}\n\n"
  echo "$FID:design" >> "$STATE_FILE"
done

# 2. Check for features in approved (need PR creation)
APPROVED_FEATURES=$(curl -s "$SUPA/rest/v1/features?status=eq.approved&select=id,title,branch_name" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY")

APPROVED_COUNT=$(echo "$APPROVED_FEATURES" | jq 'length')

for i in $(seq 0 $((APPROVED_COUNT - 1))); do
  FID=$(echo "$APPROVED_FEATURES" | jq -r ".[$i].id")
  FTITLE=$(echo "$APPROVED_FEATURES" | jq -r ".[$i].title")
  BRANCH=$(echo "$APPROVED_FEATURES" | jq -r ".[$i].branch_name")
  
  if grep -q "$FID:approved" "$STATE_FILE" 2>/dev/null; then
    continue
  fi
  
  ACTIONS="${ACTIONS}✅ **PR NEEDED**: \"${FTITLE}\" is Approved — create PR from branch \`${BRANCH}\`, assign reviewers, update to pr_submitted\nFeature ID: ${FID}\n\n"
  echo "$FID:approved" >> "$STATE_FILE"
done

# 3. Clean up state file — remove entries for features no longer in those statuses
if [ -f "$STATE_FILE" ]; then
  TEMP_STATE=$(mktemp)
  while IFS= read -r line; do
    FID=$(echo "$line" | cut -d: -f1)
    PHASE=$(echo "$line" | cut -d: -f2)
    
    # Check if feature is still in that status
    if [ "$PHASE" = "design" ]; then
      STILL=$(echo "$DESIGN_FEATURES" | jq -r "[.[] | select(.id == \"$FID\")] | length")
    elif [ "$PHASE" = "approved" ]; then
      STILL=$(echo "$APPROVED_FEATURES" | jq -r "[.[] | select(.id == \"$FID\")] | length")
    else
      STILL="0"
    fi
    
    if [ "$STILL" != "0" ]; then
      echo "$line" >> "$TEMP_STATE"
    fi
  done < "$STATE_FILE"
  mv "$TEMP_STATE" "$STATE_FILE"
fi

# Output
if [ -n "$ACTIONS" ]; then
  echo -e "$ACTIONS"
  echo "→ HBx should act on these immediately."
else
  echo "✅ No pipeline actions needed. All features are either in progress or waiting for human input."
fi
