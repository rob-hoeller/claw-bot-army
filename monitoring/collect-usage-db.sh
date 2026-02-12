#!/bin/bash
# HBx Platform Monitoring - Token Usage Collector
# Runs every 15 minutes via cron
# Parses OpenClaw session JSONL files and stores usage data in Supabase

set +e  # Don't exit on error - continue processing other sessions

# Load environment
source /home/ubuntu/.openclaw/workspace/dashboard/.env.local 2>/dev/null || true

SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL}"
SUPABASE_KEY="${SUPABASE_SERVICE_ROLE_KEY}"

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_KEY" ]; then
    echo "Error: Supabase credentials not found"
    exit 1
fi

SESSIONS_DIR="/home/ubuntu/.openclaw/agents/main/sessions"
STATE_FILE="/home/ubuntu/.openclaw/workspace/monitoring/logs/usage-collector-state.json"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
HOSTNAME=$(hostname)

mkdir -p "$(dirname "$STATE_FILE")"

if [ ! -f "$STATE_FILE" ]; then
    echo '{}' > "$STATE_FILE"
fi

# Parse session key to extract agent_id and user_id
parse_session_key() {
    local key="$1"
    local agent_id=""
    local user_id=""
    
    if [[ "$key" == dashboard-* ]]; then
        local parts="${key#dashboard-}"
        user_id="${parts##*-}"
        agent_id="${parts%-*}"
    elif [[ "$key" == agent:* ]]; then
        agent_id=$(echo "$key" | cut -d':' -f2)
        local third=$(echo "$key" | cut -d':' -f3)
        if [ "$third" == "main" ]; then
            user_id="system"
        else
            user_id="${third}-session"
        fi
    else
        agent_id="unknown"
        user_id="unknown"
    fi
    
    echo "$agent_id|$user_id"
}

get_last_line() {
    local session_id="$1"
    jq -r --arg id "$session_id" '.[$id].last_line // 0' "$STATE_FILE"
}

update_last_line() {
    local session_id="$1"
    local line_num="$2"
    local tmp_file=$(mktemp)
    jq --arg id "$session_id" --argjson line "$line_num" \
        '.[$id] = {"last_line": $line, "updated_at": now | todate}' \
        "$STATE_FILE" > "$tmp_file" && mv "$tmp_file" "$STATE_FILE"
}

echo "[$TIMESTAMP] Starting token usage collection..."

TOTAL_SESSIONS=0
TOTAL_RECORDS=0

for jsonl_file in "$SESSIONS_DIR"/*.jsonl; do
    [ -f "$jsonl_file" ] || continue
    [[ "$jsonl_file" == *.lock ]] && continue
    [[ "$jsonl_file" == *.deleted.* ]] && continue
    
    filename=$(basename "$jsonl_file")
    session_id="${filename%.jsonl}"
    
    # Get session info
    session_info=$(head -1 "$jsonl_file" 2>/dev/null | jq -r 'select(.type == "session") | .id' 2>/dev/null || echo "")
    [ -z "$session_info" ] && continue
    
    # Find session key
    session_key=$(jq -r --arg id "$session_id" 'to_entries[] | select(.value.sessionId == $id) | .key' \
        "$SESSIONS_DIR/sessions.json" 2>/dev/null || echo "")
    [ -z "$session_key" ] && session_key="unknown-$session_id"
    
    # Parse agent and user
    parsed=$(parse_session_key "$session_key")
    agent_id=$(echo "$parsed" | cut -d'|' -f1)
    user_id=$(echo "$parsed" | cut -d'|' -f2)
    
    # Get model info
    model_info=$(grep '"type":"model_change"' "$jsonl_file" 2>/dev/null | tail -1 | jq -r '"\(.provider)|\(.modelId)"' 2>/dev/null || echo "anthropic|unknown")
    provider=$(echo "$model_info" | cut -d'|' -f1)
    model=$(echo "$model_info" | cut -d'|' -f2)
    
    # Check for new lines
    last_line=$(get_last_line "$session_id")
    total_lines=$(wc -l < "$jsonl_file")
    
    [ "$last_line" -ge "$total_lines" ] && continue
    
    ((TOTAL_SESSIONS++))
    
    # Extract latest usage data using jq to build the payload directly
    # This avoids issues with special characters in the JSON
    PAYLOAD=$(grep '"role":"assistant"' "$jsonl_file" 2>/dev/null | \
        grep '"usage"' | \
        tail -1 | \
        jq --arg ts "$TIMESTAMP" \
           --arg sk "$session_key" \
           --arg si "$session_id" \
           --arg ai "$agent_id" \
           --arg ui "$user_id" \
           --arg mod "$model" \
           --arg prov "$provider" \
           --arg hn "$HOSTNAME" \
        '{
            recorded_at: $ts,
            session_key: $sk,
            session_id: $si,
            agent_id: $ai,
            user_id: $ui,
            model: $mod,
            provider: $prov,
            input_tokens: (.message.usage.input // 0),
            output_tokens: (.message.usage.output // 0),
            cache_read_tokens: (.message.usage.cacheRead // 0),
            cache_write_tokens: (.message.usage.cacheWrite // 0),
            total_tokens: (.message.usage.totalTokens // 0),
            context_used: (.message.usage.totalTokens // 0),
            context_limit: 200000,
            context_percent: (((.message.usage.totalTokens // 0) * 100 / 200000) | floor),
            cost_input: (.message.usage.cost.input // 0),
            cost_output: (.message.usage.cost.output // 0),
            cost_cache_read: (.message.usage.cost.cacheRead // 0),
            cost_cache_write: (.message.usage.cost.cacheWrite // 0),
            cost_total: (.message.usage.cost.total // 0),
            delta_input_tokens: 0,
            delta_output_tokens: 0,
            delta_total_tokens: (.message.usage.totalTokens // 0),
            delta_cost: (.message.usage.cost.total // 0),
            request_count: 1,
            hostname: $hn
        }' 2>/dev/null)
    
    if [ -z "$PAYLOAD" ] || [ "$PAYLOAD" == "null" ]; then
        update_last_line "$session_id" "$total_lines"
        continue
    fi
    
    # Insert into Supabase
    HTTP_CODE=$(curl -s -w "%{http_code}" -o /dev/null -X POST \
        "${SUPABASE_URL}/rest/v1/token_usage" \
        -H "apikey: ${SUPABASE_KEY}" \
        -H "Authorization: Bearer ${SUPABASE_KEY}" \
        -H "Content-Type: application/json" \
        -H "Prefer: return=minimal" \
        -d "$PAYLOAD")
    
    if [ "$HTTP_CODE" = "201" ]; then
        ((TOTAL_RECORDS++))
    else
        echo "[$TIMESTAMP] Error storing usage for $session_key: HTTP $HTTP_CODE"
    fi
    
    update_last_line "$session_id" "$total_lines"
done

echo "[$TIMESTAMP] Token usage collection complete: $TOTAL_SESSIONS sessions, $TOTAL_RECORDS records stored"

# Run daily aggregation
echo "[$TIMESTAMP] Running daily aggregation..."
curl -s -X POST \
    "${SUPABASE_URL}/rest/v1/rpc/aggregate_daily_token_usage" \
    -H "apikey: ${SUPABASE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_KEY}" \
    -H "Content-Type: application/json" \
    -d '{"target_date": "'$(date -u +%Y-%m-%d)'"}' > /dev/null 2>&1 || true

echo "[$TIMESTAMP] Done"
