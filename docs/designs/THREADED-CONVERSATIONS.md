# Technical Design: Threaded Conversations / Topics

**Feature ID:** TBD (Supabase features table)  
**Status:** Design Complete → Ready for Implementation  
**Author:** HBx  
**Date:** 2026-02-15  
**Assigned To:** HBx_IN2 (Code Factory)

---

## 1. Overview

### Problem Statement
Currently, all conversations with an agent exist in a single flat stream. Users working on multiple projects or topics experience:
- Context pollution (unrelated history affects LLM responses)
- Poor organization (hard to find past discussions)
- Inefficient caching (mixed context = fewer cache hits)
- No ability to pause/resume specific workstreams

### Solution
Introduce **Threads** — named, independent conversation streams within each agent relationship. Each thread maintains its own message history and context window.

### Success Metrics
- Users can manage 3+ parallel workstreams without confusion
- Context window only loads relevant thread history
- Thread-specific LLM cache hit rate improves
- Users can locate past conversations within 10 seconds

---

## 2. User Stories

| ID | Story | Priority |
|----|-------|----------|
| US-1 | As a user, I can create a new named thread to start a focused conversation | P0 |
| US-2 | As a user, I can switch between threads without losing context | P0 |
| US-3 | As a user, I can see a list of all my threads with an agent | P0 |
| US-4 | As a user, I can archive threads I'm done with | P1 |
| US-5 | As a user, I can search across all threads | P1 |
| US-6 | As a user, I can view full history of any thread on demand | P1 |
| US-7 | As a user, I can rename a thread | P2 |
| US-8 | As a user, I can delete a thread permanently | P2 |

---

## 3. Database Schema

### 3.1 New Table: `threads`

```sql
-- Migration: 004_threads_schema.sql

CREATE TABLE IF NOT EXISTS threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Ownership
  agent_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Thread metadata
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  color TEXT,  -- Optional: UI accent color
  
  -- Stats (denormalized for performance)
  message_count INTEGER DEFAULT 0,
  last_message_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  archived_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_threads_user_agent ON threads(user_id, agent_id);
CREATE INDEX idx_threads_status ON threads(status);
CREATE INDEX idx_threads_last_message ON threads(last_message_at DESC);

-- Unique: prevent duplicate thread names per user-agent
CREATE UNIQUE INDEX idx_threads_unique_name 
  ON threads(user_id, agent_id, name) 
  WHERE status = 'active';
```

### 3.2 Modify Table: `messages`

```sql
-- Add thread reference to messages
ALTER TABLE messages 
  ADD COLUMN thread_id UUID REFERENCES threads(id) ON DELETE CASCADE;

-- Index for thread-based queries
CREATE INDEX idx_messages_thread ON messages(thread_id, created_at DESC);

-- Backfill: Create default threads for existing conversations
-- (Migration script will handle this)
```

### 3.3 Deprecate: `conversations` table

The existing `conversations` table becomes redundant. Migration path:
1. Create default thread per existing conversation
2. Link messages to new threads
3. Keep `conversations` table temporarily for rollback
4. Remove in future migration after validation

### 3.4 Row Level Security

```sql
-- Threads RLS
ALTER TABLE threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own threads"
  ON threads FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own threads"
  ON threads FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own threads"
  ON threads FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own threads"
  ON threads FOR DELETE
  USING (auth.uid() = user_id);

-- Update messages RLS to include thread ownership check
CREATE POLICY "Users can view messages in own threads"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM threads 
      WHERE threads.id = messages.thread_id 
      AND threads.user_id = auth.uid()
    )
  );
```

### 3.5 Triggers

```sql
-- Auto-update thread stats on message insert
CREATE OR REPLACE FUNCTION update_thread_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE threads SET
    message_count = message_count + 1,
    last_message_at = NEW.created_at,
    updated_at = NOW()
  WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_thread_stats
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_thread_stats();
```

---

## 4. API Design

### 4.1 Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/chat/threads` | List threads for agent |
| POST | `/api/chat/threads` | Create new thread |
| GET | `/api/chat/threads/[id]` | Get thread details |
| PATCH | `/api/chat/threads/[id]` | Update thread (rename, archive) |
| DELETE | `/api/chat/threads/[id]` | Delete thread |
| GET | `/api/chat/threads/[id]/messages` | Get thread messages |
| POST | `/api/chat/threads/[id]/messages` | Send message to thread |

### 4.2 Request/Response Examples

**List Threads**
```typescript
// GET /api/chat/threads?agentId=HBx&status=active

// Response
{
  threads: [
    {
      id: "uuid",
      name: "Dashboard Redesign",
      status: "active",
      messageCount: 47,
      lastMessageAt: "2026-02-15T10:30:00Z",
      createdAt: "2026-02-10T09:00:00Z"
    },
    // ...
  ]
}
```

**Create Thread**
```typescript
// POST /api/chat/threads
{
  agentId: "HBx",
  name: "API Integration",
  description: "Working on third-party API integration"
}

// Response
{
  id: "uuid",
  name: "API Integration",
  status: "active",
  // ...
}
```

**Send Message (Updated)**
```typescript
// POST /api/chat/threads/[threadId]/messages
{
  content: "Let's start with the authentication flow",
  attachments: []
}
```

---

## 5. UI Components

### 5.1 Component Hierarchy

```
ChatPanel (updated)
├── ThreadSidebar (new)
│   ├── ThreadList
│   │   └── ThreadItem (clickable, shows preview)
│   ├── CreateThreadButton
│   └── ThreadSearch
├── ThreadHeader (new)
│   ├── ThreadTitle (editable)
│   ├── ThreadActions (archive, delete)
│   └── ThreadInfo (message count, created date)
├── MessageList (existing, filtered by thread)
└── ChatInput (existing, posts to active thread)
```

### 5.2 New Components

| Component | Path | Description |
|-----------|------|-------------|
| `ThreadSidebar` | `components/chat/ThreadSidebar.tsx` | Left sidebar with thread list |
| `ThreadItem` | `components/chat/ThreadItem.tsx` | Single thread in list |
| `ThreadHeader` | `components/chat/ThreadHeader.tsx` | Active thread info bar |
| `CreateThreadDialog` | `components/chat/CreateThreadDialog.tsx` | Modal for new thread |
| `ThreadSearch` | `components/chat/ThreadSearch.tsx` | Search across threads |

### 5.3 State Management

```typescript
// Thread state (can use Zustand or React Context)
interface ThreadState {
  threads: Thread[]
  activeThreadId: string | null
  isLoading: boolean
  error: string | null
  
  // Actions
  fetchThreads: (agentId: string) => Promise<void>
  createThread: (name: string, agentId: string) => Promise<Thread>
  selectThread: (threadId: string) => void
  archiveThread: (threadId: string) => Promise<void>
  deleteThread: (threadId: string) => Promise<void>
}
```

### 5.4 UI Mockup (ASCII)

```
┌─────────────────────────────────────────────────────────────────┐
│ Agent: HBx 🧠                                          [Close]  │
├──────────────────┬──────────────────────────────────────────────┤
│ THREADS          │ ▼ Dashboard Redesign                        │
│ ─────────────────│   47 messages · Started Feb 10              │
│ + New Thread     ├──────────────────────────────────────────────┤
│                  │                                              │
│ ● Dashboard Re.. │  [User] Let's work on the sidebar...        │
│   47 msgs · 2h   │                                              │
│                  │  [HBx] I'll update the navigation...         │
│ ○ API Integrat.. │                                              │
│   12 msgs · 1d   │  [User] Perfect. Now the header...           │
│                  │                                              │
│ ○ Bug Fixes      │  [HBx] Here's my suggestion for...           │
│   8 msgs · 3d    │                                              │
│                  │                                              │
│ ─────────────────│                                              │
│ ARCHIVED         │                                              │
│ ○ Old Project    │                                              │
│                  ├──────────────────────────────────────────────┤
│ 🔍 Search...     │ [Type a message...]                    [Send]│
└──────────────────┴──────────────────────────────────────────────┘
```

---

## 6. Gateway Integration

### 6.1 Context Window Management

When sending messages to OpenClaw Gateway, only include messages from the active thread:

```typescript
// Current: loads all messages for conversation
const history = await getConversationHistory(conversationId)

// New: loads only thread messages
const history = await getThreadMessages(threadId, { limit: 50 })
```

### 6.2 Session Key Strategy

Option A: **Thread-specific sessions** (recommended)
- Each thread gets its own OpenClaw session
- Better isolation, better caching
- Session key: `{agentId}:{userId}:{threadId}`

Option B: **Shared session, filtered context**
- Single session per agent-user pair
- Filter message history before sending
- Simpler but less cache-efficient

**Decision:** Implement Option A for better LLM caching benefits.

---

## 7. Migration Plan

### Phase 1: Schema (PR #1)
- [ ] Create `004_threads_schema.sql`
- [ ] Add `thread_id` column to messages
- [ ] Create indexes and RLS policies
- [ ] Write backfill script for existing data

### Phase 2: API (PR #2)
- [ ] Implement thread CRUD endpoints
- [ ] Update message endpoints to require thread
- [ ] Add thread validation middleware

### Phase 3: UI - Thread List (PR #3)
- [ ] ThreadSidebar component
- [ ] ThreadItem component
- [ ] Thread creation dialog
- [ ] Wire to API

### Phase 4: UI - Thread Experience (PR #4)
- [ ] ThreadHeader component
- [ ] Update ChatPanel to filter by thread
- [ ] Thread switching behavior
- [ ] Archive/delete actions

### Phase 5: Search & Polish (PR #5)
- [ ] Thread search functionality
- [ ] Keyboard shortcuts
- [ ] Empty states
- [ ] Loading states

---

## 8. Testing Checklist

### Unit Tests
- [ ] Thread CRUD operations
- [ ] RLS policy enforcement
- [ ] Message filtering by thread
- [ ] Stats trigger accuracy

### Integration Tests
- [ ] Create thread → send message → verify in thread
- [ ] Switch threads → verify context isolation
- [ ] Archive thread → verify hidden from active list
- [ ] Delete thread → verify cascade delete of messages

### E2E Tests
- [ ] Full thread lifecycle (create, use, archive)
- [ ] Multi-thread workflow
- [ ] Search across threads

---

## 9. Acceptance Criteria (from ticket)

- [x] Design: Users can create named threads/topics
- [x] Design: Each thread has independent conversation history
- [x] Design: Easy switching between threads
- [x] Design: Thread list/overview visible
- [x] Design: Context window only includes current thread
- [x] Design: Threads can be archived/closed
- [x] Design: Search across threads
- [x] Design: User can recall/review full conversation history for any thread

---

## 10. Open Questions

| Question | Status | Decision |
|----------|--------|----------|
| Should threads auto-name from first message? | Open | TBD by team |
| Thread limit per agent? | Open | Suggest: 50 active |
| Show thread in URL for deep linking? | Open | Suggest: Yes |
| Thread sharing between users? | Deferred | Future feature |

---

## 11. References

- Current schema: `supabase/migrations/001_chat_schema.sql`
- Chat components: `dashboard/src/components/chat/`
- Code Factory rules: `global-knowledge/CODE-FACTORY.md`
- Feature ticket: Supabase `features` table

---

**Document Status:** ✅ Complete — Ready for implementation
