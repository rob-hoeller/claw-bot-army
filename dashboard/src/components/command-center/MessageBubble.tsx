/**
 * Message Bubble
 * 
 * Individual message renderer for the command center.
 * Displays user and assistant messages with intent badges and actions.
 */

"use client"

import { motion } from "framer-motion"
import { formatDistanceToNow } from "date-fns"
import { cn } from "@/lib/utils"
import type { CommandMessage } from "./command-center.types"

interface MessageBubbleProps {
  message: CommandMessage
  isStreaming?: boolean
  onConfirmFeature?: () => void
  onCancelFeature?: () => void
  className?: string
}

const INTENT_COLORS = {
  build: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  query: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  report: "bg-green-500/20 text-green-300 border-green-500/30",
  analyze: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  operate: "bg-red-500/20 text-red-300 border-red-500/30",
  unknown: "bg-white/10 text-white/40 border-white/20",
} as const

export function MessageBubble({
  message,
  isStreaming,
  onConfirmFeature,
  onCancelFeature,
  className
}: MessageBubbleProps) {
  const isUser = message.role === 'user'
  const isAssistant = message.role === 'assistant'
  
  // Parse timestamp
  const timestamp = message.timestamp 
    ? formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })
    : 'just now'

  // Check if this is a build intent with action buttons needed
  const needsFeatureConfirmation = 
    isAssistant && 
    message.intent === 'build' && 
    message.metadata?.action === 'create_feature'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "flex gap-3 mb-4",
        isUser ? "flex-row-reverse" : "flex-row",
        className
      )}
    >
      {/* Avatar */}
      <div className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
        isUser ? "bg-blue-500/20" : "bg-slate-800"
      )}>
        {isUser ? (
          <span className="text-sm">👤</span>
        ) : (
          <span className="text-sm">🧠</span>
        )}
      </div>

      {/* Message Content */}
      <div className={cn(
        "flex flex-col max-w-[75%]",
        isUser ? "items-end" : "items-start"
      )}>
        {/* Timestamp */}
        <span className="text-xs text-white/30 mb-1 px-1">
          {timestamp}
        </span>

        {/* Message Bubble */}
        <div className={cn(
          "rounded-2xl px-4 py-3 relative",
          isUser 
            ? "bg-blue-500/20 text-white rounded-br-md" 
            : "bg-slate-800 text-white/90 rounded-bl-md"
        )}>
          {/* Intent Badge (for assistant messages) */}
          {isAssistant && message.intent && message.intent !== 'unknown' && (
            <div className="mb-2">
              <span className={cn(
                "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border",
                INTENT_COLORS[message.intent]
              )}>
                {message.intent.toUpperCase()}
              </span>
            </div>
          )}

          {/* Message Text */}
          <div className="whitespace-pre-wrap text-sm leading-relaxed">
            {message.content}
            
            {/* Streaming cursor */}
            {isStreaming && (
              <span className="inline-block w-1.5 h-4 bg-white/70 ml-1 animate-pulse" />
            )}
          </div>

          {/* Action Buttons (for build intent) */}
          {needsFeatureConfirmation && (
            <div className="flex gap-2 mt-3 pt-3 border-t border-white/10">
              <button
                onClick={onConfirmFeature}
                className="px-4 py-2 bg-purple-500 hover:bg-purple-600 rounded-lg text-sm font-medium text-white transition-colors"
              >
                Create Feature
              </button>
              <button
                onClick={onCancelFeature}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium text-white/70 transition-colors"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Data Tables (if metadata contains results) */}
          {message.metadata?.queryResult && (
            <div className="mt-3 pt-3 border-t border-white/10">
              <pre className="text-xs text-white/50 overflow-x-auto">
                {JSON.stringify(message.metadata.queryResult, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
