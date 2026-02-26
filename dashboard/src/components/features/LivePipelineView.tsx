"use client"

import { useMemo, useState, useEffect } from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { Check, Loader2, Circle, AlertCircle } from "lucide-react"
import type {
  LivePipelineViewProps,
  PipelineStepData,
  ConnectorState,
  TerminalLine,
  PipelineStepId,
} from "./pipeline.types"
import { derivePipelineSteps, formatElapsedTime } from "./pipeline-utils"
import { PipelineTerminal } from "./PipelineTerminal"
import { Skeleton } from "@/components/shared/Skeletons"

// ─── Step Component ──────────────────────────────────────────────────────────

interface PipelineStepProps {
  step: PipelineStepData
  isActive: boolean
  onClick?: (stepId: PipelineStepId) => void
}

function PipelineStep({ step, isActive, onClick }: PipelineStepProps) {
  const [liveElapsed, setLiveElapsed] = useState(step.elapsedMs)

  // Live ticker for running steps
  useEffect(() => {
    if (step.stepStatus !== "running" || !step.startedAt) {
      setLiveElapsed(step.elapsedMs)
      return
    }

    const interval = setInterval(() => {
      const now = Date.now()
      const start = new Date(step.startedAt!).getTime()
      setLiveElapsed(now - start)
    }, 1000)

    return () => clearInterval(interval)
  }, [step.stepStatus, step.startedAt, step.elapsedMs])

  // Icon based on status
  const Icon =
    step.stepStatus === "completed"
      ? Check
      : step.stepStatus === "running"
        ? Loader2
        : step.stepStatus === "error"
          ? AlertCircle
          : Circle

  const iconColor =
    step.stepStatus === "completed"
      ? "text-green-400"
      : step.stepStatus === "running"
        ? "text-amber-400"
        : step.stepStatus === "error"
          ? "text-red-400"
          : "text-white/30"

  const borderColor =
    step.stepStatus === "completed"
      ? "border-green-400/40"
      : step.stepStatus === "running"
        ? "border-amber-400/40"
        : step.stepStatus === "error"
          ? "border-red-400/40"
          : "border-white/10"

  return (
    <motion.div
      className={cn(
        "relative flex flex-col items-center gap-2 p-4 rounded-xl bg-slate-800 border transition-all cursor-pointer",
        borderColor,
        isActive && "ring-2 ring-amber-400/50"
      )}
      animate={
        isActive
          ? {
              boxShadow: [
                "0 0 0px rgba(251, 191, 36, 0)",
                "0 0 20px rgba(251, 191, 36, 0.4)",
                "0 0 0px rgba(251, 191, 36, 0)",
              ],
            }
          : {}
      }
      transition={{ duration: 2, repeat: isActive ? Infinity : 0 }}
      onClick={() => onClick?.(step.id)}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onClick?.(step.id)
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`${step.label} step: ${step.stepStatus}`}
      aria-pressed={isActive}
    >
      {/* Icon */}
      <div
        className={cn(
          "flex items-center justify-center w-12 h-12 rounded-full border-2",
          step.stepStatus === "completed"
            ? "bg-green-400/10 border-green-400"
            : step.stepStatus === "running"
              ? "bg-amber-400/10 border-amber-400"
              : step.stepStatus === "error"
                ? "bg-red-400/10 border-red-400"
                : "bg-white/5 border-white/20"
        )}
      >
        <Icon
          className={cn(
            "w-6 h-6",
            iconColor,
            step.stepStatus === "running" && "animate-spin"
          )}
        />
      </div>

      {/* Step info */}
      <div className="text-center min-w-[80px]">
        <div className="text-sm font-medium text-white">{step.label}</div>
        <div className="text-xs text-white/50">{step.agent}</div>
        {liveElapsed !== null && (
          <div className="text-xs text-white/40 mt-1">
            {formatElapsedTime(liveElapsed)}
          </div>
        )}
        {step.revisionCount > 0 && (
          <div className="text-[10px] text-yellow-400/60 mt-0.5">
            {step.revisionCount} rev{step.revisionCount > 1 ? "s" : ""}
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ─── Connector Component ─────────────────────────────────────────────────────

interface PipelineConnectorProps {
  state: ConnectorState
}

function PipelineConnector({ state }: PipelineConnectorProps) {
  const lineColor =
    state === "completed"
      ? "bg-green-400"
      : state === "active"
        ? "bg-amber-400"
        : "bg-white/20"

  return (
    <div className="flex items-center justify-center flex-shrink-0 w-12">
      <div className="relative h-0.5 w-full">
        <div className={cn("h-full", lineColor)} />
        {state === "active" && (
          <motion.div
            className="absolute inset-0 h-full bg-amber-400"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}
      </div>
    </div>
  )
}

// ─── Loading Skeleton ────────────────────────────────────────────────────────

function PipelineViewSkeleton() {
  return (
    <div className="space-y-6">
      {/* Step row skeleton */}
      <div className="flex items-center gap-3 overflow-x-auto pb-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="w-32 h-36 rounded-xl" />
            {i < 5 && <Skeleton className="w-12 h-0.5" />}
          </div>
        ))}
      </div>
      {/* Terminal skeleton */}
      <Skeleton className="w-full h-64 rounded-xl" />
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function LivePipelineView({
  feature,
  isLoading,
  selectedStepId,
  onStepClick,
  className,
}: LivePipelineViewProps) {
  // Derive pipeline steps
  const steps = useMemo(() => derivePipelineSteps(feature), [feature])

  // Convert pipeline_log to TerminalLine format
  const terminalLines = useMemo((): TerminalLine[] => {
    const log = feature.pipeline_log || []
    return log.map((entry, idx) => ({
      key: `${idx}-${entry.timestamp}`,
      timestamp: entry.timestamp,
      agent: entry.agent,
      action: `${entry.stage.charAt(0).toUpperCase() + entry.stage.slice(1)}`,
      verdict: entry.verdict,
      details: entry.issues || [],
      revisionLoop: entry.revision_loop,
    }))
  }, [feature.pipeline_log])

  // Determine which step is active
  const activeStepId = steps.find((s) => s.stepStatus === "running")?.id

  // Determine connector states
  const getConnectorState = (fromIndex: number): ConnectorState => {
    const fromStep = steps[fromIndex]
    const toStep = steps[fromIndex + 1]
    if (fromStep.stepStatus === "completed") {
      return toStep.stepStatus === "running" ? "active" : "completed"
    }
    return "pending"
  }

  // Check if streaming (any step is running)
  const isStreaming = steps.some((s) => s.stepStatus === "running")

  if (isLoading) {
    return (
      <div className={cn("space-y-6", className)}>
        <PipelineViewSkeleton />
      </div>
    )
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Pipeline Steps Row */}
      <div
        className="flex items-center gap-3 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
        role="region"
        aria-label="Pipeline steps"
        tabIndex={0}
      >
        {steps.map((step, idx) => (
          <div key={step.id} className="flex items-center gap-3">
            <PipelineStep
              step={step}
              isActive={activeStepId === step.id}
              onClick={onStepClick}
            />
            {idx < steps.length - 1 && (
              <PipelineConnector state={getConnectorState(idx)} />
            )}
          </div>
        ))}
      </div>

      {/* Pipeline Terminal */}
      <PipelineTerminal
        lines={terminalLines}
        isStreaming={isStreaming}
        filterStepId={selectedStepId}
      />
    </div>
  )
}
