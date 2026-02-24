"use client"

import { useState } from "react"
import { Plus, X, Loader2 } from "lucide-react"
import { useEpics } from "@/hooks/useEpics"
import { useEpicFeatures } from "@/hooks/useEpicFeatures"
import { EpicBadge } from "./EpicBadge"

interface EpicSelectorProps {
  featureId: string
}

export function EpicSelector({ featureId }: EpicSelectorProps) {
  const { epics } = useEpics()
  const { epicLinks, loading, addToEpic, removeFromEpic } = useEpicFeatures(featureId)
  const [showDropdown, setShowDropdown] = useState(false)

  const unlinkedEpics = epics.filter(e => !epicLinks.some(l => l.epic_id === e.id))

  if (loading) return <Loader2 className="h-3 w-3 animate-spin text-white/30" />

  return (
    <div className="flex flex-wrap items-center gap-1">
      {epicLinks.map(link => (
        <div key={link.epic_id} className="flex items-center gap-0.5">
          <EpicBadge title={link.epic_title} color={link.epic_color} />
          <button
            onClick={() => removeFromEpic(link.epic_id)}
            className="text-white/20 hover:text-red-400 transition-colors"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </div>
      ))}

      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] text-white/30 hover:text-white/50 hover:bg-white/5 transition-colors"
        >
          <Plus className="h-2.5 w-2.5" />Epic
        </button>
        {showDropdown && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setShowDropdown(false)} />
            <div className="absolute top-full left-0 mt-1 z-40 bg-black/95 border border-white/10 rounded-md py-1 min-w-[160px] shadow-xl">
              {unlinkedEpics.length > 0 ? (
                unlinkedEpics.map(epic => (
                  <button
                    key={epic.id}
                    onClick={() => {
                      addToEpic(epic.id)
                      setShowDropdown(false)
                    }}
                    className="w-full text-left px-2 py-1 text-[11px] hover:bg-white/10 flex items-center gap-2"
                  >
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: epic.color }} />
                    <span className="text-white/70">{epic.title}</span>
                  </button>
                ))
              ) : (
                <div className="px-2 py-1 text-[10px] text-white/30">No available epics</div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
