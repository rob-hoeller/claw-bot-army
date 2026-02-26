"use client"

import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { Check, Loader2, Circle, Inbox, FileText, Palette, Hammer, FlaskConical, Rocket } from "lucide-react"
import type { WorkflowCardProps, PipelineStepStatus, TerminalLine } from "./pipeline.types"
import { Skeleton } from "@/components/shared/Skeletons"
import { generateAgentChainSummary } from "./pipeline-utils"
import { PipelineTerminal } from "./PipelineTerminal"
import { useMemo } from "react"

// ─── Format Elapsed Time ─────────────────────────────────────────────────────

function formatElapsedTimeCompact(ms: number | null): string {
  if (ms === null) return ""
  
  if (ms < 1000) {
    return `${(ms / 1000).toFixed(1)}s`
  }
  
  const seconds = Math.floor(ms / 1000)
  if (seconds < 60) {
    return `${seconds}s`
  }
  
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  if (minutes < 60) {
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`
  }
  
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
}

// ─── Map step labels to Lucide icons ─────────────────────────────────────────

const STEP_ICON_MAP: Record<string, React.ElementType> = {
  "Intake": Inbox,
  "Spec": FileText,
  "Design": Palette,
  "Build": Hammer,
  "QA": FlaskConical,
  "Ship": Rocket,
}

// ─── Priority Badge Component ────────────────────────────────────────────────

interface PriorityBadgeProps {
  priority: string
}

function PriorityBadge({ priority }: PriorityBadgeProps) {
  const config = {
    urgent: {
      bg: "bg-red-500/20",
      text: "text-red-400",
      border: "border-red-400/30",
      label: "URGENT",
    },
    high: {
      bg: "bg-amber-500/20",
      text: "text-amber-400",
      border: "border-amber-400/30",
      label: "HIGH",
    },
    medium: {
      bg: "bg-blue-500/20",
      text: "text-blue-400",
      border: "border-blue-400/30",
      label: "MED",
    },
    low: {
      bg: "bg-slate-500/20",
      text: "text-slate-400",
      border: "border-slate-400/30",
      label: "LOW",
    },
  }

  const style = config[priority as keyof typeof config] || config.medium

  return (
    <div
      className={cn(
        "absolute top-3 right-3 px-2 py-0.5 rounded-full border text-[10px] font-semibold uppercase tracking-wide",
        style.bg,
        style.text,
        style.border
      )}
    >
      {style.label}
    </div>
  )
}

// ─── Step Icon Component ─────────────────────────────────────────────────────

interface CompactStepIconProps {
  icon: string
  status: PipelineStepStatus
  label: string
  elapsedMs?: number | null
}

function CompactStepIcon({ icon, status, label, elapsedMs }: CompactStepIconProps) {
  // Get base icon from step label
  const BaseIcon = STEP_ICON_MAP[label] || Circle

  // If running, show spinner overlay; otherwise show base icon
  const Icon = status === "running" ? Loader2 : BaseIcon

  const borderColor =
    status === "completed"
      ? "border-green-400"
      : status === "running"
        ? "border-amber-400/40"
        : status === "error"
          ? "border-red-400"
          : "border-white/20"

  const bgColor =
    status === "completed"
      ? "bg-green-400/10"
      : status === "running"
        ? "bg-amber-400/10"
        : "bg-white/5"

  const iconColor =
    status === "completed"
      ? "text-green-400"
      : status === "running"
        ? "text-amber-400"
        : status === "error"
          ? "text-red-400"
          : "text-slate-500"

  const statusLabel =
    status === "completed"
      ? "COMPLETED"
      : status === "running"
        ? "RUNNING"
        : status === "error"
          ? "ERROR"
          : "PENDING"

  const statusColor =
    status === "completed"
      ? "text-green-400"
      : status === "running"
        ? "text-amber-400"
        : status === "error"
          ? "text-red-400"
          : "text-slate-500"

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={cn(
          "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all relative",
          borderColor,
          bgColor
        )}
      >
        {status === "running" ? (
          <div className="relative flex items-center justify-center">
            {/* Pulsing outer ring */}
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-amber-400"
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.6, 0, 0.6],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            
            {/* Rotating border segment */}
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{
                background: `conic-gradient(from 0deg, transparent 0%, transparent 75%, #fbbf24 75%, #fbbf24 100%)`,
              }}
              animate={{ rotate: 360 }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "linear",
              }}
            />
            
            {/* Spinner icon */}
            <Icon className={cn("w-5 h-5 relative z-10", iconColor, "animate-spin")} />
          </div>
        ) : (
          <Icon className={cn("w-5 h-5", iconColor)} />
        )}
      </div>
      <div className="text-center">
        <div className="text-[10px] text-white/50 uppercase tracking-wider">
          {label}
        </div>
        <div className={cn(
          "text-[11px] uppercase tracking-wider",
          status === "pending" ? "font-medium" : "font-semibold",
          statusColor
        )}>
          {statusLabel}
        </div>
        {elapsedMs !== null && elapsedMs !== undefined && status !== "pending" && (
          <div className="text-[9px] text-slate-600 font-mono mt-0.5">
            {formatElapsedTimeCompact(elapsedMs)}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Connector Line ──────────────────────────────────────────────────────────

interface CompactConnectorProps {
  isCompleted: boolean
  isRunning?: boolean
}

function CompactConnector({ isCompleted, isRunning }: CompactConnectorProps) {
  // Completed: solid green
  if (isCompleted) {
    return (
      <div className="flex items-center justify-center w-8 -mx-2 mt-4">
        <div className="h-[3px] w-full bg-green-400 rounded-sm" />
      </div>
    )
  }
  
  // Running: animated gradient
  if (isRunning) {
    return (
      <div className="flex items-center justify-center w-8 -mx-2 mt-4">
        <motion.div
          className="h-[3px] w-full rounded-sm"
          style={{
            background: "linear-gradient(90deg, #fbbf24 0%, #14b8a6 50%, #fbbf24 100%)",
            backgroundSize: "200% 100%",
          }}
          animate={{
            backgroundPosition: ["0% 0%", "100% 0%"],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      </div>
    )
  }
  
  // Pending: dotted gray
  return (
    <div className="flex items-center justify-center w-8 -mx-2 mt-4">
      <div
        className="h-[2px] w-full"
        style={{
          backgroundImage: "repeating-linear-gradient(to right, #475569 0px, #475569 4px, transparent 4px, transparent 8px)",
        }}
      />
    </div>
  )
}

// ─── Loading Skeleton ────────────────────────────────────────────────────────

function WorkflowCardSkeleton() {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/50 p-4">
      <Skeleton className="h-5 w-48 mb-2" />
      <Skeleton className="h-4 w-64 mb-4" />
      <div className="flex items-center gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <Skeleton className="w-8 h-8 rounded-full" />
            {i < 5 && <Skeleton className="w-8 h-0.5" />}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function WorkflowCard({
  feature,
  steps,
  isJustMoved,
  onClick,
  isLoading,
  isExpanded,
}: WorkflowCardProps) {
  if (isLoading) {
    return <WorkflowCardSkeleton />
  }

  const agentChain = generateAgentChainSummary(steps)

  // Prepare terminal lines from pipeline_log
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

  // Check if any step is running
  const isStreaming = steps.some((s) => s.stepStatus === "running")

  return (
    <motion.div
      className={cn(
        "rounded-xl border border-white/10 bg-slate-900/50 p-5 cursor-pointer transition-all hover:border-white/20 hover:bg-slate-900/70 min-h-[140px] relative",
        isJustMoved && "ring-2 ring-amber-400/50"
      )}
      onClick={() => onClick(feature.id)}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onClick(feature.id)
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`View workflow: ${feature.title}`}
      initial={isJustMoved ? { scale: 1.02 } : {}}
      animate={
        isJustMoved
          ? {
              boxShadow: [
                "0 0 0px rgba(251, 191, 36, 0)",
                "0 0 20px rgba(251, 191, 36, 0.4)",
                "0 0 0px rgba(251, 191, 36, 0)",
              ],
            }
          : {}
      }
      transition={{ duration: 2 }}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
    >
      {/* Priority Badge */}
      <PriorityBadge priority={feature.priority || "medium"} />
      
      {/* Title */}
      <h3
        className="text-base font-bold text-white mb-1 line-clamp-1"
        title={feature.title}
      >
        {feature.title}
      </h3>

      {/* Agent Chain Subtitle */}
      <p className="text-xs text-white/50 mb-5 line-clamp-1">{agentChain}</p>

      {/* Compact Step Icons */}
      <div className="flex items-start gap-1">
        {steps.map((step, idx) => (
          <div key={step.id} className="flex items-center">
            <CompactStepIcon
              icon={step.icon}
              status={step.stepStatus}
              label={step.label}
              elapsedMs={step.elapsedMs}
            />
            {idx < steps.length - 1 && (
              <CompactConnector
                isCompleted={step.stepStatus === "completed"}
                isRunning={
                  step.stepStatus === "completed" && 
                  idx < steps.length - 1 && 
                  steps[idx + 1].stepStatus === "running"
                }
              />
            )}
          </div>
        ))}
      </div>

      {/* Expandable Terminal */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden mt-5"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.2 }}
            >
              <PipelineTerminal
                lines={terminalLines}
                isStreaming={isStreaming}
                maxHeightPx={280}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
