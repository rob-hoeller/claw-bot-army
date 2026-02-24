-- Migration: Phase Chat Messages
-- Created: 2026-02-24
-- Purpose: Store chat messages for planning and review phases

CREATE TABLE IF NOT EXISTS phase_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_id UUID NOT NULL REFERENCES features(id) ON DELETE CASCADE,
  phase TEXT NOT NULL CHECK (phase IN ('planning', 'review')),
  sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'agent', 'orchestrator')),
  sender_id TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  content TEXT NOT NULL,
  mentions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_phase_chat_messages_feature ON phase_chat_messages(feature_id);
CREATE INDEX idx_phase_chat_messages_feature_phase ON phase_chat_messages(feature_id, phase);
CREATE INDEX idx_phase_chat_messages_created ON phase_chat_messages(feature_id, created_at);
