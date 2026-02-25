"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { supabase } from "@/lib/supabase"

import type { PhaseChatMessage } from "@/components/features/audit-trail/types"
import type { Attachment } from "@/components/chat/types"
export type { PhaseChatMessage }

interface UsePhaseChatMessagesReturn {
  messages: PhaseChatMessage[]
  loading: boolean
  error: string | null
  sendMessage: (content: string, mentions?: string[], attachments?: Attachment[], authorId?: string, authorName?: string) => Promise<void>
}

export function usePhaseChatMessages(
  featureId: string,
  phase: string
): UsePhaseChatMessagesReturn {
  const [messages, setMessages] = useState<PhaseChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const messageIdsRef = useRef<Set<string>>(new Set())

  // Fetch messages
  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/features/${featureId}/phase-chat?phase=${phase}`)
        if (!res.ok) throw new Error("Failed to load messages")
        const data = await res.json()
        if (cancelled) return
        const msgs: PhaseChatMessage[] = data.messages ?? []
        messageIdsRef.current = new Set(msgs.map((m) => m.id))
        setMessages(msgs)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Unknown error")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [featureId, phase])

  // Realtime subscription
  useEffect(() => {
    if (!supabase) return

    const channel = supabase
      .channel(`phase-chat-${featureId}-${phase}`)
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
          if (msg.phase !== phase) return
          if (messageIdsRef.current.has(msg.id)) return

          messageIdsRef.current.add(msg.id)
          setMessages((prev) => {
            // Remove optimistic message if this is the real one
            const filtered = prev.filter(
              (m) => !m.id.startsWith("opt-") || m.content !== msg.content
            )
            return [...filtered, msg]
          })
        }
      )
      .subscribe()

    return () => {
      supabase!.removeChannel(channel)
    }
  }, [featureId, phase])

  const sendMessage = useCallback(
    async (content: string, mentions: string[] = [], attachments: Attachment[] = [], authorId = "unknown", authorName = "Unknown") => {
      const optimisticId = `opt-${Date.now()}`
      const optimistic: PhaseChatMessage = {
        id: optimisticId,
        feature_id: featureId,
        phase: phase as PhaseChatMessage["phase"],
        author_type: "human",
        author_id: authorId,
        author_name: authorName,
        content,
        mentions,
        attachments,
        created_at: new Date().toISOString(),
      }

      messageIdsRef.current.add(optimisticId)
      setMessages((prev) => [...prev, optimistic])

      try {
        const res = await fetch(`/api/features/${featureId}/phase-chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phase,
            content,
            author_type: "human",
            author_id: authorId,
            author_name: authorName,
            mentions,
            attachments,
          }),
        })

        if (!res.ok) throw new Error("Failed to send")

        const saved: PhaseChatMessage = await res.json()
        messageIdsRef.current.add(saved.id)
        setMessages((prev) =>
          prev.map((m) => (m.id === optimisticId ? saved : m))
        )
      } catch {
        // Remove optimistic on failure
        messageIdsRef.current.delete(optimisticId)
        setMessages((prev) => prev.filter((m) => m.id !== optimisticId))
      }
    },
    [featureId, phase]
  )

  return { messages, loading, error, sendMessage }
}
