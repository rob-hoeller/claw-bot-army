-- Migration: 003_chat_media
-- Creates chat_media table for tracking uploaded chat images

CREATE TABLE IF NOT EXISTS public.chat_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name text NOT NULL,
  original_path text,
  storage_path text,
  storage_url text,
  session_key text,
  sender_id text,
  channel text,
  mime_type text,
  file_size bigint,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Unique constraint to prevent duplicate uploads
CREATE UNIQUE INDEX IF NOT EXISTS chat_media_file_name_idx ON public.chat_media (file_name);

-- Enable RLS
ALTER TABLE public.chat_media ENABLE ROW LEVEL SECURITY;

-- Service role has full access
CREATE POLICY "Service role full access" ON public.chat_media
  FOR ALL
  USING (true)
  WITH CHECK (true);
