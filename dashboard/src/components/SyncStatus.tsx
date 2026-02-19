"use client"

import { useEffect, useState, useCallback } from "react"
import { RefreshCw } from "lucide-react"
import { supabase } from "@/lib/supabase"

const POLL_INTERVAL_MS = 60_000  // Re-check sync every 60s
const TICK_INTERVAL_MS = 10_000  // Refresh relative time every 10s

function formatRelativeTime(date: Date | null | undefined): string {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    return ""
  }

  try {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffSec = Math.floor(diffMs / 1000)
    const diffMin = Math.floor(diffSec / 60)
    const diffHour = Math.floor(diffMin / 60)

    if (diffSec < 10) return "just now"
    if (diffSec < 60) return `${diffSec}s ago`
    if (diffMin < 60) return `${diffMin}m ago`
    if (diffHour < 24) return `${diffHour}h ago`

    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return ""
  }
}

export default function SyncStatus() {
  const [lastSynced, setLastSynced] = useState<Date | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [, setTick] = useState(0) // force re-render for relative time

  const checkSync = useCallback(async () => {
    if (!supabase) {
      setIsLoading(false)
      return
    }

    try {
      const { error } = await supabase.from("agents").select("id").limit(1)
      if (!error) {
        setLastSynced(new Date())
      }
    } catch (err) {
      console.warn("SyncStatus: Failed to check sync", err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    checkSync()

    // Poll for sync status every 60s
    const pollId = setInterval(checkSync, POLL_INTERVAL_MS)

    // Tick every 10s to keep relative time fresh
    const tickId = setInterval(() => setTick((t) => t + 1), TICK_INTERVAL_MS)

    return () => {
      clearInterval(pollId)
      clearInterval(tickId)
    }
  }, [checkSync])

  // Don't render anything if no state
  if (!lastSynced && !isLoading) return null

  try {
    const timeText = lastSynced ? formatRelativeTime(lastSynced) : ""

    return (
      <div className="flex items-center gap-1.5 text-xs text-white/30">
        <RefreshCw
          className={`h-3 w-3 ${isLoading ? "animate-spin text-blue-400/60" : ""}`}
        />
        <span>
          {isLoading
            ? "Syncing..."
            : timeText
              ? `Synced ${timeText}`
              : ""}
        </span>
      </div>
    )
  } catch {
    return null
  }
}
