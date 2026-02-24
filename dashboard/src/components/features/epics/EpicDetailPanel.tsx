"use client"

import { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import { X, Layers, Trash2, Plus, Search, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { EpicProgressBar } from "./EpicProgressBar"

interface Feature {
  id: string
  title: string
  status: string
  priority: string
}

interface EpicDetail {
  id: string
  title: string
  description: string | null
  status: string
  color: string
  owner: string | null
  features: Feature[]
}

interface EpicDetailPanelProps {
  epicId: string
  onClose: () => void
  onRefresh?: () => void
}

const statusColors: Record<string, string> = {
  planning: "text-gray-400",
  design_review: "text-blue-400",
  in_progress: "text-yellow-400",
  qa_review: "text-orange-400",
  review: "text-purple-400",
  approved: "text-emerald-400",
  pr_submitted: "text-cyan-400",
  done: "text-green-400",
  cancelled: "text-red-400",
}

export function EpicDetailPanel({ epicId, onClose, onRefresh }: EpicDetailPanelProps) {
  const [epic, setEpic] = useState<EpicDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAddFeature, setShowAddFeature] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [allFeatures, setAllFeatures] = useState<Feature[]>([])
  const [searchLoading, setSearchLoading] = useState(false)

  const fetchEpic = useCallback(async () => {
    try {
      const res = await fetch(`/api/epics/${epicId}`)
      if (!res.ok) return
      const data = await res.json()
      setEpic(data)
    } finally {
      setLoading(false)
    }
  }, [epicId])

  useEffect(() => { fetchEpic() }, [fetchEpic])

  const handleAddFeature = async (featureId: string) => {
    await fetch(`/api/epics/${epicId}/features`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ feature_id: featureId }),
    })
    await fetchEpic()
    onRefresh?.()
  }

  const handleRemoveFeature = async (featureId: string) => {
    await fetch(`/api/epics/${epicId}/features`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ feature_id: featureId }),
    })
    await fetchEpic()
    onRefresh?.()
  }

  const handleDeleteEpic = async () => {
    if (!confirm("Delete this epic? Features will NOT be deleted.")) return
    await fetch(`/api/epics/${epicId}`, { method: "DELETE" })
    onRefresh?.()
    onClose()
  }

  const searchFeatures = useCallback(async (query: string) => {
    setSearchLoading(true)
    try {
      const res = await fetch("/api/features")
      if (!res.ok) return
      const data = await res.json()
      const features = Array.isArray(data) ? data : data.features || []
      const filtered = features.filter((f: Feature) =>
        f.title.toLowerCase().includes(query.toLowerCase()) &&
        !epic?.features.some(ef => ef.id === f.id)
      )
      setAllFeatures(filtered)
    } finally {
      setSearchLoading(false)
    }
  }, [epic])

  useEffect(() => {
    if (showAddFeature) searchFeatures(searchQuery)
  }, [showAddFeature, searchQuery, searchFeatures])

  if (loading) {
    return (
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
        className="fixed top-0 right-0 h-full w-full max-w-md bg-black/98 border-l border-white/10 z-50 flex items-center justify-center">
        <Loader2 className="h-6 w-6 text-purple-400 animate-spin" />
      </motion.div>
    )
  }

  if (!epic) return null

  const doneCount = epic.features.filter(f => f.status === "done").length

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="fixed top-0 right-0 h-full w-full max-w-md bg-black/98 border-l border-white/10 z-50 flex flex-col"
    >
      {/* Header */}
      <div className="flex-shrink-0 p-3 border-b border-white/10">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Layers className="h-5 w-5 flex-shrink-0" style={{ color: epic.color }} />
            <h2 className="text-sm font-semibold text-white truncate">{epic.title}</h2>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={handleDeleteEpic} className="h-7 w-7 text-red-400/50 hover:text-red-400">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {epic.description && (
          <p className="text-[11px] text-white/40 mt-1">{epic.description}</p>
        )}
        <div className="mt-2">
          <EpicProgressBar total={epic.features.length} done={doneCount} color={epic.color} />
        </div>
      </div>

      {/* Features */}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] text-white/40 uppercase tracking-wider">
            Linked Features ({epic.features.length})
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAddFeature(!showAddFeature)}
            className="h-6 text-[10px] gap-1 text-purple-400"
          >
            <Plus className="h-3 w-3" />Add
          </Button>
        </div>

        {showAddFeature && (
          <div className="mb-3 p-2 rounded-md bg-white/[0.03] border border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <Search className="h-3 w-3 text-white/30" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search features..."
                className="h-6 text-[11px] bg-transparent border-none p-0 focus-visible:ring-0"
              />
            </div>
            {searchLoading ? (
              <Loader2 className="h-3 w-3 animate-spin text-white/30 mx-auto" />
            ) : (
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {allFeatures.slice(0, 10).map(f => (
                  <button
                    key={f.id}
                    onClick={() => handleAddFeature(f.id)}
                    className="w-full text-left px-2 py-1 text-[11px] text-white/70 hover:bg-white/10 rounded flex items-center justify-between"
                  >
                    <span className="truncate">{f.title}</span>
                    <Plus className="h-3 w-3 text-white/30 flex-shrink-0" />
                  </button>
                ))}
                {allFeatures.length === 0 && (
                  <p className="text-[10px] text-white/30 text-center py-2">No features found</p>
                )}
              </div>
            )}
          </div>
        )}

        <div className="space-y-1">
          {epic.features.map(feature => (
            <div
              key={feature.id}
              className="flex items-center justify-between p-2 rounded-md bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className={cn("text-[10px] font-medium", statusColors[feature.status] || "text-white/40")}>
                  ●
                </span>
                <span className="text-[11px] text-white/70 truncate">{feature.title}</span>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <Badge className="text-[8px] px-1 py-0 h-3.5 bg-white/5 text-white/40 border-white/10">
                  {feature.status.replace("_", " ")}
                </Badge>
                <button
                  onClick={() => handleRemoveFeature(feature.id)}
                  className="text-white/20 hover:text-red-400 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
          {epic.features.length === 0 && (
            <div className="text-center py-8">
              <p className="text-[11px] text-white/30">No features linked yet</p>
              <p className="text-[10px] text-white/20 mt-1">Click "Add" to link features to this epic</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
