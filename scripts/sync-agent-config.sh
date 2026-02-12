#!/bin/bash
# sync-agent-config.sh
# Pulls agent config files from Supabase and writes to local workspace
# Usage: ./sync-agent-config.sh [AGENT_ID]
# Default: HBx

set -e

AGENT_ID="${1:-HBx}"
WORKSPACE="${OPENCLAW_WORKSPACE:-/home/ubuntu/.openclaw/workspace}"

# Supabase config
SUPABASE_URL="https://lqlnflbzsqsmufjrygvu.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxxbG5mbGJ6c3FzbXVmanJ5Z3Z1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3NDgzNzQsImV4cCI6MjA4NjMyNDM3NH0.6HUGzcclNT5vfNAFnUUiMfTuFYT4QQ8l4VRMZOG8wdc"

echo "🔄 Syncing config for agent: $AGENT_ID"
echo "   Workspace: $WORKSPACE"

# Fetch agent from Supabase
RESPONSE=$(curl -s "${SUPABASE_URL}/rest/v1/agents?id=eq.${AGENT_ID}&select=*" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}")

# Check if agent exists
if [ "$RESPONSE" = "[]" ]; then
  echo "❌ Agent not found: $AGENT_ID"
  exit 1
fi

# Parse and write each file
# Using jq to extract fields
write_file() {
  local field="$1"
  local filename="$2"
  local content=$(echo "$RESPONSE" | jq -r ".[0].${field} // empty")
  
  if [ -n "$content" ] && [ "$content" != "null" ]; then
    echo "$content" > "${WORKSPACE}/${filename}"
    echo "   ✅ ${filename} ($(echo "$content" | wc -c) bytes)"
  else
    echo "   ⏭️  ${filename} (empty in DB, skipped)"
  fi
}

echo ""
echo "📥 Writing files..."

write_file "soul_md" "SOUL.md"
write_file "agents_md" "AGENTS.md"
write_file "identity_md" "IDENTITY.md"
write_file "tools_md" "TOOLS.md"
write_file "heartbeat_md" "HEARTBEAT.md"
write_file "user_md" "USER.md"
# MEMORY.md now syncs from DB (source of truth)
write_file "memory_md" "MEMORY.md"

echo ""
echo "✅ Sync complete for $AGENT_ID"
echo "   Timestamp: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
