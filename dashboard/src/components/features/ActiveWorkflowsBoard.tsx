"use client"

import { useMemo } from "react"
import { cn } from "@/lib/utils"
import { Inbox } from "lucide-react"
import type { ActiveWorkflowsBoardProps } from "./pipeline.types"
import { derivePipelineSteps } from "./pipeline-utils"
import { WorkflowCard } from "./WorkflowCard"
import { EmptyState } from "@/components/shared/EmptyState"
import { Skeleton } from "@/components/shared/Skeletons"

// ─── Loading Skeleton ────────────────────────────────────────────────────────

function ActiveWorkflowsBoardSkeleton({ count }: { count: number }) {
  return (
    <div className="space-y-3" role="status" aria-busy="true" aria-label="Loading workflows">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-white/10 bg-slate-900/50 p-4">
          <Skeleton className="h-5 w-48 mb-2" />
          <Skeleton className="h-4 w-64 mb-4" />
          <div className="flex items-center gap-2">
            {Array.from({ length: 6 }).map((_, j) => (
              <div key={j} className="flex items-center gap-2">
                <Skeleton className="w-8 h-8 rounded-full" />
                {j < 5 && <Skeleton className="w-8 h-0.5" />}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function ActiveWorkflowsBoard({
  features,
  justMoved,
  isLoading,
  skeletonCount = 3,
  filter,
  onSelectFeature,
  activeFeatureId,
  className,
}: ActiveWorkflowsBoardProps) {
  // Apply default filter if not provided
  const excludeStatuses = filter?.excludeStatuses || ["done", "cancelled"]
  const agentFilter = filter?.agentId

  // Filter features
  const activeFeatures = useMemo(() => {
    let filtered = features.filter(
      (f) => !excludeStatuses.includes(f.status)
    )

    if (agentFilter) {
      filtered = filtered.filter((f) => f.current_agent === agentFilter)
    }

    return filtered
  }, [features, excludeStatuses, agentFilter])

  // Derive steps for each feature (memoized to avoid redundant computation)
  const featuresWithSteps = useMemo(
    () =>
      activeFeatures.map((feature) => ({
        feature,
        steps: derivePipelineSteps(feature),
      })),
    [activeFeatures]
  )

  if (isLoading) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center justify-between">
          <h2 className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">
            ACTIVE WORKFLOWS
          </h2>
        </div>
        <ActiveWorkflowsBoardSkeleton count={skeletonCount} />
      </div>
    )
  }

  if (featuresWithSteps.length === 0) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center justify-between">
          <h2 className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">
            ACTIVE WORKFLOWS
          </h2>
        </div>
        <EmptyState
          icon={Inbox}
          title="No active workflows"
          description="All features are either completed or cancelled."
        />
      </div>
    )
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">
          ACTIVE WORKFLOWS
        </h2>
        <span className="text-xs text-white/30">
          {featuresWithSteps.length} active
        </span>
      </div>

      {/* Workflow Cards */}
      <div className="space-y-3">
        {featuresWithSteps.map(({ feature, steps }) => (
          <WorkflowCard
            key={feature.id}
            feature={feature}
            steps={steps}
            isJustMoved={justMoved.has(feature.id)}
            onClick={onSelectFeature}
          />
        ))}
      </div>
    </div>
  )
}
