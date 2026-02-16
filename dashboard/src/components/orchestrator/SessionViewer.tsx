"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { motion } from "framer-motion"
import { 
  Bot, 
  User, 
  RefreshCw, 
  X, 
  Clock,
  Zap,
  Monitor,
  ExternalLink,
  Copy,
  Check
} from "lucide-react"
import { SessionInfo, SessionMessage } from "./types"
import { cn } from "@/lib/utils"

interface SessionViewerProps {
  session: SessionInfo
  onClose: () => void
}

interface FullMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp?: number
}

export function SessionViewer({ session, onClose }: SessionViewerProps) {
  const [messages, setMessages] = useState<FullMessage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const fetchHistory = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch(
        `/api/chat/history?sessionKey=${encodeURIComponent(session.key)}&limit=100`
      )
      if (!response.ok) {
        throw new Error('Failed to fetch history')
      }
      const data = await response.json()
      setMessages(data.messages || [])
      setError(null)
    } catch (err) {
      console.error('Error fetching history:', err)
      setError('Failed to load conversation history')
    } finally {
      setIsLoading(false)
    }
  }, [session.key])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  // Scroll to bottom when messages load
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages])

  const formatTimestamp = (timestamp?: number) => {
    if (!timestamp) return ''
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  const copySessionKey = async () => {
    await navigator.clipboard.writeText(session.key)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const getSessionIcon = () => {
    if (session.isSubAgent) return <Zap className="h-5 w-5 text-yellow-400" />
    if (session.isDashboard) return <Monitor className="h-5 w-5 text-blue-400" />
    return <Bot className="h-5 w-5 text-purple-400" />
  }

  return (
    <div className="flex flex-col h-full bg-black/20">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/30">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-white/10 flex items-center justify-center">
            {getSessionIcon()}
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-medium text-white truncate">
              {session.displayName}
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] text-white/40 truncate max-w-[200px]">
                {session.key}
              </span>
              <button
                onClick={copySessionKey}
                className="text-white/30 hover:text-white/60 transition-colors"
                title="Copy session key"
              >
                {copied ? (
                  <Check className="h-3 w-3 text-green-400" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </button>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchHistory}
            disabled={isLoading}
            className="p-2 rounded-lg hover:bg-white/5 text-white/40 transition-colors"
            title="Refresh history"
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/5 text-white/40 transition-colors"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Session metadata */}
      <div className="px-4 py-2 border-b border-white/5 flex items-center gap-4 text-[11px] text-white/40">
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Active {new Date(session.updatedAt).toLocaleString()}
        </span>
        <span>{session.totalTokens.toLocaleString()} tokens</span>
        <span className="text-white/30">{session.model}</span>
      </div>

      {/* Error state */}
      {error && (
        <div className="px-4 py-3 bg-red-500/10 border-b border-red-500/20">
          <p className="text-xs text-red-300">{error}</p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading && messages.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <RefreshCw className="h-5 w-5 text-white/30 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center">
            <Bot className="h-8 w-8 text-white/20 mb-2" />
            <p className="text-xs text-white/40">No messages in this session</p>
            <p className="text-[10px] text-white/30">
              The conversation may be stored differently or just started
            </p>
          </div>
        ) : (
          messages.map((message, index) => (
            <motion.div
              key={message.id || index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.02 }}
              className={cn(
                "flex gap-3",
                message.role === 'user' && "flex-row-reverse"
              )}
            >
              {/* Avatar */}
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                message.role === 'user' 
                  ? "bg-purple-500/20" 
                  : message.role === 'system'
                  ? "bg-yellow-500/20"
                  : "bg-blue-500/20"
              )}>
                {message.role === 'user' ? (
                  <User className="h-4 w-4 text-purple-300" />
                ) : message.role === 'system' ? (
                  <Zap className="h-4 w-4 text-yellow-300" />
                ) : (
                  <Bot className="h-4 w-4 text-blue-300" />
                )}
              </div>

              {/* Message content */}
              <div className={cn(
                "max-w-[80%] rounded-2xl px-4 py-2.5",
                message.role === 'user' 
                  ? "bg-purple-500/20 rounded-br-md" 
                  : message.role === 'system'
                  ? "bg-yellow-500/10 rounded-bl-md border border-yellow-500/20"
                  : "bg-white/[0.08] rounded-bl-md"
              )}>
                {message.role === 'system' && (
                  <div className="text-[10px] text-yellow-400/70 mb-1 font-medium">
                    SYSTEM
                  </div>
                )}
                <p className="text-sm text-white/90 whitespace-pre-wrap break-words">
                  {message.content}
                </p>
                {message.timestamp && (
                  <p className={cn(
                    "text-[10px] mt-1",
                    message.role === 'user' ? "text-purple-300/50" : "text-white/30"
                  )}>
                    {formatTimestamp(message.timestamp)}
                  </p>
                )}
              </div>
            </motion.div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Footer with session actions */}
      <div className="px-4 py-3 border-t border-white/5 bg-black/20">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-white/30">
            {messages.length} messages
          </span>
          <button
            className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 transition-colors"
            onClick={() => {
              // Could open in new window or navigate to full chat
              console.log('Open full session:', session.key)
            }}
          >
            <ExternalLink className="h-3 w-3" />
            Open in Chat
          </button>
        </div>
      </div>
    </div>
  )
}
