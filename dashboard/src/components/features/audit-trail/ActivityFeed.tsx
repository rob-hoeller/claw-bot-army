"use client"

import { useEffect, useRef, useState } from "react"
import { supabase } from "@/lib/supabase"
import type { PhaseChatMessage } from "./types"

const AUTHOR_STYLES: Record<string, { color: string; emoji: string }> = {
  human: { color: "text-blue-300", emoji: "👤" },
  agent: { color: "text-green-300", emoji: "🤖" },
  orchestrator: { color: "text-purple-300", emoji: "🧠" },
  system: { color: "text-white/50", emoji: "⚙️" },
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
  } catch {
    return ""
  }
}

interface ActivityFeedProps {
  featureId: string
  phase?: string
}

export function ActivityFeed({ featureId, phase }: ActivityFeedProps) {
  const [messages, setMessages] = useState<PhaseChatMessage[]>([])
  const [isLive, setIsLive] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Fetch initial messages
  useEffect(() => {
    let cancelled = false
    async function load() {
      const params = new URLSearchParams()
      if (phase) params.set("phase", phase)
      const res = await fetch(`/api/features/${featureId}/phase-chat?${params}`)
      if (!res.ok || cancelled) return
      const data = await res.json()
      if (!cancelled) setMessages(data.messages ?? [])
    }
    load()
    return () => { cancelled = true }
  }, [featureId, phase])

  // Realtime subscription
  useEffect(() => {
    if (!supabase) return
    const channel = supabase
      .channel(`activity-feed-${featureId}-${phase ?? "all"}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "phase_chat_messages",
          filter: `feature_id=eq.${featureId}`,
        },
        (payload) => {
          const msg = payload.new as PhaseChatMessage
          if (phase && msg.phase !== phase) return
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev
            return [...prev, msg]
          })
        }
      )
      .subscribe()

    return () => { supabase!.removeChannel(channel) }
  }, [featureId, phase])

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Live indicator
  useEffect(() => {
    const check = () => {
      if (messages.length === 0) { setIsLive(false); return }
      const latest = messages[messages.length - 1]
      setIsLive(Date.now() - new Date(latest.created_at).getTime() < 60_000)
    }
    check()
    const interval = setInterval(check, 10_000)
    return () => clearInterval(interval)
  }, [messages])

  if (messages.length === 0) return null

  return (
    <div className="mt-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10px] text-white/40 uppercase tracking-wider">Activity Feed</span>
        {isLive && (
          <span className="flex items-center gap-1 text-[9px] text-red-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
            </span>
            Live
          </span>
        )}
      </div>
      <div className="max-h-48 overflow-y-auto space-y-1 rounded bg-white/[0.02] border border-white/5 p-2">
        {messages.map((msg) => {
          const style = AUTHOR_STYLES[msg.author_type] ?? AUTHOR_STYLES.system
          return (
            <div key={msg.id} className="flex items-start gap-1.5 text-[10px]">
              <span>{style.emoji}</span>
              <span className={`font-medium ${style.color} flex-shrink-0`}>{msg.author_name}</span>
              <span className="text-white/25 flex-shrink-0">{formatTime(msg.created_at)}</span>
              <span className="text-white/60">{msg.content}</span>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
