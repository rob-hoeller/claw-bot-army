"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import {
  Activity,
  Cpu,
  HardDrive,
  MemoryStick,
  Gauge,
  Users,
  Wifi,
  WifiOff,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Clock,
  AlertTriangle,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface MetricData {
  recorded_at: string
  cpu_percent: number
  mem_percent: number
  load_percent: number
  session_count: number
  gateway_status: string
  gateway_latency_ms: number
}

interface Stats {
  cpu: { current: number; avg: number; max: number }
  memory: { current: number; avg: number; max: number }
  load: { current: number; avg: number; max: number }
  sessions: { current: number; avg: number; max: number }
  gateway: { status: string; latency: number; uptime: number }
  samples: number
  period: { from: string; to: string }
}

interface MetricsResponse {
  data: MetricData[]
  stats: Stats | null
  type: string
  hours: number
}

// Stat Card Component
function StatCard({
  label,
  value,
  unit,
  avg,
  max,
  icon: Icon,
  status,
  trend,
}: {
  label: string
  value: number | string
  unit?: string
  avg?: number
  max?: number
  icon: React.ElementType
  status: "ok" | "warning" | "critical"
  trend?: "up" | "down" | "stable"
}) {
  const statusColors = {
    ok: "text-green-400 border-green-500/30 bg-green-500/10",
    warning: "text-yellow-400 border-yellow-500/30 bg-yellow-500/10",
    critical: "text-red-400 border-red-500/30 bg-red-500/10",
  }

  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-xl border p-4 transition-all",
        statusColors[status]
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-white/50 uppercase tracking-wider">{label}</span>
        <Icon className="h-4 w-4 text-white/30" />
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-3xl font-bold">{value}</span>
        {unit && <span className="text-lg text-white/50">{unit}</span>}
        {trend && (
          <TrendIcon className={cn(
            "h-4 w-4 ml-2",
            trend === "up" ? "text-red-400" : trend === "down" ? "text-green-400" : "text-white/30"
          )} />
        )}
      </div>
      {(avg !== undefined || max !== undefined) && (
        <div className="mt-2 flex gap-3 text-xs text-white/40">
          {avg !== undefined && <span>avg {avg}{unit}</span>}
          {max !== undefined && <span>peak {max}{unit}</span>}
        </div>
      )}
    </motion.div>
  )
}

// Mini Chart Component (sparkline-style)
function MiniChart({ data, color, height = 60 }: { data: number[]; color: string; height?: number }) {
  if (!data || data.length === 0) return null
  
  const max = Math.max(...data, 1)
  const min = Math.min(...data, 0)
  const range = max - min || 1
  
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * 100
    const y = height - ((v - min) / range) * height
    return `${x},${y}`
  }).join(' ')

  return (
    <svg width="100%" height={height} className="overflow-visible">
      <defs>
        <linearGradient id={`gradient-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        points={points}
      />
      <polygon
        fill={`url(#gradient-${color})`}
        points={`0,${height} ${points} 100,${height}`}
      />
    </svg>
  )
}

// Chart Card Component
function ChartCard({
  title,
  data,
  color,
  unit,
  threshold,
}: {
  title: string
  data: MetricData[]
  color: string
  unit: string
  threshold?: number
}) {
  const values = data.map(d => {
    switch (title.toLowerCase()) {
      case "cpu usage": return d.cpu_percent
      case "memory usage": return d.mem_percent
      case "cpu load": return d.load_percent
      case "sessions": return d.session_count
      default: return 0
    }
  })

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <h3 className="text-sm text-white/50 mb-4">{title}</h3>
      <div className="h-16">
        <MiniChart data={values} color={color} />
      </div>
      {threshold && (
        <div className="mt-2 text-xs text-white/30">
          Threshold: {threshold}{unit}
        </div>
      )}
    </div>
  )
}

export function MonitoringPage() {
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState(24) // hours
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const fetchMetrics = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/metrics?hours=${timeRange}`)
      if (!res.ok) throw new Error('Failed to fetch metrics')
      const data = await res.json()
      setMetrics(data)
      setLastUpdate(new Date())
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMetrics()
    // Refresh every 5 minutes
    const interval = setInterval(fetchMetrics, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [timeRange])

  const getStatus = (value: number, warn: number, crit: number): "ok" | "warning" | "critical" => {
    if (value >= crit) return "critical"
    if (value >= warn) return "warning"
    return "ok"
  }

  const getTrend = (current: number, avg: number): "up" | "down" | "stable" => {
    const diff = current - avg
    if (Math.abs(diff) < avg * 0.1) return "stable"
    return diff > 0 ? "up" : "down"
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Unable to load metrics</h2>
          <p className="text-white/50 mb-4">{error}</p>
          <button
            onClick={fetchMetrics}
            className="px-4 py-2 bg-purple-500/20 text-purple-300 rounded-lg hover:bg-purple-500/30 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  const stats = metrics?.stats
  const data = metrics?.data || []

  return (
    <div className="flex-1 overflow-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Activity className="h-7 w-7 text-purple-400" />
            Platform Monitoring
          </h1>
          <p className="text-white/50 text-sm mt-1">
            Infrastructure health and performance metrics
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* Time Range Selector */}
          <div className="flex items-center gap-2 bg-white/5 rounded-lg p-1">
            {[6, 24, 48, 168].map((hours) => (
              <button
                key={hours}
                onClick={() => setTimeRange(hours)}
                className={cn(
                  "px-3 py-1 text-sm rounded-md transition-colors",
                  timeRange === hours
                    ? "bg-purple-500/30 text-purple-300"
                    : "text-white/50 hover:text-white/70"
                )}
              >
                {hours < 24 ? `${hours}h` : `${hours / 24}d`}
              </button>
            ))}
          </div>
          
          {/* Refresh Button */}
          <button
            onClick={fetchMetrics}
            disabled={loading}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Last Update */}
      {lastUpdate && (
        <div className="flex items-center gap-2 text-xs text-white/40 mb-6">
          <Clock className="h-3 w-3" />
          Last updated: {lastUpdate.toLocaleTimeString()}
          {stats?.samples && ` · ${stats.samples} samples`}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <StatCard
          label="CPU"
          value={stats?.cpu.current.toFixed(1) || "—"}
          unit="%"
          avg={stats?.cpu.avg}
          max={stats?.cpu.max}
          icon={Cpu}
          status={getStatus(stats?.cpu.current || 0, 70, 90)}
          trend={stats ? getTrend(stats.cpu.current, stats.cpu.avg) : undefined}
        />
        <StatCard
          label="Memory"
          value={stats?.memory.current.toFixed(1) || "—"}
          unit="%"
          avg={stats?.memory.avg}
          max={stats?.memory.max}
          icon={MemoryStick}
          status={getStatus(stats?.memory.current || 0, 80, 95)}
          trend={stats ? getTrend(stats.memory.current, stats.memory.avg) : undefined}
        />
        <StatCard
          label="Load"
          value={stats?.load.current.toFixed(0) || "—"}
          unit="%"
          avg={stats?.load.avg}
          max={stats?.load.max}
          icon={Gauge}
          status={getStatus(stats?.load.current || 0, 75, 100)}
          trend={stats ? getTrend(stats.load.current, stats.load.avg) : undefined}
        />
        <StatCard
          label="Sessions"
          value={stats?.sessions.current || "—"}
          avg={stats?.sessions.avg}
          max={stats?.sessions.max}
          icon={Users}
          status={getStatus(stats?.sessions.current || 0, 3, 4)}
        />
        <StatCard
          label="Gateway"
          value={stats?.gateway.status === "ok" ? "Online" : "Down"}
          icon={stats?.gateway.status === "ok" ? Wifi : WifiOff}
          status={stats?.gateway.status === "ok" ? "ok" : "critical"}
        />
        <StatCard
          label="Latency"
          value={stats?.gateway.latency || "—"}
          unit="ms"
          icon={Activity}
          status={getStatus(stats?.gateway.latency || 0, 100, 500)}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <ChartCard
          title="CPU Usage"
          data={data}
          color="#a855f7"
          unit="%"
          threshold={90}
        />
        <ChartCard
          title="Memory Usage"
          data={data}
          color="#3b82f6"
          unit="%"
          threshold={95}
        />
        <ChartCard
          title="CPU Load"
          data={data}
          color="#22c55e"
          unit="%"
          threshold={100}
        />
        <ChartCard
          title="Sessions"
          data={data}
          color="#eab308"
          unit=""
        />
      </div>

      {/* Scaling Recommendations */}
      {stats && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-6">
          <h3 className="text-lg font-semibold mb-4">Scaling Recommendations</h3>
          {stats.cpu.max > 90 || stats.memory.max > 95 || stats.load.max > 100 ? (
            <div className="space-y-3">
              {stats.cpu.max > 90 && (
                <div className="flex items-center gap-3 text-red-400">
                  <AlertTriangle className="h-5 w-5" />
                  <span>CPU peaked at {stats.cpu.max}% — consider upgrading instance</span>
                </div>
              )}
              {stats.memory.max > 95 && (
                <div className="flex items-center gap-3 text-red-400">
                  <AlertTriangle className="h-5 w-5" />
                  <span>Memory peaked at {stats.memory.max}% — upgrade or optimize</span>
                </div>
              )}
              {stats.load.max > 100 && (
                <div className="flex items-center gap-3 text-red-400">
                  <AlertTriangle className="h-5 w-5" />
                  <span>Load peaked at {stats.load.max}% — CPU bottleneck detected</span>
                </div>
              )}
              <div className="mt-4 pt-4 border-t border-white/10 text-sm text-white/50">
                <strong>Options:</strong>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Scale Up: Upgrade EC2 instance (t3.large → t3.xlarge)</li>
                  <li>Scale Out: Run high-traffic agents on separate instances</li>
                  <li>Optimize: Reduce concurrent sessions, add caching</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 text-green-400">
              <Activity className="h-5 w-5" />
              <span>All metrics within healthy ranges — no scaling needed</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
