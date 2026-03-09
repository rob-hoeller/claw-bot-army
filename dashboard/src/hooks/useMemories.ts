"use client"

import { useState, useEffect, useCallback } from "react"
import type { MemoryDay, MemoryEntry } from "@/app/api/memories/route"

export type { MemoryDay, MemoryEntry }

export function useMemories() {
  const [days, setDays] = useState<MemoryDay[]>([])
  const [datesWithMemory, setDatesWithMemory] = useState<string[]>([])
  const [agents, setAgents] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [agentFilter, setAgentFilter] = useState<string | null>(null)
  const [longTermMemory, setLongTermMemory] = useState<string | null>(null)
  const [longTermLoading, setLongTermLoading] = useState(false)
  const [totalEntries, setTotalEntries] = useState(0)

  const buildUrl = useCallback(
    (overrides?: { date?: string | null; search?: string; agent?: string | null }) => {
      const params = new URLSearchParams()
      const date = "date" in (overrides || {}) ? overrides!.date : selectedDate
      const search = overrides?.search ?? searchQuery
      const agent = "agent" in (overrides || {}) ? overrides!.agent : agentFilter

      if (date) params.set("date", date)
      if (search) params.set("search", search)
      if (agent) params.set("agent", agent)

      return `/api/memories?${params.toString()}`
    },
    [selectedDate, searchQuery, agentFilter]
  )

  const fetchMemories = useCallback(
    async (url?: string) => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(url ?? buildUrl())
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        setDays(data.days || [])
        setDatesWithMemory(data.datesWithMemory || [])
        setAgents(data.agents || [])
        setTotalEntries(data.totalEntries || 0)
        if (data.supabaseError) {
          console.warn("[Memories] Supabase error:", data.supabaseError)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch memories")
      } finally {
        setLoading(false)
      }
    },
    [buildUrl]
  )

  const fetchLongTermMemory = useCallback(async () => {
    setLongTermLoading(true)
    try {
      const res = await fetch("/api/memories?longTerm=true")
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setLongTermMemory(data.longTermMemory)
    } catch (err) {
      console.warn("[Memories] Long-term memory error:", err)
    } finally {
      setLongTermLoading(false)
    }
  }, [])

  // Initial fetch (no filters)
  useEffect(() => {
    fetchMemories("/api/memories")
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Re-fetch when filters change (debounced for search)
  useEffect(() => {
    if (loading) return // skip during initial load
    const timer = setTimeout(() => {
      fetchMemories(buildUrl())
    }, searchQuery ? 400 : 0)
    return () => clearTimeout(timer)
  }, [selectedDate, agentFilter, searchQuery]) // eslint-disable-line react-hooks/exhaustive-deps

  const selectDate = useCallback(
    (date: string | null) => {
      setSelectedDate(date)
    },
    []
  )

  const setSearch = useCallback((q: string) => {
    setSearchQuery(q)
  }, [])

  const setAgent = useCallback((agent: string | null) => {
    setAgentFilter(agent)
  }, [])

  // Get entries for the currently selected date
  const selectedDayEntries = selectedDate
    ? days.find((d) => d.date === selectedDate)?.entries || []
    : days.flatMap((d) => d.entries)

  return {
    days,
    datesWithMemory,
    agents,
    loading,
    error,
    totalEntries,
    selectedDate,
    searchQuery,
    agentFilter,
    selectedDayEntries,
    longTermMemory,
    longTermLoading,
    selectDate,
    setSearch,
    setAgent,
    fetchLongTermMemory,
    refresh: fetchMemories,
  }
}
