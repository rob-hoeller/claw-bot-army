"use client"

import { ChatPanel } from "./ChatPanel"

/**
 * Drop-in wrapper that forwards props to the unified ChatPanel.
 * ChatPanel now manages its own chat state internally.
 */
interface DashboardChatPanelProps {
  agentId: string
  agentName: string
  agentEmoji?: string
  userId?: string
  sessionUserId?: string
  isReadOnly?: boolean
  syncFromGateway?: boolean
}

export function DashboardChatPanel({
  agentId,
  agentName,
  agentEmoji,
  userId,
  sessionUserId,
  isReadOnly = false,
  syncFromGateway = false,
}: DashboardChatPanelProps) {
  return (
    <ChatPanel
      agentId={agentId}
      agentName={agentName}
      agentEmoji={agentEmoji}
      userId={userId}
      sessionUserId={sessionUserId}
      isReadOnly={isReadOnly}
      syncFromGateway={syncFromGateway}
    />
  )
}
