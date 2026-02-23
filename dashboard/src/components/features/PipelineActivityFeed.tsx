"use client"

import { motion, AnimatePresence } from "framer-motion"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { ActivityEvent } from "@/hooks/useRealtimeFeatures"

interface PipelineActivityFeedProps {
  events: ActivityEvent[]
  open: boolean
  onClose: () => void
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

function formatStatus(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

export function PipelineActivityFeed({
  events,
  open,
  onClose,
}: PipelineActivityFeedProps) {
  const displayEvents = events.slice(0, 20)

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ x: 320 }}
          animate={{ x: 0 }}
          exit={{ x: 320 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="fixed top-0 right-0 h-full w-80 bg-[#0f172a] border-l border-white/10 z-30 flex flex-col"
        >
          <div className="flex items-center justify-between p-3 border-b border-white/10">
            <h3 className="text-xs font-semibold text-white/80 uppercase tracking-wider">
              Activity Feed
            </h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-6 w-6"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {displayEvents.length === 0 ? (
              <p className="text-[11px] text-white/30 text-center mt-8">
                No events yet. Activity will appear here in real time.
              </p>
            ) : (
              displayEvents.map((event, i) => (
                <div
                  key={`${event.time.getTime()}-${i}`}
                  className="flex gap-2 py-1.5 border-b border-white/5 last:border-0"
                >
                  <span className="text-[10px] text-white/30 font-mono flex-shrink-0 w-10">
                    {formatTime(event.time)}
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono leading-tight">
                    <span className="text-white/70">{event.featureTitle}</span>
                    {" → "}
                    <span className="text-blue-400">
                      {formatStatus(event.status)}
                    </span>
                    {event.agent && (
                      <span className="text-white/30"> ({event.agent})</span>
                    )}
                  </span>
                </div>
              ))
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
