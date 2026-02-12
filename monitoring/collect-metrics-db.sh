#!/bin/bash
# HBx Platform Monitoring - Metrics Collector (Database Version)
# Runs every 15 minutes via cron
# Stores metrics in Supabase for dashboard integration

set -e

# Load environment
source /home/ubuntu/.openclaw/workspace/dashboard/.env.local 2>/dev/null || true

SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL}"
SUPABASE_KEY="${SUPABASE_SERVICE_ROLE_KEY}"

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_KEY" ]; then
    echo "Error: Supabase credentials not found"
    exit 1
fi

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
HOSTNAME=$(hostname)

# =============================================================================
# SYSTEM METRICS
# =============================================================================

# CPU usage (1 second sample)
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)

# Memory
MEM_TOTAL=$(free -b | awk '/Mem:/ {print $2}')
MEM_USED=$(free -b | awk '/Mem:/ {print $3}')
MEM_PERCENT=$(awk "BEGIN {printf \"%.2f\", ($MEM_USED/$MEM_TOTAL)*100}")

# Disk
DISK_TOTAL=$(df -B1 / | awk 'NR==2 {print $2}')
DISK_USED=$(df -B1 / | awk 'NR==2 {print $3}')
DISK_PERCENT=$(df / | awk 'NR==2 {print $5}' | tr -d '%')

# Load average
LOAD_1=$(cat /proc/loadavg | awk '{print $1}')
LOAD_5=$(cat /proc/loadavg | awk '{print $2}')
LOAD_15=$(cat /proc/loadavg | awk '{print $3}')

# CPU count
CPU_COUNT=$(nproc)

# Uptime in seconds
UPTIME_SEC=$(cat /proc/uptime | awk '{print $1}')

# =============================================================================
# OPENCLAW METRICS
# =============================================================================

GATEWAY_URL="http://127.0.0.1:18789"

# Check if gateway is responding
GATEWAY_STATUS="down"
GATEWAY_LATENCY=0

START_TIME=$(date +%s%N)
if curl -s -o /dev/null -w "" --connect-timeout 5 "$GATEWAY_URL/health" 2>/dev/null; then
    GATEWAY_STATUS="ok"
    END_TIME=$(date +%s%N)
    GATEWAY_LATENCY=$(( (END_TIME - START_TIME) / 1000000 ))
fi

# Get session count
SESSION_COUNT=0
if command -v openclaw &> /dev/null; then
    STATUS_OUTPUT=$(openclaw status 2>/dev/null || echo "")
    SESSION_COUNT=$(echo "$STATUS_OUTPUT" | grep -oP 'sessions \K\d+' | head -1 || echo "0")
    if [ -z "$SESSION_COUNT" ]; then
        SESSION_COUNT=0
    fi
fi

# Process stats
PROCESS_CPU=0
PROCESS_MEM=0
NODE_RSS=0
NODE_PID=$(pgrep -f "node.*openclaw" | head -1 || echo "")
if [ -n "$NODE_PID" ]; then
    PROC_STATS=$(ps -p "$NODE_PID" -o %cpu,%mem --no-headers 2>/dev/null || echo "0 0")
    PROCESS_CPU=$(echo "$PROC_STATS" | awk '{print $1}')
    PROCESS_MEM=$(echo "$PROC_STATS" | awk '{print $2}')
    NODE_RSS=$(ps -p "$NODE_PID" -o rss --no-headers 2>/dev/null | tr -d ' ' || echo "0")
    NODE_RSS=$((NODE_RSS * 1024))
fi

# =============================================================================
# INSERT INTO SUPABASE
# =============================================================================

PAYLOAD=$(cat <<EOF
{
  "recorded_at": "$TIMESTAMP",
  "cpu_percent": $CPU_USAGE,
  "mem_total_bytes": $MEM_TOTAL,
  "mem_used_bytes": $MEM_USED,
  "mem_percent": $MEM_PERCENT,
  "disk_total_bytes": $DISK_TOTAL,
  "disk_used_bytes": $DISK_USED,
  "disk_percent": $DISK_PERCENT,
  "load_1m": $LOAD_1,
  "load_5m": $LOAD_5,
  "load_15m": $LOAD_15,
  "cpu_count": $CPU_COUNT,
  "uptime_seconds": $UPTIME_SEC,
  "gateway_status": "$GATEWAY_STATUS",
  "gateway_latency_ms": $GATEWAY_LATENCY,
  "session_count": $SESSION_COUNT,
  "process_cpu_percent": $PROCESS_CPU,
  "process_mem_percent": $PROCESS_MEM,
  "node_rss_bytes": $NODE_RSS,
  "hostname": "$HOSTNAME"
}
EOF
)

# Insert into Supabase
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  "${SUPABASE_URL}/rest/v1/platform_metrics" \
  -H "apikey: ${SUPABASE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=minimal" \
  -d "$PAYLOAD")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$HTTP_CODE" = "201" ]; then
    echo "[$TIMESTAMP] Metrics stored in database"
else
    echo "[$TIMESTAMP] Error storing metrics: HTTP $HTTP_CODE - $BODY"
    # Fallback: also write to local file
    METRICS_DIR="/home/ubuntu/.openclaw/workspace/monitoring/logs"
    mkdir -p "$METRICS_DIR"
    echo "$PAYLOAD" | jq -c '.' >> "$METRICS_DIR/metrics-$(date -u +%Y-%m-%d).jsonl"
    echo "[$TIMESTAMP] Fallback: written to local file"
fi
