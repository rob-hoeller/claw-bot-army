"use client"

import { useEffect, useRef, type ReactNode } from "react"
import { cn } from "@/lib/utils"
import { MessageSquare, Loader2 } from "lucide-react"
import type { PhaseChatMessage } from "@/hooks/usePhaseChatMessages"

interface Agent {
  id: string
  name: string
  emoji: string | null
}

interface PhaseChatMessagesProps {
  messages: PhaseChatMessage[]
  agents: Agent[]
  loading?: boolean
}

function MentionBadge({ agentId, agents }: { agentId: string; agents: Agent[] }) {
  const agent = agents.find((a) => a.id === agentId)
  return (
    <span className="inline-flex items-center gap-0.5 bg-purple-500/20 text-purple-300 rounded px-1 py-0 text-[10px] font-medium mx-0.5 align-baseline">
      {agent?.emoji && <span className="text-[9px]">{agent.emoji}</span>}
      @{agentId}
    </span>
  )
}

function renderContentWithMentions(content: string, mentions: string[], agents: Agent[]): ReactNode[] {
  if (!mentions || mentions.length === 0) {
    return [content]
  }

  const parts: ReactNode[] = []
  const regex = /@(\w+)/g
  let lastIndex = 0
  let match

  while ((match = regex.exec(content)) !== null) {
    const id = match[1]
    if (mentions.includes(id) || agents.some((a) => a.id === id)) {
      if (match.index > lastIndex) {
        parts.push(content.slice(lastIndex, match.index))
      }
      parts.push(<MentionBadge key={`${match.index}-${id}`} agentId={id} agents={agents} />)
      lastIndex = match.index + match[0].length
    }
  }

  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex))
  }

  return parts.length > 0 ? parts : [content]
}

const senderEmojiMap: Record<string, string> = {
  user: "👤",
  agent: "🤖",
  orchestrator: "🧠",
}

export function PhaseChatMessages({ messages, agents, loading }: PhaseChatMessagesProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-4 w-4 text-purple-400 animate-spin" />
        <span className="text-[10px] text-white/30 ml-2">Loading chat...</span>
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-white/30">
        <MessageSquare className="h-5 w-5 mb-2 opacity-50" />
        <p className="text-[11px]">No messages yet. Start the conversation...</p>
      </div>
    )
  }

  return (
    <div className="max-h-[320px] overflow-y-auto space-y-2 py-3 px-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
      {messages.map((msg) => {
        const isUser = msg.sender_type === "user"
        const agent = agents.find((a) => a.id === msg.sender_id)
        const emoji = agent?.emoji || senderEmojiMap[msg.sender_type] || "🤖"

        return (
          <div
            key={msg.id}
            className={cn("flex gap-2", isUser ? "flex-row-reverse" : "flex-row")}
          >
            <span className="text-sm flex-shrink-0 mt-0.5">{emoji}</span>
            <div
              className={cn(
                "max-w-[80%] rounded-lg px-2.5 py-1.5",
                isUser
                  ? "bg-blue-600/20 border border-blue-500/20"
                  : "bg-white/[0.04] border border-white/10"
              )}
            >
              <div
                className={cn(
                  "flex items-baseline gap-2 mb-0.5",
                  isUser && "flex-row-reverse"
                )}
              >
                <span className="text-[10px] font-medium text-white/70">
                  {msg.sender_name}
                </span>
                <span className="text-[9px] text-white/25">
                  {new Date(msg.created_at).toLocaleString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <p
                className={cn(
                  "text-[11px] text-white/70 whitespace-pre-wrap",
                  isUser && "text-right"
                )}
              >
                {renderContentWithMentions(msg.content, msg.mentions, agents)}
              </p>
            </div>
          </div>
        )
      })}
      <div ref={bottomRef} />
    </div>
  )
}
