"use client"

import { useState, useEffect } from "react"
import { AnimatePresence } from "framer-motion"
import { CommandBar } from "./CommandBar"
import { MissionFeed } from "./MissionFeed"
import { MissionDetailPanel } from "./MissionDetailPanel"
import { useMissionFeed } from "@/hooks/useMissionFeed"
import type { MissionControlProps } from "./mission.types"
import { cn } from "@/lib/utils"

/**
 * MissionControl
 * 
 * Main layout component for the Mission Control interface:
 * - CommandBar at top (always visible)
 * - Two-panel layout: MissionFeed (left) + MissionDetailPanel (right)
 * - Detail panel hidden when no feature selected (feed takes full width)
 * - Responsive: stack vertically on mobile
 * - Keyboard navigation: arrow keys + Enter
 */
export default function MissionControl({ className }: MissionControlProps) {
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | undefined>()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const feedData = useMissionFeed()

  // Get all features in order for keyboard navigation
  const allFeatures = [
    ...feedData.needsAttention,
    ...feedData.activeMissions,
    ...feedData.recentlyCompleted,
  ]

  // Find the selected feature
  const selectedFeature = allFeatures.find((f) => f.id === selectedFeatureId)

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!allFeatures.length) return

      // Arrow key navigation
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault()

        const currentIndex = selectedFeatureId
          ? allFeatures.findIndex((f) => f.id === selectedFeatureId)
          : -1

        let nextIndex: number
        if (e.key === "ArrowDown") {
          nextIndex = currentIndex < allFeatures.length - 1 ? currentIndex + 1 : 0
        } else {
          nextIndex = currentIndex > 0 ? currentIndex - 1 : allFeatures.length - 1
        }

        setSelectedFeatureId(allFeatures[nextIndex]?.id)
      }

      // Enter to select/deselect
      if (e.key === "Enter" && !e.metaKey && !e.ctrlKey) {
        if (selectedFeatureId) {
          // Already selected, deselect
          setSelectedFeatureId(undefined)
        } else if (allFeatures.length > 0) {
          // Select first feature
          setSelectedFeatureId(allFeatures[0].id)
        }
      }

      // Escape to deselect
      if (e.key === "Escape") {
        setSelectedFeatureId(undefined)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [allFeatures, selectedFeatureId])

  const handleSubmitFeature = async (data: {
    title: string
    description: string
    priority: "low" | "medium" | "high" | "urgent"
  }) => {
    setIsSubmitting(true)

    try {
      const response = await fetch("/api/features", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error("Failed to create feature")
      }

      const result = await response.json()

      // Auto-select the newly created feature
      if (result.id) {
        setSelectedFeatureId(result.id)
      }
    } catch (error) {
      console.error("Failed to submit feature:", error)
      alert("Failed to create feature. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={cn("h-screen flex flex-col bg-slate-950", className)}>
      {/* Command Bar */}
      <div className="border-b border-white/10">
        <CommandBar onSubmit={handleSubmitFeature} isSubmitting={isSubmitting} />
      </div>

      {/* Two-panel layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel: Mission Feed */}
        <div
          className={cn(
            "transition-all duration-300 overflow-y-auto",
            selectedFeature
              ? "w-2/5 min-w-[320px] max-w-[500px]"
              : "w-full"
          )}
        >
          <MissionFeed
            data={feedData}
            selectedFeatureId={selectedFeatureId}
            onSelectFeature={setSelectedFeatureId}
          />
        </div>

        {/* Right panel: Detail Panel (conditional) */}
        <AnimatePresence mode="wait">
          {selectedFeature && (
            <div className="flex-1 overflow-hidden">
              <MissionDetailPanel
                key={selectedFeature.id}
                feature={selectedFeature}
                onClose={() => setSelectedFeatureId(undefined)}
              />
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Keyboard shortcuts hint (bottom right) */}
      {allFeatures.length > 0 && (
        <div className="absolute bottom-4 left-4 px-3 py-2 bg-slate-900/90 border border-white/10 rounded-lg backdrop-blur-sm">
          <div className="flex items-center gap-4 text-xs text-white/50">
            <div className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-white/60">↑</kbd>
              <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-white/60">↓</kbd>
              <span>Navigate</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-white/60">Enter</kbd>
              <span>Select</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-white/60">Esc</kbd>
              <span>Close</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
