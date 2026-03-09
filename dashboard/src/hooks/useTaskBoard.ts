"use client"

import { useEffect, useState, useCallback } from "react"
import { supabase } from "@/lib/supabase"

export type FeatureStatus =
  | "planning"
  | "spec"
  | "design_review"
  | "approved"
  | "building"
  | "qa"
  | "done"

export type FeaturePriority = "low" | "medium" | "high" | "critical"

export interface Feature {
  id: string
  title: string
  description: string | null
  status: FeatureStatus
  priority: FeaturePriority
  requested_by: string | null
  assigned_to: string | null
  current_agent: string | null
  current_step: string | null
  branch_name: string | null
  pr_url: string | null
  pr_number: number | null
  pr_status: string | null
  created_at: string
  updated_at: string
  completed_at: string | null
  needs_attention: boolean
  attention_type: string | null
  pipeline_log: unknown
  revision_count: number | null
}

export interface ActivityEntry {
  id: string
  agent_id: string | null
  action_type: string | null
  action_details: string | null
  related_id: string | null
  created_at: string
  feature_id: string | null
  step_id: string | null
  event_type: string | null
  content: string | null
  metadata: unknown
}

export type KanbanColumn = "backlog" | "in_progress" | "review" | "done"

export function statusToColumn(status: FeatureStatus): KanbanColumn {
  switch (status) {
    case "planning":
      return "backlog"
    case "spec":
    case "design_review":
    case "approved":
    case "building":
      return "in_progress"
    case "qa":
      return "review"
    case "done":
      return "done"
  }
}

export function useTaskBoard() {
  const [features, setFeatures] = useState<Feature[]>([])
  const [activity, setActivity] = useState<ActivityEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [activityLoading, setActivityLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchFeatures = useCallback(async () => {
    if (!supabase) {
      setError("Supabase not configured")
      setLoading(false)
      return
    }
    try {
      const { data, error: fetchError } = await supabase
        .from("features")
        .select("*")
        .order("updated_at", { ascending: false })

      if (fetchError) throw fetchError
      setFeatures((data as Feature[]) || [])
      setError(null)
    } catch (err) {
      console.error("Failed to fetch features:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch features")
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchActivity = useCallback(async () => {
    if (!supabase) {
      setActivityLoading(false)
      return
    }
    try {
      const { data, error: fetchError } = await supabase
        .from("agent_activity")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100)

      if (fetchError) throw fetchError
      setActivity((data as ActivityEntry[]) || [])
    } catch (err) {
      console.error("Failed to fetch activity:", err)
    } finally {
      setActivityLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchFeatures()
    fetchActivity()
  }, [fetchFeatures, fetchActivity])

  // Real-time subscription for features
  useEffect(() => {
    if (!supabase) return

    const channel = supabase
      .channel("task-board-features")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "features" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setFeatures((prev) => [payload.new as Feature, ...prev])
          } else if (payload.eventType === "UPDATE") {
            setFeatures((prev) =>
              prev.map((f) => (f.id === payload.new.id ? (payload.new as Feature) : f))
            )
          } else if (payload.eventType === "DELETE") {
            setFeatures((prev) => prev.filter((f) => f.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase?.removeChannel(channel)
    }
  }, [])

  // Real-time subscription for activity
  useEffect(() => {
    if (!supabase) return

    const channel = supabase
      .channel("task-board-activity")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "agent_activity" },
        (payload) => {
          setActivity((prev) => [payload.new as ActivityEntry, ...prev.slice(0, 99)])
        }
      )
      .subscribe()

    return () => {
      supabase?.removeChannel(channel)
    }
  }, [])

  const createTask = useCallback(
    async (title: string, description?: string, priority: FeaturePriority = "medium") => {
      if (!supabase) throw new Error("Supabase not configured")

      const { data, error: insertError } = await supabase
        .from("features")
        .insert({
          title,
          description: description || null,
          status: "planning",
          priority,
          needs_attention: false,
        })
        .select()
        .single()

      if (insertError) throw insertError
      return data as Feature
    },
    []
  )

  const updateTaskStatus = useCallback(
    async (featureId: string, status: FeatureStatus) => {
      if (!supabase) throw new Error("Supabase not configured")

      const { error: updateError } = await supabase
        .from("features")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", featureId)

      if (updateError) throw updateError
    },
    []
  )

  return {
    features,
    activity,
    loading,
    activityLoading,
    error,
    refresh: fetchFeatures,
    createTask,
    updateTaskStatus,
  }
}
