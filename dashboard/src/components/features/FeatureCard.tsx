"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import type { Feature } from "@/hooks/useRealtimeFeatures"

// ─── Helpers ─────────────────────────────────────────────────────

const priorityColors: Record<string, string> = {
  urgent: "#ef4444",
  high: "#f97316",
  medium: "#3b82f6",
  low: "#6b7280",
}

const priorityLabels: Record<string, string> = {
  urgent: "P0",
  high: "P1",
  medium: "P2",
  low: "P3",
}

function formatElapsed(ms: number): string {
  if (ms < 60_000) return "<1m"
  const mins = Math.floor(ms / 60_000)
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  const remMins = mins % 60
  if (hours < 24) return remMins > 0 ? `${hours}h ${remMins}m` : `${hours}h`
  const days = Math.floor(hours / 24)
  const remHours = hours % 24
  return remHours > 0 ? `${days}d ${remHours}h` : `${days}d`
}

const STUCK_THRESHOLD_MS = 30 * 60 * 1000 // 30 minutes

// ─── Component ───────────────────────────────────────────────────

interface FeatureCardProps {
  feature: Feature
  justMoved: boolean
  onClick?: () => void
}

export function FeatureCard({ feature, justMoved, onClick }: FeatureCardProps) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const calc = () =>
      setElapsed(Date.now() - new Date(feature.updated_at).getTime())
    calc()
    const interval = setInterval(calc, 60_000)
    return () => clearInterval(interval)
  }, [feature.updated_at])

  const isStuck =
    elapsed > STUCK_THRESHOLD_MS &&
    feature.status !== "done" &&
    feature.status !== "cancelled"

  const borderColor = priorityColors[feature.priority] || "#6b7280"

  return (
    <motion.div
      layoutId={feature.id}
      layout
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      onClick={onClick}
      className={cn(
        "rounded-lg p-3 cursor-pointer transition-shadow",
        "bg-[#1e293b] border-l-4",
        justMoved && "animate-card-glow"
      )}
      style={{ borderLeftColor: borderColor }}
    >
      {/* Title row */}
      <div className="flex items-start gap-1.5 mb-1">
        <Badge
          className="text-[9px] px-1 py-0 h-4 flex-shrink-0 border-0 font-bold"
          style={{
            backgroundColor: `${borderColor}33`,
            color: borderColor,
          }}
        >
          {priorityLabels[feature.priority] || "P2"}
        </Badge>
        <h4 className="text-sm font-semibold text-slate-100 leading-tight line-clamp-2 flex-1">
          {feature.title}
        </h4>
        {isStuck && (
          <span title="Stuck >30min in this stage">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
          </span>
        )}
      </div>

      {/* Subtitle */}
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>
          {feature.assigned_to
            ? `Assigned: ${feature.assigned_to}`
            : "Pending human"}
        </span>
        <span className="flex items-center gap-1">
          ⏱ {formatElapsed(elapsed)}
        </span>
      </div>
    </motion.div>
  )
}
