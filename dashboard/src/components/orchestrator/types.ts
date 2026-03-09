// Orchestrator Types

export interface SessionInfo {
  key: string
  sessionId: string
  kind: string
  channel: string
  model: string
  modelProvider?: string
  totalTokens: number
  inputTokens?: number
  outputTokens?: number
  updatedAt: number
  ageMs?: number
  agentId?: string
  displayName: string
  label?: string
  isSubAgent: boolean
  isCron?: boolean
  isDashboard: boolean
  isMain?: boolean
  contextTokens?: number
  aborted?: boolean
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
