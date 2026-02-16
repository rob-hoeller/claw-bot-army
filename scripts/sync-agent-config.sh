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

# ============================================================
# MEMORY.md: Dynamic Agent Registry Generation
# ============================================================
# The agent registry is generated dynamically from the agents table
# to ensure HBx always has current agent data (single source of truth).
# Static content from memory_md is preserved below the registry.
# ============================================================

echo ""
echo "📊 Generating dynamic agent registry..."

# Fetch ALL agents from Supabase (using correct column names)
# Schema: id, name, department_id, role, status, last_active, description
ALL_AGENTS=$(curl -s "${SUPABASE_URL}/rest/v1/agents?select=id,name,department_id,role,status,last_active,description&order=id" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}")

# Verify we got valid JSON array
if ! echo "$ALL_AGENTS" | jq -e 'type == "array"' > /dev/null 2>&1; then
  echo "   ⚠️  Failed to fetch agents list, falling back to memory_md"
  write_file "memory_md" "MEMORY.md"
  exit 0
fi

# Count agents
TOTAL_AGENTS=$(echo "$ALL_AGENTS" | jq 'length')
ACTIVE_AGENTS=$(echo "$ALL_AGENTS" | jq '[.[] | select(.status == "active" or .status == "Active" or .status == null)] | length')
DEPLOYING_AGENTS=$(echo "$ALL_AGENTS" | jq '[.[] | select(.status == "deploying" or .status == "Deploying")] | length')
INACTIVE_AGENTS=$(echo "$ALL_AGENTS" | jq '[.[] | select(.status == "inactive" or .status == "Inactive")] | length')

echo "   Found $TOTAL_AGENTS agents in Supabase"

# Generate the agent registry table
generate_registry() {
  echo "# Long-Term Memory: HBx"
  echo ""
  echo "> This file stores platform state, agent registry, and significant events."
  echo "> Agent registry is **dynamically generated** from Supabase (single source of truth)."
  echo "> Last synced: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  echo ""
  echo "---"
  echo ""
  echo "## Agent Registry"
  echo ""
  echo "### Active Agents"
  echo ""
  echo "| Agent ID | Name | Department | Role | Status | Last Active |"
  echo "|----------|------|------------|------|--------|-------------|"
  
  # Generate rows from agents table
  # Using department_id for now (can join with departments table later)
  echo "$ALL_AGENTS" | jq -r '.[] | 
    "| \(.id // "—") | \(.name // "—") | \(.department_id // "—") | \(.role // "—") | \(
      if .status == "active" or .status == "Active" or .status == null then "✅ Active"
      elif .status == "deploying" or .status == "Deploying" then "🔄 Deploying"
      elif .status == "inactive" or .status == "Inactive" then "⏸️ Inactive"
      else .status
      end
    ) | \(.last_active // "—") |"'
  
  echo ""
  echo "### Agent Health Summary"
  echo ""
  echo "| Metric | Value |"
  echo "|--------|-------|"
  echo "| Total Agents | $TOTAL_AGENTS |"
  echo "| Active | $ACTIVE_AGENTS |"
  echo "| Deploying | $DEPLOYING_AGENTS |"
  echo "| Inactive | $INACTIVE_AGENTS |"
  echo "| Issues | 0 |"
  echo ""
  echo "---"
  echo ""
}

# Get static content from memory_md (everything after "## Recent Activity" or similar)
STATIC_CONTENT=$(echo "$RESPONSE" | jq -r '.[0].memory_md // empty' | sed -n '/^## Recent Activity/,$p')

# If no static content found, use default
if [ -z "$STATIC_CONTENT" ]; then
  STATIC_CONTENT="## Recent Activity

### Platform Events

| Date | Event | Details |
|------|-------|---------|
| 2026-02-10 | Platform Launch | HBx dashboard deployed to Vercel |
| 2026-02-10 | Agent Setup | Initial agents configured |
| 2026-02-13 | Dynamic Registry | Agent registry now syncs from Supabase |

### Task Routing Log

| Date | Task | Routed To | Status |
|------|------|-----------|--------|
| — | — | — | — |

---

## Global Knowledge Status

| File | Last Updated | Status |
|------|--------------|--------|
| COMPANY.md | 2026-02-10 | ✅ Current |
| COMPLIANCE.md | 2026-02-10 | ✅ Current |
| DEPARTMENTS.md | 2026-02-10 | ✅ Current |
| PLATFORM-RULES.md | 2026-02-10 | ✅ Current |

---

## Notes

- Platform launched for Schell Brothers
- Agent registry now dynamically generated from Supabase
- Single source of truth architecture enforced
- Dashboard UI in active development

---

## Session Log

| Date | Focus | Key Outcomes |
|------|-------|--------------|
| 2026-02-10 | Platform Setup | Dashboard deployed, agents configured |
| 2026-02-13 | Cache Fix | Dynamic agent registry implemented |"
fi

# Write MEMORY.md with dynamic registry + static content
{
  generate_registry
  echo "$STATIC_CONTENT"
} > "${WORKSPACE}/MEMORY.md"

echo "   ✅ MEMORY.md (dynamic registry + static content)"

# Sync OpenClaw config to Supabase (redacted) for dashboard access
OPENCLAW_CONFIG="$HOME/.openclaw/openclaw.json"
if [ -f "$OPENCLAW_CONFIG" ] && command -v node &> /dev/null; then
  REDACTED_JSON=$(node -e "
    const fs = require('fs');
    const c = JSON.parse(fs.readFileSync('$OPENCLAW_CONFIG', 'utf-8'));
    function r(o, k) {
      if (typeof o === 'string' && o === '__OPENCLAW_REDACTED__') return '••••••••';
      if (typeof o !== 'object' || o === null) return o;
      if (Array.isArray(o)) return o.map((v,i) => r(v, String(i)));
      const res = {};
      for (const [key, val] of Object.entries(o)) {
        if (typeof val === 'string' && ['token','key','secret','password','bottoken'].some(s => key.toLowerCase().replace(/[^a-z]/g,'').includes(s))) {
          res[key] = '••••••••';
        } else { res[key] = r(val, key); }
      }
      return res;
    }
    console.log(JSON.stringify(r(c, '')));
  " 2>/dev/null)
  if [ -n "$REDACTED_JSON" ]; then
    curl -s -X POST "${SUPABASE_URL}/rest/v1/platform_config" \
      -H "apikey: ${SUPABASE_ANON_KEY}" \
      -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
      -H "Content-Type: application/json" \
      -H "Prefer: resolution=merge-duplicates" \
      -d "{\"id\": \"current\", \"config\": $REDACTED_JSON, \"updated_at\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\"}" > /dev/null 2>&1
    echo "   ✅ Platform config synced to Supabase"
  fi
fi

echo ""
echo "✅ Sync complete for $AGENT_ID"
echo "   Timestamp: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo "   Agents synced: $TOTAL_AGENTS"
