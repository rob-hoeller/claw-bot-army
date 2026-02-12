#!/bin/bash
# HBx Platform Monitoring - Metrics Collector
# Runs every 15 minutes via cron

set -e

METRICS_DIR="/home/ubuntu/.openclaw/workspace/monitoring/logs"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
DATE=$(date -u +"%Y-%m-%d")
METRICS_FILE="$METRICS_DIR/metrics-$DATE.jsonl"

# Ensure directory exists
mkdir -p "$METRICS_DIR"

# =============================================================================
# SYSTEM METRICS
# =============================================================================

# CPU usage (1 second sample)
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)

# Memory
MEM_TOTAL=$(free -b | awk '/Mem:/ {print $2}')
MEM_USED=$(free -b | awk '/Mem:/ {print $3}')
MEM_AVAILABLE=$(free -b | awk '/Mem:/ {print $7}')
MEM_PERCENT=$(awk "BEGIN {printf \"%.1f\", ($MEM_USED/$MEM_TOTAL)*100}")

# Disk
DISK_TOTAL=$(df -B1 / | awk 'NR==2 {print $2}')
DISK_USED=$(df -B1 / | awk 'NR==2 {print $3}')
DISK_PERCENT=$(df / | awk 'NR==2 {print $5}' | tr -d '%')

# Load average
LOAD_1=$(cat /proc/loadavg | awk '{print $1}')
LOAD_5=$(cat /proc/loadavg | awk '{print $2}')
LOAD_15=$(cat /proc/loadavg | awk '{print $3}')

# CPU count for load interpretation
CPU_COUNT=$(nproc)

# Uptime in seconds
UPTIME_SEC=$(cat /proc/uptime | awk '{print $1}')

# =============================================================================
# OPENCLAW METRICS
# =============================================================================

GATEWAY_URL="http://127.0.0.1:18789"
GATEWAY_TOKEN="${OPENCLAW_GATEWAY_TOKEN:-}"

# Check if gateway is responding
GATEWAY_STATUS="unknown"
GATEWAY_LATENCY=0

START_TIME=$(date +%s%N)
if curl -s -o /dev/null -w "" --connect-timeout 5 "$GATEWAY_URL/health" 2>/dev/null; then
    GATEWAY_STATUS="ok"
    END_TIME=$(date +%s%N)
    GATEWAY_LATENCY=$(( (END_TIME - START_TIME) / 1000000 ))
else
    GATEWAY_STATUS="down"
fi

# Get session count from openclaw status (parse output)
SESSION_COUNT=0
ACTIVE_SESSIONS=""
if command -v openclaw &> /dev/null; then
    STATUS_OUTPUT=$(openclaw status 2>/dev/null || echo "")
    SESSION_COUNT=$(echo "$STATUS_OUTPUT" | grep -oP 'sessions \K\d+' | head -1 || echo "0")
    if [ -z "$SESSION_COUNT" ]; then
        SESSION_COUNT=0
    fi
fi

# Get OpenClaw process info
OPENCLAW_PID=$(pgrep -f "openclaw" | head -1 || echo "")
OPENCLAW_MEM=0
OPENCLAW_CPU=0
if [ -n "$OPENCLAW_PID" ]; then
    PROC_STATS=$(ps -p "$OPENCLAW_PID" -o %cpu,%mem --no-headers 2>/dev/null || echo "0 0")
    OPENCLAW_CPU=$(echo "$PROC_STATS" | awk '{print $1}')
    OPENCLAW_MEM=$(echo "$PROC_STATS" | awk '{print $2}')
fi

# Node.js process memory (more accurate)
NODE_PID=$(pgrep -f "node.*openclaw" | head -1 || echo "")
NODE_RSS=0
if [ -n "$NODE_PID" ]; then
    NODE_RSS=$(ps -p "$NODE_PID" -o rss --no-headers 2>/dev/null | tr -d ' ' || echo "0")
    NODE_RSS=$((NODE_RSS * 1024))  # Convert KB to bytes
fi

# =============================================================================
# BUILD JSON OUTPUT
# =============================================================================

cat >> "$METRICS_FILE" << EOF
{"ts":"$TIMESTAMP","system":{"cpu_percent":$CPU_USAGE,"mem_total":$MEM_TOTAL,"mem_used":$MEM_USED,"mem_available":$MEM_AVAILABLE,"mem_percent":$MEM_PERCENT,"disk_total":$DISK_TOTAL,"disk_used":$DISK_USED,"disk_percent":$DISK_PERCENT,"load_1m":$LOAD_1,"load_5m":$LOAD_5,"load_15m":$LOAD_15,"cpu_count":$CPU_COUNT,"uptime_sec":$UPTIME_SEC},"gateway":{"status":"$GATEWAY_STATUS","latency_ms":$GATEWAY_LATENCY,"sessions":$SESSION_COUNT,"process_cpu":$OPENCLAW_CPU,"process_mem_percent":$OPENCLAW_MEM,"node_rss_bytes":$NODE_RSS}}
EOF

echo "Metrics collected at $TIMESTAMP"
