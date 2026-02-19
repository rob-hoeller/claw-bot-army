"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Activity, Pause, Play, ChevronDown } from "lucide-react"
import { ActivityItem, ActivityItemData } from "./ActivityItem"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"

interface ActivityFeedProps {
  onItemClick?: (item: ActivityItemData) => void
  maxItems?: number
  className?: string
}

// Demo data for when Supabase isn't connected
// Demo data removed — all data comes from Supabase

// Agent metadata lookup (would come from config in real app)
const agentMeta: Record<string, { name: string; emoji: string }> = {
  'hbx': { name: 'HBx', emoji: '🦞' },
  'cx-1': { name: 'CX-1', emoji: '🤖' },
  'cx-2': { name: 'CX-2', emoji: '🔧' },
  'cx-3': { name: 'CX-3', emoji: '📊' },
  'cx-4': { name: 'CX-4', emoji: '🎯' },
  'cx-5': { name: 'CX-5', emoji: '🚀' },
  'cx-6': { name: 'CX-6', emoji: '💡' },
}

export function ActivityFeed({ 
  onItemClick, 
  maxItems = 50,
  className 
}: ActivityFeedProps) {
  const [items, setItems] = useState<ActivityItemData[]>([])
  const [isPaused, setIsPaused] = useState(false)
  const [isAtBottom, setIsAtBottom] = useState(true)
  const [newItemIds, setNewItemIds] = useState<Set<string>>(new Set())
  const feedRef = useRef<HTMLDivElement>(null)
  const isDemoMode = !supabase

  // Load initial items and set up real-time subscription
  useEffect(() => {
    if (isDemoMode) {
      setItems([])
      return
    }

    const sb = supabase!

    // Load recent messages
    async function loadRecent() {
      const { data, error } = await sb
        .from('messages')
        .select(`
          id,
          created_at,
          role,
          content,
          conversation_id,
          conversations!inner(user_id, agent_id)
        `)
        .order('created_at', { ascending: false })
        .limit(maxItems)

      if (error) {
        console.error('Error loading activity:', error)
        return
      }

      if (data) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mapped: ActivityItemData[] = data.map((msg: any) => {
          // conversations can be an array or object depending on query
          const conv = Array.isArray(msg.conversations) ? msg.conversations[0] : msg.conversations
          const agentId = conv?.agent_id || 'unknown'
          const meta = agentMeta[agentId] || { name: agentId, emoji: '🤖' }
          return {
            id: msg.id,
            timestamp: msg.created_at,
            userId: conv?.user_id || 'unknown',
            agentId,
            agentName: meta.name,
            agentEmoji: meta.emoji,
            role: msg.role as 'user' | 'assistant',
            preview: msg.content?.slice(0, 150) || '',
            conversationId: msg.conversation_id
          }
        }).reverse() // Oldest first for display

        setItems(mapped)
      }
    }

    loadRecent()

    // Set up real-time subscription
    const channel = sb
      .channel('activity-feed')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        async (payload) => {
          if (isPaused) return

          // Fetch the full message with conversation data
          const { data: msg } = await sb
            .from('messages')
            .select(`
              id,
              created_at,
              role,
              content,
              conversation_id,
              conversations!inner(user_id, agent_id)
            `)
            .eq('id', payload.new.id)
            .single()

          if (msg) {
            // conversations can be an array or object depending on query
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const conv = Array.isArray((msg as any).conversations) ? (msg as any).conversations[0] : (msg as any).conversations
            const agentId = conv?.agent_id || 'unknown'
            const meta = agentMeta[agentId] || { name: agentId, emoji: '🤖' }
            const newItem: ActivityItemData = {
              id: msg.id,
              timestamp: msg.created_at,
              userId: conv?.user_id || 'unknown',
              agentId,
              agentName: meta.name,
              agentEmoji: meta.emoji,
              role: msg.role as 'user' | 'assistant',
              preview: msg.content?.slice(0, 150) || '',
              conversationId: msg.conversation_id
            }

            setItems(prev => [...prev.slice(-maxItems + 1), newItem])
            setNewItemIds(prev => new Set([...prev, msg.id]))

            // Clear "new" status after animation
            setTimeout(() => {
              setNewItemIds(prev => {
                const next = new Set(prev)
                next.delete(msg.id)
                return next
              })
            }, 2000)
          }
        }
      )
      .subscribe()

    return () => {
      sb.removeChannel(channel)
    }
  }, [isDemoMode, isPaused, maxItems])

  // Auto-scroll to bottom when new items arrive
  useEffect(() => {
    if (isAtBottom && feedRef.current && !isPaused) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight
    }
  }, [items, isAtBottom, isPaused])

  // Track scroll position
  const handleScroll = () => {
    if (feedRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = feedRef.current
      const atBottom = scrollHeight - scrollTop - clientHeight < 50
      setIsAtBottom(atBottom)
    }
  }

  const scrollToBottom = () => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight
      setIsAtBottom(true)
    }
  }

  return (
    <div className={cn("flex flex-col h-full bg-black/20 border-l border-white/5", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-white/50" />
          <span className="text-xs font-medium text-white/70">Activity Feed</span>
          {isDemoMode && (
            <span className="text-[10px] text-yellow-400/70 bg-yellow-400/10 px-1.5 py-0.5 rounded">
              No DB
            </span>
          )}
        </div>
        <button
          onClick={() => setIsPaused(!isPaused)}
          className={cn(
            "p-1 rounded transition-colors",
            isPaused ? "bg-yellow-500/20 text-yellow-400" : "hover:bg-white/5 text-white/40"
          )}
          title={isPaused ? "Resume feed" : "Pause feed"}
        >
          {isPaused ? (
            <Play className="h-3.5 w-3.5" />
          ) : (
            <Pause className="h-3.5 w-3.5" />
          )}
        </button>
      </div>

      {/* Feed */}
      <div 
        ref={feedRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto"
      >
        <AnimatePresence initial={false}>
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-4">
              <Activity className="h-8 w-8 text-white/20 mb-2" />
              <p className="text-xs text-white/40">No activity yet</p>
              <p className="text-[10px] text-white/30">Messages will appear here</p>
            </div>
          ) : (
            items.map((item) => (
              <ActivityItem
                key={item.id}
                item={item}
                onClick={onItemClick}
                isNew={newItemIds.has(item.id)}
              />
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Scroll to bottom indicator */}
      <AnimatePresence>
        {!isAtBottom && !isPaused && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            onClick={scrollToBottom}
            className="absolute bottom-16 right-4 p-2 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 hover:bg-purple-500/30 transition-colors"
          >
            <ChevronDown className="h-4 w-4" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Paused indicator */}
      {isPaused && (
        <div className="px-3 py-1.5 bg-yellow-500/10 border-t border-yellow-500/20">
          <p className="text-[10px] text-yellow-400/70 text-center">
            Feed paused — click play to resume
          </p>
        </div>
      )}
    </div>
  )
}
