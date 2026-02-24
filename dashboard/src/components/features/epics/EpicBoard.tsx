"use client"

import { useState } from "react"
import { AnimatePresence } from "framer-motion"
import { Plus, Layers, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useEpics } from "@/hooks/useEpics"
import { EpicCard } from "./EpicCard"
import { EpicDetailPanel } from "./EpicDetailPanel"

const PRESET_COLORS = ["#8B5CF6", "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#EC4899"]

export function EpicBoard() {
  const { epics, loading, refetch, createEpic } = useEpics()
  const [selectedEpicId, setSelectedEpicId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [newDesc, setNewDesc] = useState("")
  const [newColor, setNewColor] = useState(PRESET_COLORS[0])
  const [creating, setCreating] = useState(false)

  const handleCreate = async () => {
    if (!newTitle.trim() || creating) return
    setCreating(true)
    try {
      await createEpic({ title: newTitle.trim(), description: newDesc.trim() || undefined, color: newColor })
      setNewTitle("")
      setNewDesc("")
      setNewColor(PRESET_COLORS[0])
      setShowCreate(false)
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-5 w-5 animate-spin text-purple-400" />
        <span className="text-[11px] text-white/30 ml-2">Loading epics...</span>
      </div>
    )
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-purple-400" />
          <h2 className="text-sm font-semibold text-white">Epics</h2>
          <span className="text-[10px] text-white/30">({epics.length})</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowCreate(!showCreate)}
          className="h-7 text-[11px] gap-1 text-purple-400 hover:text-purple-300"
        >
          <Plus className="h-3.5 w-3.5" />New Epic
        </Button>
      </div>

      {showCreate && (
        <div className="mb-4 p-3 rounded-lg bg-white/[0.03] border border-white/10 space-y-2">
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Epic title..."
            className="h-8 text-xs bg-transparent border-white/10"
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
          <Input
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="Description (optional)"
            className="h-8 text-xs bg-transparent border-white/10"
          />
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-white/40">Color:</span>
            {PRESET_COLORS.map(c => (
              <button
                key={c}
                onClick={() => setNewColor(c)}
                className="w-5 h-5 rounded-full border-2 transition-all"
                style={{
                  backgroundColor: c,
                  borderColor: newColor === c ? "white" : "transparent",
                }}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleCreate}
              disabled={!newTitle.trim() || creating}
              className="h-7 text-[10px] bg-purple-600 hover:bg-purple-500"
            >
              {creating ? <Loader2 className="h-3 w-3 animate-spin" /> : "Create"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCreate(false)}
              className="h-7 text-[10px]"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {epics.map(epic => (
          <EpicCard key={epic.id} epic={epic} onClick={() => setSelectedEpicId(epic.id)} />
        ))}
      </div>

      {epics.length === 0 && !showCreate && (
        <div className="text-center py-12">
          <Layers className="h-8 w-8 text-white/10 mx-auto mb-2" />
          <p className="text-[11px] text-white/30">No epics yet</p>
          <p className="text-[10px] text-white/20 mt-1">Create an epic to group related features</p>
        </div>
      )}

      <AnimatePresence>
        {selectedEpicId && (
          <EpicDetailPanel
            epicId={selectedEpicId}
            onClose={() => setSelectedEpicId(null)}
            onRefresh={refetch}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
