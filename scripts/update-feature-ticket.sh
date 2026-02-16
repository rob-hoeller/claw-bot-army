#!/bin/bash
# Update feature ticket in Supabase
# Usage: ./scripts/update-feature-ticket.sh

set -e

# Load environment variables
source dashboard/.env.local

SUPABASE_URL="https://lqlnflbzsqsmufjrygvu.supabase.co"
SERVICE_KEY="$SUPABASE_SERVICE_ROLE_KEY"

FEATURE_TITLE="Threaded Conversations / Topics"
ASSIGNED_TO="HBx_IN2"
NEW_STATUS="planned"

echo "🔍 Finding feature: $FEATURE_TITLE"

# Find the feature by title
FEATURE=$(curl -s "${SUPABASE_URL}/rest/v1/features?title=eq.${FEATURE_TITLE// /%20}" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY")

FEATURE_ID=$(echo "$FEATURE" | jq -r '.[0].id')

if [ "$FEATURE_ID" == "null" ] || [ -z "$FEATURE_ID" ]; then
  echo "❌ Feature not found: $FEATURE_TITLE"
  echo "Response: $FEATURE"
  exit 1
fi

echo "✅ Found feature ID: $FEATURE_ID"

# Update the feature
echo "📝 Updating feature..."
UPDATE_RESULT=$(curl -s -X PATCH "${SUPABASE_URL}/rest/v1/features?id=eq.${FEATURE_ID}" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "{
    \"assigned_to\": \"$ASSIGNED_TO\",
    \"status\": \"$NEW_STATUS\",
    \"branch_name\": \"hbx/threaded-conversations\"
  }")

echo "Update result: $UPDATE_RESULT"

# Add comment with design doc link
echo "💬 Adding design doc comment..."
COMMENT_RESULT=$(curl -s -X POST "${SUPABASE_URL}/rest/v1/feature_comments" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "{
    \"feature_id\": \"$FEATURE_ID\",
    \"agent_id\": \"HBx\",
    \"message\": \"📋 **Technical Design Complete**\n\nDesign doc created: \`docs/designs/THREADED-CONVERSATIONS.md\`\n\n**Key decisions:**\n- New \`threads\` table with user/agent ownership\n- Messages linked to threads via \`thread_id\`\n- Thread-specific OpenClaw sessions for better LLM caching\n- 5-phase implementation plan (Schema → API → UI List → UI Experience → Search)\n\n**Assigned to:** HBx_IN2 (Code Factory)\n**Status:** Ready for implementation\n\nPlease review design doc and begin Phase 1 (Schema) when ready.\",
    \"comment_type\": \"status_update\"
  }")

echo "Comment result: $COMMENT_RESULT"

echo ""
echo "✅ Feature ticket updated:"
echo "   - Assigned to: $ASSIGNED_TO"
echo "   - Status: $NEW_STATUS"
echo "   - Branch: hbx/threaded-conversations"
echo "   - Design doc comment added"
