"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Message, Attachment, BridgeMessage, bridgeToMessage } from "@/components/chat/types"
import { supabase } from "@/lib/supabase"

interface UseFeatureChatOptions {
  featureId: string
  featureTitle: string
  featureDescription?: string | null
  assignedAgentId?: string | null
  assignedAgentName?: string
  /** Current user display name */
  userName?: string
  /** Current user ID */
  userId?: string
}

export function useFeatureChat({
  featureId,
  featureTitle,
  featureDescription,
  assignedAgentId,
  assignedAgentName = "Agent",
  userName = "You",
  userId = "user",
}: UseFeatureChatOptions) {
  const [bridgeMessages, setBridgeMessages] = useState<BridgeMessage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState("")
  const [error, setError] = useState<string | null>(null)
  const prevFeatureIdRef = useRef(featureId)

  // Convert bridge messages to shared Message format
  const messages: Message[] = bridgeMessages.map(bridgeToMessage)

  // ── Load messages ──────────────────────────────────────────────
  useEffect(() => {
    // Reset state when feature changes
    if (prevFeatureIdRef.current !== featureId) {
      setBridgeMessages([])
      setIsLoading(true)
      prevFeatureIdRef.current = featureId
    }

    async function loadMessages() {
      try {
        const res = await fetch(`/api/work-items/${featureId}/messages`)
        if (!res.ok) throw new Error('Failed')
        setBridgeMessages(await res.json())
      } catch {
        setBridgeMessages([])
      } finally {
        setIsLoading(false)
      }
    }
    loadMessages()
  }, [featureId])

  // ── Realtime subscription ──────────────────────────────────────
  useEffect(() => {
    if (!supabase) return
    const channel = supabase
      .channel(`bridge-${featureId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'work_item_messages', filter: `work_item_id=eq.${featureId}` },
        (payload) => {
          const newMsg = payload.new as BridgeMessage
          setBridgeMessages(prev => prev.some(m => m.id === newMsg.id) ? prev : [...prev, newMsg])
        }
      )
      .subscribe()
    return () => { supabase!.removeChannel(channel) }
  }, [featureId])

  // ── Build history for streaming API ────────────────────────────
  const buildHistory = useCallback(() =>
    bridgeMessages
      .filter(m => m.sender_type === 'user' || m.sender_type === 'agent')
      .map(m => ({ role: m.sender_type === 'user' ? 'user' : 'assistant', content: m.content })),
    [bridgeMessages]
  )

  // ── Send message ───────────────────────────────────────────────
  const handleSend = async (content: string, _attachments: Attachment[]) => {
    if (!content.trim() || isSending) return
    setIsSending(true)
    setError(null)

    const optimistic: BridgeMessage = {
      id: `opt-${Date.now()}`,
      work_item_id: featureId,
      sender_type: 'user',
      sender_id: userId,
      sender_name: userName,
      content,
      metadata: {},
      created_at: new Date().toISOString(),
    }
    setBridgeMessages(prev => [...prev, optimistic])

    try {
      // Prefix first message with feature context
      const isFirst = bridgeMessages.length === 0
      const contextPrefix = isFirst
        ? `[Feature: "${featureTitle}"${featureDescription ? ` — ${featureDescription}` : ''}]\n\n`
        : ''
      const messageContent = contextPrefix + content

      // Persist user message
      const saveRes = await fetch(`/api/work-items/${featureId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_type: 'user',
          sender_id: userId,
          sender_name: userName,
          content: messageContent,
        }),
      })
      if (saveRes.ok) {
        const saved = await saveRes.json()
        setBridgeMessages(prev => prev.map(m => m.id === optimistic.id ? saved : m))
      }

      // Stream agent response
      setIsStreaming(true)
      setStreamingContent("")
      const history = buildHistory()
      const streamRes = await fetch(`/api/work-items/${featureId}/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageContent, history }),
      })
      if (!streamRes.ok || !streamRes.body) throw new Error('Stream failed')

      const reader = streamRes.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""
      let fullContent = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ""
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') break
            try {
              const parsed = JSON.parse(data)
              const c = parsed.choices?.[0]?.delta?.content || ''
              if (c) { fullContent += c; setStreamingContent(fullContent) }
            } catch { /* skip */ }
          }
        }
      }

      setIsStreaming(false)
      setStreamingContent("")
      if (!fullContent) fullContent = 'No response generated.'

      // Persist agent response
      const agentName = assignedAgentName || assignedAgentId || 'Agent'
      await fetch(`/api/work-items/${featureId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_type: 'agent',
          sender_id: assignedAgentId || 'unknown',
          sender_name: agentName,
          content: fullContent,
          metadata: { streamed: true },
        }),
      })
    } catch (err) {
      console.error('Chat error:', err)
      setIsStreaming(false)
      setStreamingContent("")
      setBridgeMessages(prev => prev.filter(m => m.id !== optimistic.id))
      setError(err instanceof Error ? err.message : 'Failed to send message')
    } finally {
      setIsSending(false)
    }
  }

  return {
    messages,
    bridgeMessages,
    handleSend,
    isLoading,
    isSending,
    isStreaming,
    streamingContent,
    error,
  }
}
