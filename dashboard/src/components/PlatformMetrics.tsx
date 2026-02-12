"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Cpu, HardDrive, Server, Gauge, Activity, Clock } from "lucide-react"
import CardSection from "@/components/CardSection"

interface Metrics {
  cpu: number
  memory: number
  disk: number
  load: number
  uptime: string
  sessions: number
  gateway: "online" | "offline"
  lastUpdated: string
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
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMetrics = async () => {
    try {
      const res = await fetch("/api/metrics")
      if (!res.ok) throw new Error("Failed to fetch metrics")
      const data = await res.json()
      setMetrics(data)
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

  if (error || !metrics) {
    return (
      <CardSection title="Platform Metrics" description="Infrastructure health">
        <div className="p-4 rounded-lg bg-red-500/5 border border-red-500/20 text-center">
          <p className="text-red-400 text-sm">{error || "No metrics available"}</p>
        </div>
      </CardSection>
    )
  }

  return (
    <CardSection
      title="Platform Metrics"
      description={
        <span className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              metrics.gateway === "online" ? "bg-green-500" : "bg-red-500"
            }`}
          />
          Gateway {metrics.gateway}
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
          value={metrics.cpu.toFixed(1)}
          unit="%"
          status={getStatus(metrics.cpu, 70, 90)}
        />
        <MetricItem
          icon={Server}
          label="Memory"
          value={metrics.memory.toFixed(1)}
          unit="%"
          status={getStatus(metrics.memory, 80, 95)}
        />
        <MetricItem
          icon={HardDrive}
          label="Disk"
          value={metrics.disk.toFixed(0)}
          unit="%"
          status={getStatus(metrics.disk, 80, 95)}
        />
        <MetricItem
          icon={Gauge}
          label="Load"
          value={metrics.load.toFixed(2)}
          status={getStatus(metrics.load * 100, 75, 100)}
        />
        <MetricItem
          icon={Activity}
          label="Sessions"
          value={metrics.sessions}
          status={getStatus(metrics.sessions, 12, 15)}
        />
        <MetricItem
          icon={Clock}
          label="Uptime"
          value={metrics.uptime}
          status="good"
        />
      </motion.div>
      <p className="text-white/20 text-xs mt-3 text-right">
        Updated: {new Date(metrics.lastUpdated).toLocaleTimeString()}
      </p>
    </CardSection>
  )
}
