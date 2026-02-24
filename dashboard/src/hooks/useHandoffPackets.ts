"use client"

import { useEffect, useState, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import type { HandoffPacket } from "@/components/features/audit-trail/types"

export function useHandoffPackets(featureId: string | null, active: boolean) {
  const [packets, setPackets] = useState<HandoffPacket[] | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchPackets = useCallback(async () => {
    if (!featureId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/features/${featureId}/handoff-packets`)
      if (!res.ok) throw new Error("Failed to fetch")
      const data = await res.json()
      // Handle both array response and { packets: [] } wrapper
      setPackets(Array.isArray(data) ? data : Array.isArray(data?.packets) ? data.packets : [])
    } catch {
      setPackets([])
    } finally {
      setLoading(false)
    }
  }, [featureId])

  // Lazy fetch on first activation
  useEffect(() => {
    if (!active || packets !== null || !featureId) return
    fetchPackets()
  }, [active, featureId, packets, fetchPackets])

  // Reset when feature changes
  useEffect(() => {
    setPackets(null)
  }, [featureId])

  // Realtime subscription
  useEffect(() => {
    if (!supabase || !featureId || !active) return

    const channel = supabase
      .channel(`handoff-packets-${featureId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "handoff_packets",
          filter: `feature_id=eq.${featureId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setPackets((prev) =>
              prev ? [...prev, payload.new as HandoffPacket] : [payload.new as HandoffPacket]
            )
          } else if (payload.eventType === "UPDATE") {
            const updated = payload.new as HandoffPacket
            setPackets((prev) =>
              prev ? prev.map((p) => (p.id === updated.id ? updated : p)) : prev
            )
          } else if (payload.eventType === "DELETE") {
            const deletedId = (payload.old as { id: string }).id
            setPackets((prev) =>
              prev ? prev.filter((p) => p.id !== deletedId) : prev
            )
          }
        }
      )
      .subscribe()

    return () => {
      supabase!.removeChannel(channel)
    }
  }, [featureId, active])

  return { packets, loading, refetch: fetchPackets }
}
