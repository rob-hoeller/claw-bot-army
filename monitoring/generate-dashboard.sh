#!/bin/bash
# HBx Platform Monitoring - Dashboard Generator
# Creates an HTML dashboard with charts from collected metrics

set -e

METRICS_DIR="/home/ubuntu/.openclaw/workspace/monitoring/logs"
OUTPUT_DIR="/home/ubuntu/.openclaw/workspace/monitoring/dashboard"
OUTPUT_FILE="$OUTPUT_DIR/index.html"

mkdir -p "$OUTPUT_DIR"

# Collect last 7 days of metrics
METRICS_DATA="[]"
for i in {6..0}; do
    DATE=$(date -u -d "$i days ago" +"%Y-%m-%d")
    FILE="$METRICS_DIR/metrics-$DATE.jsonl"
    if [ -f "$FILE" ]; then
        DAY_DATA=$(cat "$FILE" | jq -s '.')
        METRICS_DATA=$(echo "$METRICS_DATA" | jq --argjson new "$DAY_DATA" '. + $new')
    fi
done

# Calculate stats for the page
TOTAL_SAMPLES=$(echo "$METRICS_DATA" | jq 'length')
if [ "$TOTAL_SAMPLES" -eq 0 ]; then
    echo "No metrics data found"
    exit 1
fi

LATEST=$(echo "$METRICS_DATA" | jq '.[-1]')
FIRST_TS=$(echo "$METRICS_DATA" | jq -r '.[0].ts')
LAST_TS=$(echo "$METRICS_DATA" | jq -r '.[-1].ts')

# Generate chart data arrays
CPU_DATA=$(echo "$METRICS_DATA" | jq '[.[] | {x: .ts, y: .system.cpu_percent}]')
MEM_DATA=$(echo "$METRICS_DATA" | jq '[.[] | {x: .ts, y: .system.mem_percent}]')
LOAD_DATA=$(echo "$METRICS_DATA" | jq '[.[] | {x: .ts, y: (.system.load_1m / .system.cpu_count * 100)}]')
SESSIONS_DATA=$(echo "$METRICS_DATA" | jq '[.[] | {x: .ts, y: .gateway.sessions}]')
LATENCY_DATA=$(echo "$METRICS_DATA" | jq '[.[] | {x: .ts, y: .gateway.latency_ms}]')

# Calculate averages and peaks
STATS=$(echo "$METRICS_DATA" | jq '{
  cpu_avg: ([.[].system.cpu_percent] | add / length | . * 10 | round / 10),
  cpu_max: ([.[].system.cpu_percent] | max),
  mem_avg: ([.[].system.mem_percent] | add / length | . * 10 | round / 10),
  mem_max: ([.[].system.mem_percent] | max),
  load_avg: ([.[] | .system.load_1m / .system.cpu_count * 100] | add / length | round),
  load_max: ([.[] | .system.load_1m / .system.cpu_count * 100] | max | round),
  sessions_avg: ([.[].gateway.sessions] | add / length | . * 10 | round / 10),
  sessions_max: ([.[].gateway.sessions] | max),
  latency_avg: ([.[].gateway.latency_ms] | add / length | round),
  uptime_pct: (([.[].gateway.status] | map(select(. == "ok")) | length) / length * 100 | round)
}')

CPU_AVG=$(echo "$STATS" | jq -r '.cpu_avg')
CPU_MAX=$(echo "$STATS" | jq -r '.cpu_max')
MEM_AVG=$(echo "$STATS" | jq -r '.mem_avg')
MEM_MAX=$(echo "$STATS" | jq -r '.mem_max')
LOAD_AVG=$(echo "$STATS" | jq -r '.load_avg')
LOAD_MAX=$(echo "$STATS" | jq -r '.load_max')
SESSIONS_AVG=$(echo "$STATS" | jq -r '.sessions_avg')
SESSIONS_MAX=$(echo "$STATS" | jq -r '.sessions_max')
LATENCY_AVG=$(echo "$STATS" | jq -r '.latency_avg')
UPTIME_PCT=$(echo "$STATS" | jq -r '.uptime_pct')

# Current values
CURRENT_CPU=$(echo "$LATEST" | jq -r '.system.cpu_percent')
CURRENT_MEM=$(echo "$LATEST" | jq -r '.system.mem_percent')
CURRENT_LOAD=$(echo "$LATEST" | jq -r '(.system.load_1m / .system.cpu_count * 100) | round')
CURRENT_SESSIONS=$(echo "$LATEST" | jq -r '.gateway.sessions')

# Generate HTML
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

echo "Dashboard generated: $OUTPUT_FILE"
echo "View at: file://$OUTPUT_FILE"
echo "Or serve with: python3 -m http.server 8080 -d $OUTPUT_DIR"
