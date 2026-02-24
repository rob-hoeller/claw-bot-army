"use client"

import { cn } from "@/lib/utils"

interface EpicProgressBarProps {
  total: number
  done: number
  color: string
  showLabel?: boolean
}

export function EpicProgressBar({ total, done, color, showLabel = true }: EpicProgressBarProps) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  return (
    <div className="w-full">
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, backgroundColor: color }}
          />
        </div>
        {showLabel && (
          <span className={cn("text-[9px] text-white/40 flex-shrink-0")}>
            {done}/{total} ({pct}%)
          </span>
        )}
      </div>
    </div>
  )
}
