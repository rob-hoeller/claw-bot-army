-- Migration: Create file_attachments table
-- Feature: File Attachment Processing (40f82dfe-4824-46f0-9358-066f06e49936)

CREATE TABLE IF NOT EXISTS file_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  storage_bucket TEXT NOT NULL DEFAULT 'chat-media',
  storage_path TEXT NOT NULL,
  extracted_text TEXT,
  metadata JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'uploading'
    CHECK (status IN ('uploading','processing','completed','failed','needs_review')),
  error_message TEXT,
  uploaded_by TEXT,
  access_level TEXT NOT NULL DEFAULT 'admin',
  conversation_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_file_attachments_status ON file_attachments(status);
CREATE INDEX IF NOT EXISTS idx_file_attachments_uploaded_by ON file_attachments(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_file_attachments_filename ON file_attachments(filename);
