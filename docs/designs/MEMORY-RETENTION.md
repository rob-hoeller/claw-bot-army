# Technical Design: Enhanced Memory & Conversation Retention

**Feature ID:** fc22c76a-4eb1-468c-ae57-de42fef0bba0  
**Status:** Design Complete → Ready for Review  
**Author:** HBx_IN1 (Product Architect)  
**Date:** 2026-02-16  
**Assigned To:** TBD (Code Factory after approval)

---

## 1. Overview

### Problem Statement

Currently, agent memory in the HBx platform is ephemeral and disorganized:
- **No persistent memory**: Conversations exist but there's no mechanism for agents to extract and retain key facts/context
- **No semantic search**: Users can't search their conversation history beyond basic text matching
- **No cross-session context**: Starting a new session loses all context from previous work
- **No summarization**: Long conversations aren't condensed into actionable memory
- **No visibility**: Users have no insight into what agents "remember" about them
- **No lifecycle management**: Stale information persists indefinitely
- **File-based workaround**: Current `memory/*.md` files are manual, agent-specific, and not queryable

### Solution

Implement a comprehensive **Memory System** with:
1. **Memories table** - Structured, persistent facts extracted from conversations
2. **Embeddings infrastructure** - Vector storage for semantic similarity search  
3. **Memory lifecycle** - Creation → Active → Stale → Archived → Deleted
4. **Automatic summarization** - LLM-powered extraction of key facts from conversations
5. **Memory dashboard** - UI for users to view/manage what agents remember
6. **Cross-session retrieval** - Agents automatically recall relevant context

### Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Context recall accuracy | 85%+ | User ratings on "did agent remember relevant context?" |
| Search latency (semantic) | <500ms p95 | API response time |
| Memory storage efficiency | 90%+ compression | Summary vs full transcript ratio |
| User satisfaction | 4.5/5 | Dashboard usability survey |
| Stale memory reduction | 80% auto-archived | Memories untouched >90 days |

---

## 2. Current State Analysis

### Existing Infrastructure

| Component | Current State | Gap |
|-----------|---------------|-----|
| `conversations` table | Stores user-agent relationship | Being deprecated for threads |
| `messages` table | Full message history | No summarization, no embeddings |
| `threads` table | New in migration 004 | Thread-level organization only |
| `memory/*.md` files | Manual daily logs | Not queryable, not user-scoped |
| `MEMORY.md` | Platform state | Agent registry only, not user memory |
| `useMemoryLogs.ts` hook | References `memory_logs` table | Table doesn't exist in migrations |
| Vector search | None | Required for semantic search |

### Data Flow (Current)
```
User Message → Gateway → LLM → Response → messages table
                                              ↓
                                         (stored, never summarized)
```

### Data Flow (Proposed)
```
User Message → Gateway → LLM → Response → messages table
                                              ↓
                          [Memory Extraction Service]
                                              ↓
                    ┌─────────────────────────┼─────────────────────────┐
                    ↓                         ↓                         ↓
              memories table           memory_embeddings          conversation_summaries
                    ↓                         ↓                         ↓
              [Lifecycle Manager]      [Vector Search]           [Context Builder]
                    ↓                         ↓                         ↓
              archive/delete        semantic retrieval         session pre-prompt
```

---

## 3. User Stories

| ID | Story | Priority |
|----|-------|----------|
| US-1 | As a user, I can ask an agent about something discussed weeks ago and get a relevant answer | P0 |
| US-2 | As a user, I can search my conversation history with semantic understanding | P0 |
| US-3 | As a user, I can see what an agent "remembers" about me in a dashboard | P0 |
| US-4 | As a user, I can delete specific memories | P0 |
| US-5 | As a user, I can trust that my memories are isolated from other users | P0 |
| US-6 | As a user, old/stale memories are auto-archived so agents focus on recent context | P1 |
| US-7 | As a user, I can restore archived memories | P1 |
| US-8 | As a user, I can export my memory data (GDPR compliance) | P1 |
| US-9 | As a user, I can configure memory retention preferences | P2 |
| US-10 | As an admin, I can see memory usage across all users | P2 |

---

## 4. Database Schema

### 4.1 New Table: `memories`

Core facts/context extracted from conversations.

```sql
-- Migration: 005_memory_schema.sql

CREATE TABLE IF NOT EXISTS memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Ownership (strict isolation)
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id TEXT NOT NULL,  -- Can be NULL for cross-agent memories
  
  -- Memory content
  content TEXT NOT NULL,                    -- The actual memory/fact
  memory_type TEXT NOT NULL CHECK (memory_type IN (
    'fact',           -- Stated fact about user ("user prefers morning meetings")
    'preference',     -- User preference ("likes concise answers")
    'context',        -- Project/work context ("working on dashboard redesign")
    'instruction',    -- Explicit instruction ("always format code in TypeScript")
    'relationship',   -- Relationship info ("user is CEO of Schell Brothers")
    'summary'         -- Thread/conversation summary
  )),
  
  -- Source tracking
  source_thread_id UUID REFERENCES threads(id) ON DELETE SET NULL,
  source_message_ids UUID[],                -- Messages that generated this memory
  
  -- Lifecycle management
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'stale', 'archived', 'deleted')),
  importance SMALLINT DEFAULT 5 CHECK (importance BETWEEN 1 AND 10),  -- 1=low, 10=critical
  access_count INTEGER DEFAULT 0,           -- How often recalled
  last_accessed_at TIMESTAMPTZ,             -- For staleness calculation
  
  -- Auto-management
  auto_archive_at TIMESTAMPTZ,              -- When to auto-archive (configurable)
  auto_delete_at TIMESTAMPTZ,               -- When to permanently delete
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  archived_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,                   -- Soft delete timestamp
  
  -- Search optimization
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('english', content)
  ) STORED
);

-- Indexes
CREATE INDEX idx_memories_user ON memories(user_id);
CREATE INDEX idx_memories_user_agent ON memories(user_id, agent_id);
CREATE INDEX idx_memories_status ON memories(status);
CREATE INDEX idx_memories_type ON memories(memory_type);
CREATE INDEX idx_memories_search ON memories USING gin(search_vector);
CREATE INDEX idx_memories_accessed ON memories(last_accessed_at DESC);
CREATE INDEX idx_memories_importance ON memories(importance DESC);
```

### 4.2 New Table: `memory_embeddings`

Vector embeddings for semantic search.

```sql
-- Requires pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS memory_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_id UUID NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
  
  -- Embedding vector (1536 dimensions for OpenAI ada-002, 3072 for text-embedding-3-large)
  embedding vector(1536) NOT NULL,
  
  -- Model metadata
  model TEXT DEFAULT 'text-embedding-3-small',
  model_version TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vector similarity search index (IVFFlat for speed, or HNSW for accuracy)
CREATE INDEX idx_embeddings_vector ON memory_embeddings 
  USING ivfflat (embedding vector_cosine_ops) 
  WITH (lists = 100);

-- Unique: one embedding per memory
CREATE UNIQUE INDEX idx_embeddings_memory ON memory_embeddings(memory_id);
```

### 4.3 New Table: `conversation_summaries`

Periodic summarizations of threads for context compression.

```sql
CREATE TABLE IF NOT EXISTS conversation_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Ownership
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  thread_id UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  
  -- Summary content
  summary TEXT NOT NULL,
  key_decisions TEXT[],           -- Extracted decisions made
  action_items TEXT[],            -- Extracted to-dos
  topics TEXT[],                  -- Main topics discussed
  
  -- Coverage
  message_range_start UUID,       -- First message covered
  message_range_end UUID,         -- Last message covered
  message_count INTEGER,          -- Messages summarized
  
  -- Versioning
  version INTEGER DEFAULT 1,      -- Increments on re-summarization
  previous_summary_id UUID REFERENCES conversation_summaries(id),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_summaries_thread ON conversation_summaries(thread_id);
CREATE INDEX idx_summaries_user ON conversation_summaries(user_id);
CREATE INDEX idx_summaries_created ON conversation_summaries(created_at DESC);
```

### 4.4 New Table: `memory_logs` (Fixing existing hook)

Audit trail for memory operations.

```sql
CREATE TABLE IF NOT EXISTS memory_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Context
  agent_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Log details
  log_date DATE DEFAULT CURRENT_DATE,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  action TEXT NOT NULL CHECK (action IN (
    'created', 'accessed', 'updated', 'archived', 'restored', 'deleted'
  )),
  memory_id UUID REFERENCES memories(id) ON DELETE SET NULL,
  content TEXT,                   -- Description of what happened
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_memory_logs_agent ON memory_logs(agent_id);
CREATE INDEX idx_memory_logs_user ON memory_logs(user_id);
CREATE INDEX idx_memory_logs_date ON memory_logs(log_date DESC);
CREATE INDEX idx_memory_logs_action ON memory_logs(action);
```

### 4.5 New Table: `memory_settings`

Per-user memory preferences.

```sql
CREATE TABLE IF NOT EXISTS memory_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Retention settings
  auto_archive_days INTEGER DEFAULT 90,       -- Archive after X days of no access
  auto_delete_days INTEGER DEFAULT 365,       -- Delete archived after X additional days
  max_memories_per_agent INTEGER DEFAULT 500, -- Soft limit per agent
  
  -- Privacy settings
  memory_enabled BOOLEAN DEFAULT true,        -- Master toggle
  allow_cross_agent_memory BOOLEAN DEFAULT false, -- Share context between agents
  
  -- Summarization settings
  auto_summarize_threads BOOLEAN DEFAULT true,
  summarize_after_messages INTEGER DEFAULT 20, -- Trigger threshold
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_user_settings UNIQUE (user_id)
);
```

### 4.6 Row Level Security

```sql
-- memories RLS
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own memories"
  ON memories FOR SELECT
  USING (auth.uid() = user_id AND status != 'deleted');

CREATE POLICY "Users can create own memories"
  ON memories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own memories"
  ON memories FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can soft-delete own memories"
  ON memories FOR DELETE
  USING (auth.uid() = user_id);

-- memory_embeddings RLS (inherited from memories)
ALTER TABLE memory_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access embeddings for own memories"
  ON memory_embeddings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM memories m
      WHERE m.id = memory_embeddings.memory_id
      AND m.user_id = auth.uid()
    )
  );

-- conversation_summaries RLS
ALTER TABLE conversation_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own summaries"
  ON conversation_summaries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service can create summaries"
  ON conversation_summaries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- memory_logs RLS
ALTER TABLE memory_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own memory logs"
  ON memory_logs FOR SELECT
  USING (auth.uid() = user_id);

-- memory_settings RLS
ALTER TABLE memory_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own settings"
  ON memory_settings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

### 4.7 Database Functions

```sql
-- Function: Semantic memory search
CREATE OR REPLACE FUNCTION search_memories_semantic(
  p_user_id UUID,
  p_query_embedding vector(1536),
  p_agent_id TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 10,
  p_similarity_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
  memory_id UUID,
  content TEXT,
  memory_type TEXT,
  importance SMALLINT,
  similarity FLOAT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.content,
    m.memory_type,
    m.importance,
    1 - (me.embedding <=> p_query_embedding) as similarity,
    m.created_at
  FROM memories m
  JOIN memory_embeddings me ON me.memory_id = m.id
  WHERE m.user_id = p_user_id
    AND m.status = 'active'
    AND (p_agent_id IS NULL OR m.agent_id = p_agent_id)
    AND 1 - (me.embedding <=> p_query_embedding) >= p_similarity_threshold
  ORDER BY me.embedding <=> p_query_embedding
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Full-text memory search
CREATE OR REPLACE FUNCTION search_memories_text(
  p_user_id UUID,
  p_query TEXT,
  p_agent_id TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  memory_id UUID,
  content TEXT,
  memory_type TEXT,
  importance SMALLINT,
  rank FLOAT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.content,
    m.memory_type,
    m.importance,
    ts_rank(m.search_vector, plainto_tsquery('english', p_query)) as rank,
    m.created_at
  FROM memories m
  WHERE m.user_id = p_user_id
    AND m.status = 'active'
    AND (p_agent_id IS NULL OR m.agent_id = p_agent_id)
    AND m.search_vector @@ plainto_tsquery('english', p_query)
  ORDER BY rank DESC, m.importance DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Mark memories as accessed (for staleness tracking)
CREATE OR REPLACE FUNCTION touch_memories(p_memory_ids UUID[])
RETURNS void AS $$
BEGIN
  UPDATE memories
  SET 
    access_count = access_count + 1,
    last_accessed_at = NOW()
  WHERE id = ANY(p_memory_ids);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Archive stale memories
CREATE OR REPLACE FUNCTION archive_stale_memories()
RETURNS INTEGER AS $$
DECLARE
  archived_count INTEGER;
BEGIN
  UPDATE memories m
  SET 
    status = 'stale',
    updated_at = NOW()
  FROM memory_settings ms
  WHERE m.user_id = ms.user_id
    AND m.status = 'active'
    AND m.last_accessed_at < NOW() - (ms.auto_archive_days || ' days')::INTERVAL;
  
  GET DIAGNOSTICS archived_count = ROW_COUNT;
  
  -- Move stale to archived after half the delete period
  UPDATE memories m
  SET 
    status = 'archived',
    archived_at = NOW(),
    updated_at = NOW()
  FROM memory_settings ms
  WHERE m.user_id = ms.user_id
    AND m.status = 'stale'
    AND m.updated_at < NOW() - ((ms.auto_delete_days / 2) || ' days')::INTERVAL;
  
  RETURN archived_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 5. API Design

### 5.1 Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/memory` | List user's memories (paginated, filterable) |
| POST | `/api/memory` | Create new memory |
| GET | `/api/memory/[id]` | Get specific memory |
| PATCH | `/api/memory/[id]` | Update memory (content, importance) |
| DELETE | `/api/memory/[id]` | Soft-delete memory |
| POST | `/api/memory/search` | Semantic + text search |
| GET | `/api/memory/stats` | Memory usage statistics |
| POST | `/api/memory/archive/[id]` | Archive specific memory |
| POST | `/api/memory/restore/[id]` | Restore archived memory |
| GET | `/api/memory/export` | Export all memories (GDPR) |
| GET | `/api/memory/settings` | Get memory preferences |
| PATCH | `/api/memory/settings` | Update memory preferences |
| GET | `/api/threads/[id]/summary` | Get thread summary |
| POST | `/api/threads/[id]/summarize` | Trigger summarization |

### 5.2 Request/Response Examples

**Search Memories**
```typescript
// POST /api/memory/search
{
  query: "dashboard redesign preferences",
  agentId: "HBx",              // Optional: filter by agent
  type: "hybrid",              // "semantic" | "text" | "hybrid"
  limit: 10,
  includeArchived: false
}

// Response
{
  results: [
    {
      id: "uuid",
      content: "User prefers dark mode for dashboard, mentioned on Feb 10",
      type: "preference",
      importance: 7,
      similarity: 0.89,         // For semantic results
      agentId: "HBx",
      createdAt: "2026-02-10T14:30:00Z",
      lastAccessedAt: "2026-02-15T09:00:00Z"
    }
  ],
  totalCount: 42,
  searchType: "hybrid"
}
```

**List Memories**
```typescript
// GET /api/memory?agentId=HBx&status=active&page=1&limit=20

// Response
{
  memories: [
    {
      id: "uuid",
      content: "Working on threaded conversations feature",
      type: "context",
      importance: 8,
      status: "active",
      agentId: "HBx",
      accessCount: 12,
      sourceThread: { id: "uuid", name: "Dashboard Redesign" },
      createdAt: "2026-02-15T10:00:00Z",
      lastAccessedAt: "2026-02-15T18:00:00Z"
    }
  ],
  pagination: {
    page: 1,
    limit: 20,
    total: 156,
    hasMore: true
  }
}
```

**Memory Statistics**
```typescript
// GET /api/memory/stats

// Response
{
  totalMemories: 156,
  byStatus: {
    active: 120,
    stale: 25,
    archived: 11
  },
  byType: {
    fact: 45,
    preference: 30,
    context: 50,
    instruction: 15,
    summary: 16
  },
  byAgent: [
    { agentId: "HBx", count: 89 },
    { agentId: "HBx_SL1", count: 42 },
    { agentId: "HBx_IN1", count: 25 }
  ],
  storageUsedBytes: 524288,
  oldestMemory: "2026-01-15T08:00:00Z",
  mostAccessed: {
    id: "uuid",
    content: "User is CEO of Schell Brothers",
    accessCount: 47
  }
}
```

---

## 6. Memory Extraction Service

### 6.1 Architecture

The Memory Extraction Service runs asynchronously after conversations, analyzing messages and extracting persistent memories.

```
┌─────────────────────────────────────────────────────────────────┐
│                    Memory Extraction Pipeline                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [Messages]  →  [Trigger Check]  →  [LLM Extraction]            │
│       ↓              ↓                     ↓                     │
│  New message    Thread has 5+      "Extract memories from        │
│  inserted       messages since     these messages: [...]"        │
│                 last extraction                                  │
│                        ↓                                         │
│               [Deduplication]  →  [Embedding Generation]         │
│                        ↓                    ↓                    │
│               Check existing      OpenAI text-embedding-3-small │
│               memories for                                       │
│               similarity                                         │
│                        ↓                                         │
│               [Storage]  →  memories + memory_embeddings tables  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 Extraction Prompt

```typescript
const EXTRACTION_PROMPT = `
You are a memory extraction system. Analyze the following conversation and extract important facts, preferences, context, and instructions that should be remembered for future conversations.

Rules:
1. Extract ONLY information that would be useful in future conversations
2. Be concise - each memory should be a single fact or preference
3. Categorize each memory as: fact, preference, context, instruction, or relationship
4. Assign importance (1-10): 10 = critical (user identity, key decisions), 1 = minor detail
5. Skip small talk, greetings, and routine exchanges
6. Preserve specific names, numbers, dates when mentioned
7. If user explicitly asks to remember something, importance = 10

Output JSON array:
[
  {
    "content": "string - the memory to store",
    "type": "fact|preference|context|instruction|relationship",
    "importance": 1-10
  }
]

Conversation:
{messages}
`;
```

### 6.3 Summarization Service

Triggered when a thread reaches the summarization threshold (default: 20 messages).

```typescript
const SUMMARIZATION_PROMPT = `
Summarize this conversation thread, extracting:
1. Main topics discussed (array of 3-5 keywords)
2. Key decisions made (if any)
3. Action items / next steps (if any)
4. A concise summary (2-3 paragraphs max)

The summary should allow someone to understand what happened without reading the full thread.

Thread: {threadName}
Messages:
{messages}

Output JSON:
{
  "summary": "string",
  "topics": ["topic1", "topic2"],
  "decisions": ["decision1"],
  "actionItems": ["item1"]
}
`;
```

---

## 7. Context Retrieval (Agent Integration)

### 7.1 Pre-Prompt Context Building

When a user starts a new session or sends a message, the system automatically retrieves relevant memories:

```typescript
async function buildContextForSession(
  userId: string,
  agentId: string,
  currentMessage: string
): Promise<string> {
  // 1. Get recent memories (last accessed in past 7 days)
  const recentMemories = await getRecentMemories(userId, agentId, 10);
  
  // 2. Semantic search for relevant memories based on current message
  const queryEmbedding = await generateEmbedding(currentMessage);
  const relevantMemories = await searchSemanticMemories(
    userId, 
    queryEmbedding, 
    agentId,
    5
  );
  
  // 3. Get high-importance memories (importance >= 8)
  const criticalMemories = await getCriticalMemories(userId, agentId);
  
  // 4. Merge and deduplicate
  const allMemories = deduplicateMemories([
    ...recentMemories,
    ...relevantMemories,
    ...criticalMemories
  ]);
  
  // 5. Format as context block
  return formatMemoriesAsContext(allMemories);
}

function formatMemoriesAsContext(memories: Memory[]): string {
  if (memories.length === 0) return '';
  
  return `
## Remembered Context

The following information has been retained from previous conversations:

${memories.map(m => `- [${m.type}] ${m.content}`).join('\n')}

Use this context to provide personalized, contextually-aware responses.
`;
}
```

### 7.2 Memory-Aware System Prompt

```typescript
const MEMORY_AWARE_SYSTEM_PROMPT = `
You are {agentName}, {agentRole}.

{baseSystemPrompt}

## Memory Instructions

You have access to remembered context about this user from previous conversations.
- Reference relevant memories naturally in your responses
- When you learn new important facts, acknowledge them
- If the user corrects a memory, note that it should be updated
- Never fabricate memories or claim to remember things not in your context
- Protect user privacy - don't reveal memory contents unprompted

{retrievedMemoryContext}
`;
```

---

## 8. Dashboard UI

### 8.1 Component Hierarchy

```
MemoryDashboard
├── MemoryStats (cards showing totals, breakdown)
├── MemorySearch
│   ├── SearchInput (with semantic/text toggle)
│   └── SearchResults
├── MemoryList
│   ├── MemoryFilters (agent, type, status, date range)
│   ├── MemoryItem (expandable, with actions)
│   │   ├── MemoryContent
│   │   ├── MemoryMeta (source, dates, access count)
│   │   └── MemoryActions (edit, archive, delete)
│   └── MemoryPagination
├── MemorySettings
│   ├── RetentionSettings
│   ├── PrivacySettings
│   └── ExportData
└── MemoryTimeline (visual timeline of memories)
```

### 8.2 UI Mockup (ASCII)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Memory Dashboard                                                    [⚙️ Settings]│
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │    156      │  │     120     │  │      25     │  │    524 KB   │        │
│  │  Total      │  │   Active    │  │    Stale    │  │   Storage   │        │
│  │  Memories   │  │             │  │             │  │             │        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  🔍 Search memories...                          [Semantic ▾] [All Agents ▾] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Filters: [Active ✓] [Stale] [Archived]    Type: [All ▾]    Sort: [Recent ▾]│
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ 🧠 HBx  •  fact  •  ⭐⭐⭐⭐⭐⭐⭐⭐ (8/10)           Feb 15, 2026 │  │
│  │                                                                       │  │
│  │ User is CEO of Schell Brothers, a home builder in Delaware/Maryland   │  │
│  │                                                                       │  │
│  │ Accessed 47 times  •  Source: "Company Overview" thread               │  │
│  │                                                    [Archive] [Delete] │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ 🧠 HBx  •  preference  •  ⭐⭐⭐⭐⭐⭐⭐ (7/10)        Feb 14, 2026 │  │
│  │                                                                       │  │
│  │ User prefers concise responses with bullet points                     │  │
│  │                                                                       │  │
│  │ Accessed 23 times  •  Source: "Dashboard Design" thread               │  │
│  │                                                    [Archive] [Delete] │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ 🏠 Schellie  •  context  •  ⭐⭐⭐⭐⭐⭐ (6/10)        Feb 12, 2026 │  │
│  │                                                                       │  │
│  │ Currently focusing on Coastal Club community sales                    │  │
│  │                                                                       │  │
│  │ Accessed 8 times  •  Source: "Sales Strategy" thread                  │  │
│  │                                                    [Archive] [Delete] │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ◀ Previous    Page 1 of 8    Next ▶                                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 8.3 Settings Panel

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Memory Settings                                                    [Close X]│
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  📦 Retention                                                               │
│  ─────────────────────────────────────────────────────────────────────────  │
│  Auto-archive after:        [90 ▾] days of no access                       │
│  Auto-delete archived:      [365 ▾] days after archival                    │
│  Max memories per agent:    [500 ▾]                                        │
│                                                                             │
│  🔒 Privacy                                                                 │
│  ─────────────────────────────────────────────────────────────────────────  │
│  [✓] Enable memory system                                                  │
│  [ ] Share memories across agents                                          │
│                                                                             │
│  📝 Summarization                                                          │
│  ─────────────────────────────────────────────────────────────────────────  │
│  [✓] Auto-summarize long threads                                           │
│  Summarize after:           [20 ▾] messages                                │
│                                                                             │
│  📤 Data Export                                                            │
│  ─────────────────────────────────────────────────────────────────────────  │
│  [Export All Memories (JSON)]    [Export All Conversations (JSON)]         │
│                                                                             │
│  ⚠️ Danger Zone                                                            │
│  ─────────────────────────────────────────────────────────────────────────  │
│  [Delete All Memories]  This cannot be undone                              │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                              [Cancel]  [Save Settings]      │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 9. Implementation Plan

### Phase 1: Schema & Foundation (PR #1) - Week 1

**Scope:**
- [ ] Create migration `005_memory_schema.sql`
- [ ] Enable pgvector extension in Supabase
- [ ] Create tables: memories, memory_embeddings, conversation_summaries, memory_logs, memory_settings
- [ ] Set up RLS policies
- [ ] Create database functions

**Acceptance:**
- All tables created with proper indexes
- RLS prevents cross-user access
- Vector search function works

### Phase 2: Memory API (PR #2) - Week 1-2

**Scope:**
- [ ] Implement `/api/memory/*` endpoints
- [ ] Memory CRUD operations
- [ ] Text search implementation
- [ ] Semantic search implementation
- [ ] Statistics endpoint

**Acceptance:**
- Can create/read/update/delete memories via API
- Search returns relevant results
- All endpoints respect user isolation

### Phase 3: Extraction Service (PR #3) - Week 2-3

**Scope:**
- [ ] Build memory extraction pipeline
- [ ] Implement extraction prompt and LLM integration
- [ ] Add deduplication logic
- [ ] Create embedding generation service
- [ ] Set up async processing (queue or cron)

**Acceptance:**
- Conversations automatically generate memories
- No duplicate memories created
- Embeddings generated for all new memories

### Phase 4: Context Retrieval (PR #4) - Week 3

**Scope:**
- [ ] Implement context builder for sessions
- [ ] Integrate with Gateway/chat flow
- [ ] Add memory-aware system prompts
- [ ] Track memory access for staleness

**Acceptance:**
- Agents recall relevant context automatically
- Memory access logged for lifecycle management
- No memory leakage between users

### Phase 5: Dashboard UI (PR #5) - Week 4

**Scope:**
- [ ] MemoryDashboard component
- [ ] MemoryList with filters
- [ ] MemorySearch component
- [ ] Memory actions (archive, delete, restore)
- [ ] MemoryStats cards

**Acceptance:**
- Users can view all their memories
- Search works with both text and semantic
- Can manage (archive/delete) memories

### Phase 6: Settings & Lifecycle (PR #6) - Week 4-5

**Scope:**
- [ ] MemorySettings UI
- [ ] Lifecycle cron job for archival
- [ ] Export functionality
- [ ] Summarization trigger

**Acceptance:**
- Settings persist and apply
- Stale memories auto-archive
- Export produces valid JSON

### Phase 7: Polish & Testing (PR #7) - Week 5

**Scope:**
- [ ] End-to-end testing
- [ ] Performance optimization
- [ ] Error handling
- [ ] Loading/empty states
- [ ] Documentation

**Acceptance:**
- All acceptance criteria from ticket met
- Performance within targets
- No console errors

---

## 10. Testing Checklist

### Unit Tests
- [ ] Memory CRUD operations
- [ ] RLS policy enforcement
- [ ] Search functions (text + semantic)
- [ ] Extraction prompt parsing
- [ ] Deduplication logic
- [ ] Staleness calculation

### Integration Tests
- [ ] Create memory → search → find
- [ ] Archive flow → restore flow
- [ ] Extraction pipeline end-to-end
- [ ] Context retrieval in chat
- [ ] Settings apply correctly

### E2E Tests
- [ ] Full memory lifecycle (create → access → stale → archive → delete)
- [ ] Search across agents
- [ ] Export data download
- [ ] Multi-user isolation

### Performance Tests
- [ ] Semantic search latency (<500ms for 10k memories)
- [ ] Extraction pipeline throughput
- [ ] Dashboard load time (<2s)

---

## 11. Security & Privacy Considerations

### Data Isolation
- RLS enforced on all tables
- No cross-user queries possible
- Service role used only for background jobs

### Data Retention
- Configurable per-user retention policies
- Hard delete available (not just soft delete)
- GDPR export/delete compliance

### Embedding Security
- Embeddings stored in same RLS-protected tables
- No embedding data exposed in API responses
- Model version tracked for future migrations

### Audit Trail
- All memory operations logged
- Logs retained separately from memories
- Admin can review but not access memory content

---

## 12. Open Questions

| Question | Status | Decision |
|----------|--------|----------|
| Which embedding model? | Decided | text-embedding-3-small (cost/quality balance) |
| Embedding dimension? | Decided | 1536 (OpenAI default) |
| Max memories per user? | Open | Suggest: 500/agent, 2000 total |
| Memory sharing between agents? | Open | Default: off, opt-in per user |
| Extraction trigger frequency? | Open | Suggest: every 5 messages or 1 hour |
| pgvector vs. dedicated vector DB? | Decided | pgvector (simplicity, Supabase native) |

---

## 13. Dependencies

| Dependency | Purpose | Status |
|------------|---------|--------|
| pgvector extension | Vector storage and search | Available in Supabase |
| OpenAI API | Embeddings + extraction LLM | Available |
| Threads feature (#004) | Source thread references | In progress |
| Supabase pg_cron | Lifecycle automation | Available |

---

## 14. References

- Current schema: `supabase/migrations/001-004*.sql`
- Threaded Conversations design: `docs/designs/THREADED-CONVERSATIONS.md`
- Code Factory rules: `global-knowledge/CODE-FACTORY.md`
- OpenAI Embeddings: https://platform.openai.com/docs/guides/embeddings
- pgvector docs: https://github.com/pgvector/pgvector

---

**Document Status:** ✅ Design Complete — Ready for Review
