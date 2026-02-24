import { useState, useEffect, useCallback } from "react"

export interface Epic {
  id: string
  title: string
  description: string | null
  status: "open" | "in_progress" | "completed" | "archived"
  color: string
  owner: string | null
  feature_count: number
  features_done: number
  created_at: string
  updated_at: string
}

export function useEpics() {
  const [epics, setEpics] = useState<Epic[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchEpics = useCallback(async () => {
    try {
      const res = await fetch("/api/epics")
      if (!res.ok) throw new Error("Failed to fetch epics")
      const data = await res.json()
      setEpics(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchEpics() }, [fetchEpics])

  const createEpic = useCallback(async (epic: { title: string; description?: string; color?: string; owner?: string }) => {
    const res = await fetch("/api/epics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(epic),
    })
    if (!res.ok) throw new Error("Failed to create epic")
    const { epic: created } = await res.json()
    setEpics(prev => [{ ...created, feature_count: 0, features_done: 0 }, ...prev])
    return created
  }, [])

  const deleteEpic = useCallback(async (id: string) => {
    const res = await fetch(`/api/epics/${id}`, { method: "DELETE" })
    if (!res.ok) throw new Error("Failed to delete epic")
    setEpics(prev => prev.filter(e => e.id !== id))
  }, [])

  return { epics, loading, error, refetch: fetchEpics, createEpic, deleteEpic }
}
