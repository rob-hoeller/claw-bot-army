"use client"

import { cn } from "@/lib/utils"

interface RevisionBadgeProps {
  count: number
}

export function RevisionBadge({ count }: RevisionBadgeProps) {
  if (count <= 0) return null

  const colorClass = count >= 2 ? "text-red-400" : "text-yellow-400"

  return (
    <span
      className={cn("inline-flex items-center gap-0.5 text-xs font-medium", colorClass)}
      title={`Revision loop ${count} of 2`}
    >
      🔄 {count}
    </span>
  )
}
