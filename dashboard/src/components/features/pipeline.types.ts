/**
 * pipeline.types.ts
 * API contracts for LivePipelineView, ActiveWorkflowsBoard, and all sub-components.
 */

import type { Feature, FeatureStatus } from "@/hooks/useRealtimeFeatures"

// ─── Enums & Primitives ──────────────────────────────────────────────────────

export type PipelineStepStatus = "completed" | "running" | "pending" | "error"

export type PipelineStepId = "intake" | "spec" | "design" | "build" | "qa" | "ship"

export type ConnectorState = "completed" | "active" | "pending"

// ─── Core Data Model ─────────────────────────────────────────────────────────

/** Derived from Feature; drives all step rendering. */
export interface PipelineStepData {
  /** Stable identifier; corresponds to the 6-step model. */
  id: PipelineStepId
  /** 1-based display index. */
  index: number
  /** Display name shown under the icon. */
  label: string
  /** Agent ID that owns this step (e.g. "IN1", "HBx"). */
  agent: string
  /** Emoji icon for this step. */
  icon: string
  /** Computed from pipeline_log + current_agent + status. */
  stepStatus: PipelineStepStatus
  /**
   * ISO timestamp when this step started (from the first pipeline_log entry
   * whose agent matches this step). Null if not yet started.
   */
  startedAt: string | null
  /**
   * ISO timestamp when this step completed (from the pipeline_log entry with
   * an APPROVED / COMPLETE / SHIP verdict for this step). Null if not yet
   * completed.
   */
  completedAt: string | null
  /**
   * Elapsed milliseconds. Computed as completedAt - startedAt for completed
   * steps; Date.now() - startedAt for the running step; null for pending.
   */
  elapsedMs: number | null
  /**
   * All pipeline_log entries that belong to this step, in chronological order.
   * Used by PipelineTerminal to filter logs per step.
   */
  logEntries: Feature["pipeline_log"]
  /**
   * Number of revision loops recorded for this step; 0 if none.
   */
  revisionCount: number
}

// ─── derivePipelineSteps helper ─────────────────────────────────────────────

/**
 * Maps a Feature's pipeline_log, current_agent, and status into the ordered
 * 6-step model.  Pure function — no side effects.
 *
 * Rules:
 * - A step is "completed" if pipeline_log contains an entry for its agent with
 *   verdict APPROVED | COMPLETE | SHIP (or the feature has advanced past that
 *   agent in the canonical step order).
 * - A step is "running" if feature.current_agent === step.agent AND the
 *   feature is not in a terminal status (done, cancelled, approved, pr_submitted).
 * - A step is "error" if the most recent log entry for this agent has verdict
 *   REJECT and the feature is stalled (no subsequent completed entry).
 * - All other steps are "pending".
 * - The ship step is "completed" when feature.status === "done" or
 *   "pr_submitted".
 * - The intake step is always "completed" once any downstream step has started.
 */
export declare function derivePipelineSteps(feature: Feature): PipelineStepData[]

// ─── PipelineStep ────────────────────────────────────────────────────────────

export interface PipelineStepProps {
  step: PipelineStepData
  /**
   * Whether this is the currently active step; controls the pulsing/glowing
   * border animation via Framer Motion.
   */
  isActive: boolean
  /**
   * Provide to override the live elapsed-ms ticker so tests / Storybook can
   * supply a fixed value.
   */
  nowMs?: number
  /** Called when the user clicks the step node. */
  onClick?: (stepId: PipelineStepId) => void
}

// ─── PipelineConnector ──────────────────────────────────────────────────────

export interface PipelineConnectorProps {
  /** Drives the visual style: solid-green | animated-dashed-gold | gray. */
  state: ConnectorState
  /**
   * Horizontal width of the connector in pixels; defaults to auto-fill the
   * space between two step nodes.
   */
  widthPx?: number
  /** Accessibility label for the connector (screen reader only). */
  "aria-label"?: string
}

// ─── PipelineTerminal ────────────────────────────────────────────────────────

export interface TerminalLine {
  /** Unique key derived from entry index + timestamp. */
  key: string
  /** ISO timestamp string from pipeline_log entry. */
  timestamp: string
  /** Agent ID (e.g. "IN1"). */
  agent: string
  /** Human-readable action/stage label. */
  action: string
  /** Verdict string (APPROVED, REVISE, etc.) or null for in-progress lines. */
  verdict: string | null
  /**
   * Additional detail lines (issues, notes).  Rendered indented below the
   * main line.
   */
  details: string[]
  /** Revision loop number, if any. */
  revisionLoop?: number
}

export interface PipelineTerminalProps {
  /**
   * All log entries to display, already mapped to TerminalLine shape.
   * Caller is responsible for ordering (chronological, ascending).
   */
  lines: TerminalLine[]
  /**
   * When true, renders a blinking cursor on the last line to signal live
   * streaming.
   */
  isStreaming: boolean
  /**
   * Restrict output to entries belonging to this step.  When undefined, all
   * entries are shown.
   */
  filterStepId?: PipelineStepId
  /**
   * Maximum visible height of the terminal panel in pixels; panel scrolls
   * internally.  Defaults to 320.
   */
  maxHeightPx?: number
  /** Called when the user clicks the copy-to-clipboard button. */
  onCopy?: () => void
}

// ─── LivePipelineView ────────────────────────────────────────────────────────

export interface LivePipelineViewProps {
  /** The feature whose pipeline is being displayed. */
  feature: Feature
  /**
   * When true, renders skeleton placeholder steps instead of real data.
   * Useful while the parent is still loading feature data.
   */
  isLoading?: boolean
  /**
   * If provided, filters the terminal log to only show lines from this step.
   * When undefined, all lines are shown.
   */
  selectedStepId?: PipelineStepId
  /** Called when a step node is clicked; parent can update selectedStepId. */
  onStepClick?: (stepId: PipelineStepId) => void
  /**
   * Optional CSS class name applied to the root container; allows the parent
   * to control sizing / positioning.
   */
  className?: string
}

// ─── WorkflowStepIcon ────────────────────────────────────────────────────────

export interface WorkflowStepIconProps {
  stepId: PipelineStepId
  status: PipelineStepStatus
  /** Emoji icon character. */
  icon: string
  /** When true, renders the running animation (pulsing ring). */
  animate?: boolean
  /** Size variant; defaults to "sm". */
  size?: "xs" | "sm" | "md"
  /** Tooltip text; shown on hover. */
  tooltip?: string
}

// ─── WorkflowCard ────────────────────────────────────────────────────────────

export interface WorkflowCardProps {
  feature: Feature
  /**
   * Derived step data; pass the output of derivePipelineSteps(feature) so
   * the card doesn't recompute it (avoids redundant work when rendering a
   * list).
   */
  steps: PipelineStepData[]
  /**
   * When true, renders a subtle highlight/glow to indicate the feature just
   * changed (maps to the justMoved set in useRealtimeFeatures).
   */
  isJustMoved?: boolean
  /** Called when the card is clicked; parent handles navigation. */
  onClick: (featureId: string) => void
  /**
   * When true, renders a compact single-row skeleton placeholder instead of
   * real data.
   */
  isLoading?: boolean
}

// ─── ActiveWorkflowsBoard ────────────────────────────────────────────────────

/** Criteria for which features appear in the board. */
export interface WorkflowBoardFilter {
  /**
   * Statuses to exclude.  Defaults to ["done", "cancelled"].
   */
  excludeStatuses?: FeatureStatus[]
  /**
   * When provided, only features assigned to this agent are shown.
   * Useful for filtering by agent in a team view.
   */
  agentId?: string
}

export interface ActiveWorkflowsBoardProps {
  features: Feature[]
  /**
   * Set of feature IDs that recently updated; used to drive per-card glow
   * animations (sourced from useRealtimeFeatures justMoved).
   */
  justMoved: Set<string>
  /** When true, renders a loading skeleton of N placeholder cards. */
  isLoading?: boolean
  /**
   * Number of skeleton cards to render while loading.  Defaults to 3.
   */
  skeletonCount?: number
  /** Optional filtering criteria.  Defaults applied when omitted. */
  filter?: WorkflowBoardFilter
  /**
   * Called when the user clicks a workflow card; parent handles routing to
   * the feature detail view.
   */
  onSelectFeature: (featureId: string) => void
  /**
   * When provided, this featureId's card renders in an expanded/highlighted
   * state.
   */
  activeFeatureId?: string
  className?: string
}
