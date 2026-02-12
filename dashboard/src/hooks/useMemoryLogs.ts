"use client"

import { useEffect, useState, useCallback } from "react"
import { supabase } from "@/lib/supabase"

export interface MemoryLogEntry {
  id: string
  agent_id: string
  log_date: string
  timestamp: string
  content: string
  created_at: string
}

export interface DailyMemoryLog {
  date: string
  entries: MemoryLogEntry[]
}

export function useMemoryLogs(agentId: string | null) {
  const [logs, setLogs] = useState<DailyMemoryLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchLogs = useCallback(async () => {
    if (!supabase || !agentId) {
      setLoading(false)
      return
    }

    try {
      const { data, error: fetchError } = await supabase
        .from("memory_logs")
        .select("*")
        .eq("agent_id", agentId)
        .order("timestamp", { ascending: false })
        .limit(100)

      if (fetchError) throw fetchError

      // Group by date
      const grouped: Record<string, MemoryLogEntry[]> = {}
      for (const entry of data || []) {
        const date = entry.log_date
        if (!grouped[date]) {
          grouped[date] = []
        }
        grouped[date].push(entry)
      }

      // Convert to array sorted by date desc
      const dailyLogs: DailyMemoryLog[] = Object.entries(grouped)
        .map(([date, entries]) => ({ date, entries }))
        .sort((a, b) => b.date.localeCompare(a.date))

      setLogs(dailyLogs)
      setError(null)
    } catch (err) {
      console.error("Failed to fetch memory logs:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch logs")
    } finally {
      setLoading(false)
    }
  }, [agentId])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  return { logs, loading, error, refresh: fetchLogs }
}
