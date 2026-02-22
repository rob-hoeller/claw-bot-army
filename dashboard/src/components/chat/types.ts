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
  thread_id?: string  // New: optional thread reference
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

// Thread: Named, independent conversation stream within an agent relationship
export interface Thread {
  id: string
  agent_id: string
  user_id: string
  name: string
  description?: string
  status: 'active' | 'archived'
  color?: string  // Optional: UI accent color
  message_count: number
  last_message_at: string | null
  created_at: string
  updated_at: string
  archived_at?: string
}

// Thread list item (optimized for sidebar display)
export interface ThreadListItem {
  id: string
  name: string
  status: 'active' | 'archived'
  color?: string
  message_count: number
  last_message_at: string | null
  created_at: string
}

// Create thread request
export interface CreateThreadRequest {
  agent_id: string
  name: string
  description?: string
  color?: string
}

// Update thread request
export interface UpdateThreadRequest {
  name?: string
  description?: string
  status?: 'active' | 'archived'
  color?: string
}

export interface Agent {
  id: string
  name: string
  role: string
  emoji: string
  status: 'active' | 'deploying' | 'standby'
}

// Bridge message shape (work_item_messages table)
export interface BridgeMessage {
  id: string
  work_item_id: string
  sender_type: 'user' | 'agent' | 'system'
  sender_id: string
  sender_name: string
  content: string
  metadata: Record<string, unknown>
  created_at: string
}

export function bridgeToMessage(bm: BridgeMessage): Message {
  return {
    id: bm.id,
    conversation_id: bm.work_item_id,
    role: bm.sender_type === 'user' ? 'user' : bm.sender_type === 'agent' ? 'assistant' : 'system',
    content: bm.content,
    attachments: [],
    metadata: bm.metadata,
    created_at: bm.created_at,
  }
}
