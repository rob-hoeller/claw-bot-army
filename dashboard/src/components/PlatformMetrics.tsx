"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Cpu, HardDrive, Server, Gauge, Activity, Clock } from "lucide-react"
import CardSection from "@/components/CardSection"

interface MetricsResponse {
  stats: {
    cpu: { current: number; avg: number; max: number }
    memory: { current: number; avg: number; max: number }
    load: { current: number; avg: number; max: number }
    sessions: { current: number; avg: number; max: number }
    gateway: { status: string; latency: number; uptime: number }
    samples: number
    period: { from: string; to: string }
  } | null
  type: string
  hours: number
}

type Status = "good" | "warning" | "critical"

interface MetricItemProps {
  icon: React.ElementType
  label: string
  value: string | number
  unit?: string
  status: Status
}

function getStatus(value: number, warning: number, critical: number): Status {
  if (value >= critical) return "critical"
  if (value >= warning) return "warning"
  return "good"
}

const statusStyles: Record<Status, { bg: string; text: string; ring: string }> = {
  good: {
    bg: "bg-green-500/10",
    text: "text-green-400",
    ring: "ring-green-500/20",
  },
  warning: {
    bg: "bg-yellow-500/10",
    text: "text-yellow-400",
    ring: "ring-yellow-500/20",
  },
  critical: {
    bg: "bg-red-500/10",
    text: "text-red-400",
    ring: "ring-red-500/20",
  },
}

function MetricItem({ icon: Icon, label, value, unit, status }: MetricItemProps) {
  const styles = statusStyles[status]

  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/5 ring-1 ${styles.ring}`}>
      <div className={`rounded-lg ${styles.bg} p-2`}>
        <Icon className={`h-4 w-4 ${styles.text}`} />
      </div>
      <div className="flex-1">
        <p className="text-xs text-white/40 uppercase tracking-wide">{label}</p>
        <p className={`text-lg font-mono font-semibold ${styles.text}`}>
          {value}
          {unit && <span className="text-sm ml-0.5">{unit}</span>}
        </p>
      </div>
    </div>
  )
}

export default function PlatformMetrics() {
  const [stats, setStats] = useState<MetricsResponse["stats"]>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchMetrics = async () => {
    try {
      const res = await fetch("/api/metrics")
      if (!res.ok) throw new Error("Failed to fetch metrics")
      const data: MetricsResponse = await res.json()
      setStats(data.stats)
      setLastUpdated(new Date())
      setError(null)
    } catch (err) {
      setError("Unable to fetch metrics")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMetrics()
    const interval = setInterval(fetchMetrics, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <CardSection title="Platform Metrics" description="Infrastructure health">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-16 bg-white/[0.02] rounded-lg animate-pulse" />
          ))}
        </div>
      </CardSection>
    )
  }

  if (error || !stats) {
    return (
      <CardSection title="Platform Metrics" description="Infrastructure health">
        <div className="p-4 rounded-lg bg-yellow-500/5 border border-yellow-500/20 text-center">
          <p className="text-yellow-400 text-sm">
            {error || "Waiting for metrics data..."}
          </p>
          <p className="text-white/30 text-xs mt-1">
            Metrics are collected every 5 minutes from the gateway
          </p>
        </div>
      </CardSection>
    )
  }

  const gatewayStatus = stats.gateway?.status === "ok" ? "online" : "offline"

  return (
    <CardSection
      title="Platform Metrics"
      description={
        <span className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              gatewayStatus === "online" ? "bg-green-500" : "bg-red-500"
            }`}
          />
          Gateway {gatewayStatus}
        </span>
      }
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="grid grid-cols-2 md:grid-cols-3 gap-3"
      >
        <MetricItem
          icon={Cpu}
          label="CPU"
          value={(stats.cpu?.current ?? 0).toFixed(1)}
          unit="%"
          status={getStatus(stats.cpu?.current ?? 0, 70, 90)}
        />
        <MetricItem
          icon={Server}
          label="Memory"
          value={(stats.memory?.current ?? 0).toFixed(1)}
          unit="%"
          status={getStatus(stats.memory?.current ?? 0, 80, 95)}
        />
        <MetricItem
          icon={Gauge}
          label="Load"
          value={(stats.load?.current ?? 0).toFixed(1)}
          unit="%"
          status={getStatus(stats.load?.current ?? 0, 75, 100)}
        />
        <MetricItem
          icon={Activity}
          label="Sessions"
          value={stats.sessions?.current ?? 0}
          status={getStatus(stats.sessions?.current ?? 0, 12, 15)}
        />
        <MetricItem
          icon={HardDrive}
          label="Gateway Uptime"
          value={`${stats.gateway?.uptime ?? 0}%`}
          status={getStatus(100 - (stats.gateway?.uptime ?? 100), 5, 10)}
        />
        <MetricItem
          icon={Clock}
          label="Latency"
          value={stats.gateway?.latency ?? 0}
          unit="ms"
          status={getStatus(stats.gateway?.latency ?? 0, 200, 500)}
        />
      </motion.div>
      {lastUpdated && (
        <p className="text-white/20 text-xs mt-3 text-right">
          Updated: {lastUpdated.toLocaleTimeString()}
        </p>
      )}
      {stats.samples > 0 && (
        <p className="text-white/15 text-xs text-right">
          {stats.samples} samples from last {24}h
        </p>
      )}
    </CardSection>
  )
}
