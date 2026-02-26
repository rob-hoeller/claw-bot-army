"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronDown, ChevronRight } from "lucide-react"
import { MissionCard } from "./MissionCard"
import type { MissionFeedProps } from "./mission.types"
import { cn } from "@/lib/utils"
// @ts-ignore - May need to add this utility
import { derivePipelineSteps } from "../features/pipeline-utils"

/**
 * MissionFeed
 * 
 * Left panel containing grouped mission cards:
 * - "⏸️ NEEDS YOUR ATTENTION (N)" — always expanded if items exist
 * - "🤖 ACTIVE MISSIONS (N)" — default expanded
 * - "✅ RECENTLY COMPLETED (N)" — default collapsed
 */
export function MissionFeed({ data, selectedFeatureId, onSelectFeature }: MissionFeedProps) {
  const [expandedSections, setExpandedSections] = useState({
    attention: true,
    active: true,
    completed: false,
  })

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }))
  }

  const renderSection = (
    sectionKey: keyof typeof expandedSections,
    title: string,
    count: number,
    features: typeof data.needsAttention,
    emptyMessage: string
  ) => {
    const isExpanded = expandedSections[sectionKey]
    const shouldForceExpand = sectionKey === "attention" && count > 0

    return (
      <div className="border-b border-white/10 last:border-b-0">
        {/* Section header */}
        <button
          onClick={() => !shouldForceExpand && toggleSection(sectionKey)}
          className={cn(
            "w-full flex items-center justify-between px-4 py-3 transition-colors",
            shouldForceExpand
              ? "cursor-default bg-amber-500/5"
              : "hover:bg-white/5 cursor-pointer"
          )}
        >
          <div className="flex items-center gap-2">
            {!shouldForceExpand && (
              <motion.div
                animate={{ rotate: isExpanded ? 90 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronRight className="w-4 h-4 text-white/40" />
              </motion.div>
            )}
            <h2 className="text-xs font-semibold text-white/70 uppercase tracking-wide">
              {title}
            </h2>
            <span
              className={cn(
                "px-2 py-0.5 text-xs font-bold rounded-full",
                count > 0 ? "bg-purple-500/20 text-purple-300" : "bg-slate-800 text-white/40"
              )}
            >
              {count}
            </span>
          </div>
        </button>

        {/* Section content */}
        <AnimatePresence initial={false}>
          {(isExpanded || shouldForceExpand) && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="p-3 space-y-2">
                {features.length === 0 ? (
                  <div className="py-8 text-center">
                    <p className="text-sm text-white/40">{emptyMessage}</p>
                  </div>
                ) : (
                  <AnimatePresence mode="popLayout">
                    {features.map((feature) => {
                      // Derive pipeline steps for each feature
                      const steps = derivePipelineSteps(feature)

                      return (
                        <motion.div
                          key={feature.id}
                          layout
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.2 }}
                        >
                          <MissionCard
                            feature={feature}
                            steps={steps}
                            isSelected={selectedFeatureId === feature.id}
                            onClick={() => onSelectFeature(feature.id)}
                          />
                        </motion.div>
                      )
                    })}
                  </AnimatePresence>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  if (data.isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-white/50">Loading missions...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-slate-950/50">
      {renderSection(
        "attention",
        "⏸️ NEEDS YOUR ATTENTION",
        data.needsAttention.length,
        data.needsAttention,
        "All clear — no features need attention"
      )}

      {renderSection(
        "active",
        "🤖 ACTIVE MISSIONS",
        data.activeMissions.length,
        data.activeMissions,
        "No active missions right now"
      )}

      {renderSection(
        "completed",
        "✅ RECENTLY COMPLETED",
        data.recentlyCompleted.length,
        data.recentlyCompleted,
        "No completed features yet"
      )}
    </div>
  )
}
