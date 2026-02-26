"use client"

import { motion } from "framer-motion"
import { formatDistanceToNow } from "date-fns"
import type { MissionCardProps, PipelineStepData } from "./mission.types"
import { cn } from "@/lib/utils"
import { CheckCircle } from "lucide-react"

const PRIORITY_COLORS = {
  low: "text-slate-400 border-slate-400/30",
  medium: "text-blue-400 border-blue-400/30",
  high: "text-amber-400 border-amber-400/30",
  urgent: "text-red-400 border-red-400/30",
}

const STEP_ICONS: Record<string, string> = {
  intake: "📥",
  spec: "📋",
  design: "🎨",
  build: "🏭",
  qa: "🔍",
  ship: "🚀",
}

/**
 * MissionCard
 * 
 * Compact card showing a feature in the mission feed:
 * - Title + priority badge
 * - Mini pipeline visualization (6 dots with connectors)
 * - Current agent + step + elapsed time
 * - Pulse animation on active step
 * - Special styling for needs_attention and completed items
 */
export function MissionCard({
  feature,
  steps,
  isSelected,
  onClick,
  className,
}: MissionCardProps) {
  const activeStep = steps.find((s) => s.stepStatus === "running")
  const completedSteps = steps.filter((s) => s.stepStatus === "completed").length
  
  // @ts-ignore - needs_attention may not be in type yet
  const needsAttention = feature.needs_attention === true
  const isCompleted = feature.status === "done" || feature.status === "pr_submitted"

  const elapsedTime = activeStep?.startedAt
    ? formatDistanceToNow(new Date(activeStep.startedAt), { addSuffix: false })
    : null

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "w-full text-left p-3 rounded-lg border transition-all",
        isSelected
          ? "bg-purple-500/10 border-purple-500/30 shadow-lg shadow-purple-500/10"
          : "bg-slate-900/60 border-white/10 hover:border-white/20",
        needsAttention && "border-amber-500/50 shadow-lg shadow-amber-500/10",
        isCompleted && "opacity-70 hover:opacity-100",
        className
      )}
    >
      {/* Header: title + priority badge */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-sm font-medium text-white/90 line-clamp-2 flex-1">
          {feature.title}
        </h3>
        <div className="flex items-center gap-1.5">
          {isCompleted && <CheckCircle className="w-4 h-4 text-green-400" />}
          <span
            className={cn(
              "px-2 py-0.5 text-xs font-medium border rounded",
              PRIORITY_COLORS[feature.priority]
            )}
          >
            {feature.priority}
          </span>
        </div>
      </div>

      {/* Mini pipeline visualization */}
      <div className="flex items-center gap-1 mb-2">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            {/* Step dot */}
            <div className="relative">
              <div
                className={cn(
                  "w-2 h-2 rounded-full transition-all",
                  step.stepStatus === "completed" && "bg-green-400",
                  step.stepStatus === "running" && "bg-purple-400",
                  step.stepStatus === "error" && "bg-red-400",
                  step.stepStatus === "pending" && "bg-slate-600"
                )}
              />
              {step.stepStatus === "running" && (
                <motion.div
                  animate={{ scale: [1, 1.5, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="absolute inset-0 w-2 h-2 rounded-full bg-purple-400/30"
                />
              )}
            </div>

            {/* Connector */}
            {index < steps.length - 1 && (
              <div
                className={cn(
                  "w-3 h-0.5 transition-colors",
                  step.stepStatus === "completed" ? "bg-green-400" : "bg-slate-700"
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* Status line: agent + step + time */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-white/60">
          {activeStep ? (
            <>
              <span>{STEP_ICONS[activeStep.id]}</span>
              <span>{activeStep.label}</span>
              <span className="text-white/40">•</span>
              <span className="text-purple-400">{activeStep.agent}</span>
            </>
          ) : isCompleted ? (
            <span className="text-green-400">✓ Completed</span>
          ) : (
            <span className="text-white/40">Pending</span>
          )}
        </div>
        {elapsedTime && !isCompleted && (
          <span className="text-white/40 tabular-nums">{elapsedTime}</span>
        )}
      </div>

      {/* Needs attention indicator */}
      {needsAttention && (
        <div className="mt-2 pt-2 border-t border-amber-500/20">
          <motion.div
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="flex items-center gap-1.5 text-xs text-amber-400"
          >
            <span>⏸️</span>
            <span className="font-medium">Needs your attention</span>
          </motion.div>
        </div>
      )}

      {/* Progress indicator */}
      <div className="mt-2 h-1 bg-slate-800 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${(completedSteps / steps.length) * 100}%` }}
          transition={{ duration: 0.5 }}
          className="h-full bg-gradient-to-r from-green-400 to-purple-400"
        />
      </div>
    </motion.button>
  )
}
