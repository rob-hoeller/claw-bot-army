-- HBx Chat Schema Migration
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. Conversations Table
-- ============================================
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT NOT NULL,                    -- 'HBx', 'HBx_SL1', 'HBx_SL2', etc.
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,                                 -- Optional: "Chat with HBx"
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_agent_id ON conversations(agent_id);

-- Unique constraint: one conversation per user-agent pair
CREATE UNIQUE INDEX IF NOT EXISTS idx_conversations_user_agent 
  ON conversations(user_id, agent_id);

-- ============================================
-- 2. Messages Table
-- ============================================
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT,
  attachments JSONB DEFAULT '[]'::jsonb,     -- [{type, url, name, size}]
  metadata JSONB DEFAULT '{}'::jsonb,        -- Extra data (tokens, model, etc.)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast message retrieval
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

-- ============================================
-- 3. Auto-update timestamp trigger
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 4. Row Level Security (RLS)
-- ============================================

-- Enable RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Conversations: Users can see their own, Admins can see all
CREATE POLICY "Users can view own conversations"
  ON conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own conversations"
  ON conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations"
  ON conversations FOR UPDATE
  USING (auth.uid() = user_id);

-- Messages: Users can see messages in their conversations
CREATE POLICY "Users can view messages in own conversations"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations 
      WHERE conversations.id = messages.conversation_id 
      AND conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create messages in own conversations"
  ON messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations 
      WHERE conversations.id = messages.conversation_id 
      AND conversations.user_id = auth.uid()
    )
  );

-- ============================================
-- 5. Admin policies (add admin role check)
-- ============================================
-- Note: Adjust based on your admin detection method
-- This assumes you have a user_roles table or metadata

-- Option: If using user metadata for admin flag
-- CREATE POLICY "Admins can view all conversations"
--   ON conversations FOR SELECT
--   USING (
--     auth.uid() = user_id 
--     OR (auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true
--   );

-- ============================================
-- 6. Storage bucket for attachments
-- ============================================
-- Run this separately in Storage settings or via API:
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('chat-attachments', 'chat-attachments', false);

-- ============================================
-- Done! Tables created:
-- - conversations
-- - messages
-- 
-- Indexes, RLS policies, and triggers configured.
-- ============================================
