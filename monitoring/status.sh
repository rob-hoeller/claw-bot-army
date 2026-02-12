#!/bin/bash
# HBx Platform Monitoring - Quick Status Check
# Shows current system state and recent trends

set -e

echo "═══════════════════════════════════════════════════════════════"
echo "  HBx Platform Status — $(date -u +"%Y-%m-%d %H:%M:%S UTC")"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Current metrics
echo "┌─ SYSTEM ─────────────────────────────────────────────────────┐"
printf "│ %-20s %s\n" "CPU:" "$(top -bn1 | grep "Cpu(s)" | awk '{printf "%.1f%% used", $2}')│"
printf "│ %-20s %s\n" "Memory:" "$(free -h | awk '/Mem:/ {printf "%s / %s (%.1f%%)", $3, $2, $3/$2*100}')│"
printf "│ %-20s %s\n" "Load:" "$(cat /proc/loadavg | awk '{printf "%s %s %s (1/5/15 min)", $1, $2, $3}')│"
printf "│ %-20s %s\n" "Disk:" "$(df -h / | awk 'NR==2 {printf "%s / %s (%s)", $3, $2, $5}')│"
printf "│ %-20s %s\n" "Uptime:" "$(uptime -p | sed 's/up //')│"
echo "└──────────────────────────────────────────────────────────────┘"
echo ""

echo "┌─ GATEWAY ────────────────────────────────────────────────────┐"
# Check gateway
GW_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 "http://127.0.0.1:18789/health" 2>/dev/null || echo "000")
if [ "$GW_STATUS" = "200" ]; then
    printf "│ %-20s %s\n" "Status:" "🟢 Online│"
else
    printf "│ %-20s %s\n" "Status:" "🔴 Down (HTTP $GW_STATUS)│"
fi

# Session count
SESSION_INFO=$(openclaw status 2>/dev/null | grep -E "Sessions.*active" | head -1 || echo "Unknown")
printf "│ %-20s %s\n" "Sessions:" "$SESSION_INFO│"

# Process info
NODE_PID=$(pgrep -f "node.*openclaw" | head -1 || echo "")
if [ -n "$NODE_PID" ]; then
    PROC_INFO=$(ps -p "$NODE_PID" -o %cpu,%mem,rss --no-headers 2>/dev/null || echo "- - -")
    CPU=$(echo "$PROC_INFO" | awk '{print $1}')
    MEM=$(echo "$PROC_INFO" | awk '{print $2}')
    RSS=$(echo "$PROC_INFO" | awk '{printf "%.0fMB", $3/1024}')
    printf "│ %-20s %s\n" "Process:" "CPU: ${CPU}% | Mem: ${MEM}% | RSS: ${RSS}│"
fi
echo "└──────────────────────────────────────────────────────────────┘"
echo ""

# Recent metrics trend (last 4 samples = 1 hour)
METRICS_FILE="/home/ubuntu/.openclaw/workspace/monitoring/logs/metrics-$(date -u +"%Y-%m-%d").jsonl"
if [ -f "$METRICS_FILE" ] && [ $(wc -l < "$METRICS_FILE") -ge 2 ]; then
    echo "┌─ TREND (last hour) ─────────────────────────────────────────┐"
    TREND=$(tail -4 "$METRICS_FILE" | jq -s '
        {
            cpu_trend: ([.[].system.cpu_percent] | "min " + (min|tostring) + "% → max " + (max|tostring) + "%"),
            mem_trend: ([.[].system.mem_percent] | "min " + (min|tostring) + "% → max " + (max|tostring) + "%"),
            load_trend: ([.[].system.load_1m] | "min " + (min|tostring) + " → max " + (max|tostring)),
            samples: length
        }
    ')
    printf "│ %-20s %s\n" "CPU Trend:" "$(echo "$TREND" | jq -r '.cpu_trend')│"
    printf "│ %-20s %s\n" "Memory Trend:" "$(echo "$TREND" | jq -r '.mem_trend')│"
    printf "│ %-20s %s\n" "Load Trend:" "$(echo "$TREND" | jq -r '.load_trend')│"
    printf "│ %-20s %s\n" "Samples:" "$(echo "$TREND" | jq -r '.samples') data points│"
    echo "└──────────────────────────────────────────────────────────────┘"
else
    echo "┌─ TREND ────────────────────────────────────────────────────┐"
    echo "│ Collecting data... check back in ~30 minutes              │"
    echo "└──────────────────────────────────────────────────────────────┘"
fi
echo ""

# Alerts
echo "┌─ ALERTS ───────────────────────────────────────────────────────┐"
ALERTS=0

CPU_NOW=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}')
if (( $(echo "$CPU_NOW > 90" | bc -l) )); then
    echo "│ 🔴 CRITICAL: CPU at ${CPU_NOW}%                              │"
    ALERTS=$((ALERTS+1))
elif (( $(echo "$CPU_NOW > 70" | bc -l) )); then
    echo "│ 🟡 WARNING: CPU at ${CPU_NOW}%                               │"
    ALERTS=$((ALERTS+1))
fi

MEM_NOW=$(free | awk '/Mem:/ {printf "%.1f", $3/$2*100}')
if (( $(echo "$MEM_NOW > 95" | bc -l) )); then
    echo "│ 🔴 CRITICAL: Memory at ${MEM_NOW}%                           │"
    ALERTS=$((ALERTS+1))
elif (( $(echo "$MEM_NOW > 80" | bc -l) )); then
    echo "│ 🟡 WARNING: Memory at ${MEM_NOW}%                            │"
    ALERTS=$((ALERTS+1))
fi

LOAD_NOW=$(cat /proc/loadavg | awk '{print $1}')
CPU_COUNT=$(nproc)
LOAD_PCT=$(awk "BEGIN {printf \"%.0f\", ($LOAD_NOW / $CPU_COUNT) * 100}")
if (( LOAD_PCT > 100 )); then
    echo "│ 🔴 CRITICAL: Load at ${LOAD_PCT}% of capacity                │"
    ALERTS=$((ALERTS+1))
elif (( LOAD_PCT > 75 )); then
    echo "│ 🟡 WARNING: Load at ${LOAD_PCT}% of capacity                 │"
    ALERTS=$((ALERTS+1))
fi

if [ $ALERTS -eq 0 ]; then
    echo "│ ✅ All systems nominal                                       │"
fi
echo "└──────────────────────────────────────────────────────────────┘"
