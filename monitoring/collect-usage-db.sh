#!/bin/bash
# HBx Platform Monitoring - Token Usage Collector
# Runs every 15 minutes via cron
# Parses OpenClaw session JSONL files and stores usage data in Supabase

# Don't exit on error - we want to continue processing other sessions
set +e

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

# Ensure state directory exists
mkdir -p "$(dirname "$STATE_FILE")"

# Initialize state file if it doesn't exist
if [ ! -f "$STATE_FILE" ]; then
    echo '{}' > "$STATE_FILE"
fi

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

# Parse session key to extract agent_id and user_id
# Format: dashboard-{agent}-{user} or agent:main:{type}:{id}
parse_session_key() {
    local key="$1"
    local agent_id=""
    local user_id=""
    
    if [[ "$key" == dashboard-* ]]; then
        # dashboard-hbx-robl -> agent=hbx, user=robl
        # dashboard-hbx_sl1-robh -> agent=hbx_sl1, user=robh
        local parts=$(echo "$key" | sed 's/^dashboard-//')
        # Split on last hyphen
        user_id=$(echo "$parts" | rev | cut -d'-' -f1 | rev)
        agent_id=$(echo "$parts" | rev | cut -d'-' -f2- | rev)
    elif [[ "$key" == agent:* ]]; then
        # agent:main:main -> agent=main, user=system
        # agent:main:openai:uuid -> agent=main, user=openai-session
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

# Get the last processed line number for a session file
get_last_line() {
    local session_id="$1"
    jq -r --arg id "$session_id" '.[$id].last_line // 0' "$STATE_FILE"
}

# Update the last processed line for a session file
update_last_line() {
    local session_id="$1"
    local line_num="$2"
    local tmp_file=$(mktemp)
    jq --arg id "$session_id" --argjson line "$line_num" \
        '.[$id] = {"last_line": $line, "updated_at": now | todate}' \
        "$STATE_FILE" > "$tmp_file" && mv "$tmp_file" "$STATE_FILE"
}

# =============================================================================
# MAIN COLLECTION LOGIC
# =============================================================================

echo "[$TIMESTAMP] Starting token usage collection..."

# Track totals for logging
TOTAL_SESSIONS=0
TOTAL_RECORDS=0

# Process each session JSONL file
for jsonl_file in "$SESSIONS_DIR"/*.jsonl; do
    [ -f "$jsonl_file" ] || continue
    
    # Skip lock files and deleted files
    [[ "$jsonl_file" == *.lock ]] && continue
    [[ "$jsonl_file" == *.deleted.* ]] && continue
    
    filename=$(basename "$jsonl_file")
    session_id="${filename%.jsonl}"
    
    # Get session metadata from first line
    session_info=$(head -1 "$jsonl_file" 2>/dev/null | jq -r 'select(.type == "session") | "\(.id)|\(.timestamp)"' 2>/dev/null || echo "")
    
    if [ -z "$session_info" ]; then
        continue
    fi
    
    # Find session key from sessions.json
    session_key=$(jq -r --arg id "$session_id" 'to_entries[] | select(.value.sessionId == $id) | .key' \
        "$SESSIONS_DIR/sessions.json" 2>/dev/null || echo "")
    
    if [ -z "$session_key" ]; then
        # Try to find by matching session ID in the key
        session_key="unknown-$session_id"
    fi
    
    # Parse agent and user from session key
    parsed=$(parse_session_key "$session_key")
    agent_id=$(echo "$parsed" | cut -d'|' -f1)
    user_id=$(echo "$parsed" | cut -d'|' -f2)
    
    # Get model info from model_change events
    model_info=$(grep '"type":"model_change"' "$jsonl_file" 2>/dev/null | tail -1 | jq -r '"\(.provider)|\(.modelId)"' 2>/dev/null || echo "anthropic|unknown")
    provider=$(echo "$model_info" | cut -d'|' -f1)
    model=$(echo "$model_info" | cut -d'|' -f2)
    
    # Get last line we processed
    last_line=$(get_last_line "$session_id")
    total_lines=$(wc -l < "$jsonl_file")
    
    # Skip if no new data
    if [ "$last_line" -ge "$total_lines" ]; then
        continue
    fi
    
    ((TOTAL_SESSIONS++))
    
    # Extract usage data from new lines
    # Look for assistant messages with usage data
    usage_data=$(tail -n +"$((last_line + 1))" "$jsonl_file" | \
        grep -o '"usage":{[^}]*"cost":{[^}]*}}' 2>/dev/null | \
        tail -1 || echo "")
    
    if [ -z "$usage_data" ]; then
        # No usage data in new lines, just update state
        update_last_line "$session_id" "$total_lines"
        continue
    fi
    
    # Parse usage values
    input_tokens=$(echo "$usage_data" | jq -r '.usage.input // 0' 2>/dev/null || echo "0")
    output_tokens=$(echo "$usage_data" | jq -r '.usage.output // 0' 2>/dev/null || echo "0")
    cache_read=$(echo "$usage_data" | jq -r '.usage.cacheRead // 0' 2>/dev/null || echo "0")
    cache_write=$(echo "$usage_data" | jq -r '.usage.cacheWrite // 0' 2>/dev/null || echo "0")
    total_tokens=$(echo "$usage_data" | jq -r '.usage.totalTokens // 0' 2>/dev/null || echo "0")
    
    cost_input=$(echo "$usage_data" | jq -r '.usage.cost.input // 0' 2>/dev/null || echo "0")
    cost_output=$(echo "$usage_data" | jq -r '.usage.cost.output // 0' 2>/dev/null || echo "0")
    cost_cache_read=$(echo "$usage_data" | jq -r '.usage.cost.cacheRead // 0' 2>/dev/null || echo "0")
    cost_cache_write=$(echo "$usage_data" | jq -r '.usage.cost.cacheWrite // 0' 2>/dev/null || echo "0")
    cost_total=$(echo "$usage_data" | jq -r '.usage.cost.total // 0' 2>/dev/null || echo "0")
    
    # Count requests in this batch (assistant messages with usage)
    request_count=$(tail -n +"$((last_line + 1))" "$jsonl_file" | \
        grep -c '"usage":{' 2>/dev/null || echo "0")
    
    # Get previous snapshot for delta calculation
    prev_total=$(curl -s -X GET \
        "${SUPABASE_URL}/rest/v1/token_usage?session_key=eq.${session_key}&order=recorded_at.desc&limit=1" \
        -H "apikey: ${SUPABASE_KEY}" \
        -H "Authorization: Bearer ${SUPABASE_KEY}" | \
        jq -r '.[0].total_tokens // 0' 2>/dev/null || echo "0")
    
    prev_cost=$(curl -s -X GET \
        "${SUPABASE_URL}/rest/v1/token_usage?session_key=eq.${session_key}&order=recorded_at.desc&limit=1" \
        -H "apikey: ${SUPABASE_KEY}" \
        -H "Authorization: Bearer ${SUPABASE_KEY}" | \
        jq -r '.[0].cost_total // 0' 2>/dev/null || echo "0")
    
    # Calculate deltas
    delta_tokens=$((total_tokens - prev_total))
    delta_cost=$(echo "$cost_total - $prev_cost" | bc -l 2>/dev/null || echo "0")
    
    # Handle negative deltas (session was reset/compacted)
    if [ "$delta_tokens" -lt 0 ]; then
        delta_tokens=$total_tokens
        delta_cost=$cost_total
    fi
    
    # Calculate context usage (estimate from total_tokens and model limit)
    context_limit=200000  # Claude opus default
    context_percent=$(echo "scale=2; ($total_tokens * 100) / $context_limit" | bc -l 2>/dev/null || echo "0")
    
    # Build payload
    PAYLOAD=$(cat <<EOF
{
  "recorded_at": "$TIMESTAMP",
  "session_key": "$session_key",
  "session_id": "$session_id",
  "agent_id": "$agent_id",
  "user_id": "$user_id",
  "model": "$model",
  "provider": "$provider",
  "input_tokens": $input_tokens,
  "output_tokens": $output_tokens,
  "cache_read_tokens": $cache_read,
  "cache_write_tokens": $cache_write,
  "total_tokens": $total_tokens,
  "context_used": $total_tokens,
  "context_limit": $context_limit,
  "context_percent": $context_percent,
  "cost_input": $cost_input,
  "cost_output": $cost_output,
  "cost_cache_read": $cost_cache_read,
  "cost_cache_write": $cost_cache_write,
  "cost_total": $cost_total,
  "delta_input_tokens": 0,
  "delta_output_tokens": 0,
  "delta_total_tokens": $delta_tokens,
  "delta_cost": $delta_cost,
  "request_count": $request_count,
  "hostname": "$HOSTNAME"
}
EOF
)

    # Insert into Supabase
    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
        "${SUPABASE_URL}/rest/v1/token_usage" \
        -H "apikey: ${SUPABASE_KEY}" \
        -H "Authorization: Bearer ${SUPABASE_KEY}" \
        -H "Content-Type: application/json" \
        -H "Prefer: return=minimal" \
        -d "$PAYLOAD")
    
    HTTP_CODE=$(echo "$RESPONSE" | tail -1)
    
    if [ "$HTTP_CODE" = "201" ]; then
        ((TOTAL_RECORDS++))
        update_last_line "$session_id" "$total_lines"
    else
        echo "[$TIMESTAMP] Error storing usage for $session_key: HTTP $HTTP_CODE"
        # Still update state to avoid reprocessing
        update_last_line "$session_id" "$total_lines"
    fi
done

echo "[$TIMESTAMP] Token usage collection complete: $TOTAL_SESSIONS sessions, $TOTAL_RECORDS records stored"

# =============================================================================
# AGGREGATE DAILY TOTALS
# =============================================================================

# Run daily aggregation for today
echo "[$TIMESTAMP] Running daily aggregation..."

# Call the aggregation function
curl -s -X POST \
    "${SUPABASE_URL}/rest/v1/rpc/aggregate_daily_token_usage" \
    -H "apikey: ${SUPABASE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_KEY}" \
    -H "Content-Type: application/json" \
    -d '{"target_date": "'$(date -u +%Y-%m-%d)'"}' > /dev/null 2>&1 || true

echo "[$TIMESTAMP] Done"
