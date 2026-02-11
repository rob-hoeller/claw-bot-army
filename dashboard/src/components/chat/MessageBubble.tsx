"use client"

import { cn } from "@/lib/utils"
import { Bot, User, FileText, Download } from "lucide-react"
import { Message, Attachment } from "./types"

interface MessageBubbleProps {
  message: Message
  agentName?: string
  agentEmoji?: string
}

function AttachmentPreview({ attachment }: { attachment: Attachment }) {
  if (attachment.type === 'image') {
    return (
      <div className="mt-2 rounded-lg overflow-hidden max-w-sm">
        <img 
          src={attachment.url} 
          alt={attachment.name}
          className="w-full h-auto"
        />
      </div>
    )
  }

  if (attachment.type === 'video') {
    return (
      <div className="mt-2 rounded-lg overflow-hidden max-w-sm">
        <video 
          src={attachment.url} 
          controls
          className="w-full h-auto"
        />
      </div>
    )
  }

  // File attachment
  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors max-w-sm"
    >
      <FileText className="h-4 w-4 text-white/50" />
      <span className="text-sm text-white/70 truncate flex-1">{attachment.name}</span>
      <Download className="h-4 w-4 text-white/40" />
    </a>
  )
}

export function MessageBubble({ message, agentName = "Agent", agentEmoji }: MessageBubbleProps) {
  const isUser = message.role === 'user'
  const isSystem = message.role === 'system'

  if (isSystem) {
    return (
      <div className="flex justify-center my-4">
        <div className="px-3 py-1.5 rounded-full bg-white/5 text-xs text-white/40">
          {message.content}
        </div>
      </div>
    )
  }

  return (
    <div className={cn(
      "flex gap-3 mb-4",
      isUser ? "flex-row-reverse" : "flex-row"
    )}>
      {/* Avatar */}
      <div className={cn(
        "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm",
        isUser 
          ? "bg-purple-500/20 text-purple-300" 
          : "bg-blue-500/20 text-blue-300"
      )}>
        {isUser ? (
          <User className="h-4 w-4" />
        ) : agentEmoji ? (
          <span>{agentEmoji}</span>
        ) : (
          <Bot className="h-4 w-4" />
        )}
      </div>

      {/* Message Content */}
      <div className={cn(
        "flex flex-col max-w-[75%]",
        isUser ? "items-end" : "items-start"
      )}>
        {/* Sender Name */}
        <span className="text-xs text-white/40 mb-1 px-1">
          {isUser ? "You" : agentName}
        </span>

        {/* Bubble */}
        <div className={cn(
          "rounded-2xl px-4 py-2.5",
          isUser 
            ? "bg-purple-500/20 text-white rounded-br-md" 
            : "bg-white/[0.08] text-white/90 rounded-bl-md"
        )}>
          {/* Text Content */}
          {message.content && (
            <p className="text-sm whitespace-pre-wrap leading-relaxed">
              {message.content}
            </p>
          )}

          {/* Attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="space-y-2">
              {message.attachments.map((attachment, index) => (
                <AttachmentPreview key={index} attachment={attachment} />
              ))}
            </div>
          )}
        </div>

        {/* Timestamp */}
        <span className="text-[10px] text-white/30 mt-1 px-1">
          {new Date(message.created_at).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </span>
      </div>
    </div>
  )
}
