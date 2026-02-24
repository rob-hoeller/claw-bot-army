"use client"

import { useState, useEffect } from "react"
import { usePhaseChatMessages } from "@/hooks/usePhaseChatMessages"
import { useCurrentUser } from "@/hooks/useCurrentUser"
import { PhaseChatMessages } from "./PhaseChatMessages"
import { PhaseChatInput } from "./PhaseChatInput"

interface Agent {
  id: string
  name: string
  emoji: string | null
}

const PHASE_LABELS: Record<string, string> = {
  planning: "Planning",
  design_review: "Design Review",
  in_progress: "In Progress",
  qa_review: "QA Review",
  review: "Review",
  approved: "Approved",
  pr_submitted: "PR Submitted",
  done: "Done",
}

interface PhaseChatPanelProps {
  featureId: string
  phase: string
  agents: Agent[]
  readonly?: boolean
}

export function PhaseChatPanel({ featureId, phase, agents, readonly = false }: PhaseChatPanelProps) {
  const { messages, loading, sendMessage } = usePhaseChatMessages(featureId, phase)
  const { userId, userName } = useCurrentUser()
  const [isLive, setIsLive] = useState(false)

  // Determine "live" status: any message within last 60 seconds
  useEffect(() => {
    if (messages.length === 0) {
      setIsLive(false)
      return
    }
    const checkLive = () => {
      const now = Date.now()
      const latest = messages[messages.length - 1]
      if (latest) {
        const diff = now - new Date(latest.created_at).getTime()
        setIsLive(diff < 60_000)
      }
    }
    checkLive()
    const interval = setInterval(checkLive, 10_000)
    return () => clearInterval(interval)
  }, [messages])

  const handleSend = (content: string, mentions: string[], attachments: import("@/components/chat/types").Attachment[]) => {
    sendMessage(content, mentions, attachments, userId ?? "unknown", userName ?? "Unknown")
  }

  const label = PHASE_LABELS[phase] ?? phase

  return (
    <div className="mt-4 flex flex-col">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10px] text-white/40 uppercase tracking-wider">
          {label} {readonly ? "Activity" : "Discussion"}
        </span>
        {isLive && (
          <span className="flex items-center gap-1 text-[9px] text-red-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
            </span>
            Live
          </span>
        )}
      </div>
      <PhaseChatMessages messages={messages} agents={agents} loading={loading} />
      {!readonly && <PhaseChatInput onSend={handleSend} agents={agents} />}
    </div>
  )
}
