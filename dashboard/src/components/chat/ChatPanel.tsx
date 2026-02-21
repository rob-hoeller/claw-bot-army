"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { motion } from "framer-motion"
import { Bot, Loader2, Wifi, WifiOff, RefreshCw, ChevronUp } from "lucide-react"
import { MessageBubble } from "./MessageBubble"
import { ChatInput } from "./ChatInput"
import { Message, Attachment, Conversation } from "./types"
import { supabase } from "@/lib/supabase"

interface ChatPanelProps {
  agentId: string
  agentName: string
  agentEmoji?: string
  /** Supabase auth user UUID — used for DB persistence */
  userId?: string
  /** Short session user ID (e.g. 'lance') — used for OpenClaw session key */
  sessionUserId?: string
  isReadOnly?: boolean
  /** If true, fetches history from OpenClaw on load instead of just Supabase */
  syncFromGateway?: boolean
}

export function ChatPanel({ 
  agentId, 
  agentName, 
  agentEmoji,
  userId,
  sessionUserId,
  isReadOnly = false,
  syncFromGateway = false
}: ChatPanelProps) {
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
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Generate a stable session key for OpenClaw (uses userId for per-user isolation)
  const openclawSessionKey = `dashboard-${agentId}-${userId || 'anon'}`


  // Scroll to bottom when messages change
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, streamingContent, scrollToBottom])

  // Demo mode: no Supabase or no userId
  const isDemoMode = !supabase || !userId

  // Fetch history from OpenClaw Gateway
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

  // Sync messages from OpenClaw to Supabase
  const syncFromOpenClaw = useCallback(async () => {
    if (isDemoMode || !conversation) return
    
    setIsSyncing(true)
    try {
      const gatewayMessages = await fetchGatewayHistory()
      if (gatewayMessages && gatewayMessages.length > 0) {
        // Merge gateway messages with local messages
        // This is a simple approach - you might want more sophisticated merging
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

  // Load older messages (pagination)
  const loadMore = useCallback(async () => {
    if (!conversation || isDemoMode || isLoadingMore || !hasMore) return

    setIsLoadingMore(true)
    const container = messagesContainerRef.current
    const prevScrollHeight = container?.scrollHeight || 0

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

        // Preserve scroll position after prepending
        requestAnimationFrame(() => {
          if (container) {
            const newScrollHeight = container.scrollHeight
            container.scrollTop = newScrollHeight - prevScrollHeight
          }
        })
      } else {
        setHasMore(false)
      }
    } catch (err) {
      console.error('Error loading more messages:', err)
    } finally {
      setIsLoadingMore(false)
    }
  }, [conversation, isDemoMode, isLoadingMore, hasMore, messages])

  // Check gateway connection on mount
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

  // Load or create conversation
  useEffect(() => {
    async function initConversation() {
      // Demo mode - use mock data
      if (isDemoMode) {
        setIsLoading(false)
        setError(null)
        const welcomeNote = gatewayConnected 
          ? "" 
          : "\n\n_(Gateway not connected — responses will be simulated)_"
        setMessages([
          {
            id: '1',
            conversation_id: 'demo',
            role: 'assistant',
            content: `Hello! I'm ${agentName}. How can I help you today?${welcomeNote}`,
            attachments: [],
            created_at: new Date().toISOString()
          }
        ])
        return
      }

      // Real mode - use server API (service role)
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
          // If no local messages but sync enabled, try to fetch from OpenClaw
          const gatewayMessages = await fetchGatewayHistory()
          if (gatewayMessages && gatewayMessages.length > 0) {
            // Convert to our message format with conversation_id
            const convertedMessages = gatewayMessages.map((m: { id: string; role: string; content: string; created_at: string }) => ({
              ...m,
              conversation_id: conv.id,
              attachments: [],
            }))
            setMessages(convertedMessages)
          } else {
            // Add welcome message for new conversations
            const welcomeMsg: Message = {
              id: 'welcome',
              conversation_id: conv.id,
              role: 'assistant',
              content: `Hello! I'm ${agentName}. How can I help you today?`,
              attachments: [],
              created_at: new Date().toISOString()
            }
            setMessages([welcomeMsg])
          }
        } else {
          // Add welcome message for new conversations
          const welcomeMsg: Message = {
            id: 'welcome',
            conversation_id: conv.id,
            role: 'assistant',
            content: `Hello! I'm ${agentName}. How can I help you today?`,
            attachments: [],
            created_at: new Date().toISOString()
          }
          setMessages([welcomeMsg])
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

  // Parse SSE stream from OpenClaw gateway
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
              // Support both /v1/chat/completions and /v1/responses streaming formats
              const content = parsed.choices?.[0]?.delta?.content  // chat/completions format
                || (parsed.type === 'response.output_text.delta' ? parsed.delta : '')  // responses format
                || ''
              if (content) {
                fullContent += content
                onChunk(fullContent)
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }
      // Stream ended without [DONE] — may be a dropped connection
      onDone(fullContent, receivedDoneSignal)
    } catch (err) {
      console.error('SSE parsing error:', err)
      onDone(fullContent, false)
    }
  }

  // Build history for API call (excludes welcome message and temp messages)
  const buildHistoryForAPI = useCallback(() => {
    return messages
      .filter(m => !m.id.startsWith('temp-') && m.id !== 'welcome')
      .map(m => ({
        role: m.role,
        content: m.content,
      }))
  }, [messages])

  // Send message to OpenClaw gateway
  const sendToGateway = async (content: string, attachments: Attachment[] = []): Promise<string> => {
    abortControllerRef.current = new AbortController()

    // Include conversation history for context
    const history = buildHistoryForAPI()

    const response = await fetch('/api/chat/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: content,
        agentId,
        sessionKey: openclawSessionKey,
        history,
        stream: true,
        attachments: attachments.map(a => ({
          type: a.type,
          url: a.url,
          name: a.name,
          mimeType: a.mimeType,
        })),
      }),
      signal: abortControllerRef.current.signal,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `Gateway error: ${response.status}`)
    }

    if (!response.body) {
      throw new Error('No response body')
    }

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

          // Stream ended without [DONE] — likely a dropped connection.
          // Wait a moment then poll gateway history for the complete response.
          console.warn('[ChatPanel] Stream ended without [DONE], polling for complete response...')
          try {
            // Wait for gateway to finish processing
            await new Promise(r => setTimeout(r, 3000))
            const historyRes = await fetch(
              `/api/chat/history?sessionKey=${encodeURIComponent(openclawSessionKey)}&limit=5`
            )
            if (historyRes.ok) {
              const historyData = await historyRes.json()
              const lastAssistant = historyData
                .filter((m: { role: string }) => m.role === 'assistant')
                .pop()
              if (lastAssistant?.content && lastAssistant.content.length > fullContent.length) {
                console.log('[ChatPanel] Recovered complete response from gateway history')
                resolve(lastAssistant.content)
                return
              }
            }
          } catch (pollErr) {
            console.warn('[ChatPanel] Recovery poll failed:', pollErr)
          }

          // Use whatever we got
          resolve(fullContent || "I received your message but couldn't generate a response.")
        }
      ).catch(reject)
    })
  }

  // Handle sending a message
  const handleSend = async (content: string, attachments: Attachment[]) => {
    console.log('[ChatPanel handleSend]', { content: content.slice(0, 50), attachmentCount: attachments.length, attachments: attachments.map(a => ({ type: a.type, name: a.name, urlPrefix: a.url?.slice(0, 60) })) })
    if (!content.trim() && attachments.length === 0) return

    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      conversation_id: conversation?.id || 'demo',
      role: 'user',
      content,
      attachments,
      created_at: new Date().toISOString()
    }

    // Optimistically add user message
    setMessages(prev => [...prev, userMessage])
    setIsSending(true)
    setError(null)

    try {
      // Save user message via API (service role)
      // Strip base64 data from attachments before persisting (too large for DB)
      if (!isDemoMode && conversation) {
        try {
          const persistAttachments = attachments.map(a => ({
            ...a,
            url: a.url.startsWith('data:') ? `[base64:${a.mimeType || a.type}]` : a.url,
          }))
          const response = await fetch('/api/chat/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              conversationId: conversation.id,
              role: 'user',
              content,
              attachments: persistAttachments
            })
          })
          if (response.ok) {
            const data = await response.json()
            const savedMsg = data.message
            if (savedMsg) {
              setMessages(prev => prev.map(m => m.id === userMessage.id ? savedMsg : m))
            }
          } else {
            console.warn('Failed to persist user message:', response.status)
          }
        } catch (persistErr) {
          console.warn('Message persistence error (non-fatal):', persistErr)
        }
      }

      // Try to send to gateway / direct LLM
      // Sub-agents (non-HBx) use direct Anthropic API via /api/chat/send,
      // so they should always attempt the call regardless of gateway status.
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
        // Mock response when gateway not connected (HBx only)
        await new Promise(resolve => setTimeout(resolve, 1000))
        responseContent = `I received your message: "${content}"\n\n_(Gateway not connected — configure OPENCLAW_GATEWAY_URL and OPENCLAW_GATEWAY_TOKEN for real responses)_`
      }

      const assistantMessage: Message = {
        id: `response-${Date.now()}`,
        conversation_id: conversation?.id || 'demo',
        role: 'assistant',
        content: responseContent,
        attachments: [],
        created_at: new Date().toISOString()
      }

      // Save assistant message via API (service role)
      if (!isDemoMode && conversation) {
        try {
        const response = await fetch('/api/chat/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversationId: conversation.id,
            role: 'assistant',
            content: responseContent,
            attachments: []
          })
        })
        if (response.ok) {
        const data = await response.json()
        const savedResponse = data.message
        if (savedResponse) {
          setMessages(prev => [...prev, savedResponse])
        } else {
          setMessages(prev => [...prev, assistantMessage])
        }
        } else {
          console.warn('Failed to persist assistant message:', response.status)
          setMessages(prev => [...prev, assistantMessage])
        }
        } catch (persistErr) {
          console.warn('Assistant message persistence error (non-fatal):', persistErr)
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

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col p-4 space-y-4">
        {/* Chat message skeletons */}
        {[...Array(4)].map((_, i) => {
          const isUser = i % 2 === 1
          return (
            <div key={i} className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className="w-8 h-8 rounded-full bg-white/[0.06] animate-pulse flex-shrink-0" />
              <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[75%]`}>
                <div className="w-12 h-3 rounded bg-white/[0.04] animate-pulse mb-1" />
                <div className="rounded-2xl bg-white/[0.06] animate-pulse px-4 py-3 space-y-2">
                  <div className="h-3 w-48 rounded bg-white/[0.08] animate-pulse" />
                  {i === 0 && <div className="h-3 w-32 rounded bg-white/[0.08] animate-pulse" />}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  if (error && !messages.length) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center px-4">
          <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
            <Bot className="h-6 w-6 text-red-400" />
          </div>
          <p className="text-sm text-red-300">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="text-sm text-purple-400 hover:text-purple-300"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Connection Status */}
      <div className="flex items-center justify-between px-4 py-1 border-b border-white/5">
        <div className="text-xs text-white/30 truncate">
          Session: {openclawSessionKey}
        </div>
        <div className="flex items-center gap-3">
          {/* Sync button */}
          {gatewayConnected && !isDemoMode && (
            <button
              onClick={syncFromOpenClaw}
              disabled={isSyncing}
              className="flex items-center gap-1 text-xs text-white/50 hover:text-white/70 disabled:opacity-50"
              title="Sync from OpenClaw"
            >
              <RefreshCw className={`h-3 w-3 ${isSyncing ? 'animate-spin' : ''}`} />
            </button>
          )}
          {/* Gateway status */}
          <div className="flex items-center gap-1.5 text-xs">
            {gatewayConnected === null ? (
              <span className="text-white/30">Checking gateway...</span>
            ) : gatewayConnected ? (
              <>
                <Wifi className="h-3 w-3 text-green-400" />
                <span className="text-green-400/70">Connected</span>
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3 text-yellow-400" />
                <span className="text-yellow-400/70">Demo mode</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="px-4 py-2 bg-red-500/10 border-b border-red-500/20">
          <p className="text-xs text-red-300">{error}</p>
        </div>
      )}

      {/* Messages Area */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/20 flex items-center justify-center mb-4">
              {agentEmoji ? (
                <span className="text-2xl">{agentEmoji}</span>
              ) : (
                <Bot className="h-8 w-8 text-blue-400" />
              )}
            </div>
            <h3 className="text-lg font-medium text-white mb-1">{agentName}</h3>
            <p className="text-sm text-white/50 max-w-xs">
              Start a conversation with {agentName}. Ask questions, give tasks, or request help.
            </p>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-1"
          >
            {/* Load More Button */}
            {hasMore && (
              <div className="flex justify-center pb-3">
                <button
                  onClick={loadMore}
                  disabled={isLoadingMore}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white/50 hover:text-white/70 bg-white/[0.05] hover:bg-white/[0.08] rounded-full transition-colors disabled:opacity-50"
                >
                  {isLoadingMore ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <ChevronUp className="h-3 w-3" />
                  )}
                  {isLoadingMore ? 'Loading...' : 'Load older messages'}
                </button>
              </div>
            )}
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                agentName={agentName}
                agentEmoji={agentEmoji}
              />
            ))}
            
            {/* Streaming message */}
            {isStreaming && streamingContent && (
              <MessageBubble
                message={{
                  id: 'streaming',
                  conversation_id: conversation?.id || 'demo',
                  role: 'assistant',
                  content: streamingContent,
                  attachments: [],
                  created_at: new Date().toISOString()
                }}
                agentName={agentName}
                agentEmoji={agentEmoji}
                isStreaming
              />
            )}
            
            {/* Typing indicator (before streaming starts) */}
            {isSending && !isStreaming && (
              <div className="flex gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                  {agentEmoji ? (
                    <span className="text-sm">{agentEmoji}</span>
                  ) : (
                    <Bot className="h-4 w-4 text-blue-300" />
                  )}
                </div>
                <div className="bg-white/[0.08] rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </motion.div>
        )}
      </div>

      {/* Input Area - Hidden in read-only mode */}
      {!isReadOnly && (
        <ChatInput
          onSend={handleSend}
          disabled={isSending}
          placeholder={`Message ${agentName}...`}
          conversationId={conversation?.id}
          sessionKey={openclawSessionKey}
        />
      )}
    </div>
  )
}
