#!/bin/bash
# Sync gateway sessions to Supabase for dashboard consumption
# Runs on VPS, pushes session snapshots to gateway_sessions table

set -euo pipefail

# Load env
source /home/ubuntu/.openclaw/workspace/dashboard/.env.local 2>/dev/null || true
source /home/ubuntu/hbx-dashboard/.env.local 2>/dev/null || true

SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL}"
SERVICE_KEY="${SUPABASE_SERVICE_ROLE_KEY}"

if [ -z "$SUPABASE_URL" ] || [ -z "$SERVICE_KEY" ]; then
  echo "❌ Missing SUPABASE_URL or SERVICE_KEY"
  exit 1
fi

# Get sessions from openclaw CLI
SESSIONS_JSON=$(openclaw sessions --json --all-agents --active 120 2>/dev/null || echo '{"sessions":[]}')

# Transform and upsert to Supabase
echo "$SESSIONS_JSON" | python3 -c "
import sys, json, urllib.request

data = json.load(sys.stdin)
sessions = data.get('sessions', [])

supabase_url = '${SUPABASE_URL}'
service_key = '${SERVICE_KEY}'

# Build upsert payload
rows = []
for s in sessions:
    key = s.get('key', '')
    agent_id = s.get('agentId', 'main')
    
    # Determine type
    is_cron = 'cron' in key
    is_sub = s.get('kind') == 'isolated' or 'spawn' in key
    is_main = key == 'agent:main:main' or key.endswith(':telegram:8391685290')
    
    # Display name
    if is_main:
        display = '🧠 HBx (Main)'
    elif 'telegram' in key:
        display = '💬 Telegram'
    elif is_cron:
        display = '⏰ Cron: ' + key.split(':')[-1][:8]
    elif is_sub:
        display = '⚡ Sub-Agent'
    elif 'webchat' in key or 'dashboard' in key:
        display = '📊 Dashboard'
    else:
        display = key.split(':')[-1][:20]
    
    rows.append({
        'session_key': key,
        'agent_id': agent_id,
        'kind': s.get('kind', 'unknown'),
        'model': s.get('model', 'unknown'),
        'total_tokens': s.get('totalTokens', 0),
        'percent_used': s.get('percentUsed', 0),
        'updated_at': s.get('updatedAt', 0),
        'is_cron': is_cron,
        'is_sub_agent': is_sub,
        'is_main': is_main,
        'display_name': display,
    })

if not rows:
    print('No active sessions to sync')
    sys.exit(0)

# Upsert via REST API
url = f'{supabase_url}/rest/v1/gateway_sessions'
headers = {
    'apikey': service_key,
    'Authorization': f'Bearer {service_key}',
    'Content-Type': 'application/json',
    'Prefer': 'resolution=merge-duplicates',
}

req = urllib.request.Request(url, data=json.dumps(rows).encode(), headers=headers, method='POST')
try:
    resp = urllib.request.urlopen(req)
    print(f'✅ Synced {len(rows)} sessions to Supabase')
except Exception as e:
    print(f'❌ Error: {e}')
    sys.exit(1)
"

# Clean up stale sessions (not updated in 2+ hours)
curl -s -X DELETE "${SUPABASE_URL}/rest/v1/gateway_sessions?snapshot_at=lt.$(date -u -d '2 hours ago' +%Y-%m-%dT%H:%M:%S)" \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}" > /dev/null 2>&1 || true
