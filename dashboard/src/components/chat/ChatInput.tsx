"use client"

import { useState, useRef, useCallback, KeyboardEvent } from "react"
import { cn } from "@/lib/utils"
import { Send, Paperclip, Image, X, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Attachment } from "./types"

interface ChatInputProps {
  onSend: (content: string, attachments: Attachment[]) => void
  disabled?: boolean
  placeholder?: string
  conversationId?: string
  sessionKey?: string
}

interface PendingFile {
  file: File
  preview?: string
  type: 'image' | 'video' | 'file'
}

function classifyFile(file: File): 'image' | 'video' | 'file' {
  if (file.type.startsWith('image/')) return 'image'
  if (file.type.startsWith('video/')) return 'video'
  return 'file'
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

async function uploadFile(
  file: File,
  conversationId?: string,
  sessionKey?: string
): Promise<Attachment> {
  const fileType = classifyFile(file)

  // Try uploading to Supabase Storage first
  try {
    const formData = new FormData()
    formData.append('file', file)
    if (conversationId) formData.append('conversationId', conversationId)
    if (sessionKey) formData.append('sessionKey', sessionKey)

    const response = await fetch('/api/chat/upload', {
      method: 'POST',
      body: formData,
    })

    if (response.ok) {
      const data = await response.json()
      return {
        type: fileType,
        url: data.url,
        name: data.name,
        size: data.size,
        mimeType: data.mimeType,
      }
    }
    console.warn('Upload returned', response.status, '— falling back to base64')
  } catch (err) {
    console.warn('Upload failed — falling back to base64:', err)
  }

  // Fallback: convert to base64 data URL
  const dataUrl = await fileToBase64(file)
  return {
    type: fileType,
    url: dataUrl,
    name: file.name,
    size: file.size,
    mimeType: file.type,
  }
}

/** Convert a FileList / File[] into PendingFile entries */
function filesToPending(files: File[]): PendingFile[] {
  return files.map(file => {
    const type = classifyFile(file)
    return {
      file,
      type,
      preview: type === 'image' ? URL.createObjectURL(file) : undefined,
    }
  })
}

export function ChatInput({ 
  onSend, 
  disabled = false, 
  placeholder = "Type a message...",
  conversationId,
  sessionKey,
}: ChatInputProps) {
  const [message, setMessage] = useState("")
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const dragCounterRef = useRef(0)

  const addFiles = useCallback((files: File[]) => {
    if (files.length === 0) return
    setPendingFiles(prev => [...prev, ...filesToPending(files)])
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    addFiles(files)
    e.target.value = '' // Reset input so same file can be re-selected
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

  const handleSend = async () => {
    if (!message.trim() && pendingFiles.length === 0) return
    if (disabled || isUploading) return

    let attachments: Attachment[] = []

    if (pendingFiles.length > 0) {
      setIsUploading(true)
      try {
        attachments = await Promise.all(
          pendingFiles.map(pf => uploadFile(pf.file, conversationId, sessionKey))
        )
      } catch (err) {
        console.error('All upload methods failed:', err)
        setIsUploading(false)
        return
      }
      setIsUploading(false)
    }

    // Clean up blob previews
    pendingFiles.forEach(pf => {
      if (pf.preview) URL.revokeObjectURL(pf.preview)
    })

    onSend(message.trim(), attachments)
    setMessage("")
    setPendingFiles([])
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value)
    const textarea = e.target
    textarea.style.height = 'auto'
    textarea.style.height = Math.min(textarea.scrollHeight, 150) + 'px'
  }

  // Paste handler — images from clipboard
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items)
    const imageItems = items.filter(item => item.type.startsWith('image/'))
    
    if (imageItems.length > 0) {
      e.preventDefault()
      const files = imageItems
        .map(item => item.getAsFile())
        .filter((f): f is File => f !== null)
      addFiles(files)
    }
  }

  // Drag & drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current += 1
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragOver(true)
    }
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current -= 1
    if (dragCounterRef.current === 0) {
      setIsDragOver(false)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current = 0
    setIsDragOver(false)

    const files = Array.from(e.dataTransfer.files)
    addFiles(files)
  }, [addFiles])

  const isBusy = disabled || isUploading

  return (
    <div
      className={cn(
        "border-t border-white/10 p-4 transition-colors",
        isDragOver && "bg-purple-500/10 border-purple-500/40"
      )}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDragOver && (
        <div className="flex items-center justify-center py-4 mb-3 rounded-xl border-2 border-dashed border-purple-500/50 bg-purple-500/5">
          <p className="text-sm text-purple-300">Drop files here</p>
        </div>
      )}

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
                <div className="w-16 h-16 rounded-lg border border-white/10 bg-white/5 flex flex-col items-center justify-center gap-0.5">
                  <span className="text-[10px] font-medium text-purple-300">
                    {pf.file.name.split('.').pop()?.toUpperCase()}
                  </span>
                  <span className="text-[9px] text-white/30 px-1 truncate max-w-[56px]">
                    {pf.file.name}
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
            onChange={handleFileSelect}
          />
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />
          
          {/* Paperclip: any file type (PC, Mac, mobile file explorers) */}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-white/40 hover:text-white/70"
            onClick={() => fileInputRef.current?.click()}
            disabled={isBusy}
            title="Attach files"
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          
          {/* Image button: filtered to images/video */}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-white/40 hover:text-white/70"
            onClick={() => imageInputRef.current?.click()}
            disabled={isBusy}
            title="Attach images"
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
            placeholder={isUploading ? "Uploading files..." : placeholder}
            disabled={isBusy}
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
          disabled={isBusy || (!message.trim() && pendingFiles.length === 0)}
          className="h-9 w-9 p-0 bg-purple-500 hover:bg-purple-600 disabled:opacity-30"
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Helper Text */}
      <p className="text-[10px] text-white/30 mt-2 text-center">
        Enter to send • Shift+Enter for new line • Paste or drag &amp; drop files
      </p>
    </div>
  )
}
