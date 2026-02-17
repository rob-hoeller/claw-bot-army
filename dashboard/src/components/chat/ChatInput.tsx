"use client"

import { useState, useRef, KeyboardEvent } from "react"
import { cn } from "@/lib/utils"
import { Send, Paperclip, Image, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Attachment } from "./types"

interface ChatInputProps {
  onSend: (content: string, attachments: Attachment[]) => void
  disabled?: boolean
  placeholder?: string
}

interface PendingFile {
  file: File
  preview?: string
  type: 'image' | 'video' | 'file'
}

export function ChatInput({ 
  onSend, 
  disabled = false, 
  placeholder = "Type a message..." 
}: ChatInputProps) {
  const [message, setMessage] = useState("")
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'any' | 'image') => {
    const files = Array.from(e.target.files || [])
    
    const newFiles: PendingFile[] = files.map(file => {
      const fileType = file.type.startsWith('image/') 
        ? 'image' 
        : file.type.startsWith('video/') 
          ? 'video' 
          : 'file'
      
      return {
        file,
        type: fileType,
        preview: fileType === 'image' ? URL.createObjectURL(file) : undefined
      }
    })

    setPendingFiles(prev => [...prev, ...newFiles])
    e.target.value = '' // Reset input
  }

  const removePendingFile = (index: number) => {
    setPendingFiles(prev => {
      const updated = [...prev]
      if (updated[index].preview) {
        URL.revokeObjectURL(updated[index].preview!)
      }
      updated.splice(index, 1)
      return updated
    })
  }

  const [isUploading, setIsUploading] = useState(false)

  const handleSend = async () => {
    if (!message.trim() && pendingFiles.length === 0) return
    if (disabled || isUploading) return

    // Upload files to Supabase Storage
    setIsUploading(true)
    const attachments: Attachment[] = []

    try {
      for (const pf of pendingFiles) {
        const formData = new FormData()
        formData.append('file', pf.file)
        formData.append('channel', 'webchat')

        const res = await fetch('/api/chat/upload-media', {
          method: 'POST',
          body: formData,
        })

        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          console.error('Upload failed:', err)
          continue
        }

        const data = await res.json()
        attachments.push({
          type: pf.type,
          url: data.storage_url,
          name: pf.file.name,
          size: pf.file.size,
          mimeType: pf.file.type,
        })
      }
    } finally {
      setIsUploading(false)
    }

    onSend(message.trim(), attachments)
    setMessage("")
    // Revoke preview URLs
    pendingFiles.forEach(pf => pf.preview && URL.revokeObjectURL(pf.preview))
    setPendingFiles([])
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Auto-resize textarea
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value)
    const textarea = e.target
    textarea.style.height = 'auto'
    textarea.style.height = Math.min(textarea.scrollHeight, 150) + 'px'
  }

  // Handle paste for images
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items)
    const imageItems = items.filter(item => item.type.startsWith('image/'))
    
    if (imageItems.length > 0) {
      e.preventDefault()
      imageItems.forEach(item => {
        const file = item.getAsFile()
        if (file) {
          const preview = URL.createObjectURL(file)
          setPendingFiles(prev => [...prev, { file, type: 'image', preview }])
        }
      })
    }
  }

  return (
    <div className="border-t border-white/10 p-4">
      {/* Pending Files Preview */}
      {pendingFiles.length > 0 && (
        <div className="flex gap-2 mb-3 flex-wrap">
          {pendingFiles.map((pf, index) => (
            <div 
              key={index}
              className="relative group"
            >
              {pf.type === 'image' && pf.preview ? (
                <div className="w-16 h-16 rounded-lg overflow-hidden border border-white/10">
                  <img 
                    src={pf.preview} 
                    alt={pf.file.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center">
                  <span className="text-xs text-white/50 text-center px-1 truncate">
                    {pf.file.name.split('.').pop()?.toUpperCase()}
                  </span>
                </div>
              )}
              <button
                onClick={() => removePendingFile(index)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input Row */}
      <div className="flex items-end gap-2">
        {/* Attachment Buttons */}
        <div className="flex gap-1">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => handleFileSelect(e, 'any')}
          />
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={(e) => handleFileSelect(e, 'image')}
          />
          
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-white/40 hover:text-white/70"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-white/40 hover:text-white/70"
            onClick={() => imageInputRef.current?.click()}
            disabled={disabled}
          >
            <Image className="h-4 w-4" />
          </Button>
        </div>

        {/* Text Input */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className={cn(
              "w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/30",
              "focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "max-h-[150px]"
            )}
          />
        </div>

        {/* Send Button */}
        <Button
          onClick={handleSend}
          disabled={disabled || isUploading || (!message.trim() && pendingFiles.length === 0)}
          className="h-9 w-9 p-0 bg-purple-500 hover:bg-purple-600 disabled:opacity-30"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>

      {/* Helper Text */}
      <p className="text-[10px] text-white/30 mt-2 text-center">
        Press Enter to send • Shift+Enter for new line • Paste images directly
      </p>
    </div>
  )
}
