"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Users, 
  Bot, 
  Monitor, 
  RefreshCw, 
  Clock, 
  Zap,
  ChevronRight,
  MessageSquare
} from "lucide-react"
import { SessionInfo } from "./types"
import { cn } from "@/lib/utils"

interface SessionListProps {
  onSelectSession: (session: SessionInfo) => void
  selectedSessionKey?: string
  filter?: 'all' | 'subagents' | 'dashboard'
  refreshInterval?: number
}

export function SessionList({
  onSelectSession,
  selectedSessionKey,
  filter = 'all',
  refreshInterval = 10000
}: SessionListProps) {
  const [sessions, setSessions] = useState<SessionInfo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  const fetchSessions = useCallback(async () => {
    try {
      const response = await fetch(`/api/orchestrator/sessions?filter=${filter}&limit=50`)
      if (!response.ok) {
        throw new Error('Failed to fetch sessions')
      }
      const data = await response.json()
      setSessions(data.sessions || [])
      setLastRefresh(new Date())
      setError(null)
    } catch (err) {
      console.error('Error fetching sessions:', err)
      setError('Failed to load sessions')
    } finally {
      setIsLoading(false)
    }
  }, [filter])

  // Initial fetch and polling
  useEffect(() => {
    fetchSessions()
    
    const interval = setInterval(fetchSessions, refreshInterval)
    return () => clearInterval(interval)
  }, [fetchSessions, refreshInterval])

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`
    return date.toLocaleDateString()
  }

  const getSessionIcon = (session: SessionInfo) => {
    if (session.isSubAgent) return <Zap className="h-4 w-4 text-yellow-400" />
    if (session.isDashboard) return <Monitor className="h-4 w-4 text-blue-400" />
    return <Bot className="h-4 w-4 text-purple-400" />
  }

  const getSessionTypeBadge = (session: SessionInfo) => {
    if (session.isSubAgent) {
      return (
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-300">
          Sub-Agent
        </span>
      )
    }
    if (session.isDashboard) {
      return (
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300">
          Dashboard
        </span>
      )
    }
    return (
      <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300">
        Main
      </span>
    )
  }

  if (isLoading && sessions.length === 0) {
    return (
      <div className="flex items-center justify-center h-32">
        <RefreshCw className="h-5 w-5 text-white/30 animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-white/50" />
          <span className="text-xs font-medium text-white/70">Active Sessions</span>
          <span className="text-[10px] text-white/40 bg-white/5 px-1.5 py-0.5 rounded">
            {sessions.length}
          </span>
        </div>
        <button
          onClick={() => fetchSessions()}
          className="p-1 rounded hover:bg-white/5 text-white/40 transition-colors"
          title="Refresh sessions"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
        </button>
      </div>

      {/* Last refresh indicator */}
      {lastRefresh && (
        <div className="px-3 py-1 text-[10px] text-white/30 border-b border-white/5">
          Last updated: {formatTime(lastRefresh.getTime())}
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="px-3 py-2 bg-red-500/10 border-b border-red-500/20">
          <p className="text-xs text-red-300">{error}</p>
        </div>
      )}

      {/* Session list */}
      <div className="flex-1 overflow-y-auto">
        {sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center p-4">
            <Bot className="h-8 w-8 text-white/20 mb-2" />
            <p className="text-xs text-white/40">No active sessions</p>
            <p className="text-[10px] text-white/30">Sessions will appear when agents are active</p>
          </div>
        ) : (
          <AnimatePresence>
            {sessions.map((session) => (
              <motion.button
                key={session.key}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                onClick={() => onSelectSession(session)}
                className={cn(
                  "w-full text-left px-3 py-2.5 border-b border-white/5 transition-colors",
                  "hover:bg-white/5",
                  selectedSessionKey === session.key && "bg-purple-500/10 border-l-2 border-l-purple-500"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 min-w-0 flex-1">
                    <div className="mt-0.5">
                      {getSessionIcon(session)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white truncate">
                          {session.displayName}
                        </span>
                        {getSessionTypeBadge(session)}
                      </div>
                      
                      {/* Last message preview */}
                      {session.lastMessages.length > 0 && (
                        <p className="text-xs text-white/40 truncate mt-0.5">
                          {session.lastMessages[session.lastMessages.length - 1].content.slice(0, 60)}
                          {session.lastMessages[session.lastMessages.length - 1].content.length > 60 && '...'}
                        </p>
                      )}
                      
                      {/* Session metadata */}
                      <div className="flex items-center gap-3 mt-1">
                        <span className="flex items-center gap-1 text-[10px] text-white/30">
                          <Clock className="h-3 w-3" />
                          {formatTime(session.updatedAt)}
                        </span>
                        <span className="flex items-center gap-1 text-[10px] text-white/30">
                          <MessageSquare className="h-3 w-3" />
                          {session.totalTokens.toLocaleString()} tokens
                        </span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-white/20 flex-shrink-0 mt-1" />
                </div>
              </motion.button>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}
