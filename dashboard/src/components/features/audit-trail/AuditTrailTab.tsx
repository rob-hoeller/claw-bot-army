"use client"

import { useState, useEffect } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { ClipboardList, Loader2 } from "lucide-react"
import { StepHeader } from "./StepHeader"
import { StepPanelContent } from "./StepPanelContent"
import type { HandoffPacket } from "./types"

const PIPELINE_PHASES = [
  { phase: "planning", label: "Plan", order: 1 },
  { phase: "design_review", label: "Design", order: 2 },
  { phase: "in_progress", label: "Build", order: 3 },
  { phase: "qa_review", label: "Test", order: 4 },
  { phase: "review", label: "Review", order: 5 },
  { phase: "approved", label: "Approved", order: 6 },
  { phase: "pr_submitted", label: "PR Submitted", order: 7 },
  { phase: "done", label: "Done", order: 8 },
] as const

interface AuditTrailTabProps {
  featureId: string
  featureStatus: string
  packets: HandoffPacket[] | null
  loading: boolean
}

export function AuditTrailTab({ featureId, featureStatus, packets, loading }: AuditTrailTabProps) {
  const [expandedPhase, setExpandedPhase] = useState<string | null>(null)

  // Auto-expand active phase on first load
  useEffect(() => {
    if (packets && packets.length > 0 && expandedPhase === null) {
      const active = packets.find(p => p.status === "in_progress")
      if (active) setExpandedPhase(active.phase)
    }
  }, [packets]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleToggle = (phase: string) => {
    setExpandedPhase(prev => (prev === phase ? null : phase))
  }

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

  // Group packets by phase, pick latest version per phase
  const packetsByPhase: Record<string, HandoffPacket[]> = {}
  for (const p of packets) {
    if (!packetsByPhase[p.phase]) packetsByPhase[p.phase] = []
    packetsByPhase[p.phase].push(p)
  }

  const currentPhaseIndex = PIPELINE_PHASES.findIndex(p => p.phase === featureStatus)

  return (
    <div className="flex-1 overflow-y-auto p-3">
      {PIPELINE_PHASES.map((step, i) => {
        const phasePackets = packetsByPhase[step.phase] || []
        const latestPacket = phasePackets.length > 0
          ? phasePackets.reduce((a, b) => (a.version > b.version ? a : b))
          : null
        const versionCount = phasePackets.length

        let state: "completed" | "active" | "future"
        if (latestPacket?.status === "completed" || latestPacket?.status === "skipped") {
          state = "completed"
        } else if (latestPacket?.status === "in_progress" || i === currentPhaseIndex) {
          state = latestPacket ? "active" : (i === currentPhaseIndex ? "active" : "future")
        } else if (i < currentPhaseIndex) {
          state = "completed"
        } else {
          state = "future"
        }

        const isExpanded = expandedPhase === step.phase

        return (
          <div key={step.phase}>
            <StepHeader
              phase={step.phase}
              label={step.label}
              state={state}
              packet={latestPacket}
              versionCount={versionCount}
              isExpanded={isExpanded}
              onToggle={() => state !== "future" && handleToggle(step.phase)}
            />

            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="ml-[9px] pl-4 border-l border-white/10 pb-3">
                    {latestPacket ? (
                      <StepPanelContent packet={latestPacket} />
                    ) : (
                      <div className="py-2 px-3 text-center">
                        <p className="text-[10px] text-white/30 italic">
                          {state === "active"
                            ? "Work in progress — data will appear as the agent completes this phase."
                            : "No handoff data recorded for this phase."}
                        </p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Vertical connector line */}
            {i < PIPELINE_PHASES.length - 1 && (
              <div className="w-px bg-white/10 ml-[9px] h-2" />
            )}
          </div>
        )
      })}
    </div>
  )
}
