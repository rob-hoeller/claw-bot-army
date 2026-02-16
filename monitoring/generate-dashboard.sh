#!/bin/bash
# HBx Platform Monitoring - Dashboard Generator (Optimized)
# Creates an HTML dashboard with charts from collected metrics
# Optimized: Single jq pass, skip if no new data

set -e

METRICS_DIR="/home/ubuntu/.openclaw/workspace/monitoring/logs"
OUTPUT_DIR="/home/ubuntu/.openclaw/workspace/monitoring/dashboard"
OUTPUT_FILE="$OUTPUT_DIR/index.html"
LAST_RUN_FILE="$OUTPUT_DIR/.last_run"

mkdir -p "$OUTPUT_DIR"

# =============================================================================
# SKIP CHECK: Only regenerate if metrics files have changed
# =============================================================================
NEWEST_METRIC=$(find "$METRICS_DIR" -name "metrics-*.jsonl" -type f -printf '%T@\n' 2>/dev/null | sort -n | tail -1)
if [ -f "$LAST_RUN_FILE" ] && [ -f "$OUTPUT_FILE" ]; then
    LAST_RUN=$(cat "$LAST_RUN_FILE")
    if [ "$NEWEST_METRIC" = "$LAST_RUN" ]; then
        echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] No new metrics data, skipping dashboard generation"
        exit 0
    fi
fi

# =============================================================================
# COLLECT DATA: Stream all metrics files directly to jq
# =============================================================================
METRICS_FILES=""
for i in {6..0}; do
    DATE=$(date -u -d "$i days ago" +"%Y-%m-%d")
    FILE="$METRICS_DIR/metrics-$DATE.jsonl"
    [ -f "$FILE" ] && METRICS_FILES="$METRICS_FILES $FILE"
done

if [ -z "$METRICS_FILES" ]; then
    echo "No metrics data found"
    exit 1
fi

# =============================================================================
# SINGLE JQ PASS: Process all data at once
# =============================================================================
PROCESSED=$(cat $METRICS_FILES | jq -s '
  # Input is array of all metrics
  . as $data |
  
  # Calculate stats
  ($data | length) as $total |
  ($data | first) as $first |
  ($data | last) as $latest |
  
  # CPU stats
  ([$data[].cpu_percent // 0] | add / length | . * 10 | round / 10) as $cpu_avg |
  ([$data[].cpu_percent // 0] | max) as $cpu_max |
  
  # Memory stats
  ([$data[].mem_percent // 0] | add / length | . * 10 | round / 10) as $mem_avg |
  ([$data[].mem_percent // 0] | max) as $mem_max |
  
  # Load stats (normalized to CPU count)
  ([$data[] | (.load_1m // 0) / ((.cpu_count // 1) | if . == 0 then 1 else . end) * 100] | add / length | round) as $load_avg |
  ([$data[] | (.load_1m // 0) / ((.cpu_count // 1) | if . == 0 then 1 else . end) * 100] | max | round) as $load_max |
  
  # Session stats
  ([$data[].session_count // 0] | add / length | . * 10 | round / 10) as $sessions_avg |
  ([$data[].session_count // 0] | max) as $sessions_max |
  
  # Latency and uptime
  ([$data[].gateway_latency_ms // 0] | add / length | round) as $latency_avg |
  (([$data[].gateway_status] | map(select(. == "ok")) | length) / $total * 100 | round) as $uptime_pct |
  
  # Current values from latest
  ($latest.cpu_percent // 0) as $current_cpu |
  ($latest.mem_percent // 0) as $current_mem |
  (($latest.load_1m // 0) / (($latest.cpu_count // 1) | if . == 0 then 1 else . end) * 100 | round) as $current_load |
  ($latest.session_count // 0) as $current_sessions |
  
  # Chart data arrays
  [$data[] | {x: .recorded_at, y: (.cpu_percent // 0)}] as $cpu_data |
  [$data[] | {x: .recorded_at, y: (.mem_percent // 0)}] as $mem_data |
  [$data[] | {x: .recorded_at, y: ((.load_1m // 0) / ((.cpu_count // 1) | if . == 0 then 1 else . end) * 100)}] as $load_data |
  [$data[] | {x: .recorded_at, y: (.session_count // 0)}] as $sessions_data |
  
  # Output everything in one object
  {
    total: $total,
    first_ts: $first.recorded_at,
    last_ts: $latest.recorded_at,
    
    cpu_avg: $cpu_avg,
    cpu_max: $cpu_max,
    mem_avg: $mem_avg,
    mem_max: $mem_max,
    load_avg: $load_avg,
    load_max: $load_max,
    sessions_avg: $sessions_avg,
    sessions_max: $sessions_max,
    latency_avg: $latency_avg,
    uptime_pct: $uptime_pct,
    
    current_cpu: $current_cpu,
    current_mem: $current_mem,
    current_load: $current_load,
    current_sessions: $current_sessions,
    
    cpu_data: $cpu_data,
    mem_data: $mem_data,
    load_data: $load_data,
    sessions_data: $sessions_data
  }
')

# =============================================================================
# EXTRACT VALUES (fast - just reading from already-processed JSON)
# =============================================================================
TOTAL_SAMPLES=$(echo "$PROCESSED" | jq -r '.total')
FIRST_TS=$(echo "$PROCESSED" | jq -r '.first_ts')
LAST_TS=$(echo "$PROCESSED" | jq -r '.last_ts')

CPU_AVG=$(echo "$PROCESSED" | jq -r '.cpu_avg')
CPU_MAX=$(echo "$PROCESSED" | jq -r '.cpu_max')
MEM_AVG=$(echo "$PROCESSED" | jq -r '.mem_avg')
MEM_MAX=$(echo "$PROCESSED" | jq -r '.mem_max')
LOAD_AVG=$(echo "$PROCESSED" | jq -r '.load_avg')
LOAD_MAX=$(echo "$PROCESSED" | jq -r '.load_max')
SESSIONS_AVG=$(echo "$PROCESSED" | jq -r '.sessions_avg')
SESSIONS_MAX=$(echo "$PROCESSED" | jq -r '.sessions_max')
LATENCY_AVG=$(echo "$PROCESSED" | jq -r '.latency_avg')
UPTIME_PCT=$(echo "$PROCESSED" | jq -r '.uptime_pct')

CURRENT_CPU=$(echo "$PROCESSED" | jq -r '.current_cpu')
CURRENT_MEM=$(echo "$PROCESSED" | jq -r '.current_mem')
CURRENT_LOAD=$(echo "$PROCESSED" | jq -r '.current_load')
CURRENT_SESSIONS=$(echo "$PROCESSED" | jq -r '.current_sessions')

CPU_DATA=$(echo "$PROCESSED" | jq -c '.cpu_data')
MEM_DATA=$(echo "$PROCESSED" | jq -c '.mem_data')
LOAD_DATA=$(echo "$PROCESSED" | jq -c '.load_data')
SESSIONS_DATA=$(echo "$PROCESSED" | jq -c '.sessions_data')

# =============================================================================
# GENERATE HTML
# =============================================================================
cat > "$OUTPUT_FILE" << 'HTMLHEAD'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="refresh" content="300">
    <title>HBx Platform Monitoring</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chartjs-adapter-date-fns"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 100%);
            color: #fff;
            min-height: 100vh;
            padding: 20px;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .header h1 {
            font-size: 2rem;
            background: linear-gradient(90deg, #a855f7, #3b82f6);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 5px;
        }
        .header .subtitle {
            color: #888;
            font-size: 0.9rem;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-bottom: 30px;
        }
        .stat-card {
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 12px;
            padding: 20px;
            text-align: center;
        }
        .stat-card .label {
            color: #888;
            font-size: 0.8rem;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 8px;
        }
        .stat-card .value {
            font-size: 2rem;
            font-weight: 700;
        }
        .stat-card .meta {
            color: #666;
            font-size: 0.75rem;
            margin-top: 5px;
        }
        .stat-card.ok .value { color: #22c55e; }
        .stat-card.warning .value { color: #eab308; }
        .stat-card.critical .value { color: #ef4444; }
        .charts-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
            gap: 20px;
        }
        .chart-card {
            background: rgba(255,255,255,0.03);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 12px;
            padding: 20px;
        }
        .chart-card h3 {
            color: #aaa;
            font-size: 0.9rem;
            margin-bottom: 15px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .chart-container {
            position: relative;
            height: 250px;
        }
        .footer {
            text-align: center;
            color: #555;
            font-size: 0.8rem;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid rgba(255,255,255,0.1);
        }
        @media (max-width: 600px) {
            .charts-grid { grid-template-columns: 1fr; }
            .stat-card .value { font-size: 1.5rem; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🧠 HBx Platform Monitoring</h1>
        <div class="subtitle">Auto-refreshes every 5 minutes</div>
    </div>
    
    <div class="stats-grid">
HTMLHEAD

# Add stat cards with conditional styling
cpu_class="ok"
[ $(echo "$CURRENT_CPU > 70" | bc -l) -eq 1 ] && cpu_class="warning"
[ $(echo "$CURRENT_CPU > 90" | bc -l) -eq 1 ] && cpu_class="critical"

mem_class="ok"
[ $(echo "$CURRENT_MEM > 80" | bc -l) -eq 1 ] && mem_class="warning"
[ $(echo "$CURRENT_MEM > 95" | bc -l) -eq 1 ] && mem_class="critical"

load_class="ok"
[ "$CURRENT_LOAD" -gt 75 ] && load_class="warning"
[ "$CURRENT_LOAD" -gt 100 ] && load_class="critical"

cat >> "$OUTPUT_FILE" << EOF
        <div class="stat-card $cpu_class">
            <div class="label">CPU Usage</div>
            <div class="value">${CURRENT_CPU}%</div>
            <div class="meta">avg ${CPU_AVG}% · peak ${CPU_MAX}%</div>
        </div>
        <div class="stat-card $mem_class">
            <div class="label">Memory</div>
            <div class="value">${CURRENT_MEM}%</div>
            <div class="meta">avg ${MEM_AVG}% · peak ${MEM_MAX}%</div>
        </div>
        <div class="stat-card $load_class">
            <div class="label">CPU Load</div>
            <div class="value">${CURRENT_LOAD}%</div>
            <div class="meta">avg ${LOAD_AVG}% · peak ${LOAD_MAX}%</div>
        </div>
        <div class="stat-card ok">
            <div class="label">Sessions</div>
            <div class="value">${CURRENT_SESSIONS}</div>
            <div class="meta">avg ${SESSIONS_AVG} · peak ${SESSIONS_MAX}</div>
        </div>
        <div class="stat-card ok">
            <div class="label">Gateway Latency</div>
            <div class="value">${LATENCY_AVG}ms</div>
            <div class="meta">${UPTIME_PCT}% uptime</div>
        </div>
        <div class="stat-card ok">
            <div class="label">Data Points</div>
            <div class="value">${TOTAL_SAMPLES}</div>
            <div class="meta">since ${FIRST_TS:0:10}</div>
        </div>
    </div>
    
    <div class="charts-grid">
        <div class="chart-card">
            <h3>📊 CPU Usage Over Time</h3>
            <div class="chart-container">
                <canvas id="cpuChart"></canvas>
            </div>
        </div>
        <div class="chart-card">
            <h3>💾 Memory Usage Over Time</h3>
            <div class="chart-container">
                <canvas id="memChart"></canvas>
            </div>
        </div>
        <div class="chart-card">
            <h3>⚡ CPU Load (% of capacity)</h3>
            <div class="chart-container">
                <canvas id="loadChart"></canvas>
            </div>
        </div>
        <div class="chart-card">
            <h3>🔌 Active Sessions</h3>
            <div class="chart-container">
                <canvas id="sessionsChart"></canvas>
            </div>
        </div>
    </div>
    
    <div class="footer">
        Last updated: $(date -u +"%Y-%m-%d %H:%M:%S UTC") · Data from $FIRST_TS to $LAST_TS
    </div>

    <script>
        const chartConfig = {
            type: 'line',
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { intersect: false, mode: 'index' },
                plugins: { legend: { display: false } },
                scales: {
                    x: {
                        type: 'time',
                        time: { unit: 'hour', displayFormats: { hour: 'MMM d, HH:mm' } },
                        grid: { color: 'rgba(255,255,255,0.05)' },
                        ticks: { color: '#666', maxTicksLimit: 8 }
                    },
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(255,255,255,0.05)' },
                        ticks: { color: '#666' }
                    }
                }
            }
        };

        // CPU Chart
        new Chart(document.getElementById('cpuChart'), {
            ...chartConfig,
            data: {
                datasets: [{
                    data: $CPU_DATA,
                    borderColor: '#a855f7',
                    backgroundColor: 'rgba(168, 85, 247, 0.1)',
                    fill: true,
                    tension: 0.3,
                    pointRadius: 0
                }]
            },
            options: { ...chartConfig.options, scales: { ...chartConfig.options.scales, y: { ...chartConfig.options.scales.y, max: 100 } } }
        });

        // Memory Chart
        new Chart(document.getElementById('memChart'), {
            ...chartConfig,
            data: {
                datasets: [{
                    data: $MEM_DATA,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    fill: true,
                    tension: 0.3,
                    pointRadius: 0
                }]
            },
            options: { ...chartConfig.options, scales: { ...chartConfig.options.scales, y: { ...chartConfig.options.scales.y, max: 100 } } }
        });

        // Load Chart
        new Chart(document.getElementById('loadChart'), {
            ...chartConfig,
            data: {
                datasets: [{
                    data: $LOAD_DATA,
                    borderColor: '#22c55e',
                    backgroundColor: 'rgba(34, 197, 94, 0.1)',
                    fill: true,
                    tension: 0.3,
                    pointRadius: 0
                }]
            },
            options: {
                ...chartConfig.options,
                plugins: {
                    ...chartConfig.options.plugins,
                    annotation: {
                        annotations: {
                            line1: { type: 'line', yMin: 100, yMax: 100, borderColor: '#ef4444', borderWidth: 2, borderDash: [5, 5] }
                        }
                    }
                }
            }
        });

        // Sessions Chart
        new Chart(document.getElementById('sessionsChart'), {
            ...chartConfig,
            data: {
                datasets: [{
                    data: $SESSIONS_DATA,
                    borderColor: '#eab308',
                    backgroundColor: 'rgba(234, 179, 8, 0.1)',
                    fill: true,
                    tension: 0.3,
                    pointRadius: 0
                }]
            }
        });
    </script>
</body>
</html>
EOF

# Save last run timestamp for skip check
echo "$NEWEST_METRIC" > "$LAST_RUN_FILE"

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Dashboard generated: $OUTPUT_FILE ($TOTAL_SAMPLES samples)"
