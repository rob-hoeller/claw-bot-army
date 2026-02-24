"use client"

import { cn } from "@/lib/utils"

interface Agent {
  id: string
  name: string
  emoji: string | null
}

interface MentionAutocompleteProps {
  agents: Agent[]
  onSelect: (agentId: string) => void
  activeIndex: number
}

export function MentionAutocomplete({
  agents,
  onSelect,
  activeIndex,
}: MentionAutocompleteProps) {
  return (
    <div className="absolute bottom-full left-0 mb-1 w-56 max-h-48 overflow-y-auto bg-black/95 border border-white/10 rounded-lg shadow-xl shadow-black/50 py-1 z-50">
      {agents.map((agent, i) => (
        <button
          key={agent.id}
          onMouseDown={(e) => {
            e.preventDefault()
            onSelect(agent.id)
          }}
          className={cn(
            "w-full text-left px-3 py-1.5 flex items-center gap-2 text-[11px] transition-colors",
            i === activeIndex
              ? "bg-purple-500/20 text-purple-300"
              : "text-white/70 hover:bg-white/5"
          )}
        >
          <span className="text-sm">{agent.emoji}</span>
          <div>
            <span className="font-medium">{agent.id}</span>
            <span className="text-white/40 ml-1.5">{agent.name}</span>
          </div>
        </button>
      ))}
      {agents.length === 0 && (
        <div className="px-3 py-2 text-[10px] text-white/30">No matches</div>
      )}
    </div>
  )
}
