"use client"

import { useState } from "react"
import {
  Bot,
  FileText,
  PenTool,
  GitPullRequest,
  TestTube2,
  MessageSquare,
  Clock,
  Globe,
  ExternalLink,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react"
import { DecisionItem } from "./DecisionItem"
import { DiffView } from "./DiffView"
import { VersionSelector } from "./VersionSelector"
import { PhaseChatPanel } from "./PhaseChatPanel"
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

function formatTime(iso: string | null | undefined): string {
  if (!iso) return ""
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  } catch {
    return ""
  }
}

interface Agent {
  id: string
  name: string
  emoji: string | null
}

interface StepPanelContentProps {
  packet: HandoffPacket | null
  /** All packets for this phase, sorted by version ascending */
  phasePackets?: HandoffPacket[]
  /** The phase being viewed */
  phase: string
  /** Feature spec (shown in planning phase) */
  featureSpec?: string | null
  /** Design spec (shown in design_review phase) */
  designSpec?: string | null
  /** Acceptance criteria (shown in planning phase) */
  acceptanceCriteria?: string | null
  /** PR URL (shown in review/approved/pr_submitted/done phases) */
  prUrl?: string | null
  /** PR number */
  prNumber?: number | null
  /** PR status */
  prStatus?: string | null
  /** Vercel preview URL (shown in review phase) */
  vercelPreviewUrl?: string | null
  /** Feature ID for chat panel */
  featureId: string
  /** Agents list for chat */
  agents: Agent[]
  /** Approved by (for review/approved phases) */
  approvedBy?: string | null
}

export function StepPanelContent({
  packet,
  phasePackets,
  phase,
  featureSpec,
  designSpec,
  acceptanceCriteria,
  prUrl,
  prNumber,
  prStatus,
  vercelPreviewUrl,
  featureId,
  agents,
  approvedBy,
}: StepPanelContentProps) {
  const [showFull, setShowFull] = useState(false)
  const [showFullSpec, setShowFullSpec] = useState(false)
  const [selectedPacketId, setSelectedPacketId] = useState(packet?.id ?? "")
  const [diffMode, setDiffMode] = useState(false)

  const versions = phasePackets && phasePackets.length > 1
    ? phasePackets.map((p) => ({ id: p.id, version: p.version }))
    : undefined

  const activePacket = phasePackets?.find((p) => p.id === selectedPacketId) || packet
  const summary = activePacket?.output_summary || ""
  const truncated = summary.length > 300 && !showFull

  const showChat = phase === "planning" || phase === "review"
  const showFeatureSpec = phase === "planning" && featureSpec
  const showDesignSpec = phase === "design_review" && designSpec
  const showAcceptanceCriteria = phase === "planning" && acceptanceCriteria
  const showPreviewLink = phase === "review" && vercelPreviewUrl
  const showPrLink = (phase === "approved" || phase === "pr_submitted" || phase === "done") && prUrl
  const showApproval = (phase === "approved" || phase === "pr_submitted" || phase === "done") && approvedBy

  return (
    <div className="pt-1 space-y-3">
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
      {diffMode && activePacket && (
        <div className="mb-3">
          <DiffView featureId={activePacket.feature_id} packetId={selectedPacketId} />
        </div>
      )}

      {/* Agent Info + Timestamps */}
      {activePacket && (activePacket.agent_name || activePacket.started_at) && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 py-1.5 px-2 rounded bg-white/[0.03] border border-white/5">
          {activePacket.agent_name && (
            <div className="flex items-center gap-1.5">
              <Bot className="h-3 w-3 text-purple-400/60" />
              <span className="text-[10px] text-white/70 font-medium">{activePacket.agent_name}</span>
              <span className="text-[9px] text-white/30">
                {activePacket.agent_type === "ai_agent" ? "AI Agent" : "Human"}
              </span>
            </div>
          )}
          {activePacket.started_at && (
            <div className="flex items-center gap-1">
              <Clock className="h-2.5 w-2.5 text-white/30" />
              <span className="text-[9px] text-white/40">
                {formatTime(activePacket.started_at)}
                {activePacket.completed_at && ` → ${formatTime(activePacket.completed_at)}`}
              </span>
            </div>
          )}
          {activePacket.duration_ms && (
            <span className="text-[9px] bg-white/5 text-white/50 px-1.5 py-0.5 rounded">
              {formatDuration(activePacket.duration_ms)}
            </span>
          )}
        </div>
      )}

      {/* Vercel Preview Link (prominent for review phase) */}
      {showPreviewLink && (
        <a
          href={vercelPreviewUrl!}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-md text-[11px] font-medium bg-cyan-600/20 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-600/30 transition-colors"
        >
          <Globe className="h-4 w-4" />
          Open Vercel Preview
          <ExternalLink className="h-3 w-3" />
        </a>
      )}

      {/* Approval Status */}
      {showApproval && (
        <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-green-500/10 border border-green-500/20">
          <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
          <span className="text-[11px] text-green-300">Approved by {approvedBy}</span>
        </div>
      )}

      {/* PR Link */}
      {showPrLink && (
        <a
          href={prUrl!}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-2 py-1.5 rounded bg-purple-500/10 border border-purple-500/20 text-[11px] text-purple-300 hover:bg-purple-500/15 transition-colors"
        >
          <GitPullRequest className="h-3.5 w-3.5" />
          <span>PR #{prNumber}</span>
          {prStatus && (
            <span className={`text-[9px] px-1.5 py-0.5 rounded ${prStatus === 'merged' ? 'bg-green-500/20 text-green-400' : 'bg-purple-500/20 text-purple-400'}`}>
              {prStatus}
            </span>
          )}
          <ExternalLink className="h-2.5 w-2.5 ml-auto" />
        </a>
      )}

      {/* Summary */}
      {summary && (
        <div>
          <div className="text-[9px] text-white/30 uppercase tracking-wider mb-1">Summary</div>
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

      {/* Feature Spec (planning phase) */}
      {showFeatureSpec && (
        <div>
          <div className="text-[9px] text-white/30 uppercase tracking-wider mb-1 flex items-center gap-1">
            <FileText className="h-2.5 w-2.5" /> Feature Spec
          </div>
          <pre className="text-[11px] text-white/70 whitespace-pre-wrap font-mono bg-white/[0.02] rounded p-2 border border-white/5 max-h-60 overflow-y-auto">
            {showFullSpec ? featureSpec : featureSpec!.slice(0, 500) + (featureSpec!.length > 500 ? "…" : "")}
          </pre>
          {featureSpec!.length > 500 && (
            <button onClick={() => setShowFullSpec(!showFullSpec)} className="text-[10px] text-purple-400 hover:text-purple-300 mt-1">
              {showFullSpec ? "Show less" : "Show full spec"}
            </button>
          )}
        </div>
      )}

      {/* Acceptance Criteria (planning phase) */}
      {showAcceptanceCriteria && (
        <div>
          <div className="text-[9px] text-white/30 uppercase tracking-wider mb-1">Acceptance Criteria</div>
          <pre className="text-[11px] text-white/70 whitespace-pre-wrap font-mono bg-white/[0.02] rounded p-2 border border-white/5">
            {acceptanceCriteria}
          </pre>
        </div>
      )}

      {/* Design Spec (design_review phase) */}
      {showDesignSpec && (
        <div>
          <div className="text-[9px] text-white/30 uppercase tracking-wider mb-1 flex items-center gap-1">
            <PenTool className="h-2.5 w-2.5" /> Design Spec
          </div>
          <pre className="text-[11px] text-white/70 whitespace-pre-wrap font-mono bg-white/[0.02] rounded p-2 border border-white/5 max-h-60 overflow-y-auto">
            {showFullSpec ? designSpec : designSpec!.slice(0, 500) + (designSpec!.length > 500 ? "…" : "")}
          </pre>
          {designSpec!.length > 500 && (
            <button onClick={() => setShowFullSpec(!showFullSpec)} className="text-[10px] text-purple-400 hover:text-purple-300 mt-1">
              {showFullSpec ? "Show less" : "Show full spec"}
            </button>
          )}
        </div>
      )}

      {/* Artifacts */}
      {(activePacket?.output_artifacts?.length ?? 0) > 0 && (
        <div>
          <div className="text-[9px] text-white/30 uppercase tracking-wider mb-1">
            Artifacts
          </div>
          <div className="flex flex-wrap gap-1">
            {activePacket!.output_artifacts!.map((artifact: Artifact, i: number) => (
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
      {(activePacket?.output_decisions?.length ?? 0) > 0 && (
        <div>
          <div className="text-[9px] text-white/30 uppercase tracking-wider mb-1">
            Decisions ({activePacket!.output_decisions!.length})
          </div>
          <div className="space-y-1.5">
            {activePacket!.output_decisions!.map((decision, i) => (
              <DecisionItem key={i} decision={decision} />
            ))}
          </div>
        </div>
      )}

      {/* Activity Log */}
      {(activePacket?.activity_log?.length ?? 0) > 0 && (
        <div>
          <div className="text-[9px] text-white/30 uppercase tracking-wider mb-1">Activity Log</div>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {activePacket!.activity_log!.map((event, i) => (
              <div key={i} className="flex items-start gap-2 text-[10px]">
                <span className="text-white/30 flex-shrink-0">{formatTime(event.timestamp)}</span>
                <span className="text-white/50">{event.action}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cost */}
      {activePacket && (activePacket.cost_usd || activePacket.cost_tokens_in) && (
        <div className="flex items-center gap-2 text-[9px] text-white/30 pt-2 border-t border-white/5">
          {activePacket.cost_usd && <span>${Number(activePacket.cost_usd).toFixed(4)}</span>}
          {activePacket.cost_tokens_in && (
            <span>↓{(activePacket.cost_tokens_in / 1000).toFixed(1)}k</span>
          )}
          {activePacket.cost_tokens_out && (
            <span>↑{(activePacket.cost_tokens_out / 1000).toFixed(1)}k</span>
          )}
        </div>
      )}

      {/* Embedded Chat (planning + review phases) */}
      {showChat && (
        <PhaseChatPanel
          featureId={featureId}
          phase={phase as "planning" | "review"}
          agents={agents}
        />
      )}

      {/* No data fallback */}
      {!activePacket && !showFeatureSpec && !showDesignSpec && !showChat && !showPreviewLink && !showPrLink && (
        <div className="flex flex-col items-center justify-center h-20 text-center">
          <p className="text-[11px] text-white/40">No data for this phase yet</p>
          <p className="text-[10px] text-white/25 mt-1">Data will appear as the agent completes this phase.</p>
        </div>
      )}
    </div>
  )
}
