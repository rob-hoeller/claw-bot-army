"use client"

import { useState, useRef, useCallback, KeyboardEvent } from "react"
import { cn } from "@/lib/utils"
import { Send, Paperclip, Image as ImageIcon, X, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MentionAutocomplete } from "./MentionAutocomplete"
import type { Attachment } from "@/components/chat/types"

interface Agent {
  id: string
  name: string
  emoji: string | null
}

interface PendingFile {
  file: File
  preview?: string
  type: "image" | "video" | "file"
}

interface PhaseChatInputProps {
  onSend: (content: string, mentions: string[], attachments: Attachment[]) => void
  disabled?: boolean
  agents: Agent[]
}

function classifyFile(file: File): "image" | "video" | "file" {
  if (file.type.startsWith("image/")) return "image"
  if (file.type.startsWith("video/")) return "video"
  return "file"
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

async function uploadFile(file: File): Promise<Attachment> {
  const fileType = classifyFile(file)
  try {
    const formData = new FormData()
    formData.append("file", file)
    const response = await fetch("/api/chat/upload", {
      method: "POST",
      body: formData,
    })
    if (response.ok) {
      const data = await response.json()
      return { type: fileType, url: data.url, name: data.name, size: data.size, mimeType: data.mimeType }
    }
  } catch {
    // fall through to base64
  }
  const dataUrl = await fileToBase64(file)
  return { type: fileType, url: dataUrl, name: file.name, size: file.size, mimeType: file.type }
}

function filesToPending(files: File[]): PendingFile[] {
  return files.map((file) => {
    const type = classifyFile(file)
    return { file, type, preview: type === "image" ? URL.createObjectURL(file) : undefined }
  })
}

export function PhaseChatInput({ onSend, disabled = false, agents }: PhaseChatInputProps) {
  const [message, setMessage] = useState("")
  const [mentions, setMentions] = useState<string[]>([])
  const [showMentions, setShowMentions] = useState(false)
  const [mentionQuery, setMentionQuery] = useState("")
  const [mentionActiveIndex, setMentionActiveIndex] = useState(0)
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const dragCounterRef = useRef(0)

  const filteredAgents = agents
    .filter(
      (a) =>
        a.id.toLowerCase().startsWith(mentionQuery.toLowerCase()) ||
        a.name.toLowerCase().startsWith(mentionQuery.toLowerCase())
    )
    .slice(0, 6)

  const detectMention = useCallback((value: string, cursorPos: number) => {
    let i = cursorPos - 1
    while (i >= 0 && value[i] !== "@" && value[i] !== " " && value[i] !== "\n") i--
    if (i >= 0 && value[i] === "@" && (i === 0 || value[i - 1] === " " || value[i - 1] === "\n")) {
      setMentionQuery(value.slice(i + 1, cursorPos))
      setShowMentions(true)
      setMentionActiveIndex(0)
    } else {
      setShowMentions(false)
    }
  }, [])

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setMessage(value)
    const textarea = e.target
    textarea.style.height = "auto"
    textarea.style.height = Math.min(textarea.scrollHeight, 100) + "px"
    detectMention(value, textarea.selectionStart ?? value.length)
  }

  const handleMentionSelect = useCallback(
    (agentId: string) => {
      const textarea = textareaRef.current
      if (!textarea) return
      const cursorPos = textarea.selectionStart
      const value = message
      let i = cursorPos - 1
      while (i >= 0 && value[i] !== "@") i--
      const before = value.slice(0, i)
      const after = value.slice(cursorPos)
      const newMessage = `${before}@${agentId} ${after}`
      setMessage(newMessage)
      setShowMentions(false)
      if (!mentions.includes(agentId)) setMentions((prev) => [...prev, agentId])
      setTimeout(() => {
        textarea.focus()
        const newPos = i + agentId.length + 2
        textarea.setSelectionRange(newPos, newPos)
      }, 0)
    },
    [message, mentions]
  )

  const addFiles = useCallback((files: File[]) => {
    if (files.length === 0) return
    setPendingFiles((prev) => [...prev, ...filesToPending(files)])
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(Array.from(e.target.files || []))
    e.target.value = ""
  }

  const removePendingFile = (index: number) => {
    setPendingFiles((prev) => {
      const updated = [...prev]
      if (updated[index].preview) URL.revokeObjectURL(updated[index].preview!)
      updated.splice(index, 1)
      return updated
    })
  }

  const handleSend = async () => {
    if ((!message.trim() && pendingFiles.length === 0) || disabled || isUploading) return

    const finalMentions: string[] = []
    const mentionRegex = /@(\w+)/g
    let match
    while ((match = mentionRegex.exec(message)) !== null) {
      const id = match[1]
      if (agents.some((a) => a.id === id) && !finalMentions.includes(id)) finalMentions.push(id)
    }

    let attachments: Attachment[] = []
    if (pendingFiles.length > 0) {
      setIsUploading(true)
      try {
        attachments = await Promise.all(pendingFiles.map((pf) => uploadFile(pf.file)))
      } catch {
        setIsUploading(false)
        return
      }
      setIsUploading(false)
    }

    pendingFiles.forEach((pf) => { if (pf.preview) URL.revokeObjectURL(pf.preview) })

    onSend(message.trim(), finalMentions, attachments)
    setMessage("")
    setMentions([])
    setPendingFiles([])
    if (textareaRef.current) textareaRef.current.style.height = "auto"
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (showMentions && filteredAgents.length > 0) {
      if (e.key === "ArrowDown") { e.preventDefault(); setMentionActiveIndex((p) => (p + 1) % filteredAgents.length); return }
      if (e.key === "ArrowUp") { e.preventDefault(); setMentionActiveIndex((p) => (p - 1 + filteredAgents.length) % filteredAgents.length); return }
      if (e.key === "Enter") { e.preventDefault(); handleMentionSelect(filteredAgents[mentionActiveIndex].id); return }
      if (e.key === "Escape") { e.preventDefault(); setShowMentions(false); return }
    }
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items)
    const imageItems = items.filter((item) => item.type.startsWith("image/"))
    if (imageItems.length > 0) {
      e.preventDefault()
      const files = imageItems.map((item) => item.getAsFile()).filter((f): f is File => f !== null)
      addFiles(files)
    }
  }

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation()
    dragCounterRef.current += 1
    if (e.dataTransfer.types.includes("Files")) setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation()
    dragCounterRef.current -= 1
    if (dragCounterRef.current === 0) setIsDragOver(false)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation() }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation()
    dragCounterRef.current = 0
    setIsDragOver(false)
    addFiles(Array.from(e.dataTransfer.files))
  }, [addFiles])

  const isBusy = disabled || isUploading

  return (
    <div
      className={cn("transition-colors", isDragOver && "bg-purple-500/10 rounded-lg")}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {isDragOver && (
        <div className="flex items-center justify-center py-2 mb-2 rounded-lg border border-dashed border-purple-500/50 bg-purple-500/5">
          <p className="text-[10px] text-purple-300">Drop files here</p>
        </div>
      )}

      {pendingFiles.length > 0 && (
        <div className="flex gap-1.5 mb-2 flex-wrap">
          {pendingFiles.map((pf, index) => (
            <div key={index} className="relative group">
              {pf.type === "image" && pf.preview ? (
                <div className="w-12 h-12 rounded-lg overflow-hidden border border-white/10">
                  <img src={pf.preview} alt={pf.file.name} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-lg border border-white/10 bg-white/5 flex flex-col items-center justify-center gap-0.5">
                  <span className="text-[8px] font-medium text-purple-300">
                    {pf.file.name.split(".").pop()?.toUpperCase()}
                  </span>
                  <span className="text-[7px] text-white/30 px-0.5 truncate max-w-[44px]">{pf.file.name}</span>
                </div>
              )}
              <button
                onClick={() => removePendingFile(index)}
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-1.5 pt-2">
        <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileSelect} />
        <input ref={imageInputRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleFileSelect} />

        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-white/30 hover:text-white/60 flex-shrink-0"
          onClick={() => fileInputRef.current?.click()}
          disabled={isBusy}
          title="Attach files"
        >
          <Paperclip className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-white/30 hover:text-white/60 flex-shrink-0"
          onClick={() => imageInputRef.current?.click()}
          disabled={isBusy}
          title="Attach images"
        >
          <ImageIcon className="h-3 w-3" />
        </Button>

        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={isUploading ? "Uploading..." : "Type a message... Use @ to mention"}
            rows={1}
            disabled={isBusy}
            className={cn(
              "w-full resize-none rounded-xl border border-white/10 bg-white/5",
              "px-3 py-2 text-[11px] text-white placeholder:text-white/30",
              "focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20",
              "max-h-[100px] disabled:opacity-50"
            )}
          />
          {showMentions && (
            <MentionAutocomplete agents={filteredAgents} onSelect={handleMentionSelect} activeIndex={mentionActiveIndex} />
          )}
        </div>
        <Button
          onClick={handleSend}
          disabled={isBusy || (!message.trim() && pendingFiles.length === 0)}
          className="h-8 w-8 p-0 bg-purple-500 hover:bg-purple-600 disabled:opacity-30 flex-shrink-0"
        >
          {isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
        </Button>
      </div>
      <p className="text-[9px] text-white/25 mt-1.5 text-center">
        Enter to send · Shift+Enter for new line · @ to mention · Paste or drop files
      </p>
    </div>
  )
}
