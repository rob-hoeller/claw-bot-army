"use client"

import { CheckCircle2, Circle, Loader2, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import type { HandoffPacket } from "./types"

function formatDuration(ms: number | null): string {
  if (!ms) return ""
  const mins = Math.floor(ms / 60000)
  if (mins < 1) return "< 1m"
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

interface StepHeaderProps {
  phase: string
  label: string
  state: "completed" | "active" | "future"
  packet: HandoffPacket | null
  versionCount: number
  isExpanded: boolean
  onToggle: () => void
}

export function StepHeader({ phase, label, state, packet, versionCount, isExpanded, onToggle }: StepHeaderProps) {
  const StatusIcon = state === "completed" ? CheckCircle2 : state === "active" ? Loader2 : Circle

  return (
    <button
      onClick={onToggle}
      disabled={state === "future"}
      className={cn(
        "w-full flex items-center gap-2 px-1 py-1.5 rounded-md transition-all text-left",
        state === "completed" && "hover:bg-white/5 cursor-pointer",
        state === "active" && "hover:bg-purple-500/5 cursor-pointer",
        state === "future" && "opacity-40 cursor-default"
      )}
    >
      <StatusIcon
        className={cn(
          "h-[18px] w-[18px] flex-shrink-0",
          state === "completed" && "text-green-400",
          state === "active" && "text-purple-400 animate-spin",
          state === "future" && "text-white/20"
        )}
      />

      <span
        className={cn(
          "text-[11px] font-medium",
          state === "future" ? "text-white/30" : "text-white/80"
        )}
      >
        {label}
      </span>

      {versionCount > 1 && (
        <span className="text-[9px] text-amber-400/70 bg-amber-500/10 px-1 rounded">
          ⟲ {versionCount - 1} revision{versionCount > 2 ? "s" : ""}
        </span>
      )}

      {packet?.duration_ms ? (
        <span className="text-[10px] text-white/40 ml-auto">
          {formatDuration(packet.duration_ms)}
        </span>
      ) : state === "active" && packet?.started_at ? (
        <span className="text-[10px] text-purple-400/60 animate-pulse ml-auto">
          in progress
        </span>
      ) : (
        <span className="ml-auto" />
      )}

      {state !== "future" && (
        <ChevronDown
          className={cn(
            "h-3 w-3 text-white/30 transition-transform flex-shrink-0",
            isExpanded && "rotate-180"
          )}
        />
      )}
    </button>
  )
}
