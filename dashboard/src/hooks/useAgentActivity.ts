"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import type { AgentActivityEvent, PipelineStepId } from "@/components/mission/mission.types"
import type { RealtimeChannel } from "@supabase/supabase-js"

interface UseAgentActivityOptions {
  featureId: string
  stepFilter?: PipelineStepId
  agentFilter?: string
  maxEvents?: number
}

interface UseAgentActivityReturn {
  events: AgentActivityEvent[]
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

const MAX_SCROLLBACK = 500

/**
 * useAgentActivity
 * 
 * Subscribes to realtime agent_activity events for a given feature.
 * Maintains a scrollback buffer (last 500 events) and supports filtering
 * by step_id and agent_id.
 */
export function useAgentActivity({
  featureId,
  stepFilter,
  agentFilter,
  maxEvents = MAX_SCROLLBACK,
}: UseAgentActivityOptions): UseAgentActivityReturn {
  const [events, setEvents] = useState<AgentActivityEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)

  const fetchEvents = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      if (!supabase) {
        throw new Error("Supabase client not initialized")
      }

      let query = supabase
        .from("agent_activity")
        .select("*")
        .eq("feature_id", featureId)
        .order("created_at", { ascending: true })
        .limit(maxEvents)

      if (stepFilter) {
        query = query.eq("step_id", stepFilter)
      }

      if (agentFilter) {
        query = query.eq("agent_id", agentFilter)
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError

      setEvents(data || [])
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch agent activity"))
    } finally {
      setIsLoading(false)
    }
  }, [featureId, stepFilter, agentFilter, maxEvents])

  useEffect(() => {
    fetchEvents()

    if (!supabase) {
      setError(new Error("Supabase client not initialized"))
      return
    }

    // Set up realtime subscription
    const channel = supabase
      .channel(`agent_activity:${featureId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "agent_activity",
          filter: `feature_id=eq.${featureId}`,
        },
        (payload) => {
          const newEvent = payload.new as AgentActivityEvent

          // Apply filters
          if (stepFilter && newEvent.step_id !== stepFilter) return
          if (agentFilter && newEvent.agent_id !== agentFilter) return

          setEvents((prev) => {
            const updated = [...prev, newEvent]
            // Maintain scrollback limit
            if (updated.length > maxEvents) {
              return updated.slice(updated.length - maxEvents)
            }
            return updated
          })
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      if (channelRef.current && supabase) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [featureId, stepFilter, agentFilter, maxEvents, fetchEvents])

  return {
    events,
    isLoading,
    error,
    refetch: fetchEvents,
  }
}
