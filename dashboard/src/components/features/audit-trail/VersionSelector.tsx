"use client"

import { GitCompare } from "lucide-react"

interface VersionOption {
  id: string
  version: number
}

interface VersionSelectorProps {
  versions: VersionOption[]
  selectedId: string
  onSelect: (id: string) => void
  diffMode: boolean
  onToggleDiff: () => void
}

export function VersionSelector({
  versions,
  selectedId,
  onSelect,
  diffMode,
  onToggleDiff,
}: VersionSelectorProps) {
  const selectedVersion = versions.find((v) => v.id === selectedId)
  const canDiff = selectedVersion ? selectedVersion.version > 1 : false

  return (
    <div className="flex items-center gap-2 mb-2">
      <select
        value={selectedId}
        onChange={(e) => onSelect(e.target.value)}
        className="text-[10px] bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-white/70 outline-none focus:border-purple-500/50 cursor-pointer appearance-none"
      >
        {versions.map((v) => (
          <option key={v.id} value={v.id} className="bg-[#1a1a2e] text-white">
            v{v.version}
          </option>
        ))}
      </select>

      {canDiff && (
        <button
          onClick={onToggleDiff}
          className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded border transition-colors ${
            diffMode
              ? "bg-purple-500/20 text-purple-300 border-purple-500/30"
              : "bg-white/5 text-white/40 border-white/10 hover:text-white/60 hover:border-white/20"
          }`}
        >
          <GitCompare className="h-2.5 w-2.5" />
          {diffMode ? "Hide changes" : "Show changes"}
        </button>
      )}
    </div>
  )
}
