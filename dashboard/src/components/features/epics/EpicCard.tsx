"use client"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Layers, ChevronRight } from "lucide-react"
import { EpicProgressBar } from "./EpicProgressBar"
import type { Epic } from "@/hooks/useEpics"

interface EpicCardProps {
  epic: Epic
  onClick: () => void
}

const statusLabels: Record<string, { label: string; color: string }> = {
  open: { label: "Open", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  in_progress: { label: "Active", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  completed: { label: "Done", color: "bg-green-500/20 text-green-400 border-green-500/30" },
  archived: { label: "Archived", color: "bg-gray-500/20 text-gray-400 border-gray-500/30" },
}

export function EpicCard({ epic, onClick }: EpicCardProps) {
  const statusConf = statusLabels[epic.status] || statusLabels.open

  return (
    <div
      onClick={onClick}
      className="p-3 rounded-lg bg-white/[0.02] border border-white/5 hover:border-white/20 hover:bg-white/[0.04] transition-all cursor-pointer group"
      style={{ borderLeftColor: epic.color, borderLeftWidth: "3px" }}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <Layers className="h-4 w-4 flex-shrink-0" style={{ color: epic.color }} />
          <h3 className="text-sm font-medium text-white/90 truncate group-hover:text-purple-300 transition-colors">
            {epic.title}
          </h3>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Badge className={cn("text-[9px] px-1.5 py-0 h-4 border", statusConf.color)}>
            {statusConf.label}
          </Badge>
          <ChevronRight className="h-3.5 w-3.5 text-white/20 group-hover:text-white/40 transition-colors" />
        </div>
      </div>

      {epic.description && (
        <p className="text-[11px] text-white/40 mb-2 line-clamp-2 pl-6">{epic.description}</p>
      )}

      <div className="pl-6">
        <EpicProgressBar total={epic.feature_count} done={epic.features_done} color={epic.color} />
      </div>
    </div>
  )
}
