"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { supabase } from "@/lib/supabase"

// ─── Types ───────────────────────────────────────────────────────
export type FeatureStatus =
  | "planning"
  | "design_review"
  | "in_progress"
  | "qa_review"
  | "review"
  | "approved"
  | "pr_submitted"
  | "done"
  | "cancelled"

export interface Feature {
  id: string
  title: string
  description: string | null
  status: FeatureStatus
  priority: "low" | "medium" | "high" | "urgent"
  requested_by: string | null
  assigned_to: string | null
  approved_by: string | null
  acceptance_criteria: string | null
  labels: string[] | null
  pr_url: string | null
  pr_number: number | null
  pr_status: string | null
  branch_name: string | null
  vercel_preview_url: string | null
  feature_spec: string | null
  design_spec: string | null
  estimated_cost: number | null
  actual_cost: number | null
  cost_notes: string | null
  current_agent: string | null
  revision_count: number
  pipeline_log: Array<{
    timestamp: string
    agent: string
    stage: string
    verdict: string
    issues?: string[]
    revision_loop?: number
  }>
  created_at: string
  updated_at: string
}

export interface ActivityEvent {
  time: Date
  featureTitle: string
  status: string
  agent: string | null
}

export type ConnectionStatus = "connected" | "reconnecting" | "disconnected"

// ─── Hook ────────────────────────────────────────────────────────
export function useRealtimeFeatures() {
  const [features, setFeatures] = useState<Feature[]>([])
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected")
  const [activityLog, setActivityLog] = useState<ActivityEvent[]>([])
  const [justMoved, setJustMoved] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const wasDisconnectedRef = useRef(false)
  const lastConnectedAtRef = useRef<Date | null>(null)

  const isDemoMode = !supabase

  const fetchAll = useCallback(async () => {
    if (!supabase) return
    try {
      const { data, error } = await supabase
        .from("features")
        .select("*")
        .neq("status", "cancelled")
        .order("created_at", { ascending: false })
      if (error) throw error
      if (data) setFeatures(data as Feature[])
    } catch (err) {
      console.error("[useRealtimeFeatures] fetch error:", err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isDemoMode) {
      setConnectionStatus("disconnected")
      setIsLoading(false)
      return
    }

    fetchAll()

    const channel = supabase!
      .channel("features-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "features" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setFeatures((prev) => [payload.new as Feature, ...prev])
            const f = payload.new as Feature
            setActivityLog((prev) =>
              [
                {
                  time: new Date(),
                  featureTitle: f.title,
                  status: f.status,
                  agent: f.assigned_to,
                },
                ...prev,
              ].slice(0, 50)
            )
          } else if (payload.eventType === "UPDATE") {
            const updated = payload.new as Feature
            setFeatures((prev) =>
              prev.map((f) => (f.id === updated.id ? updated : f))
            )
            // Track "just moved" for glow
            setJustMoved((prev) => new Set(prev).add(updated.id))
            setTimeout(() => {
              setJustMoved((prev) => {
                const next = new Set(prev)
                next.delete(updated.id)
                return next
              })
            }, 5000)
            // Activity log
            setActivityLog((prev) =>
              [
                {
                  time: new Date(),
                  featureTitle: updated.title,
                  status: updated.status,
                  agent: updated.assigned_to,
                },
                ...prev,
              ].slice(0, 50)
            )
          } else if (payload.eventType === "DELETE") {
            setFeatures((prev) =>
              prev.filter(
                (f) => f.id !== (payload.old as { id: string }).id
              )
            )
          }
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          // If we were disconnected, refetch to catch missed events
          if (wasDisconnectedRef.current) {
            fetchAll()
            wasDisconnectedRef.current = false
          }
          setConnectionStatus("connected")
          lastConnectedAtRef.current = new Date()
        } else if (status === "CHANNEL_ERROR") {
          setConnectionStatus("disconnected")
          wasDisconnectedRef.current = true
        } else if (status === "TIMED_OUT") {
          setConnectionStatus("reconnecting")
          wasDisconnectedRef.current = true
        }
      })

    return () => {
      supabase!.removeChannel(channel)
    }
  }, [fetchAll, isDemoMode])

  return {
    features,
    setFeatures,
    connectionStatus,
    activityLog,
    justMoved,
    isLoading,
    isDemoMode,
    refetch: fetchAll,
    lastConnectedAt: lastConnectedAtRef.current,
  }
}
