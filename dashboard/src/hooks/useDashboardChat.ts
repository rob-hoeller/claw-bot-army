"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Message, Attachment, Conversation } from "@/components/chat/types"
import { supabase } from "@/lib/supabase"

interface UseDashboardChatOptions {
  agentId: string
  agentName: string
  userId?: string
  sessionUserId?: string
  syncFromGateway?: boolean
}

export function useDashboardChat({
  agentId,
  agentName,
  userId,
  syncFromGateway = false,
}: UseDashboardChatOptions) {
  const PAGE_SIZE = 10
  const [messages, setMessages] = useState<Message[]>([])
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [gatewayConnected, setGatewayConnected] = useState<boolean | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  const openclawSessionKey = `dashboard-${agentId}-${userId || 'anon'}`
  const isDemoMode = !supabase || !userId

  // ── Gateway history ────────────────────────────────────────────
  const fetchGatewayHistory = useCallback(async () => {
    try {
      const response = await fetch(`/api/chat/history?sessionKey=${encodeURIComponent(openclawSessionKey)}&limit=50`)
      if (!response.ok) return null
      const data = await response.json()
      return data.messages || []
    } catch (err) {
      console.error('Failed to fetch gateway history:', err)
      return null
    }
  }, [openclawSessionKey])

  // ── Sync from OpenClaw ─────────────────────────────────────────
  const syncFromOpenClaw = useCallback(async () => {
    if (isDemoMode || !conversation) return
    setIsSyncing(true)
    try {
      const gatewayMessages = await fetchGatewayHistory()
      if (gatewayMessages && gatewayMessages.length > 0) {
        const existingIds = new Set(messages.map(m => m.id))
        const newMessages = gatewayMessages.filter((m: Message) => !existingIds.has(m.id))
        if (newMessages.length > 0) {
          setMessages(prev => [...prev, ...newMessages])
        }
      }
    } finally {
      setIsSyncing(false)
    }
  }, [isDemoMode, conversation, fetchGatewayHistory, messages])

  // ── Load older messages ────────────────────────────────────────
  const loadMore = useCallback(async () => {
    if (!conversation || isDemoMode || isLoadingMore || !hasMore) return
    setIsLoadingMore(true)
    try {
      const oldestMessage = messages[0]
      if (!oldestMessage) return
      const response = await fetch(
        `/api/chat/messages?conversationId=${encodeURIComponent(conversation.id)}&before=${encodeURIComponent(oldestMessage.created_at)}&limit=${PAGE_SIZE + 1}`
      )
      if (!response.ok) throw new Error('Failed to load older messages')
      const data = await response.json()
      const olderMsgs = data.messages || []
      if (olderMsgs.length > 0) {
        const hasMoreMessages = olderMsgs.length > PAGE_SIZE
        setHasMore(hasMoreMessages)
        const toAdd = hasMoreMessages ? olderMsgs.slice(0, PAGE_SIZE) : olderMsgs
        setMessages(prev => [...toAdd.reverse(), ...prev])
      } else {
        setHasMore(false)
      }
    } catch (err) {
      console.error('Error loading more messages:', err)
    } finally {
      setIsLoadingMore(false)
    }
  }, [conversation, isDemoMode, isLoadingMore, hasMore, messages])

  // ── Check gateway ──────────────────────────────────────────────
  useEffect(() => {
    async function checkGateway() {
      try {
        const response = await fetch('/api/chat/sessions?limit=1')
        setGatewayConnected(response.ok)
      } catch {
        setGatewayConnected(false)
      }
    }
    checkGateway()
  }, [])

  // ── Init conversation ──────────────────────────────────────────
  useEffect(() => {
    async function initConversation() {
      if (isDemoMode) {
        setIsLoading(false)
        setError(null)
        const welcomeNote = gatewayConnected ? "" : "\n\n_(Gateway not connected — responses will be simulated)_"
        setMessages([{
          id: '1', conversation_id: 'demo', role: 'assistant',
          content: `Hello! I'm ${agentName}. How can I help you today?${welcomeNote}`,
          attachments: [], created_at: new Date().toISOString()
        }])
        return
      }

      try {
        setIsLoading(true)
        setError(null)
        const response = await fetch(
          `/api/chat/conversations?shortId=${encodeURIComponent(userId!)}&agentId=${encodeURIComponent(agentId)}`
        )
        if (!response.ok) throw new Error('Failed to load conversation')
        const data = await response.json()
        const conv = data.conversation
        setConversation(conv)

        const msgs = data.messages || []
        if (msgs.length > 0) {
          setHasMore(Boolean(data.hasMore))
          setMessages(msgs)
        } else if (syncFromGateway && gatewayConnected) {
          const gatewayMessages = await fetchGatewayHistory()
          if (gatewayMessages && gatewayMessages.length > 0) {
            setMessages(gatewayMessages.map((m: { id: string; role: string; content: string; created_at: string }) => ({
              ...m, conversation_id: conv.id, attachments: [],
            })))
          } else {
            setMessages([{
              id: 'welcome', conversation_id: conv.id, role: 'assistant',
              content: `Hello! I'm ${agentName}. How can I help you today?`,
              attachments: [], created_at: new Date().toISOString()
            }])
          }
        } else {
          setMessages([{
            id: 'welcome', conversation_id: conv.id, role: 'assistant',
            content: `Hello! I'm ${agentName}. How can I help you today?`,
            attachments: [], created_at: new Date().toISOString()
          }])
        }
      } catch (err) {
        console.error('Error initializing conversation:', err)
        setError('Failed to load conversation')
      } finally {
        setIsLoading(false)
      }
    }
    initConversation()
  }, [agentId, agentName, userId, isDemoMode, gatewayConnected, syncFromGateway, fetchGatewayHistory])

  // ── SSE parser ─────────────────────────────────────────────────
  const parseSSEStream = async (
    reader: ReadableStreamDefaultReader<Uint8Array>,
    onChunk: (content: string) => void,
    onDone: (fullContent: string, receivedDone: boolean) => void
  ) => {
    const decoder = new TextDecoder()
    let buffer = ""
    let fullContent = ""
    let receivedDoneSignal = false

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ""
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') {
              receivedDoneSignal = true
              onDone(fullContent, true)
              return
            }
            try {
              const parsed = JSON.parse(data)
              const content = parsed.choices?.[0]?.delta?.content
                || (parsed.type === 'response.output_text.delta' ? parsed.delta : '')
                || ''
              if (content) { fullContent += content; onChunk(fullContent) }
            } catch { /* skip */ }
          }
        }
      }
      onDone(fullContent, receivedDoneSignal)
    } catch (err) {
      console.error('SSE parsing error:', err)
      onDone(fullContent, false)
    }
  }

  // ── Build history for API ──────────────────────────────────────
  const buildHistoryForAPI = useCallback(() => {
    return messages
      .filter(m => !m.id.startsWith('temp-') && m.id !== 'welcome')
      .map(m => ({ role: m.role, content: m.content }))
  }, [messages])

  // ── Send to gateway ────────────────────────────────────────────
  const sendToGateway = async (content: string, attachments: Attachment[] = []): Promise<string> => {
    abortControllerRef.current = new AbortController()
    const history = buildHistoryForAPI()

    const response = await fetch('/api/chat/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: content, agentId, sessionKey: openclawSessionKey,
        history, stream: true,
        attachments: attachments.map(a => ({ type: a.type, url: a.url, name: a.name, mimeType: a.mimeType })),
      }),
      signal: abortControllerRef.current.signal,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `Gateway error: ${response.status}`)
    }
    if (!response.body) throw new Error('No response body')

    setIsStreaming(true)
    setStreamingContent("")
    const reader = response.body.getReader()

    return new Promise((resolve, reject) => {
      parseSSEStream(
        reader,
        (partialContent) => setStreamingContent(partialContent),
        async (fullContent, receivedDone) => {
          setIsStreaming(false)
          setStreamingContent("")
          if (receivedDone || !openclawSessionKey) {
            resolve(fullContent || "I received your message but couldn't generate a response.")
            return
          }
          console.warn('[useDashboardChat] Stream ended without [DONE], polling…')
          try {
            await new Promise(r => setTimeout(r, 3000))
            const historyRes = await fetch(`/api/chat/history?sessionKey=${encodeURIComponent(openclawSessionKey)}&limit=5`)
            if (historyRes.ok) {
              const historyData = await historyRes.json()
              const lastAssistant = historyData.filter((m: { role: string }) => m.role === 'assistant').pop()
              if (lastAssistant?.content && lastAssistant.content.length > fullContent.length) {
                resolve(lastAssistant.content)
                return
              }
            }
          } catch (pollErr) {
            console.warn('[useDashboardChat] Recovery poll failed:', pollErr)
          }
          resolve(fullContent || "I received your message but couldn't generate a response.")
        }
      ).catch(reject)
    })
  }

  // ── Handle send ────────────────────────────────────────────────
  const handleSend = async (content: string, attachments: Attachment[]) => {
    if (!content.trim() && attachments.length === 0) return

    const userMessage: Message = {
      id: `temp-${Date.now()}`, conversation_id: conversation?.id || 'demo',
      role: 'user', content, attachments, created_at: new Date().toISOString()
    }
    setMessages(prev => [...prev, userMessage])
    setIsSending(true)
    setError(null)

    try {
      // Persist user message
      if (!isDemoMode && conversation) {
        try {
          const persistAttachments = attachments.map(a => ({
            ...a, url: a.url.startsWith('data:') ? `[base64:${a.mimeType || a.type}]` : a.url,
          }))
          const response = await fetch('/api/chat/messages', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ conversationId: conversation.id, role: 'user', content, attachments: persistAttachments })
          })
          if (response.ok) {
            const data = await response.json()
            if (data.message) setMessages(prev => prev.map(m => m.id === userMessage.id ? data.message : m))
          }
        } catch (persistErr) {
          console.warn('Message persistence error (non-fatal):', persistErr)
        }
      }

      // Send to gateway / direct LLM
      let responseContent: string
      const isSubAgent = agentId !== 'HBx' && agentId !== 'hbx'
      const shouldAttemptSend = gatewayConnected || isSubAgent

      if (shouldAttemptSend) {
        try {
          responseContent = await sendToGateway(content, attachments)
        } catch (err) {
          console.error('Send error, falling back to mock:', err)
          responseContent = `I received your message: "${content}"\n\n_(${isSubAgent ? 'Direct LLM' : 'Gateway'} connection failed — this is a simulated response)_`
        }
      } else {
        await new Promise(resolve => setTimeout(resolve, 1000))
        responseContent = `I received your message: "${content}"\n\n_(Gateway not connected — configure OPENCLAW_GATEWAY_URL and OPENCLAW_GATEWAY_TOKEN for real responses)_`
      }

      const assistantMessage: Message = {
        id: `response-${Date.now()}`, conversation_id: conversation?.id || 'demo',
        role: 'assistant', content: responseContent, attachments: [], created_at: new Date().toISOString()
      }

      // Persist assistant message
      if (!isDemoMode && conversation) {
        try {
          const response = await fetch('/api/chat/messages', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ conversationId: conversation.id, role: 'assistant', content: responseContent, attachments: [] })
          })
          if (response.ok) {
            const data = await response.json()
            setMessages(prev => [...prev, data.message || assistantMessage])
          } else {
            setMessages(prev => [...prev, assistantMessage])
          }
        } catch {
          setMessages(prev => [...prev, assistantMessage])
        }
      } else {
        setMessages(prev => [...prev, assistantMessage])
      }
    } catch (err) {
      console.error('Error sending message:', err)
      setError(err instanceof Error ? err.message : 'Failed to send message')
    } finally {
      setIsSending(false)
      setIsStreaming(false)
      setStreamingContent("")
      abortControllerRef.current = null
    }
  }

  return {
    messages,
    handleSend,
    isLoading,
    isSending,
    isStreaming,
    streamingContent,
    error,
    hasMore,
    isLoadingMore,
    loadMore,
    gatewayConnected,
    isSyncing,
    syncFromOpenClaw,
    conversationId: conversation?.id,
    sessionKey: openclawSessionKey,
    sessionLabel: `Session: ${openclawSessionKey}`,
  }
}
