"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"

/**
 * Lightweight hook that returns which phases ("planning", "review") have
 * at least one chat message for a given feature.
 */
export function usePhasesWithChat(featureId: string): string[] {
  const [phases, setPhases] = useState<string[]>([])

  useEffect(() => {
    if (!featureId) return

    let cancelled = false

    async function load() {
      try {
        // Fetch both phases in parallel
        const [planRes, reviewRes] = await Promise.all([
          fetch(`/api/features/${featureId}/phase-chat?phase=planning`),
          fetch(`/api/features/${featureId}/phase-chat?phase=review`),
        ])
        const result: string[] = []
        if (planRes.ok) {
          const planData = await planRes.json()
          if ((planData.messages ?? []).length > 0) result.push("planning")
        }
        if (reviewRes.ok) {
          const reviewData = await reviewRes.json()
          if ((reviewData.messages ?? []).length > 0) result.push("review")
        }
        if (!cancelled) setPhases(result)
      } catch {
        // Silently fail — dots just won't show
      }
    }

    load()

    // Realtime: listen for inserts to update
    if (supabase) {
      const channel = supabase
        .channel(`phases-with-chat-${featureId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "phase_chat_messages",
            filter: `feature_id=eq.${featureId}`,
          },
          (payload) => {
            const phase = (payload.new as { phase: string }).phase
            setPhases((prev) => (prev.includes(phase) ? prev : [...prev, phase]))
          }
        )
        .subscribe()

      return () => {
        cancelled = true
        supabase!.removeChannel(channel)
      }
    }

    return () => { cancelled = true }
  }, [featureId])

  return phases
}
