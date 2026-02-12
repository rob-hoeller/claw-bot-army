"use client"

import { RefreshCw } from "lucide-react"

interface SyncStatusProps {
  lastSynced: Date | null
  isLoading?: boolean
}

function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)

  if (diffSec < 10) return "just now"
  if (diffSec < 60) return `${diffSec}s ago`
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHour < 24) return `${diffHour}h ago`
  
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default function SyncStatus({ lastSynced, isLoading }: SyncStatusProps) {
  if (!lastSynced && !isLoading) return null

  return (
    <div className="flex items-center gap-1.5 text-xs text-white/30">
      <RefreshCw 
        className={`h-3 w-3 ${isLoading ? "animate-spin text-blue-400/60" : ""}`} 
      />
      <span>
        {isLoading 
          ? "Syncing..." 
          : lastSynced 
            ? `Synced ${formatRelativeTime(lastSynced)}`
            : ""
        }
      </span>
    </div>
  )
}
