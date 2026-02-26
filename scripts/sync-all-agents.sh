#!/bin/bash
# sync-all-agents.sh
# Syncs all sub-agents from Supabase to their agent directories
# HBx goes to workspace, others go to /home/ubuntu/.openclaw/agents/{ID}/

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

WORKSPACE="${OPENCLAW_WORKSPACE:-/home/ubuntu/.openclaw/workspace}"
AGENTS_DIR="/home/ubuntu/.openclaw/agents"

# Load Supabase env (prefer explicit env vars, fallback to dashboard/.env.local)
SUPABASE_URL="${SUPABASE_URL:-}"
SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY:-}"
ENV_FILE="${SUPABASE_ENV_FILE:-}"

if [ -z "$ENV_FILE" ]; then
  if [ -f "${REPO_ROOT}/dashboard/.env.local" ]; then
    ENV_FILE="${REPO_ROOT}/dashboard/.env.local"
  elif [ -f "${WORKSPACE}/dashboard/.env.local" ]; then
    ENV_FILE="${WORKSPACE}/dashboard/.env.local"
  fi
fi

if [ -n "$ENV_FILE" ] && [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck source=/dev/null
  . "$ENV_FILE"
  set +a
fi

SUPABASE_URL="${SUPABASE_URL:-${NEXT_PUBLIC_SUPABASE_URL:-}}"
SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY:-${NEXT_PUBLIC_SUPABASE_ANON_KEY:-${NEXT_PUBLICSUPABASE_ANON_KEY:-}}}"

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_ANON_KEY" ]; then
  echo "❌ Supabase env vars missing. Set SUPABASE_URL/SUPABASE_ANON_KEY or provide dashboard/.env.local"
  exit 1
fi

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
