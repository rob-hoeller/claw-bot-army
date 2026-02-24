"use client"

import { useState } from "react"
import {
  Bot,
  FileText,
  PenTool,
  GitPullRequest,
  TestTube2,
  MessageSquare,
} from "lucide-react"
import { DecisionItem } from "./DecisionItem"
import { DiffView } from "./DiffView"
import { VersionSelector } from "./VersionSelector"
import type { HandoffPacket, Artifact } from "./types"

const artifactIconMap: Record<string, typeof FileText> = {
  spec: FileText,
  design_doc: PenTool,
  code_change: GitPullRequest,
  test_results: TestTube2,
  review_feedback: MessageSquare,
  pr_document: GitPullRequest,
  other: FileText,
}

function ArtifactIcon({ type }: { type: string }) {
  const Icon = artifactIconMap[type] || FileText
  return <Icon className="h-2.5 w-2.5" />
}

interface StepPanelContentProps {
  packet: HandoffPacket
  /** All packets for this phase, sorted by version ascending */
  phasePackets?: HandoffPacket[]
}

export function StepPanelContent({ packet, phasePackets }: StepPanelContentProps) {
  const [showFull, setShowFull] = useState(false)
  const [selectedPacketId, setSelectedPacketId] = useState(packet.id)
  const [diffMode, setDiffMode] = useState(false)
  const versions = phasePackets && phasePackets.length > 1
    ? phasePackets.map((p) => ({ id: p.id, version: p.version }))
    : undefined

  const activePacket = phasePackets?.find((p) => p.id === selectedPacketId) || packet
  const summary = activePacket.output_summary || ""
  const truncated = summary.length > 300 && !showFull

  return (
    <div className="pt-2">
      {/* Version Selector */}
      {versions && (
        <VersionSelector
          versions={versions}
          selectedId={selectedPacketId}
          onSelect={(id) => {
            setSelectedPacketId(id)
            setDiffMode(false)
          }}
          diffMode={diffMode}
          onToggleDiff={() => setDiffMode(!diffMode)}
        />
      )}

      {/* Diff View */}
      {diffMode && (
        <div className="mb-3">
          <DiffView featureId={activePacket.feature_id} packetId={selectedPacketId} />
        </div>
      )}

      {/* Agent Info */}
      {activePacket.agent_name && (
        <div className="flex items-center gap-2 mb-2 py-1">
          <Bot className="h-3 w-3 text-purple-400/60" />
          <span className="text-[10px] text-white/60">{activePacket.agent_name}</span>
          <span className="text-[9px] text-white/30">•</span>
          <span className="text-[9px] text-white/30">
            {activePacket.agent_type === "ai_agent" ? "AI Agent" : "Human"}
          </span>
        </div>
      )}

      {/* Summary */}
      {summary && (
        <div className="mb-3">
          <p className="text-[11px] text-white/70 leading-relaxed whitespace-pre-wrap">
            {truncated ? summary.slice(0, 300) + "…" : summary}
          </p>
          {summary.length > 300 && (
            <button
              onClick={() => setShowFull(!showFull)}
              className="text-[10px] text-purple-400 hover:text-purple-300 mt-1"
            >
              {showFull ? "Show less" : "Show more"}
            </button>
          )}
        </div>
      )}

      {/* Artifacts */}
      {(activePacket.output_artifacts?.length ?? 0) > 0 && (
        <div className="mb-3">
          <div className="text-[9px] text-white/30 uppercase tracking-wider mb-1">
            Artifacts
          </div>
          <div className="flex flex-wrap gap-1">
            {activePacket.output_artifacts!.map((artifact: Artifact, i: number) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded bg-blue-500/10 text-blue-300 border border-blue-500/20 hover:bg-blue-500/20 cursor-pointer transition-colors"
                title={artifact.title}
              >
                <ArtifactIcon type={artifact.type} />
                {artifact.title}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Decisions */}
      {(activePacket.output_decisions?.length ?? 0) > 0 && (
        <div className="mb-3">
          <div className="text-[9px] text-white/30 uppercase tracking-wider mb-1">
            Decisions ({activePacket.output_decisions!.length})
          </div>
          <div className="space-y-1.5">
            {activePacket.output_decisions!.map((decision, i) => (
              <DecisionItem key={i} decision={decision} />
            ))}
          </div>
        </div>
      )}

      {/* Cost */}
      {(activePacket.cost_usd || activePacket.cost_tokens_in) && (
        <div className="flex items-center gap-2 text-[9px] text-white/30 mt-2 pt-2 border-t border-white/5">
          {activePacket.cost_usd && <span>${Number(activePacket.cost_usd).toFixed(4)}</span>}
          {activePacket.cost_tokens_in && (
            <span>↓{(activePacket.cost_tokens_in / 1000).toFixed(1)}k</span>
          )}
          {activePacket.cost_tokens_out && (
            <span>↑{(activePacket.cost_tokens_out / 1000).toFixed(1)}k</span>
          )}
        </div>
      )}
    </div>
  )
}
