"use client"

import { motion } from "framer-motion"
import { User, Bot } from "lucide-react"
import { cn } from "@/lib/utils"

export interface ActivityItemData {
  id: string
  timestamp: string
  userId: string
  userName?: string
  agentId: string
  agentName: string
  agentEmoji?: string
  role: 'user' | 'assistant'
  preview: string
  conversationId: string
}

interface ActivityItemProps {
  item: ActivityItemData
  onClick?: (item: ActivityItemData) => void
  isNew?: boolean
}

// Agent color mapping for visual distinction
const agentColors: Record<string, string> = {
  'hbx': 'border-l-purple-500',
  'cx-1': 'border-l-blue-500',
  'cx-2': 'border-l-cyan-500',
  'cx-3': 'border-l-green-500',
  'cx-4': 'border-l-yellow-500',
  'cx-5': 'border-l-orange-500',
  'cx-6': 'border-l-red-500',
  'default': 'border-l-white/30',
}

export function ActivityItem({ item, onClick, isNew = false }: ActivityItemProps) {
  const timeStr = new Date(item.timestamp).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit',
    second: '2-digit'
  })
  
  const borderColor = agentColors[item.agentId] || agentColors['default']
  const isUser = item.role === 'user'

  return (
    <motion.div
      initial={isNew ? { opacity: 0, x: -20 } : false}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
      onClick={() => onClick?.(item)}
      className={cn(
        "px-3 py-2 border-l-2 cursor-pointer transition-colors",
        "hover:bg-white/5",
        borderColor,
        isNew && "bg-white/[0.03]"
      )}
    >
      {/* Header: Time + Agent */}
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[10px] text-white/30 font-mono">{timeStr}</span>
        <div className="flex items-center gap-1">
          {item.agentEmoji ? (
            <span className="text-xs">{item.agentEmoji}</span>
          ) : (
            <Bot className="h-3 w-3 text-white/40" />
          )}
          <span className="text-[10px] text-white/50 font-medium">{item.agentName}</span>
        </div>
      </div>

      {/* Message Preview */}
      <div className="flex items-start gap-2">
        <div className={cn(
          "flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center",
          isUser ? "bg-purple-500/20" : "bg-blue-500/20"
        )}>
          {isUser ? (
            <User className="h-2.5 w-2.5 text-purple-300" />
          ) : item.agentEmoji ? (
            <span className="text-[8px]">{item.agentEmoji}</span>
          ) : (
            <Bot className="h-2.5 w-2.5 text-blue-300" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-[10px] text-white/40 mr-1">
            {isUser ? (item.userName || 'User') : item.agentName}:
          </span>
          <span className="text-xs text-white/70 line-clamp-2">
            {item.preview}
          </span>
        </div>
      </div>
    </motion.div>
  )
}
