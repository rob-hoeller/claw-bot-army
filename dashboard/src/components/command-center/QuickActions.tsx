/**
 * Quick Actions
 * 
 * Horizontal scrollable row of quick action chips
 * for common command center queries.
 */

"use client"

import { cn } from "@/lib/utils"

interface QuickActionsProps {
  onSelect: (query: string) => void
  disabled?: boolean
  className?: string
}

const QUICK_ACTIONS = [
  { label: "What shipped today?", query: "What shipped today?" },
  { label: "Agent health", query: "Agent health check" },
  { label: "Active missions", query: "What's in the pipeline?" },
  { label: "System status", query: "System status" },
  { label: "Top priorities", query: "Show me top priorities" },
  { label: "Feature metrics", query: "Show me feature metrics" },
] as const

export function QuickActions({ onSelect, disabled, className }: QuickActionsProps) {
  return (
    <div className={cn("flex gap-2 overflow-x-auto pb-2 scrollbar-hide", className)}>
      {QUICK_ACTIONS.map((action) => (
        <button
          key={action.query}
          onClick={() => onSelect(action.query)}
          disabled={disabled}
          className={cn(
            "px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors flex-shrink-0",
            "bg-white/[0.05] hover:bg-white/[0.08] text-white/60 hover:text-white/90",
            "border border-white/10 hover:border-white/20",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          {action.label}
        </button>
      ))}
    </div>
  )
}
