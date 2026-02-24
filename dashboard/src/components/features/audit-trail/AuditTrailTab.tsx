"use client"

import { ClipboardList, Loader2, ArrowRight, Clock, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { HandoffPacket } from "./types"

const PHASE_LABELS: Record<string, string> = {
  planning: "Planning",
  design_review: "Design Review",
  in_progress: "Build",
  qa_review: "QA Review",
  review: "Review",
  approved: "Approved",
  pr_submitted: "PR Submitted",
  done: "Done",
}

const PHASE_EMOJI: Record<string, string> = {
  planning: "🚀",
  design_review: "📋",
  in_progress: "🔨",
  qa_review: "✅",
  review: "👁️",
  approved: "👤",
  pr_submitted: "🔀",
  done: "🎉",
}

const PHASE_ORDER = ["planning", "design_review", "in_progress", "qa_review", "review", "approved", "pr_submitted", "done"]

function formatDuration(ms: number | null | undefined): string {
  if (!ms) return ""
  if (ms < 1000) return `${ms}ms`
  const secs = Math.floor(ms / 1000)
  if (secs < 60) return `${secs}s`
  const mins = Math.floor(secs / 60)
  const remSecs = secs % 60
  if (mins < 60) return remSecs > 0 ? `${mins}m ${remSecs}s` : `${mins}m`
  const hrs = Math.floor(mins / 60)
  const remMins = mins % 60
  return remMins > 0 ? `${hrs}h ${remMins}m` : `${hrs}h`
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
  } catch {
    return ""
  }
}

/** Color-code duration: green < 2min, yellow 2-5min, red > 5min */
function durationColor(ms: number | null | undefined): string {
  if (!ms) return "text-white/40"
  if (ms < 120_000) return "text-green-400"
  if (ms < 300_000) return "text-yellow-400"
  return "text-red-400"
}

function durationBgColor(ms: number | null | undefined): string {
  if (!ms) return "bg-white/5"
  if (ms < 120_000) return "bg-green-500/10 border-green-500/20"
  if (ms < 300_000) return "bg-yellow-500/10 border-yellow-500/20"
  return "bg-red-500/10 border-red-500/20"
}

interface HandoffEntry {
  phase: string
  agentName: string | null
  startedAt: string | null
  completedAt: string | null
  durationMs: number | null
  status: string
  summary: string | null
  nextPhase: string | null
  nextAgent: string | null
}

function buildHandoffEntries(packets: HandoffPacket[]): HandoffEntry[] {
  // Get latest completed packet per phase
  const phaseMap = new Map<string, HandoffPacket>()
  for (const p of packets) {
    const existing = phaseMap.get(p.phase)
    if (!existing || p.version > existing.version) {
      phaseMap.set(p.phase, p)
    }
  }

  // Sort by phase order
  const sorted = PHASE_ORDER
    .filter(phase => phaseMap.has(phase))
    .map(phase => phaseMap.get(phase)!)

  return sorted.map((packet, i) => {
    const nextPacket = sorted[i + 1] || null
    return {
      phase: packet.phase,
      agentName: packet.agent_name,
      startedAt: packet.started_at,
      completedAt: packet.completed_at,
      durationMs: packet.duration_ms ?? null,
      status: packet.status,
      summary: packet.output_summary ? packet.output_summary.split("\n")[0].slice(0, 100) : null,
      nextPhase: nextPacket?.phase ?? null,
      nextAgent: nextPacket?.agent_name ?? null,
    }
  })
}

interface AuditTrailTabProps {
  featureId: string
  featureStatus: string
  packets: HandoffPacket[] | null
  loading: boolean
  approvedBy?: string | null
}

export function AuditTrailTab({ featureId, featureStatus, packets, loading, approvedBy }: AuditTrailTabProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-4 w-4 text-purple-400 animate-spin" />
        <span className="text-[10px] text-white/30 ml-2">Loading audit trail...</span>
      </div>
    )
  }

  if (!packets || packets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-32 text-center">
        <ClipboardList className="h-6 w-6 text-white/20 mb-2" />
        <p className="text-[11px] text-white/40">No audit trail yet</p>
        <p className="text-[10px] text-white/25 mt-1">
          Handoff data will appear as the pipeline runs.
        </p>
      </div>
    )
  }

  const entries = buildHandoffEntries(packets)

  // Calculate total pipeline duration
  const firstStart = entries.find(e => e.startedAt)?.startedAt
  const lastComplete = [...entries].reverse().find(e => e.completedAt)?.completedAt
  const totalMs = firstStart && lastComplete
    ? new Date(lastComplete).getTime() - new Date(firstStart).getTime()
    : null

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="text-[9px] text-white/30 uppercase tracking-wider mb-3">Pipeline Handoff Timeline</div>

      <div className="space-y-0">
        {entries.map((entry, i) => {
          const phaseLabel = PHASE_LABELS[entry.phase] || entry.phase
          const emoji = PHASE_EMOJI[entry.phase] || "📌"
          const isCompleted = entry.status === "completed"
          const isRejected = entry.status === "rejected"
          const isLast = i === entries.length - 1

          return (
            <div key={entry.phase} className="flex items-start gap-2.5 group">
              {/* Timeline line + dot */}
              <div className="flex flex-col items-center flex-shrink-0 w-4">
                <div className={cn(
                  "w-2 h-2 rounded-full mt-1.5 transition-colors",
                  isCompleted ? "bg-green-400/80" :
                  isRejected ? "bg-red-400/80" :
                  "bg-purple-400/60 ring-2 ring-purple-400/20"
                )} />
                {!isLast && (
                  <div className="w-px flex-1 bg-white/10 min-h-[24px]" />
                )}
              </div>

              {/* Content */}
              <div className="pb-4 min-w-0 flex-1">
                {/* Main line: agent completed Phase → handed off to next */}
                <div className="text-[11px] text-white/70 leading-relaxed">
                  <span className="mr-1">{emoji}</span>
                  <span className="font-medium text-white/80">{entry.agentName || "Agent"}</span>
                  {isCompleted ? (
                    <span> completed <span className="text-white/90">{phaseLabel}</span></span>
                  ) : isRejected ? (
                    <span> rejected <span className="text-red-300">{phaseLabel}</span></span>
                  ) : (
                    <span> is working on <span className="text-purple-300">{phaseLabel}</span></span>
                  )}
                  {isCompleted && entry.nextAgent && entry.nextPhase && (
                    <span className="text-white/50">
                      {" "}→ handed off to <span className="text-white/70">{entry.nextAgent}</span>
                    </span>
                  )}
                </div>

                {/* Timestamp + duration */}
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  {entry.completedAt && (
                    <span className="text-[10px] text-white/30">
                      at {formatTime(entry.completedAt)}
                    </span>
                  )}
                  {!entry.completedAt && entry.startedAt && (
                    <span className="text-[10px] text-white/30">
                      started {formatTime(entry.startedAt)}
                    </span>
                  )}
                  {entry.durationMs && (
                    <span className={cn(
                      "text-[9px] px-1.5 py-0.5 rounded border",
                      durationBgColor(entry.durationMs),
                      durationColor(entry.durationMs)
                    )}>
                      took {formatDuration(entry.durationMs)}
                    </span>
                  )}
                </div>

                {/* Summary snippet */}
                {entry.summary && (
                  <p className="text-[10px] text-white/40 mt-1 line-clamp-1">{entry.summary}</p>
                )}
              </div>
            </div>
          )
        })}

        {/* Approval stamp */}
        {approvedBy && (
          <div className="flex items-start gap-2.5">
            <div className="flex flex-col items-center flex-shrink-0 w-4">
              <div className="w-2 h-2 rounded-full mt-1.5 bg-emerald-400/80" />
            </div>
            <div className="pb-4 min-w-0 flex-1">
              <div className="text-[11px] text-white/70 leading-relaxed flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-emerald-400 inline" />
                <span className="font-medium text-emerald-300">{approvedBy}</span>
                <span> approved</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Total pipeline duration */}
      {totalMs && (
        <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[10px] text-white/40">
            <Clock className="h-3 w-3" />
            <span>Total pipeline time</span>
          </div>
          <span className={cn("text-[11px] font-medium", durationColor(totalMs))}>
            {formatDuration(totalMs)}
          </span>
        </div>
      )}
    </div>
  )
}
