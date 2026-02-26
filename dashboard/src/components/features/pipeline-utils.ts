/**
 * pipeline-utils.ts
 * Pure utility functions for deriving pipeline step data from Feature objects.
 */

import type { Feature, FeatureStatus } from "@/hooks/useRealtimeFeatures"
import type {
  PipelineStepData,
  PipelineStepId,
  PipelineStepStatus,
} from "./pipeline.types"

// ─── Step Configuration ──────────────────────────────────────────────────────

interface StepConfig {
  id: PipelineStepId
  index: number
  label: string
  agent: string
  icon: string
}

const STEP_CONFIGS: StepConfig[] = [
  { id: "intake", index: 1, label: "Intake", agent: "HBx", icon: "📥" },
  { id: "spec", index: 2, label: "Spec", agent: "IN1", icon: "📋" },
  { id: "design", index: 3, label: "Design", agent: "IN5", icon: "🎨" },
  { id: "build", index: 4, label: "Build", agent: "IN2", icon: "🔧" },
  { id: "qa", index: 5, label: "QA", agent: "IN6", icon: "🧪" },
  { id: "ship", index: 6, label: "Ship", agent: "HBx", icon: "🚀" },
]

// ─── Terminal Statuses ───────────────────────────────────────────────────────

const TERMINAL_STATUSES: FeatureStatus[] = [
  "done",
  "cancelled",
  "approved",
  "pr_submitted",
]

const COMPLETION_VERDICTS = ["APPROVED", "COMPLETE", "SHIP"]

// ─── derivePipelineSteps ─────────────────────────────────────────────────────

/**
 * Maps a Feature's pipeline_log, current_agent, and status into the ordered
 * 6-step model. Pure function — no side effects.
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
export function derivePipelineSteps(feature: Feature): PipelineStepData[] {
  const log = feature.pipeline_log || []
  const currentAgent = feature.current_agent
  const status = feature.status
  const isTerminal = TERMINAL_STATUSES.includes(status)

  return STEP_CONFIGS.map((config) => {
    const stepLogEntries = log.filter((entry) => entry.agent === config.agent)
    const allLogEntries = log

    // Find completion entry
    const completionEntry = stepLogEntries.find((entry) =>
      COMPLETION_VERDICTS.includes(entry.verdict)
    )

    // Find most recent entry for this agent
    const mostRecentEntry = stepLogEntries[stepLogEntries.length - 1]

    // Find first entry for this agent (start time)
    const firstEntry = stepLogEntries[0]

    // Determine step status
    let stepStatus: PipelineStepStatus = "pending"

    // Special handling for intake step: completed once any downstream step has started
    if (config.id === "intake") {
      const hasDownstreamActivity = STEP_CONFIGS.slice(1).some((step) =>
        log.some((entry) => entry.agent === step.agent)
      )
      if (hasDownstreamActivity || log.length > 0) {
        stepStatus = "completed"
      }
    }
    // Special handling for ship step: completed when feature is done or pr_submitted
    else if (config.id === "ship") {
      if (status === "done" || status === "pr_submitted") {
        stepStatus = "completed"
      } else if (currentAgent === config.agent && !isTerminal) {
        stepStatus = "running"
      }
    }
    // Normal step logic
    else {
      // Check if completed
      if (completionEntry) {
        stepStatus = "completed"
      }
      // Check if advanced past this step (implicit completion)
      else {
        const currentStepIndex = STEP_CONFIGS.findIndex(
          (s) => s.agent === currentAgent
        )
        if (currentStepIndex !== -1 && currentStepIndex > config.index) {
          stepStatus = "completed"
        }
      }

      // Check if running
      if (
        stepStatus !== "completed" &&
        currentAgent === config.agent &&
        !isTerminal
      ) {
        stepStatus = "running"
      }

      // Check for error state
      if (
        stepStatus === "pending" &&
        mostRecentEntry &&
        mostRecentEntry.verdict === "REJECT"
      ) {
        // Check if stalled (no subsequent progress)
        const recentIndex = allLogEntries.indexOf(mostRecentEntry)
        const hasSubsequentProgress =
          recentIndex !== -1
            ? allLogEntries
                .slice(recentIndex + 1)
                .some((entry) => COMPLETION_VERDICTS.includes(entry.verdict))
            : false

        if (!hasSubsequentProgress && status !== "cancelled") {
          stepStatus = "error"
        }
      }
    }

    // Calculate timestamps
    const startedAt = firstEntry ? firstEntry.timestamp : null
    const completedAt = completionEntry ? completionEntry.timestamp : null

    // Calculate elapsed time
    // Note: Uses Date.now() for live elapsed time. The nowMs prop in PipelineStepProps
    // is available for testing overrides but not wired through derivePipelineSteps.
    let elapsedMs: number | null = null
    if (startedAt) {
      if (completedAt) {
        elapsedMs =
          new Date(completedAt).getTime() - new Date(startedAt).getTime()
      } else if (stepStatus === "running") {
        elapsedMs = Date.now() - new Date(startedAt).getTime()
      }
    }

    // Count revision loops
    const revisionCount = stepLogEntries.filter(
      (entry) => entry.verdict === "REVISE"
    ).length

    return {
      id: config.id,
      index: config.index,
      label: config.label,
      agent: config.agent,
      icon: config.icon,
      stepStatus,
      startedAt,
      completedAt,
      elapsedMs,
      logEntries: stepLogEntries,
      revisionCount,
    }
  })
}

// ─── Helper: Format Elapsed Time ─────────────────────────────────────────────

/**
 * Format elapsed milliseconds as a human-readable duration.
 * Examples: "2m", "45s", "1h 23m"
 */
export function formatElapsedTime(ms: number | null): string {
  if (ms === null) return "—"

  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) {
    const remainingHours = hours % 24
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`
  }
  if (hours > 0) {
    const remainingMinutes = minutes % 60
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
  }
  if (minutes > 0) {
    return `${minutes}m`
  }
  return `${seconds}s`
}

// ─── Helper: Generate Agent Chain Summary ───────────────────────────────────

/**
 * Generate a human-readable agent chain summary for a workflow card.
 * Examples: "IN1 specs → IN5 designs → IN2 builds"
 */
export function generateAgentChainSummary(steps: PipelineStepData[]): string {
  // Get all steps that have been started or are active
  const activeSteps = steps.filter(
    (s) =>
      s.stepStatus === "completed" ||
      s.stepStatus === "running" ||
      s.stepStatus === "error"
  )

  if (activeSteps.length === 0) {
    return "Waiting to start"
  }

  // Map to agent + verb
  const chains = activeSteps.map((step) => {
    const verb =
      step.id === "intake"
        ? "intake"
        : step.id === "spec"
          ? "specs"
          : step.id === "design"
            ? "designs"
            : step.id === "build"
              ? "builds"
              : step.id === "qa"
                ? "tests"
                : "ships"

    return `${step.agent} ${verb}`
  })

  return chains.join(" → ")
}
