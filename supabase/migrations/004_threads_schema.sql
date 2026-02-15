-- HBx Threads Schema Migration
-- Feature: Threaded Conversations / Topics
-- Ticket: 4ca601e2-8adc-44a8-8f36-b2badc0b0e0a

-- ============================================
-- 1. Threads Table
-- ============================================
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

-- ============================================
-- 2. Threads Indexes
-- ============================================

-- Primary lookup: user's threads for an agent
CREATE INDEX IF NOT EXISTS idx_threads_user_agent ON threads(user_id, agent_id);

-- Filter by status (active vs archived)
CREATE INDEX IF NOT EXISTS idx_threads_status ON threads(status);

-- Sort by recent activity
CREATE INDEX IF NOT EXISTS idx_threads_last_message ON threads(last_message_at DESC);

-- Unique: prevent duplicate thread names per user-agent (active only)
CREATE UNIQUE INDEX IF NOT EXISTS idx_threads_unique_name 
  ON threads(user_id, agent_id, name) 
  WHERE status = 'active';

-- ============================================
-- 3. Add thread_id to Messages Table
-- ============================================

-- Add thread reference column
ALTER TABLE messages 
  ADD COLUMN IF NOT EXISTS thread_id UUID REFERENCES threads(id) ON DELETE CASCADE;

-- Index for thread-based message queries
CREATE INDEX IF NOT EXISTS idx_messages_thread ON messages(thread_id, created_at DESC);

-- ============================================
-- 4. Row Level Security
-- ============================================

ALTER TABLE threads ENABLE ROW LEVEL SECURITY;

-- Users can view their own threads
CREATE POLICY "Users can view own threads"
  ON threads FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own threads
CREATE POLICY "Users can create own threads"
  ON threads FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own threads
CREATE POLICY "Users can update own threads"
  ON threads FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own threads
CREATE POLICY "Users can delete own threads"
  ON threads FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 5. Updated Messages RLS Policy
-- ============================================

-- Drop existing message policies that will be replaced
DROP POLICY IF EXISTS "Users can view messages in own conversations" ON messages;
DROP POLICY IF EXISTS "Users can create messages in own conversations" ON messages;

-- New policy: Users can view messages in their own threads OR conversations (backward compat)
CREATE POLICY "Users can view messages in own threads or conversations"
  ON messages FOR SELECT
  USING (
    -- Thread-based access
    EXISTS (
      SELECT 1 FROM threads 
      WHERE threads.id = messages.thread_id 
      AND threads.user_id = auth.uid()
    )
    OR
    -- Legacy conversation-based access (for migration period)
    EXISTS (
      SELECT 1 FROM conversations 
      WHERE conversations.id = messages.conversation_id 
      AND conversations.user_id = auth.uid()
    )
  );

-- New policy: Users can create messages in their own threads OR conversations
CREATE POLICY "Users can create messages in own threads or conversations"
  ON messages FOR INSERT
  WITH CHECK (
    -- Thread-based access
    (
      thread_id IS NOT NULL AND
      EXISTS (
        SELECT 1 FROM threads 
        WHERE threads.id = messages.thread_id 
        AND threads.user_id = auth.uid()
      )
    )
    OR
    -- Legacy conversation-based access (for migration period)
    (
      thread_id IS NULL AND
      EXISTS (
        SELECT 1 FROM conversations 
        WHERE conversations.id = messages.conversation_id 
        AND conversations.user_id = auth.uid()
      )
    )
  );

-- ============================================
-- 6. Trigger: Auto-update thread stats on message insert
-- ============================================

CREATE OR REPLACE FUNCTION update_thread_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update if message has a thread_id
  IF NEW.thread_id IS NOT NULL THEN
    UPDATE threads SET
      message_count = message_count + 1,
      last_message_at = NEW.created_at,
      updated_at = NOW()
    WHERE id = NEW.thread_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists to allow re-running migration
DROP TRIGGER IF EXISTS trigger_update_thread_stats ON messages;

CREATE TRIGGER trigger_update_thread_stats
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_thread_stats();

-- ============================================
-- 7. Trigger: Auto-update threads updated_at
-- ============================================

-- Using existing update_updated_at() function from 002_phase4_schema.sql
DROP TRIGGER IF EXISTS threads_updated_at ON threads;

CREATE TRIGGER threads_updated_at
  BEFORE UPDATE ON threads
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 8. Backfill: Create threads from existing conversations
-- ============================================

-- Create a default thread for each existing conversation
INSERT INTO threads (agent_id, user_id, name, status, created_at, updated_at)
SELECT 
  c.agent_id,
  c.user_id,
  COALESCE(c.title, 'General'),
  'active',
  c.created_at,
  c.updated_at
FROM conversations c
WHERE NOT EXISTS (
  -- Don't create if thread already exists for this user-agent pair
  SELECT 1 FROM threads t 
  WHERE t.user_id = c.user_id 
  AND t.agent_id = c.agent_id
  AND t.name = COALESCE(c.title, 'General')
);

-- Link existing messages to their new threads
UPDATE messages m
SET thread_id = t.id
FROM conversations c, threads t
WHERE m.conversation_id = c.id
  AND m.thread_id IS NULL
  AND t.user_id = c.user_id
  AND t.agent_id = c.agent_id
  AND t.name = COALESCE(c.title, 'General');

-- Update thread stats for backfilled messages
UPDATE threads t
SET 
  message_count = (
    SELECT COUNT(*) FROM messages m WHERE m.thread_id = t.id
  ),
  last_message_at = (
    SELECT MAX(m.created_at) FROM messages m WHERE m.thread_id = t.id
  )
WHERE EXISTS (
  SELECT 1 FROM messages m WHERE m.thread_id = t.id
);

-- ============================================
-- Done! Schema changes:
-- - threads table with RLS
-- - thread_id column on messages
-- - Indexes for performance
-- - Stats trigger
-- - Backfill existing conversations to threads
-- ============================================
