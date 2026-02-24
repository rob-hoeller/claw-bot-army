"use client"

import { cn } from "@/lib/utils"

interface EpicBadgeProps {
  title: string
  color: string
  onClick?: () => void
}

export function EpicBadge({ title, color, onClick }: EpicBadgeProps) {
  return (
    <span
      onClick={(e) => {
        if (onClick) {
          e.stopPropagation()
          onClick()
        }
      }}
      className={cn(
        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium border transition-colors",
        onClick && "cursor-pointer hover:brightness-125"
      )}
      style={{
        backgroundColor: `${color}20`,
        borderColor: `${color}40`,
        color: color,
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: color }}
      />
      {title}
    </span>
  )
}
