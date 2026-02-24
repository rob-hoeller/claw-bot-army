"use client"

import { usePhaseChatMessages } from "@/hooks/usePhaseChatMessages"
import { PhaseChatMessages } from "./PhaseChatMessages"
import { PhaseChatInput } from "./PhaseChatInput"

interface Agent {
  id: string
  name: string
  emoji: string | null
}

interface PhaseChatPanelProps {
  featureId: string
  phase: "planning" | "review"
  agents: Agent[]
}

export function PhaseChatPanel({ featureId, phase, agents }: PhaseChatPanelProps) {
  const { messages, loading, sendMessage } = usePhaseChatMessages(featureId, phase)

  const handleSend = (content: string, mentions: string[]) => {
    sendMessage(content, mentions)
  }

  return (
    <div className="mt-4 flex flex-col">
      <div className="text-[10px] text-white/40 uppercase tracking-wider mb-2">
        {phase === "planning" ? "Planning" : "Review"} Discussion
      </div>
      <PhaseChatMessages messages={messages} agents={agents} loading={loading} />
      <PhaseChatInput onSend={handleSend} agents={agents} />
    </div>
  )
}
