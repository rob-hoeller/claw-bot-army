"use client"

import { ClipboardList, Loader2 } from "lucide-react"
import type { HandoffPacket } from "./types"

const PHASE_LABELS: Record<string, string> = {
  planning: "Plan",
  design_review: "Design",
  in_progress: "Build",
  qa_review: "Test",
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
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  } catch {
    return ""
  }
}

interface TimelineEvent {
  timestamp: string
  emoji: string
  description: string
  agent: string | null
  durationLabel: string | null
}

function buildTimeline(packets: HandoffPacket[]): TimelineEvent[] {
  // Sort by started_at, then completed_at
  const sorted = [...packets].sort((a, b) => {
    const ta = new Date(a.started_at || 0).getTime()
    const tb = new Date(b.started_at || 0).getTime()
    return ta - tb
  })

  const events: TimelineEvent[] = []

  for (const packet of sorted) {
    const phaseLabel = PHASE_LABELS[packet.phase] || packet.phase
    const emoji = PHASE_EMOJI[packet.phase] || "📌"
    const agentName = packet.agent_name || null
    const durationStr = formatDuration(packet.duration_ms)

    // Started event
    events.push({
      timestamp: packet.started_at || packet.created_at,
      emoji,
      description: `Pipeline moved to ${phaseLabel}`,
      agent: agentName,
      durationLabel: null,
    })

    // Completed event
    if (packet.completed_at && (packet.status === "completed" || packet.status === "rejected" || packet.status === "skipped")) {
      const summary = packet.output_summary
        ? packet.output_summary.split("\n")[0].slice(0, 80)
        : null

      const statusVerb =
        packet.status === "completed" ? "completed" :
        packet.status === "rejected" ? "rejected" :
        "skipped"

      const desc = summary
        ? `${agentName || "Agent"} ${statusVerb} — ${summary}${packet.output_summary && packet.output_summary.length > 80 ? "…" : ""}`
        : `${agentName || "Agent"} ${statusVerb} ${phaseLabel}`

      events.push({
        timestamp: packet.completed_at,
        emoji: packet.status === "rejected" ? "❌" : emoji,
        description: desc,
        agent: agentName,
        durationLabel: durationStr ? `${phaseLabel} phase: ${durationStr}` : null,
      })
    }
  }

  // Sort all events chronologically
  events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
  return events
}

interface AuditTrailTabProps {
  featureId: string
  featureStatus: string
  packets: HandoffPacket[] | null
  loading: boolean
}

export function AuditTrailTab({ featureId, featureStatus, packets, loading }: AuditTrailTabProps) {
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

  const events = buildTimeline(packets)

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="space-y-0">
        {events.map((event, i) => (
          <div key={i} className="flex items-start gap-2.5 group">
            {/* Timeline line + dot */}
            <div className="flex flex-col items-center flex-shrink-0 w-3">
              <div className="w-1.5 h-1.5 rounded-full bg-white/20 mt-1 group-hover:bg-purple-400/60 transition-colors" />
              {i < events.length - 1 && (
                <div className="w-px flex-1 bg-white/10 min-h-[16px]" />
              )}
            </div>

            {/* Content */}
            <div className="pb-3 min-w-0 flex-1">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-[10px] leading-relaxed text-white/60">
                  <span className="mr-1">{event.emoji}</span>
                  {event.description}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-white/30">
                  {formatTime(event.timestamp)}
                </span>
                {event.durationLabel && (
                  <span className="bg-white/5 text-white/40 text-[9px] px-1.5 rounded">
                    {event.durationLabel}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
