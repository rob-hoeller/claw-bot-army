"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import {
  Coins,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Clock,
  DollarSign,
  Zap,
  Users,
  Bot,
  Calendar,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react"
import { cn } from "@/lib/utils"

// =============================================================================
// TYPES
// =============================================================================

interface SummaryData {
  today: { tokens: number; cost: number; requests: number }
  week: { tokens: number; cost: number; requests: number }
  month: { tokens: number; cost: number; requests: number }
  topAgents: Array<{ agent_id: string; tokens: number; cost: number }>
  topUsers: Array<{ user_id: string; tokens: number; cost: number }>
}

interface TimeSeriesPoint {
  recorded_at: string
  agent_id: string
  delta_total_tokens: number
  delta_cost: number
  cost_total: number
}

interface DailyData {
  date: string
  agent_id: string
  user_id: string
  total_tokens: number
  total_cost: number
  request_count: number
}

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

function formatTokens(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}k`
  return num.toString()
}

function formatCost(num: number): string {
  if (num >= 100) return `$${num.toFixed(0)}`
  if (num >= 1) return `$${num.toFixed(2)}`
  return `$${num.toFixed(4)}`
}

function StatCard({
  label,
  value,
  subValue,
  icon: Icon,
  trend,
  trendValue,
  color = "purple",
}: {
  label: string
  value: string
  subValue?: string
  icon: React.ElementType
  trend?: "up" | "down" | "stable"
  trendValue?: string
  color?: "purple" | "blue" | "green" | "yellow" | "red"
}) {
  const colorClasses = {
    purple: "text-purple-400 border-purple-500/30 bg-purple-500/10",
    blue: "text-blue-400 border-blue-500/30 bg-blue-500/10",
    green: "text-green-400 border-green-500/30 bg-green-500/10",
    yellow: "text-yellow-400 border-yellow-500/30 bg-yellow-500/10",
    red: "text-red-400 border-red-500/30 bg-red-500/10",
  }

  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("rounded-xl border p-4 transition-all", colorClasses[color])}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-white/50 uppercase tracking-wider">{label}</span>
        <Icon className="h-4 w-4 text-white/30" />
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold">{value}</span>
        {trend && trendValue && (
          <span className={cn(
            "text-xs flex items-center gap-0.5",
            trend === "up" ? "text-red-400" : trend === "down" ? "text-green-400" : "text-white/30"
          )}>
            <TrendIcon className="h-3 w-3" />
            {trendValue}
          </span>
        )}
      </div>
      {subValue && <div className="text-sm text-white/40 mt-1">{subValue}</div>}
    </motion.div>
  )
}

function MiniBarChart({ data, color, height = 60 }: { data: number[]; color: string; height?: number }) {
  if (!data || data.length === 0) return null
  
  const max = Math.max(...data, 1)
  const barWidth = 100 / data.length

  return (
    <svg width="100%" height={height} className="overflow-visible">
      {data.map((v, i) => {
        const barHeight = (v / max) * height
        return (
          <rect
            key={i}
            x={`${i * barWidth}%`}
            y={height - barHeight}
            width={`${barWidth * 0.8}%`}
            height={barHeight}
            fill={color}
            opacity={0.7}
            rx={2}
          />
        )
      })}
    </svg>
  )
}

function LeaderboardCard({
  title,
  items,
  icon: Icon,
  valueFormatter,
  color = "purple",
}: {
  title: string
  items: Array<{ id: string; value: number; tokens?: number }>
  icon: React.ElementType
  valueFormatter: (n: number) => string
  color?: string
}) {
  const maxValue = Math.max(...items.map(i => i.value), 1)

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="h-4 w-4 text-white/50" />
        <h3 className="text-sm font-medium text-white/70">{title}</h3>
      </div>
      <div className="space-y-3">
        {items.length === 0 ? (
          <div className="text-sm text-white/30 text-center py-4">No data yet</div>
        ) : (
          items.map((item, i) => (
            <div key={item.id} className="relative">
              <div 
                className="absolute inset-0 bg-purple-500/10 rounded"
                style={{ width: `${(item.value / maxValue) * 100}%` }}
              />
              <div className="relative flex items-center justify-between py-1.5 px-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/30 w-4">{i + 1}</span>
                  <span className="text-sm font-medium">{item.id}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold">{valueFormatter(item.value)}</div>
                  {item.tokens && (
                    <div className="text-xs text-white/40">{formatTokens(item.tokens)} tokens</div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function TokenUsagePage() {
  const [summary, setSummary] = useState<SummaryData | null>(null)
  const [timeSeries, setTimeSeries] = useState<TimeSeriesPoint[]>([])
  const [dailyData, setDailyData] = useState<DailyData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState(7) // days
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Fetch all data in parallel
      const [summaryRes, timeSeriesRes, dailyRes] = await Promise.all([
        fetch('/api/usage?view=summary'),
        fetch(`/api/usage?view=timeseries&hours=${timeRange * 24}`),
        fetch(`/api/usage?view=daily&days=${timeRange}`),
      ])

      if (!summaryRes.ok || !timeSeriesRes.ok || !dailyRes.ok) {
        throw new Error('Failed to fetch usage data')
      }

      const [summaryData, tsData, dData] = await Promise.all([
        summaryRes.json(),
        timeSeriesRes.json(),
        dailyRes.json(),
      ])

      setSummary(summaryData)
      setTimeSeries(tsData.data || [])
      setDailyData(dData.data || [])
      setLastUpdate(new Date())
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    // Refresh every 5 minutes
    const interval = setInterval(fetchData, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [timeRange])

  // Calculate trends
  const calculateTrend = (current: number, previous: number): { trend: "up" | "down" | "stable"; value: string } => {
    if (previous === 0) return { trend: "stable", value: "—" }
    const change = ((current - previous) / previous) * 100
    if (Math.abs(change) < 5) return { trend: "stable", value: "~0%" }
    return {
      trend: change > 0 ? "up" : "down",
      value: `${Math.abs(change).toFixed(0)}%`
    }
  }

  // Aggregate daily data for charts
  const dailyTotals = dailyData.reduce((acc, d) => {
    const date = d.date
    if (!acc[date]) acc[date] = { tokens: 0, cost: 0, requests: 0 }
    acc[date].tokens += parseInt(String(d.total_tokens || 0))
    acc[date].cost += parseFloat(String(d.total_cost || 0))
    acc[date].requests += d.request_count || 0
    return acc
  }, {} as Record<string, { tokens: number; cost: number; requests: number }>)

  const chartData = Object.entries(dailyTotals)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => ({ date, ...data }))

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Coins className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Unable to load usage data</h2>
          <p className="text-white/50 mb-4">{error}</p>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-purple-500/20 text-purple-300 rounded-lg hover:bg-purple-500/30 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Coins className="h-7 w-7 text-yellow-400" />
            Token Usage & Costs
          </h1>
          <p className="text-white/50 text-sm mt-1">
            Track AI costs across agents and users
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* Time Range Selector */}
          <div className="flex items-center gap-2 bg-white/5 rounded-lg p-1">
            {[7, 14, 30, 90].map((days) => (
              <button
                key={days}
                onClick={() => setTimeRange(days)}
                className={cn(
                  "px-3 py-1 text-sm rounded-md transition-colors",
                  timeRange === days
                    ? "bg-yellow-500/30 text-yellow-300"
                    : "text-white/50 hover:text-white/70"
                )}
              >
                {days}d
              </button>
            ))}
          </div>
          
          {/* Refresh Button */}
          <button
            onClick={fetchData}
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
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <StatCard
          label="Today's Cost"
          value={formatCost(summary?.today.cost || 0)}
          subValue={`${formatTokens(summary?.today.tokens || 0)} tokens`}
          icon={DollarSign}
          color="green"
        />
        <StatCard
          label="Today's Requests"
          value={String(summary?.today.requests || 0)}
          icon={Zap}
          color="blue"
        />
        <StatCard
          label="Week Cost"
          value={formatCost(summary?.week.cost || 0)}
          subValue={`${formatTokens(summary?.week.tokens || 0)} tokens`}
          icon={Calendar}
          color="purple"
        />
        <StatCard
          label="Week Requests"
          value={String(summary?.week.requests || 0)}
          icon={BarChart3}
          color="yellow"
        />
        <StatCard
          label="Month Cost"
          value={formatCost(summary?.month.cost || 0)}
          subValue={`${formatTokens(summary?.month.tokens || 0)} tokens`}
          icon={TrendingUp}
          color="purple"
        />
        <StatCard
          label="Month Requests"
          value={String(summary?.month.requests || 0)}
          icon={PieChart}
          color="blue"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Daily Cost Chart */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <h3 className="text-sm font-medium text-white/70 mb-4 flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Daily Cost Trend
          </h3>
          <div className="h-32">
            <MiniBarChart 
              data={chartData.map(d => d.cost)} 
              color="#a855f7"
            />
          </div>
          <div className="flex justify-between text-xs text-white/30 mt-2">
            <span>{chartData[0]?.date || '—'}</span>
            <span>{chartData[chartData.length - 1]?.date || '—'}</span>
          </div>
        </div>

        {/* Daily Tokens Chart */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <h3 className="text-sm font-medium text-white/70 mb-4 flex items-center gap-2">
            <Coins className="h-4 w-4" />
            Daily Token Usage
          </h3>
          <div className="h-32">
            <MiniBarChart 
              data={chartData.map(d => d.tokens)} 
              color="#3b82f6"
            />
          </div>
          <div className="flex justify-between text-xs text-white/30 mt-2">
            <span>{chartData[0]?.date || '—'}</span>
            <span>{chartData[chartData.length - 1]?.date || '—'}</span>
          </div>
        </div>
      </div>

      {/* Leaderboards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <LeaderboardCard
          title="Top Agents by Cost"
          icon={Bot}
          items={(summary?.topAgents || []).map(a => ({
            id: a.agent_id,
            value: a.cost,
            tokens: a.tokens,
          }))}
          valueFormatter={formatCost}
        />
        <LeaderboardCard
          title="Top Users by Cost"
          icon={Users}
          items={(summary?.topUsers || []).map(u => ({
            id: u.user_id,
            value: u.cost,
            tokens: u.tokens,
          }))}
          valueFormatter={formatCost}
        />
      </div>

      {/* Cost Breakdown Info */}
      <div className="mt-8 rounded-xl border border-white/10 bg-white/5 p-6">
        <h3 className="text-lg font-semibold mb-4">Cost Model Reference</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-white/50 mb-1">Input Tokens</div>
            <div className="font-mono">$15.00 / 1M</div>
          </div>
          <div>
            <div className="text-white/50 mb-1">Output Tokens</div>
            <div className="font-mono">$75.00 / 1M</div>
          </div>
          <div>
            <div className="text-white/50 mb-1">Cache Read</div>
            <div className="font-mono text-green-400">$1.50 / 1M (90% savings)</div>
          </div>
          <div>
            <div className="text-white/50 mb-1">Cache Write</div>
            <div className="font-mono">$18.75 / 1M</div>
          </div>
        </div>
        <p className="text-xs text-white/40 mt-4">
          Costs are calculated by OpenClaw using Claude Opus 4.5 pricing. Cache reads provide significant savings for repeated context.
        </p>
      </div>
    </div>
  )
}
