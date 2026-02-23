"use client"

import { cn } from "@/lib/utils"

// ─── Stage Config ────────────────────────────────────────────────

const stageMap: Record<string, { label: string; icon: string }> = {
  IN1: { label: "Speccing", icon: "📋" },
  IN5: { label: "Designing", icon: "🎨" },
  IN2: { label: "Building", icon: "🔧" },
  IN6: { label: "QA", icon: "🧪" },
}

interface PipelineStagePillProps {
  agent: string | null
  status: string
  isStalled?: boolean
}

export function PipelineStagePill({ agent, status, isStalled }: PipelineStagePillProps) {
  // Determine label and icon
  let label: string
  let icon: string

  if (status === "escalated") {
    label = "Escalated"
    icon = "🚨"
  } else if (!agent && status === "review") {
    label = "Review"
    icon = "👀"
  } else if (agent && stageMap[agent]) {
    label = stageMap[agent].label
    icon = stageMap[agent].icon
  } else if (agent) {
    label = agent
    icon = "⚡"
  } else {
    return null // No pill if no agent and not in review/escalated
  }

  if (isStalled && status !== "escalated") {
    icon = "⏳"
    label += " (stalled)"
  }

  const colorClass =
    status === "escalated"
      ? "bg-red-500/10 text-red-400"
      : isStalled
        ? "bg-yellow-500/10 text-yellow-400"
        : "bg-blue-500/10 text-blue-400"

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        colorClass
      )}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </span>
  )
}
