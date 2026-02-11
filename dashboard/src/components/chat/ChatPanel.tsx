"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { motion } from "framer-motion"
import { Bot, Loader2, Wifi, WifiOff } from "lucide-react"
import { MessageBubble } from "./MessageBubble"
import { ChatInput } from "./ChatInput"
import { Message, Attachment, Conversation } from "./types"
import { supabase } from "@/lib/supabase"

interface ChatPanelProps {
  agentId: string
  agentName: string
  agentEmoji?: string
  userId?: string
}

export function ChatPanel({ 
  agentId, 
  agentName, 
  agentEmoji,
  userId 
}: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [gatewayConnected, setGatewayConnected] = useState<boolean | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Scroll to bottom when messages change
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, streamingContent, scrollToBottom])

  // Check if userId is a valid UUID (real Supabase user) vs placeholder
  const isValidUUID = (id: string) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    return uuidRegex.test(id)
  }

  // Demo mode: no Supabase, no userId, or placeholder userId
  const isDemoMode = !supabase || !userId || !isValidUUID(userId)

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

      // Real mode - use Supabase
      const sb = supabase!
      
      try {
        setIsLoading(true)
        setError(null)

        // Try to find existing conversation
        const { data: existingConv, error: fetchError } = await sb
          .from('conversations')
          .select('*')
          .eq('user_id', userId)
          .eq('agent_id', agentId)
          .single()

        if (fetchError && fetchError.code !== 'PGRST116') {
          throw fetchError
        }

        let conv = existingConv

        // Create new conversation if none exists
        if (!conv) {
          const { data: newConv, error: createError } = await sb
            .from('conversations')
            .insert({
              user_id: userId,
              agent_id: agentId,
              title: `Chat with ${agentName}`
            })
            .select()
            .single()

          if (createError) throw createError
          conv = newConv
        }

        setConversation(conv)

        // Load messages
        const { data: msgs, error: msgsError } = await sb
          .from('messages')
          .select('*')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: true })

        if (msgsError) throw msgsError

        if (msgs && msgs.length > 0) {
          setMessages(msgs)
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
  }, [agentId, agentName, userId, isDemoMode, gatewayConnected])

  // Parse SSE stream from OpenClaw gateway
  const parseSSEStream = async (
    reader: ReadableStreamDefaultReader<Uint8Array>,
    onChunk: (content: string) => void,
    onDone: (fullContent: string) => void
  ) => {
    const decoder = new TextDecoder()
    let buffer = ""
    let fullContent = ""

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
              onDone(fullContent)
              return
            }
            try {
              const parsed = JSON.parse(data)
              const content = parsed.choices?.[0]?.delta?.content || ""
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
      onDone(fullContent)
    } catch (err) {
      console.error('SSE parsing error:', err)
      onDone(fullContent)
    }
  }

  // Send message to OpenClaw gateway
  const sendToGateway = async (content: string): Promise<string> => {
    abortControllerRef.current = new AbortController()

    const response = await fetch('/api/chat/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: content,
        agentId,
        sessionKey: conversation?.id || `dashboard-${agentId}-${userId || 'anon'}`,
        stream: true,
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
        (fullContent) => {
          setIsStreaming(false)
          setStreamingContent("")
          resolve(fullContent || "I received your message but couldn't generate a response.")
        }
      ).catch(reject)
    })
  }

  // Handle sending a message
  const handleSend = async (content: string, attachments: Attachment[]) => {
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
      // Save user message to Supabase (if connected)
      if (!isDemoMode && supabase && conversation) {
        const sb = supabase!
        const { data: savedMsg, error: saveError } = await sb
          .from('messages')
          .insert({
            conversation_id: conversation.id,
            role: 'user',
            content,
            attachments
          })
          .select()
          .single()

        if (saveError) throw saveError
        setMessages(prev => prev.map(m => m.id === userMessage.id ? savedMsg : m))
      }

      // Try to send to gateway
      let responseContent: string

      if (gatewayConnected) {
        try {
          responseContent = await sendToGateway(content)
        } catch (err) {
          console.error('Gateway error, falling back to mock:', err)
          // Fallback to mock if gateway fails
          responseContent = `I received your message: "${content}"\n\n_(Gateway connection failed — this is a simulated response)_`
        }
      } else {
        // Mock response when gateway not connected
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

      // Save assistant message to Supabase (if connected)
      if (!isDemoMode && supabase && conversation) {
        const sb = supabase!
        const { data: savedResponse, error: responseError } = await sb
          .from('messages')
          .insert({
            conversation_id: conversation.id,
            role: 'assistant',
            content: responseContent,
            attachments: []
          })
          .select()
          .single()

        if (responseError) throw responseError
        setMessages(prev => [...prev, savedResponse])
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
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 text-purple-400 animate-spin" />
          <p className="text-sm text-white/50">Loading conversation...</p>
        </div>
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
      <div className="flex items-center justify-end px-4 py-1 border-b border-white/5">
        <div className="flex items-center gap-1.5 text-xs">
          {gatewayConnected === null ? (
            <span className="text-white/30">Checking gateway...</span>
          ) : gatewayConnected ? (
            <>
              <Wifi className="h-3 w-3 text-green-400" />
              <span className="text-green-400/70">Gateway connected</span>
            </>
          ) : (
            <>
              <WifiOff className="h-3 w-3 text-yellow-400" />
              <span className="text-yellow-400/70">Demo mode</span>
            </>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="px-4 py-2 bg-red-500/10 border-b border-red-500/20">
          <p className="text-xs text-red-300">{error}</p>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4">
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

      {/* Input Area */}
      <ChatInput
        onSend={handleSend}
        disabled={isSending}
        placeholder={`Message ${agentName}...`}
      />
    </div>
  )
}
