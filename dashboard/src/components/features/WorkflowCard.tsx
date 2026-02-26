"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { Check, Loader2, Circle } from "lucide-react"
import type { WorkflowCardProps, PipelineStepStatus } from "./pipeline.types"
import { Skeleton } from "@/components/shared/Skeletons"
import { generateAgentChainSummary } from "./pipeline-utils"

// ─── Step Icon Component ─────────────────────────────────────────────────────

interface CompactStepIconProps {
  icon: string
  status: PipelineStepStatus
  label: string
}

function CompactStepIcon({ icon, status, label }: CompactStepIconProps) {
  const Icon =
    status === "completed"
      ? Check
      : status === "running"
        ? Loader2
        : status === "error"
          ? Circle
          : Circle

  const borderColor =
    status === "completed"
      ? "border-green-400"
      : status === "running"
        ? "border-amber-400"
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
          : "text-white/30"

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
          : "text-white/40"

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className={cn(
          "flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all",
          borderColor,
          bgColor
        )}
      >
        <Icon
          className={cn(
            "w-4 h-4",
            iconColor,
            status === "running" && "animate-spin"
          )}
        />
      </div>
      <div className="text-center">
        <div className="text-[9px] text-white/50 uppercase tracking-wide">
          {label}
        </div>
        <div className={cn("text-[8px] uppercase font-medium", statusColor)}>
          {statusLabel}
        </div>
      </div>
    </div>
  )
}

// ─── Connector Line ──────────────────────────────────────────────────────────

interface CompactConnectorProps {
  isCompleted: boolean
}

function CompactConnector({ isCompleted }: CompactConnectorProps) {
  return (
    <div className="flex items-center justify-center w-8 -mx-2 mt-4">
      <div
        className={cn(
          "h-0.5 w-full",
          isCompleted ? "bg-green-400" : "bg-white/20"
        )}
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
}: WorkflowCardProps) {
  if (isLoading) {
    return <WorkflowCardSkeleton />
  }

  const agentChain = generateAgentChainSummary(steps)

  return (
    <motion.div
      className={cn(
        "rounded-xl border border-white/10 bg-slate-900/50 p-4 cursor-pointer transition-all hover:border-white/20 hover:bg-slate-900/70",
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
      {/* Title */}
      <h3
        className="text-base font-bold text-white mb-1 line-clamp-1"
        title={feature.title}
      >
        {feature.title}
      </h3>

      {/* Agent Chain Subtitle */}
      <p className="text-xs text-white/50 mb-4 line-clamp-1">{agentChain}</p>

      {/* Compact Step Icons */}
      <div className="flex items-start gap-0">
        {steps.map((step, idx) => (
          <div key={step.id} className="flex items-center">
            <CompactStepIcon
              icon={step.icon}
              status={step.stepStatus}
              label={step.label}
            />
            {idx < steps.length - 1 && (
              <CompactConnector isCompleted={step.stepStatus === "completed"} />
            )}
          </div>
        ))}
      </div>
    </motion.div>
  )
}
