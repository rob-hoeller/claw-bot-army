#!/bin/bash
# sync-all-agents.sh
# Syncs all sub-agents from Supabase to their agent directories
# HBx goes to workspace, others go to /home/ubuntu/.openclaw/agents/{ID}/

set -e

WORKSPACE="/home/ubuntu/.openclaw/workspace"
AGENTS_DIR="/home/ubuntu/.openclaw/agents"

SUPABASE_URL="https://lqlnflbzsqsmufjrygvu.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxxbG5mbGJ6c3FzbXVmanJ5Z3Z1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3NDgzNzQsImV4cCI6MjA4NjMyNDM3NH0.6HUGzcclNT5vfNAFnUUiMfTuFYT4QQ8l4VRMZOG8wdc"

echo "🔄 Syncing all agents from Supabase..."
echo ""

# Get all agents
AGENTS=$(curl -s "${SUPABASE_URL}/rest/v1/agents?select=*" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}")

# Process each agent
echo "$AGENTS" | jq -c '.[]' | while read -r agent; do
  ID=$(echo "$agent" | jq -r '.id')
  NAME=$(echo "$agent" | jq -r '.name')
  
  # Determine output directory
  if [ "$ID" = "HBx" ]; then
    OUTPUT_DIR="$WORKSPACE"
  else
    OUTPUT_DIR="${AGENTS_DIR}/${ID}"
    mkdir -p "$OUTPUT_DIR"
  fi
  
  echo "📦 $ID ($NAME) → $OUTPUT_DIR"
  
  # Write each config file
  for field in soul_md agents_md identity_md tools_md heartbeat_md user_md memory_md; do
    # Map field to filename
    case $field in
      soul_md) filename="SOUL.md" ;;
      agents_md) filename="AGENTS.md" ;;
      identity_md) filename="IDENTITY.md" ;;
      tools_md) filename="TOOLS.md" ;;
      heartbeat_md) filename="HEARTBEAT.md" ;;
      user_md) filename="USER.md" ;;
      memory_md) filename="MEMORY.md" ;;
    esac
    
    content=$(echo "$agent" | jq -r ".${field} // empty")
    if [ -n "$content" ] && [ "$content" != "null" ]; then
      echo "$content" > "${OUTPUT_DIR}/${filename}"
      echo "   ✅ $filename"
    fi
  done
  echo ""
done

echo "✅ All agents synced!"
echo "   Timestamp: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
