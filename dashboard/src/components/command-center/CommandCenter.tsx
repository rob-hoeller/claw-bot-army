/**
 * Command Center
 * 
 * Conversational AI interface for the HBx dashboard.
 * Replaces CommandBar with natural language interaction.
 */

"use client"

import { useState, useRef, useEffect, KeyboardEvent } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Send, Loader2, ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
import { classifyIntent } from "@/lib/intent-classifier"
import { executeCommand } from "@/lib/command-executor"
import { MessageBubble } from "./MessageBubble"
import { QuickActions } from "./QuickActions"
import type { CommandMessage, CommandCenterProps } from "./command-center.types"

const MAX_MESSAGES = 50

export function CommandCenter({ onCreateFeature, className }: CommandCenterProps) {
  const [messages, setMessages] = useState<CommandMessage[]>([])
  const [input, setInput] = useState("")
  const [isExpanded, setIsExpanded] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to latest message
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    if (isExpanded) {
      scrollToBottom()
    }
  }, [messages, isExpanded])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + "px"
    }
  }, [input])

  // Expand on first input focus
  const handleFocus = () => {
    setIsExpanded(true)
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      // Escape to collapse (if no messages)
      if (e.key === "Escape" && messages.length === 0) {
        setIsExpanded(false)
        textareaRef.current?.blur()
      }
      
      // Cmd/Ctrl + K to focus
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setIsExpanded(true)
        setTimeout(() => textareaRef.current?.focus(), 100)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [messages.length])

  // Handle sending a message
  const handleSend = async () => {
    if (!input.trim() || isProcessing) return

    const userMessage: CommandMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
    }

    // Add user message
    setMessages(prev => [...prev.slice(-MAX_MESSAGES + 1), userMessage])
    setInput("")
    setIsProcessing(true)
    setIsExpanded(true) // Ensure expanded when messages exist

    // Simulate typing delay
    await new Promise(resolve => setTimeout(resolve, 500))

    try {
      // Classify intent
      const intent = classifyIntent(userMessage.content)
      
      // Execute command
      const response = await executeCommand(intent, userMessage.content, supabase)

      // Check if this is a build intent that needs confirmation
      const needsConfirmation = intent.intent === 'build'

      const assistantMessage: CommandMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response,
        timestamp: new Date().toISOString(),
        intent: intent.intent,
        metadata: needsConfirmation ? {
          action: 'create_feature',
          extractedTitle: userMessage.content,
          extractedPriority: intent.entities.priority || 'medium'
        } : undefined
      }

      setMessages(prev => [...prev.slice(-MAX_MESSAGES + 1), assistantMessage])
    } catch (error) {
      console.error('Command execution error:', error)
      
      const errorMessage: CommandMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString(),
      }

      setMessages(prev => [...prev.slice(-MAX_MESSAGES + 1), errorMessage])
    } finally {
      setIsProcessing(false)
    }
  }

  // Handle quick action selection
  const handleQuickAction = (query: string) => {
    setInput(query)
    setTimeout(() => handleSend(), 100)
  }

  // Handle feature creation confirmation
  const handleConfirmFeature = (message: CommandMessage) => {
    if (!onCreateFeature || !message.metadata) return

    const title = message.metadata.extractedTitle || 'Untitled Feature'
    const priority = message.metadata.extractedPriority || 'medium'

    onCreateFeature(title, '', priority)

    // Add confirmation message
    const confirmMessage: CommandMessage = {
      id: `confirm-${Date.now()}`,
      role: 'assistant',
      content: `✅ Feature created! I've added "${title}" to the pipeline with ${priority} priority. The team will start working on it shortly.`,
      timestamp: new Date().toISOString(),
      intent: 'build'
    }

    setMessages(prev => [...prev.slice(-MAX_MESSAGES + 1), confirmMessage])
  }

  // Handle feature creation cancellation
  const handleCancelFeature = () => {
    const cancelMessage: CommandMessage = {
      id: `cancel-${Date.now()}`,
      role: 'assistant',
      content: "No problem! Let me know if you'd like to create a different feature.",
      timestamp: new Date().toISOString(),
    }

    setMessages(prev => [...prev.slice(-MAX_MESSAGES + 1), cancelMessage])
  }

  // Handle keyboard events in textarea
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Collapsed state
  if (!isExpanded && messages.length === 0) {
    return (
      <div ref={containerRef} className={cn("w-full", className)}>
        <motion.div
          layout
          className="relative overflow-hidden rounded-lg border border-white/10 bg-slate-900/60 backdrop-blur-sm hover:border-white/20 transition-colors"
        >
          <button
            onClick={() => {
              setIsExpanded(true)
              setTimeout(() => textareaRef.current?.focus(), 100)
            }}
            className="w-full px-4 py-3 flex items-center gap-3 text-left"
          >
            <span className="text-lg">🧠</span>
            <span className="text-sm text-white/50 hover:text-white/70 transition-colors flex-1">
              What can I help you with today?
            </span>
            <span className="text-xs text-white/30">⌘K</span>
          </button>
        </motion.div>
      </div>
    )
  }

  // Expanded state
  return (
    <div ref={containerRef} className={cn("w-full", className)}>
      <motion.div
        layout
        className="relative overflow-hidden rounded-lg border border-purple-500/30 bg-slate-900/90 backdrop-blur-sm shadow-lg shadow-purple-500/10"
      >
        {/* Header (when expanded with messages) */}
        {messages.length > 0 && (
          <div className="flex items-center justify-between px-4 py-2 border-b border-white/10">
            <div className="flex items-center gap-2">
              <span className="text-lg">🧠</span>
              <span className="text-sm font-medium text-white/90">HBx Command Center</span>
            </div>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 text-white/40 hover:text-white/70 transition-colors"
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          </div>
        )}

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {/* Messages Area */}
              {messages.length > 0 && (
                <div className="max-h-[400px] overflow-y-auto p-4 space-y-1">
                  {messages.map((message) => (
                    <MessageBubble
                      key={message.id}
                      message={message}
                      onConfirmFeature={() => handleConfirmFeature(message)}
                      onCancelFeature={handleCancelFeature}
                    />
                  ))}
                  
                  {/* Typing indicator */}
                  {isProcessing && (
                    <div className="flex gap-3 mb-4">
                      <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm">🧠</span>
                      </div>
                      <div className="bg-slate-800 rounded-2xl rounded-bl-md px-4 py-3">
                        <div className="flex gap-1">
                          <span className="w-2 h-2 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-2 h-2 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-2 h-2 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>
              )}

              {/* Quick Actions */}
              {messages.length === 0 && (
                <div className="px-4 pt-4">
                  <p className="text-xs text-white/50 mb-3">Quick actions:</p>
                  <QuickActions 
                    onSelect={handleQuickAction}
                    disabled={isProcessing}
                  />
                </div>
              )}

              {/* Input Area */}
              <div className="p-4 border-t border-white/10">
                <div className="flex items-end gap-2">
                  {/* Text Input */}
                  <div className="flex-1 relative">
                    <textarea
                      ref={textareaRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      onFocus={handleFocus}
                      placeholder="Ask me anything..."
                      disabled={isProcessing}
                      rows={1}
                      className={cn(
                        "w-full resize-none rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/30",
                        "focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20",
                        "disabled:opacity-50 disabled:cursor-not-allowed",
                        "max-h-[120px]"
                      )}
                    />
                  </div>

                  {/* Send Button */}
                  <button
                    onClick={handleSend}
                    disabled={isProcessing || !input.trim()}
                    className="h-9 w-9 p-0 bg-purple-500 hover:bg-purple-600 disabled:opacity-30 rounded-lg flex items-center justify-center transition-colors"
                  >
                    {isProcessing ? (
                      <Loader2 className="h-4 w-4 animate-spin text-white" />
                    ) : (
                      <Send className="h-4 w-4 text-white" />
                    )}
                  </button>
                </div>

                {/* Helper Text */}
                <p className="text-xs text-white/30 mt-2 text-center">
                  Enter to send • Shift+Enter for new line • Escape to collapse
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
