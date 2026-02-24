"use client"

import { useState } from "react"
import { ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Decision } from "./types"

interface DecisionItemProps {
  decision: Decision
}

export function DecisionItem({ decision }: DecisionItemProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 text-left px-2 py-1 rounded bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors"
      >
        <ChevronRight
          className={cn(
            "h-2.5 w-2.5 text-white/30 transition-transform flex-shrink-0",
            expanded && "rotate-90"
          )}
        />
        <span className="text-[10px] text-white/60 flex-1 truncate">
          {decision.question}
        </span>
        <span className="text-[10px] text-emerald-400/70 truncate max-w-[120px]">
          {decision.chosen}
        </span>
      </button>

      {expanded && (
        <div className="ml-5 mt-1 space-y-1 text-[10px]">
          <div>
            <span className="text-white/30">Chosen:</span>{" "}
            <span className="text-emerald-400/80">{decision.chosen}</span>
          </div>
          <div>
            <span className="text-white/30">Rationale:</span>{" "}
            <span className="text-white/60">{decision.rationale}</span>
          </div>
          {decision.alternatives?.length > 0 && (
            <div>
              <span className="text-white/30">Alternatives:</span>{" "}
              <span className="text-white/40">
                {decision.alternatives.join(", ")}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
