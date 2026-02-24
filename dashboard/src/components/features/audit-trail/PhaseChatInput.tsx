"use client"

import { useState, useRef, useCallback, KeyboardEvent } from "react"
import { cn } from "@/lib/utils"
import { Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MentionAutocomplete } from "./MentionAutocomplete"

interface Agent {
  id: string
  name: string
  emoji: string | null
}

interface PhaseChatInputProps {
  onSend: (content: string, mentions: string[]) => void
  disabled?: boolean
  agents: Agent[]
}

export function PhaseChatInput({ onSend, disabled = false, agents }: PhaseChatInputProps) {
  const [message, setMessage] = useState("")
  const [mentions, setMentions] = useState<string[]>([])
  const [showMentions, setShowMentions] = useState(false)
  const [mentionQuery, setMentionQuery] = useState("")
  const [mentionActiveIndex, setMentionActiveIndex] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const filteredAgents = agents
    .filter(
      (a) =>
        a.id.toLowerCase().startsWith(mentionQuery.toLowerCase()) ||
        a.name.toLowerCase().startsWith(mentionQuery.toLowerCase())
    )
    .slice(0, 6)

  const detectMention = useCallback(
    (value: string, cursorPos: number) => {
      // Walk backwards from cursor to find @
      let i = cursorPos - 1
      while (i >= 0 && value[i] !== "@" && value[i] !== " " && value[i] !== "\n") {
        i--
      }
      if (i >= 0 && value[i] === "@" && (i === 0 || value[i - 1] === " " || value[i - 1] === "\n")) {
        const query = value.slice(i + 1, cursorPos)
        setMentionQuery(query)
        setShowMentions(true)
        setMentionActiveIndex(0)
      } else {
        setShowMentions(false)
      }
    },
    []
  )

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

      // Find the @ position
      let i = cursorPos - 1
      while (i >= 0 && value[i] !== "@") i--

      const before = value.slice(0, i)
      const after = value.slice(cursorPos)
      const newMessage = `${before}@${agentId} ${after}`

      setMessage(newMessage)
      setShowMentions(false)
      if (!mentions.includes(agentId)) {
        setMentions((prev) => [...prev, agentId])
      }

      // Restore focus and cursor
      setTimeout(() => {
        textarea.focus()
        const newPos = i + agentId.length + 2
        textarea.setSelectionRange(newPos, newPos)
      }, 0)
    },
    [message, mentions]
  )

  const handleSend = () => {
    if (!message.trim() || disabled) return
    // Extract mentions from final message
    const finalMentions: string[] = []
    const mentionRegex = /@(\w+)/g
    let match
    while ((match = mentionRegex.exec(message)) !== null) {
      const id = match[1]
      if (agents.some((a) => a.id === id) && !finalMentions.includes(id)) {
        finalMentions.push(id)
      }
    }
    onSend(message.trim(), finalMentions)
    setMessage("")
    setMentions([])
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (showMentions && filteredAgents.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setMentionActiveIndex((prev) => (prev + 1) % filteredAgents.length)
        return
      }
      if (e.key === "ArrowUp") {
        e.preventDefault()
        setMentionActiveIndex((prev) => (prev - 1 + filteredAgents.length) % filteredAgents.length)
        return
      }
      if (e.key === "Enter") {
        e.preventDefault()
        handleMentionSelect(filteredAgents[mentionActiveIndex].id)
        return
      }
      if (e.key === "Escape") {
        e.preventDefault()
        setShowMentions(false)
        return
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div>
      <div className="flex items-end gap-2 pt-2">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Type a message... Use @ to mention"
            rows={1}
            disabled={disabled}
            className={cn(
              "w-full resize-none rounded-xl border border-white/10 bg-white/5",
              "px-3 py-2 text-[11px] text-white placeholder:text-white/30",
              "focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20",
              "max-h-[100px] disabled:opacity-50"
            )}
          />
          {showMentions && (
            <MentionAutocomplete
              agents={filteredAgents}
              onSelect={handleMentionSelect}
              activeIndex={mentionActiveIndex}
            />
          )}
        </div>
        <Button
          onClick={handleSend}
          disabled={disabled || !message.trim()}
          className="h-8 w-8 p-0 bg-purple-500 hover:bg-purple-600 disabled:opacity-30 flex-shrink-0"
        >
          <Send className="h-3.5 w-3.5" />
        </Button>
      </div>
      <p className="text-[9px] text-white/25 mt-1.5 text-center">
        Enter to send · Shift+Enter for new line · @ to mention
      </p>
    </div>
  )
}
