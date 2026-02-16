"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { cn } from "@/lib/utils"
import { Send, Bot, User, Shield, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

export interface WorkItemMessage {
  id: string
  work_item_id: string
  sender_type: 'user' | 'agent' | 'orchestrator'
  sender_id: string
  sender_name: string
  content: string
  metadata: Record<string, unknown>
  created_at: string
}

interface WorkItemChatProps {
  workItemId: string
  currentUserName?: string
  currentUserId?: string
}

const senderStyles = {
  user: {
    bg: 'bg-purple-500/15',
    border: 'border-purple-500/20',
    name: 'text-purple-300',
    icon: User,
    iconBg: 'bg-purple-500/20 text-purple-300',
  },
  agent: {
    bg: 'bg-blue-500/15',
    border: 'border-blue-500/20',
    name: 'text-blue-300',
    icon: Bot,
    iconBg: 'bg-blue-500/20 text-blue-300',
  },
  orchestrator: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    name: 'text-amber-300',
    icon: Shield,
    iconBg: 'bg-amber-500/20 text-amber-300',
  },
}

function ChatMessage({ message }: { message: WorkItemMessage }) {
  const style = senderStyles[message.sender_type]
  const Icon = style.icon

  return (
    <div className={cn("flex gap-2 p-2 rounded-md", style.bg, "border", style.border)}>
      <div className={cn("flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs", style.iconBg)}>
        <Icon className="h-3 w-3" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className={cn("text-[11px] font-medium", style.name)}>
            {message.sender_name}
          </span>
          {message.sender_type === 'orchestrator' && (
            <Badge className="text-[8px] px-1 py-0 h-3.5 bg-amber-500/20 text-amber-400 border-amber-500/30">
              orchestrator
            </Badge>
          )}
          {message.sender_type === 'agent' && (
            <Badge className="text-[8px] px-1 py-0 h-3.5 bg-blue-500/20 text-blue-400 border-blue-500/30">
              agent
            </Badge>
          )}
          <span className="text-[9px] text-white/25">
            {new Date(message.created_at).toLocaleString([], { 
              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
            })}
          </span>
        </div>
        <p className="text-[11px] text-white/70 mt-0.5 whitespace-pre-wrap break-words leading-relaxed">
          {message.content}
        </p>
      </div>
    </div>
  )
}

export function WorkItemChat({ workItemId, currentUserName = 'Lance', currentUserId = 'lance' }: WorkItemChatProps) {
  const [messages, setMessages] = useState<WorkItemMessage[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/work-items/${workItemId}/messages`)
      if (res.ok) {
        const data = await res.json()
        setMessages(data)
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err)
    } finally {
      setLoading(false)
    }
  }, [workItemId])

  // Initial load + polling every 5s
  useEffect(() => {
    fetchMessages()
    pollRef.current = setInterval(fetchMessages, 5000)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [fetchMessages])

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = async () => {
    if (!newMessage.trim() || sending) return
    setSending(true)

    try {
      const res = await fetch(`/api/work-items/${workItemId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_type: 'user',
          sender_id: currentUserId,
          sender_name: currentUserName,
          content: newMessage.trim(),
        }),
      })

      if (res.ok) {
        const msg = await res.json()
        setMessages(prev => [...prev, msg])
        setNewMessage("")
      }
    } catch (err) {
      console.error('Failed to send message:', err)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/5">
        <span className="text-[10px] text-white/40 uppercase tracking-wider">Chat</span>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-5 w-5" 
          onClick={fetchMessages}
          title="Refresh"
        >
          <RefreshCw className="h-3 w-3 text-white/30" />
        </Button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-3 w-3 border border-white/20 border-t-purple-400 rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Bot className="h-6 w-6 text-white/15 mb-2" />
            <p className="text-[11px] text-white/30">No messages yet</p>
            <p className="text-[10px] text-white/20 mt-0.5">Start a conversation about this work item</p>
          </div>
        ) : (
          messages.map((msg) => <ChatMessage key={msg.id} message={msg} />)
        )}
      </div>

      {/* Input */}
      <div className="flex-shrink-0 p-2 border-t border-white/5">
        <div className="flex gap-1.5">
          <Input
            placeholder="Message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            disabled={sending}
            className="flex-1 h-7 text-xs bg-white/5 border-white/10"
          />
          <Button 
            size="sm" 
            onClick={handleSend} 
            disabled={!newMessage.trim() || sending}
            className="h-7 w-7 p-0 bg-purple-500 hover:bg-purple-600 disabled:opacity-30"
          >
            <Send className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  )
}
