// Orchestrator Types

export interface SessionInfo {
  key: string
  sessionId: string
  kind: string
  channel: string
  model: string
  totalTokens: number
  updatedAt: number
  displayName: string
  label?: string
  isSubAgent: boolean
  isDashboard: boolean
  lastMessages: SessionMessage[]
}

export interface SessionMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp?: number
}

export interface SpawnEvent {
  id: string
  timestamp: string
  task: string
  agentId?: string
  label?: string
  sessionKey?: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  result?: string
}
