// Chat Types

export interface Attachment {
  type: 'image' | 'video' | 'file'
  url: string
  name: string
  size?: number
  mimeType?: string
}

export interface Message {
  id: string
  conversation_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  attachments: Attachment[]
  metadata?: Record<string, unknown>
  created_at: string
}

export interface Conversation {
  id: string
  agent_id: string
  user_id: string
  title?: string
  created_at: string
  updated_at: string
}

export interface Agent {
  id: string
  name: string
  role: string
  emoji: string
  status: 'active' | 'deploying' | 'standby'
}
