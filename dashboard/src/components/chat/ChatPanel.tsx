"use client"

import { useState, useEffect, useRef } from "react"
import { motion } from "framer-motion"
import { Bot, Loader2 } from "lucide-react"
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
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Load or create conversation
  useEffect(() => {
    async function initConversation() {
      if (!supabase || !userId) {
        // Mock mode for development
        setIsLoading(false)
        setMessages([
          {
            id: '1',
            conversation_id: 'mock',
            role: 'assistant',
            content: `Hello! I'm ${agentName}. How can I help you today?`,
            attachments: [],
            created_at: new Date().toISOString()
          }
        ])
        return
      }

      try {
        setIsLoading(true)
        setError(null)

        // Try to find existing conversation
        const { data: existingConv, error: fetchError } = await supabase
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
          const { data: newConv, error: createError } = await supabase
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
        const { data: msgs, error: msgsError } = await supabase
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
  }, [agentId, agentName, userId])

  // Handle sending a message
  const handleSend = async (content: string, attachments: Attachment[]) => {
    if (!content.trim() && attachments.length === 0) return

    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      conversation_id: conversation?.id || 'mock',
      role: 'user',
      content,
      attachments,
      created_at: new Date().toISOString()
    }

    // Optimistically add user message
    setMessages(prev => [...prev, userMessage])
    setIsSending(true)

    try {
      if (supabase && conversation) {
        // Save user message to Supabase
        const { data: savedMsg, error: saveError } = await supabase
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

        // Update with real ID
        setMessages(prev => 
          prev.map(m => m.id === userMessage.id ? savedMsg : m)
        )

        // TODO: Send to OpenClaw gateway and get response
        // For now, simulate a response
        await new Promise(resolve => setTimeout(resolve, 1000))

        const assistantMessage: Message = {
          id: `temp-response-${Date.now()}`,
          conversation_id: conversation.id,
          role: 'assistant',
          content: `I received your message: "${content}"\n\nThis is a placeholder response. Once connected to the OpenClaw gateway, I'll provide real assistance.`,
          attachments: [],
          created_at: new Date().toISOString()
        }

        // Save assistant message
        const { data: savedResponse, error: responseError } = await supabase
          .from('messages')
          .insert({
            conversation_id: conversation.id,
            role: 'assistant',
            content: assistantMessage.content,
            attachments: []
          })
          .select()
          .single()

        if (responseError) throw responseError

        setMessages(prev => [...prev, savedResponse])
      } else {
        // Mock mode
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        const mockResponse: Message = {
          id: `mock-${Date.now()}`,
          conversation_id: 'mock',
          role: 'assistant',
          content: `I received your message: "${content}"\n\nThis is a placeholder response. Connect to Supabase for persistence.`,
          attachments: [],
          created_at: new Date().toISOString()
        }
        
        setMessages(prev => [...prev, mockResponse])
      }
    } catch (err) {
      console.error('Error sending message:', err)
      setError('Failed to send message')
    } finally {
      setIsSending(false)
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

  if (error) {
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
            
            {/* Typing indicator */}
            {isSending && (
              <div className="flex gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
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
