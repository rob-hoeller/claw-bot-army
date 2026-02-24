import { useState, useEffect, useCallback } from "react"

interface EpicFeatureLink {
  epic_id: string
  epic_title: string
  epic_color: string
}

export function useEpicFeatures(featureId: string | null) {
  const [epicLinks, setEpicLinks] = useState<EpicFeatureLink[]>([])
  const [loading, setLoading] = useState(false)

  const fetchLinks = useCallback(async () => {
    if (!featureId) return
    setLoading(true)
    try {
      // Fetch all epics and check which contain this feature
      const res = await fetch("/api/epics")
      if (!res.ok) return
      const epics = await res.json()

      const links: EpicFeatureLink[] = []
      for (const epic of epics) {
        const detailRes = await fetch(`/api/epics/${epic.id}`)
        if (!detailRes.ok) continue
        const detail = await detailRes.json()
        if (detail.features?.some((f: { id: string }) => f.id === featureId)) {
          links.push({ epic_id: epic.id, epic_title: epic.title, epic_color: epic.color })
        }
      }
      setEpicLinks(links)
    } finally {
      setLoading(false)
    }
  }, [featureId])

  useEffect(() => { fetchLinks() }, [fetchLinks])

  const addToEpic = useCallback(async (epicId: string) => {
    if (!featureId) return
    await fetch(`/api/epics/${epicId}/features`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ feature_id: featureId }),
    })
    await fetchLinks()
  }, [featureId, fetchLinks])

  const removeFromEpic = useCallback(async (epicId: string) => {
    if (!featureId) return
    await fetch(`/api/epics/${epicId}/features`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ feature_id: featureId }),
    })
    await fetchLinks()
  }, [featureId, fetchLinks])

  return { epicLinks, loading, refetch: fetchLinks, addToEpic, removeFromEpic }
}
