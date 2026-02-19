#!/bin/bash
# add-memory.sh
# Adds a new memory entry to Supabase and logs it
# Usage: ./add-memory.sh [AGENT_ID] "memory content"
# Example: ./add-memory.sh HBx "Learned that Lance prefers Option 2 for sync"

set -e

AGENT_ID="${1:-HBx}"
MEMORY_CONTENT="$2"

if [ -z "$MEMORY_CONTENT" ]; then
  echo "❌ Usage: ./add-memory.sh [AGENT_ID] \"memory content\""
  exit 1
fi

# Supabase config
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "${SCRIPT_DIR}/../dashboard/.env.local" ]; then
  set -a
  source "${SCRIPT_DIR}/../dashboard/.env.local"
  set +a
fi

SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL:-}"
SUPABASE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-}"
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_KEY" ]; then
  echo "❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY."
  echo "   Set them in Vercel or export locally before running."
  exit 1
fi

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
TODAY=$(date -u +"%Y-%m-%d")

echo "📝 Adding memory for agent: $AGENT_ID"
echo "   Content: $MEMORY_CONTENT"

# 1. Fetch current memory_md
CURRENT=$(curl -s "${SUPABASE_URL}/rest/v1/agents?id=eq.${AGENT_ID}&select=memory_md" \
  -H "apikey: ${SUPABASE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_KEY}" | jq -r '.[0].memory_md // ""')

# 2. Append new memory entry
NEW_ENTRY="
### ${TIMESTAMP}
${MEMORY_CONTENT}
"

UPDATED_MEMORY="${CURRENT}${NEW_ENTRY}"

# 3. Update agents table
UPDATE_RESULT=$(curl -s -X PATCH "${SUPABASE_URL}/rest/v1/agents?id=eq.${AGENT_ID}" \
  -H "apikey: ${SUPABASE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=minimal" \
  -d "$(jq -n --arg mem "$UPDATED_MEMORY" '{memory_md: $mem, updated_at: now | todate}')")

echo "   ✅ Memory updated in agents table"

# 4. Log to memory_logs table
LOG_ENTRY=$(jq -n \
  --arg agent_id "$AGENT_ID" \
  --arg date "$TODAY" \
  --arg timestamp "$TIMESTAMP" \
  --arg content "$MEMORY_CONTENT" \
  '{agent_id: $agent_id, log_date: $date, timestamp: $timestamp, content: $content}')

LOG_RESULT=$(curl -s -X POST "${SUPABASE_URL}/rest/v1/memory_logs" \
  -H "apikey: ${SUPABASE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=minimal" \
  -d "$LOG_ENTRY" 2>&1)

# Check if table exists (might get 404 if not created yet)
if echo "$LOG_RESULT" | grep -q "404\|does not exist"; then
  echo "   ⚠️  memory_logs table doesn't exist yet (will be created)"
else
  echo "   ✅ Logged to memory_logs table"
fi

echo ""
echo "✅ Memory added successfully"
echo "   Agent: $AGENT_ID"
echo "   Time: $TIMESTAMP"
