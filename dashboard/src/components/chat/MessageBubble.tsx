"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Bot, User, FileText, Download, X, ZoomIn } from "lucide-react"
import { Message, Attachment } from "./types"
import { motion, AnimatePresence } from "framer-motion"

interface MessageBubbleProps {
  message: Message
  agentName?: string
  agentEmoji?: string
  isStreaming?: boolean
}

// Image Lightbox Component
function ImageLightbox({ 
  src, 
  alt, 
  onClose 
}: { 
  src: string
  alt: string
  onClose: () => void 
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
      >
        <X className="h-6 w-6 text-white" />
      </button>

      {/* Image */}
      <motion.img
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        src={src}
        alt={alt}
        className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
        onClick={(e) => e.stopPropagation()}
      />
    </motion.div>
  )
}

function AttachmentPreview({ 
  attachment, 
  onImageClick 
}: { 
  attachment: Attachment
  onImageClick?: (url: string, name: string) => void 
}) {
  if (attachment.type === 'image') {
    return (
      <div 
        className="mt-2 rounded-lg overflow-hidden max-w-sm cursor-pointer group relative"
        onClick={() => onImageClick?.(attachment.url, attachment.name)}
      >
        <img 
          src={attachment.url} 
          alt={attachment.name}
          className="w-full h-auto transition-transform group-hover:scale-[1.02]"
        />
        {/* Zoom indicator on hover */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
          <ZoomIn className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
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

export function MessageBubble({ message, agentName = "Agent", agentEmoji, isStreaming = false }: MessageBubbleProps) {
  const [lightboxImage, setLightboxImage] = useState<{ url: string; name: string } | null>(null)
  
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
    <>
      {/* Lightbox Portal */}
      <AnimatePresence>
        {lightboxImage && (
          <ImageLightbox
            src={lightboxImage.url}
            alt={lightboxImage.name}
            onClose={() => setLightboxImage(null)}
          />
        )}
      </AnimatePresence>

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
                {isStreaming && (
                  <span className="inline-block w-2 h-4 ml-0.5 bg-white/70 animate-pulse" />
                )}
              </p>
            )}

            {/* Attachments */}
            {message.attachments && message.attachments.length > 0 && (
              <div className="space-y-2">
                {message.attachments.map((attachment, index) => (
                  <AttachmentPreview 
                    key={index} 
                    attachment={attachment}
                    onImageClick={(url, name) => setLightboxImage({ url, name })}
                  />
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
    </>
  )
}
