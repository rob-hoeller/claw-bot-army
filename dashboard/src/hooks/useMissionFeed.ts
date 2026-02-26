"use client"

import { useMemo } from "react"
import { useRealtimeFeatures, Feature } from "./useRealtimeFeatures"
import type { MissionFeedData } from "@/components/mission/mission.types"

/**
 * useMissionFeed
 * 
 * Groups features into three buckets for the Mission Control feed:
 * - needsAttention: features where needs_attention = true (sorted by priority)
 * - activeMissions: features not done/cancelled/needs_attention, with current_agent set
 * - recentlyCompleted: last 10 done features (sorted by completed_at DESC)
 */
export function useMissionFeed(): MissionFeedData {
  const { features, isLoading } = useRealtimeFeatures()

  const grouped = useMemo(() => {
    const needsAttention: Feature[] = []
    const activeMissions: Feature[] = []
    const completed: Feature[] = []

    features.forEach((feature) => {
      // Check for needs_attention flag (assumed to exist on Feature type)
      // @ts-ignore - needs_attention may not be in type yet
      if (feature.needs_attention === true) {
        needsAttention.push(feature)
        return
      }

      // Completed features
      if (feature.status === "done" || feature.status === "pr_submitted") {
        completed.push(feature)
        return
      }

      // Cancelled features
      if (feature.status === "cancelled") {
        return // exclude from all lists
      }

      // Active missions: in progress with an agent assigned
      if (feature.current_agent) {
        activeMissions.push(feature)
      }
    })

    // Sort needs_attention by priority
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 }
    needsAttention.sort((a, b) => {
      const aPriority = priorityOrder[a.priority] ?? 99
      const bPriority = priorityOrder[b.priority] ?? 99
      return aPriority - bPriority
    })

    // Sort completed by updated_at DESC (most recent first)
    completed.sort((a, b) => {
      const aTime = new Date(a.updated_at).getTime()
      const bTime = new Date(b.updated_at).getTime()
      return bTime - aTime
    })

    // Take only last 10 completed
    const recentlyCompleted = completed.slice(0, 10)

    return {
      needsAttention,
      activeMissions,
      recentlyCompleted,
      isLoading,
    }
  }, [features, isLoading])

  return grouped
}
