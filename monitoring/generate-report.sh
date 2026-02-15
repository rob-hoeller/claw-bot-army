#!/bin/bash
# HBx Platform Monitoring - Report Generator
# Generates daily summary from collected metrics

set -e

METRICS_DIR="/home/ubuntu/.openclaw/workspace/monitoring/logs"
REPORT_DIR="/home/ubuntu/.openclaw/workspace/monitoring/reports"
DATE=${1:-$(date -u +"%Y-%m-%d")}
METRICS_FILE="$METRICS_DIR/metrics-$DATE.jsonl"
REPORT_FILE="$REPORT_DIR/report-$DATE.md"

mkdir -p "$REPORT_DIR"

if [ ! -f "$METRICS_FILE" ]; then
    echo "No metrics file found for $DATE"
    exit 1
fi

# Count samples
SAMPLE_COUNT=$(wc -l < "$METRICS_FILE")

# Calculate averages and peaks using jq
# Note: Metrics use flat keys (cpu_percent, gateway_status, etc.)
STATS=$(cat "$METRICS_FILE" | jq -s '
{
  samples: length,
  cpu: {
    avg: ([.[].cpu_percent] | add / length | . * 10 | round / 10),
    max: ([.[].cpu_percent] | max),
    min: ([.[].cpu_percent] | min)
  },
  mem: {
    avg_percent: ([.[].mem_percent] | add / length | . * 10 | round / 10),
    max_percent: ([.[].mem_percent] | max),
    avg_used_gb: ([.[].mem_used_bytes] | add / length / 1073741824 | . * 10 | round / 10)
  },
  load: {
    avg_1m: ([.[].load_1m] | add / length | . * 100 | round / 100),
    max_1m: ([.[].load_1m] | max),
    cpu_count: (.[0].cpu_count // 2)
  },
  gateway: {
    uptime_percent: (([.[].gateway_status] | map(select(. == "ok")) | length) / length * 100 | round),
    avg_latency_ms: ([.[].gateway_latency_ms] | add / length | round),
    max_sessions: ([.[].session_count] | max),
    avg_sessions: ([.[].session_count] | add / length | . * 10 | round / 10)
  },
  disk: {
    percent: (.[0].disk_percent // 0)
  },
  first_ts: .[0].recorded_at,
  last_ts: .[-1].recorded_at
}
')

# Extract values
CPU_AVG=$(echo "$STATS" | jq -r '.cpu.avg')
CPU_MAX=$(echo "$STATS" | jq -r '.cpu.max')
MEM_AVG=$(echo "$STATS" | jq -r '.mem.avg_percent')
MEM_MAX=$(echo "$STATS" | jq -r '.mem.max_percent')
MEM_USED_GB=$(echo "$STATS" | jq -r '.mem.avg_used_gb')
LOAD_AVG=$(echo "$STATS" | jq -r '.load.avg_1m')
LOAD_MAX=$(echo "$STATS" | jq -r '.load.max_1m')
CPU_COUNT=$(echo "$STATS" | jq -r '.load.cpu_count')
GW_UPTIME=$(echo "$STATS" | jq -r '.gateway.uptime_percent')
GW_LATENCY=$(echo "$STATS" | jq -r '.gateway.avg_latency_ms')
GW_MAX_SESSIONS=$(echo "$STATS" | jq -r '.gateway.max_sessions')
GW_AVG_SESSIONS=$(echo "$STATS" | jq -r '.gateway.avg_sessions')
DISK_PERCENT=$(echo "$STATS" | jq -r '.disk.percent')
FIRST_TS=$(echo "$STATS" | jq -r '.first_ts')
LAST_TS=$(echo "$STATS" | jq -r '.last_ts')

# Calculate load percentage (load / cpu_count * 100)
LOAD_PERCENT=$(awk "BEGIN {printf \"%.0f\", ($LOAD_AVG / $CPU_COUNT) * 100}")
LOAD_MAX_PERCENT=$(awk "BEGIN {printf \"%.0f\", ($LOAD_MAX / $CPU_COUNT) * 100}")

# Determine status indicators
cpu_status() {
    if (( $(echo "$1 > 90" | bc -l) )); then echo "🔴 CRITICAL"
    elif (( $(echo "$1 > 70" | bc -l) )); then echo "🟡 WARNING"
    else echo "🟢 OK"; fi
}

mem_status() {
    if (( $(echo "$1 > 95" | bc -l) )); then echo "🔴 CRITICAL"
    elif (( $(echo "$1 > 80" | bc -l) )); then echo "🟡 WARNING"
    else echo "🟢 OK"; fi
}

load_status() {
    if (( $(echo "$1 > 100" | bc -l) )); then echo "🔴 CRITICAL"
    elif (( $(echo "$1 > 75" | bc -l) )); then echo "🟡 WARNING"
    else echo "🟢 OK"; fi
}

session_status() {
    if (( $1 >= 4 )); then echo "🔴 SATURATED"
    elif (( $1 >= 3 )); then echo "🟡 HIGH"
    else echo "🟢 OK"; fi
}

CPU_STATUS=$(cpu_status "$CPU_MAX")
MEM_STATUS=$(mem_status "$MEM_MAX")
LOAD_STATUS=$(load_status "$LOAD_MAX_PERCENT")
SESSION_STATUS=$(session_status "$GW_MAX_SESSIONS")

# Generate report
cat > "$REPORT_FILE" << EOF
# HBx Platform Report — $DATE

**Period:** $FIRST_TS → $LAST_TS
**Samples:** $SAMPLE_COUNT (every 15 min)

---

## Summary

| Metric | Status | Value |
|--------|--------|-------|
| CPU | $CPU_STATUS | avg $CPU_AVG% / peak $CPU_MAX% |
| Memory | $MEM_STATUS | avg $MEM_AVG% / peak $MEM_MAX% (~${MEM_USED_GB}GB used) |
| Load | $LOAD_STATUS | avg ${LOAD_PERCENT}% / peak ${LOAD_MAX_PERCENT}% of $CPU_COUNT vCPUs |
| Sessions | $SESSION_STATUS | avg $GW_AVG_SESSIONS / peak $GW_MAX_SESSIONS (max 4) |
| Gateway | ${GW_UPTIME}% uptime | ${GW_LATENCY}ms avg latency |
| Disk | $DISK_PERCENT% used | — |

---

## Scaling Recommendation

EOF

# Add recommendations based on metrics
NEEDS_SCALING=false
RECOMMENDATIONS=""

if (( $(echo "$CPU_MAX > 90" | bc -l) )); then
    RECOMMENDATIONS+="- 🔴 **CPU Critical:** Peak $CPU_MAX% — consider upgrading instance size\n"
    NEEDS_SCALING=true
elif (( $(echo "$CPU_AVG > 70" | bc -l) )); then
    RECOMMENDATIONS+="- 🟡 **CPU Elevated:** Sustained ${CPU_AVG}% average — monitor closely\n"
fi

if (( $(echo "$MEM_MAX > 95" | bc -l) )); then
    RECOMMENDATIONS+="- 🔴 **Memory Critical:** Peak $MEM_MAX% — upgrade or optimize\n"
    NEEDS_SCALING=true
elif (( $(echo "$MEM_AVG > 80" | bc -l) )); then
    RECOMMENDATIONS+="- 🟡 **Memory Elevated:** Sustained ${MEM_AVG}% average — monitor closely\n"
fi

if (( $(echo "$LOAD_MAX_PERCENT > 100" | bc -l) )); then
    RECOMMENDATIONS+="- 🔴 **Load Critical:** Peak ${LOAD_MAX_PERCENT}% — CPU bottleneck detected\n"
    NEEDS_SCALING=true
elif (( $(echo "$LOAD_AVG > 75" | bc -l) )); then
    RECOMMENDATIONS+="- 🟡 **Load Elevated:** Sustained ${LOAD_PERCENT}% — monitor closely\n"
fi

if (( GW_MAX_SESSIONS >= 4 )); then
    RECOMMENDATIONS+="- 🔴 **Sessions Saturated:** Hit max concurrent (4) — increase limit or scale out\n"
    NEEDS_SCALING=true
elif (( GW_MAX_SESSIONS >= 3 )); then
    RECOMMENDATIONS+="- 🟡 **Sessions High:** Approaching limit ($GW_MAX_SESSIONS/4)\n"
fi

if [ "$NEEDS_SCALING" = true ]; then
    echo "**⚠️ SCALING RECOMMENDED**" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    echo -e "$RECOMMENDATIONS" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    echo "**Options:**" >> "$REPORT_FILE"
    echo "1. **Scale Up:** Upgrade EC2 instance (t3.large → t3.xlarge)" >> "$REPORT_FILE"
    echo "2. **Scale Out:** Run high-traffic agents on separate instances" >> "$REPORT_FILE"
    echo "3. **Optimize:** Reduce concurrent sessions, add caching" >> "$REPORT_FILE"
else
    echo "✅ **No scaling needed** — all metrics within healthy ranges." >> "$REPORT_FILE"
    if [ -n "$RECOMMENDATIONS" ]; then
        echo "" >> "$REPORT_FILE"
        echo "**Notes:**" >> "$REPORT_FILE"
        echo -e "$RECOMMENDATIONS" >> "$REPORT_FILE"
    fi
fi

cat >> "$REPORT_FILE" << EOF

---

## Instance Info

| Spec | Value |
|------|-------|
| Type | EC2 (Intel Xeon E5-2686 v4) |
| vCPUs | $CPU_COUNT |
| RAM | ~8GB |
| Disk | 48GB |

---

*Generated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")*
EOF

echo "Report generated: $REPORT_FILE"
cat "$REPORT_FILE"
