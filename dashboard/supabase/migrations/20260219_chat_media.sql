-- Chat Media Storage Pipeline
-- Tracks all uploaded media files with metadata for querying by session/sender/channel

-- 1. Create chat_media table
CREATE TABLE IF NOT EXISTS chat_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT,
  file_size BIGINT,
  conversation_id TEXT,
  session_key TEXT,
  channel TEXT,        -- 'telegram', 'webchat', etc.
  sender TEXT,         -- user identifier
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_chat_media_conversation ON chat_media(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_media_session ON chat_media(session_key);
CREATE INDEX IF NOT EXISTS idx_chat_media_created ON chat_media(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_media_sender ON chat_media(sender);

-- 2. Create the storage bucket (run via Supabase Dashboard or API)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('chat-media', 'chat-media', true)
-- ON CONFLICT (id) DO NOTHING;

-- 3. Storage policy: allow authenticated uploads, public reads
-- CREATE POLICY "Public read access" ON storage.objects FOR SELECT USING (bucket_id = 'chat-media');
-- CREATE POLICY "Service role upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'chat-media');

-- RLS: Enable but allow service role full access
ALTER TABLE chat_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON chat_media
  FOR ALL
  USING (true)
  WITH CHECK (true);
