/**
 * mission.types.ts
 * Type contracts for the Mission Control system.
 */

import type {
  Feature,
  FeatureStatus,
} from "@/hooks/useRealtimeFeatures"
import type { PipelineStepId, PipelineStepData } from "../features/pipeline.types"

// Re-export pipeline types for convenience
export type { PipelineStepId, PipelineStepData }

// ─── Mission Status ──────────────────────────────────────────────────────────

/**
 * High-level mission states for grouping in the feed.
 */
export type MissionStatus = "active" | "needs_attention" | "completed" | "cancelled"

/**
 * Type of attention required from the user.
 */
export type AttentionType = "review" | "approve" | "error"

// ─── Activity Event Types ────────────────────────────────────────────────────

/**
 * All possible agent activity event types for the live stream.
 */
export type ActivityEventType =
  | "thinking"
  | "file_edit"
  | "file_create"
  | "command"
  | "result"
  | "decision"
  | "handoff"
  | "gate"
  | "revision"

/**
 * Agent activity event from the agent_activity table.
 */
export interface AgentActivityEvent {
  id: string
  feature_id: string
  agent_id: string
  step_id: PipelineStepId
  event_type: ActivityEventType
  content: string
  metadata: Record<string, unknown>
  created_at: string
}

// ─── Mission Feed Types ──────────────────────────────────────────────────────

/**
 * Grouped feature sets for the mission feed.
 */
export interface MissionFeedData {
  needsAttention: Feature[]
  activeMissions: Feature[]
  recentlyCompleted: Feature[]
  isLoading: boolean
}

export interface MissionFeedProps {
  data: MissionFeedData
  selectedFeatureId?: string
  onSelectFeature: (featureId: string) => void
}

// ─── Mission Card ────────────────────────────────────────────────────────────

export interface MissionCardProps {
  feature: Feature
  steps: PipelineStepData[]
  isSelected: boolean
  onClick: () => void
  className?: string
}

// ─── Mission Detail Panel ────────────────────────────────────────────────────

export type MissionDetailTab = "pipeline" | "activity" | "chat" | "audit"

export interface MissionDetailPanelProps {
  feature: Feature
  onClose: () => void
  className?: string
}

// ─── Command Bar ─────────────────────────────────────────────────────────────

export interface CommandBarProps {
  onSubmit: (data: {
    title: string
    description: string
    priority: "low" | "medium" | "high" | "urgent"
  }) => Promise<void>
  isSubmitting?: boolean
  className?: string
}

// ─── Agent Activity Stream ───────────────────────────────────────────────────

export interface AgentActivityStreamProps {
  featureId: string
  stepFilter?: PipelineStepId
  agentFilter?: string
  maxEvents?: number
  className?: string
}

// ─── Activity Event ──────────────────────────────────────────────────────────

export interface ActivityEventProps {
  event: AgentActivityEvent
  agentName?: string
  className?: string
}

// ─── Human Gate ──────────────────────────────────────────────────────────────

export interface HumanGateProps {
  feature: Feature
  attentionType: AttentionType
  onApprove: () => Promise<void>
  onRevise: (feedback?: string) => Promise<void>
  onEscalate?: (reason?: string) => Promise<void>
  className?: string
}

// ─── Mission Control Layout ──────────────────────────────────────────────────

export interface MissionControlProps {
  className?: string
}
