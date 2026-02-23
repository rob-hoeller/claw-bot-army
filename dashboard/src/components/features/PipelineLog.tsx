"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { ChevronDown, ChevronRight } from "lucide-react"

// ─── Types ───────────────────────────────────────────────────────

export interface PipelineLogEntry {
  timestamp: string
  agent: string
  stage: string
  verdict: string
  issues?: string[]
  revision_loop?: number
}

// ─── Helpers ─────────────────────────────────────────────────────

const stageIcons: Record<string, string> = {
  speccing: "📋",
  designing: "🎨",
  building: "🔧",
  qa: "🧪",
  review: "👀",
}

const verdictConfig: Record<string, { label: string; color: string; icon: string }> = {
  APPROVED: { label: "APPROVED", color: "bg-green-500/20 text-green-400", icon: "✅" },
  COMPLETE: { label: "COMPLETE", color: "bg-green-500/20 text-green-400", icon: "✅" },
  SHIP: { label: "SHIP", color: "bg-green-500/20 text-green-400", icon: "🚀" },
  REVISE: { label: "REVISE", color: "bg-yellow-500/20 text-yellow-400", icon: "🔄" },
  REJECT: { label: "REJECT", color: "bg-red-500/20 text-red-400", icon: "❌" },
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso)
    const now = new Date()
    const isToday =
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    return isToday ? time : `${d.toLocaleDateString([], { month: "short", day: "numeric" })} ${time}`
  } catch {
    return "—"
  }
}

// ─── Component ───────────────────────────────────────────────────

interface PipelineLogProps {
  log: PipelineLogEntry[]
}

export function PipelineLog({ log }: PipelineLogProps) {
  const [expanded, setExpanded] = useState(false)
  const [expandedIssues, setExpandedIssues] = useState<Set<number>>(new Set())

  if (!log || log.length === 0) {
    return (
      <div className="p-3 border-b border-white/5">
        <div className="text-[10px] text-white/40 uppercase tracking-wider">Pipeline Log</div>
        <p className="text-[11px] text-white/30 mt-1">No pipeline events yet.</p>
      </div>
    )
  }

  const toggleIssues = (idx: number) => {
    setExpandedIssues((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  return (
    <div className="p-3 border-b border-white/5">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-[10px] text-white/40 uppercase tracking-wider hover:text-white/60 transition-colors w-full text-left"
      >
        {expanded ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
        Pipeline Log ({log.length} events)
      </button>

      <div
        className={cn(
          "overflow-hidden transition-all duration-300",
          expanded ? "max-h-[500px] mt-2" : "max-h-0"
        )}
      >
        <div className="space-y-1.5">
          {log.map((entry, idx) => {
            const vc = verdictConfig[entry.verdict] || {
              label: entry.verdict,
              color: "bg-white/10 text-white/60",
              icon: "•",
            }
            const stageIcon = stageIcons[entry.stage] || "⚡"
            const hasIssues = entry.verdict === "REVISE" && entry.issues && entry.issues.length > 0
            const issuesOpen = expandedIssues.has(idx)

            return (
              <div key={idx}>
                <div className="flex items-center gap-2 text-[11px]">
                  <span className="text-white/30 font-mono w-12 flex-shrink-0 text-right">
                    {formatTime(entry.timestamp)}
                  </span>
                  <span>{stageIcon}</span>
                  <span className="text-white/60 flex-1 truncate">
                    {entry.agent} — {entry.stage.charAt(0).toUpperCase() + entry.stage.slice(1)}
                    {entry.revision_loop ? ` (rev ${entry.revision_loop})` : ""}
                  </span>
                  <span
                    className={cn(
                      "inline-flex items-center gap-0.5 rounded px-1 py-0 text-[9px] font-medium",
                      vc.color
                    )}
                  >
                    {vc.icon} {vc.label}
                  </span>
                  {hasIssues && (
                    <button
                      onClick={() => toggleIssues(idx)}
                      className="text-[9px] text-yellow-400/70 hover:text-yellow-400 transition-colors"
                    >
                      ({entry.issues!.length} issues)
                    </button>
                  )}
                </div>
                {hasIssues && issuesOpen && (
                  <div className="ml-14 mt-1 space-y-0.5">
                    {entry.issues!.map((issue, i) => (
                      <div
                        key={i}
                        className="text-[10px] text-yellow-400/60 pl-2 border-l border-yellow-400/20"
                      >
                        {issue}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
