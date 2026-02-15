"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Network, 
  Filter,
  LayoutGrid,
  List
} from "lucide-react"
import { SessionList } from "./SessionList"
import { SessionViewer } from "./SessionViewer"
import { SessionInfo } from "./types"
import { cn } from "@/lib/utils"

type FilterType = 'all' | 'subagents' | 'dashboard'

interface OrchestratorPanelProps {
  className?: string
}

export function OrchestratorPanel({ className }: OrchestratorPanelProps) {
  const [selectedSession, setSelectedSession] = useState<SessionInfo | null>(null)
  const [filter, setFilter] = useState<FilterType>('all')
  const [viewMode, setViewMode] = useState<'split' | 'list'>('split')

  const filterOptions: { value: FilterType; label: string }[] = [
    { value: 'all', label: 'All Sessions' },
    { value: 'subagents', label: 'Sub-Agents' },
    { value: 'dashboard', label: 'Dashboard' },
  ]

  return (
    <div className={cn("flex flex-col h-full bg-black/30 rounded-xl border border-white/10 overflow-hidden", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/20">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center">
            <Network className="h-4 w-4 text-purple-400" />
          </div>
          <div>
            <h2 className="text-sm font-medium text-white">Agent Network</h2>
            <p className="text-[10px] text-white/40">Monitor active sessions and sub-agents</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Filter dropdown */}
          <div className="flex items-center gap-1 bg-black/30 rounded-lg p-1">
            <Filter className="h-3.5 w-3.5 text-white/40 ml-1" />
            {filterOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setFilter(option.value)}
                className={cn(
                  "px-2 py-1 text-xs rounded transition-colors",
                  filter === option.value
                    ? "bg-purple-500/20 text-purple-300"
                    : "text-white/50 hover:text-white/70"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>

          {/* View mode toggle */}
          <div className="flex items-center gap-0.5 bg-black/30 rounded-lg p-1">
            <button
              onClick={() => setViewMode('split')}
              className={cn(
                "p-1.5 rounded transition-colors",
                viewMode === 'split'
                  ? "bg-white/10 text-white"
                  : "text-white/40 hover:text-white/70"
              )}
              title="Split view"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                "p-1.5 rounded transition-colors",
                viewMode === 'list'
                  ? "bg-white/10 text-white"
                  : "text-white/40 hover:text-white/70"
              )}
              title="List view"
            >
              <List className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {viewMode === 'split' ? (
          <>
            {/* Session list - left panel */}
            <div className={cn(
              "border-r border-white/5 overflow-hidden transition-all duration-300",
              selectedSession ? "w-80" : "w-full"
            )}>
              <SessionList
                filter={filter}
                onSelectSession={setSelectedSession}
                selectedSessionKey={selectedSession?.key}
                refreshInterval={15000}
              />
            </div>

            {/* Session viewer - right panel */}
            <AnimatePresence mode="wait">
              {selectedSession && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex-1 overflow-hidden"
                >
                  <SessionViewer
                    session={selectedSession}
                    onClose={() => setSelectedSession(null)}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Empty state when no session selected */}
            {!selectedSession && (
              <div className="hidden" /> // List takes full width
            )}
          </>
        ) : (
          /* List-only view */
          <div className="w-full overflow-hidden">
            <SessionList
              filter={filter}
              onSelectSession={setSelectedSession}
              selectedSessionKey={selectedSession?.key}
              refreshInterval={15000}
            />
          </div>
        )}
      </div>

      {/* Modal viewer for list mode */}
      <AnimatePresence>
        {viewMode === 'list' && selectedSession && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedSession(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl h-[80vh] bg-[#0a0a0f] rounded-xl border border-white/10 overflow-hidden"
            >
              <SessionViewer
                session={selectedSession}
                onClose={() => setSelectedSession(null)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
