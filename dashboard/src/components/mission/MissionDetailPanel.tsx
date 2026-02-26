"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { X } from "lucide-react"
import type { MissionDetailPanelProps, MissionDetailTab, AttentionType } from "./mission.types"
import { cn } from "@/lib/utils"
import { AgentActivityStream } from "./AgentActivityStream"
import { HumanGate } from "./HumanGate"
// Import existing components (assumed to exist)
// @ts-ignore - These may need path adjustments
import { LivePipelineView } from "../features/LivePipelineView"
// @ts-ignore
import { PhaseChatPanel } from "../chat/PhaseChatPanel"
// @ts-ignore
import { AuditTrailTab } from "../audit/AuditTrailTab"

/**
 * MissionDetailPanel
 * 
 * Right panel that slides in when a feature is selected:
 * - Tabbed interface: Pipeline | Activity | Chat | Audit Trail
 * - Feature title + description at top
 * - HumanGate component when needs_attention = true
 * - Close button to deselect
 */
export function MissionDetailPanel({ feature, onClose, className }: MissionDetailPanelProps) {
  const [activeTab, setActiveTab] = useState<MissionDetailTab>("pipeline")

  // @ts-ignore - needs_attention may not be in type yet
  const needsAttention = feature.needs_attention === true
  // @ts-ignore - attention_type may not be in type yet
  const attentionType: AttentionType = feature.attention_type || "review"

  const handleApprove = async () => {
    // TODO: Call API to approve and advance pipeline
    try {
      const response = await fetch(`/api/features/${feature.id}/review-verdict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verdict: "approve" }),
      })

      if (!response.ok) throw new Error("Failed to approve")

      // Success feedback handled by realtime update
    } catch (error) {
      console.error("Failed to approve:", error)
      alert("Failed to approve. Please try again.")
    }
  }

  const handleRevise = async (feedback?: string) => {
    // TODO: Call API to request revisions
    try {
      const response = await fetch(`/api/features/${feature.id}/review-verdict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verdict: "revise", feedback }),
      })

      if (!response.ok) throw new Error("Failed to request revision")
    } catch (error) {
      console.error("Failed to request revision:", error)
      alert("Failed to submit feedback. Please try again.")
    }
  }

  const handleEscalate = async (reason?: string) => {
    // TODO: Call API to escalate
    try {
      const response = await fetch(`/api/features/${feature.id}/escalate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      })

      if (!response.ok) throw new Error("Failed to escalate")
    } catch (error) {
      console.error("Failed to escalate:", error)
      alert("Failed to escalate. Please try again.")
    }
  }

  const tabs: { id: MissionDetailTab; label: string; icon: string }[] = [
    { id: "pipeline", label: "Pipeline", icon: "🔄" },
    { id: "activity", label: "Activity", icon: "📡" },
    { id: "chat", label: "Chat", icon: "💬" },
    { id: "audit", label: "Audit Trail", icon: "📋" },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 50 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "h-full flex flex-col bg-slate-950/80 border-l border-white/10",
        className
      )}
    >
      {/* Header */}
      <div className="border-b border-white/10 p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-white mb-1 line-clamp-2">
              {feature.title}
            </h2>
            {feature.description && (
              <p className="text-sm text-white/60 line-clamp-2">{feature.description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/40 hover:text-white/70 hover:bg-white/5 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Human Gate (when attention needed) */}
        {needsAttention && (
          <HumanGate
            feature={feature}
            attentionType={attentionType}
            onApprove={handleApprove}
            onRevise={handleRevise}
            onEscalate={handleEscalate}
          />
        )}

        {/* Tab navigation */}
        <div className="flex items-center gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded transition-colors whitespace-nowrap",
                activeTab === tab.id
                  ? "bg-purple-500/20 text-purple-200 border border-purple-500/30"
                  : "text-white/50 hover:text-white/70 hover:bg-white/5"
              )}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "pipeline" && (
          <div className="h-full overflow-y-auto p-4">
            <LivePipelineView feature={feature} />
          </div>
        )}

        {activeTab === "activity" && (
          <AgentActivityStream featureId={feature.id} className="h-full" />
        )}

        {activeTab === "chat" && (
          <div className="h-full">
            <PhaseChatPanel featureId={feature.id} />
          </div>
        )}

        {activeTab === "audit" && (
          <div className="h-full overflow-y-auto p-4">
            <AuditTrailTab feature={feature} />
          </div>
        )}
      </div>
    </motion.div>
  )
}
