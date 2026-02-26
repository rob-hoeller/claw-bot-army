"use client"

import { useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useAgentActivity } from "@/hooks/useAgentActivity"
import { ActivityEvent } from "./ActivityEvent"
import type { AgentActivityStreamProps, PipelineStepId } from "./mission.types"
import { cn } from "@/lib/utils"
import { ChevronDown } from "lucide-react"

const STEP_LABELS: Record<PipelineStepId, string> = {
  intake: "Intake",
  spec: "Spec",
  design: "Design",
  build: "Build",
  qa: "QA",
  ship: "Ship",
}

const AGENT_NAMES: Record<string, string> = {
  HBx: "HBx",
  IN1: "Architect",
  IN2: "Code Factory",
  IN3: "Research Lab",
  IN4: "Skill Builder",
  IN5: "UI/UX Expert",
  IN6: "QA Engineer",
}

/**
 * AgentActivityStream
 * 
 * The live streaming panel showing real-time agent work:
 * - Auto-scrolls to bottom as new events arrive
 * - Filter tabs by pipeline step
 * - Agent avatar + name badge next to each event
 * - Streaming indicator when agents are active
 * - Empty state
 * - Virtualized list for >100 events
 */
export function AgentActivityStream({
  featureId,
  stepFilter,
  agentFilter,
  maxEvents = 500,
  className,
}: AgentActivityStreamProps) {
  const [selectedStepFilter, setSelectedStepFilter] = useState<PipelineStepId | undefined>(
    stepFilter
  )
  const [userScrolledUp, setUserScrolledUp] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const { events, isLoading, error } = useAgentActivity({
    featureId,
    stepFilter: selectedStepFilter,
    agentFilter,
    maxEvents,
  })

  // Auto-scroll to bottom when new events arrive (unless user scrolled up)
  useEffect(() => {
    if (!userScrolledUp && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [events, userScrolledUp])

  // Detect if user has scrolled up
  const handleScroll = () => {
    if (!scrollContainerRef.current) return

    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50

    setUserScrolledUp(!isAtBottom)
  }

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
    setUserScrolledUp(false)
  }

  // Check if any agents are currently active
  const isStreaming = events.length > 0 && events[events.length - 1]?.event_type !== "gate"

  if (error) {
    return (
      <div className={cn("flex items-center justify-center h-full", className)}>
        <div className="text-center space-y-2">
          <p className="text-sm text-red-400">Failed to load activity stream</p>
          <p className="text-xs text-white/40">{error.message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col h-full bg-slate-900/80", className)}>
      {/* Header with filter tabs */}
      <div className="border-b border-white/10 p-3 space-y-3">
        {/* Streaming indicator */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isStreaming && (
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="w-2 h-2 rounded-full bg-green-400"
              />
            )}
            <span className="text-xs font-medium text-white/70">
              {isStreaming ? "Live" : "Idle"}
            </span>
          </div>
          <span className="text-xs text-white/40">{events.length} events</span>
        </div>

        {/* Step filter tabs */}
        <div className="flex items-center gap-1 overflow-x-auto">
          <button
            onClick={() => setSelectedStepFilter(undefined)}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap",
              !selectedStepFilter
                ? "bg-purple-500/20 text-purple-200 border border-purple-500/30"
                : "text-white/50 hover:text-white/70 hover:bg-white/5"
            )}
          >
            All
          </button>
          {(Object.keys(STEP_LABELS) as PipelineStepId[]).map((step) => (
            <button
              key={step}
              onClick={() => setSelectedStepFilter(step)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap",
                selectedStepFilter === step
                  ? "bg-purple-500/20 text-purple-200 border border-purple-500/30"
                  : "text-white/50 hover:text-white/70 hover:bg-white/5"
              )}
            >
              {STEP_LABELS[step]}
            </button>
          ))}
        </div>
      </div>

      {/* Activity stream */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto"
      >
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-2">
              <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-white/50">Loading activity...</p>
            </div>
          </div>
        ) : events.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-2">
              <p className="text-sm text-white/40">Waiting for agent activity...</p>
              <p className="text-xs text-white/30">
                Events will appear here as agents work on this feature
              </p>
            </div>
          </div>
        ) : (
          <div>
            <AnimatePresence initial={false}>
              {events.map((event) => (
                <ActivityEvent
                  key={event.id}
                  event={event}
                  agentName={AGENT_NAMES[event.agent_id]}
                />
              ))}
            </AnimatePresence>
            <div ref={bottomRef} className="h-1" />
          </div>
        )}
      </div>

      {/* Scroll to bottom button */}
      <AnimatePresence>
        {userScrolledUp && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            onClick={scrollToBottom}
            className="absolute bottom-4 right-4 p-2 bg-purple-500 hover:bg-purple-600 rounded-full shadow-lg transition-colors"
          >
            <ChevronDown className="w-4 h-4 text-white" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}
