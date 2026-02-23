"use client"

import type { ConnectionStatus } from "@/hooks/useRealtimeFeatures"
import { cn } from "@/lib/utils"

interface ConnectionIndicatorProps {
  status: ConnectionStatus
  lastConnectedAt?: Date | null
}

export function ConnectionIndicator({
  status,
  lastConnectedAt,
}: ConnectionIndicatorProps) {
  const config = {
    connected: {
      dotClass: "bg-green-500",
      label: "Live",
      textClass: "text-green-400",
    },
    reconnecting: {
      dotClass: "bg-amber-500 animate-pulse-dot",
      label: "Reconnecting…",
      textClass: "text-amber-400",
    },
    disconnected: {
      dotClass: "bg-red-500",
      label: lastConnectedAt
        ? `Disconnected · Last ${lastConnectedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
        : "Disconnected",
      textClass: "text-red-400",
    },
  }

  const c = config[status]

  return (
    <div className="flex items-center gap-1.5">
      <span
        className={cn("inline-block h-2 w-2 rounded-full flex-shrink-0", c.dotClass)}
      />
      <span className={cn("text-[11px] font-medium", c.textClass)}>
        {c.label}
      </span>
    </div>
  )
}
