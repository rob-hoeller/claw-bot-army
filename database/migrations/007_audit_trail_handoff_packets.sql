-- Audit Trail & Collaboration Hub: handoff packets, phase chat, epics
-- Date: 2026-02-24
-- Feature ID: 05610cd9-7132-44b8-8ed1-d2a67e097010

-- ============================================================
-- Phase 1: Handoff Packets
-- ============================================================

CREATE TABLE IF NOT EXISTS handoff_packets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_id UUID NOT NULL REFERENCES features(id) ON DELETE CASCADE,
  phase TEXT NOT NULL CHECK (phase IN ('planning','design_review','in_progress','qa_review','review','approved','pr_submitted','done')),
  version INT NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress','completed','rejected','skipped')),

  agent_id TEXT,
  agent_type TEXT CHECK (agent_type IN ('ai_agent','human')),
  agent_name TEXT,

  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  duration_ms INT GENERATED ALWAYS AS (
    CASE WHEN completed_at IS NOT NULL
      THEN (EXTRACT(EPOCH FROM (completed_at - started_at)) * 1000)::INT
      ELSE NULL
    END
  ) STORED,

  cost_tokens_in INT,
  cost_tokens_out INT,
  cost_usd NUMERIC(10,6),

  input_source_phase TEXT,
  input_source_packet_id UUID REFERENCES handoff_packets(id),
  input_context JSONB DEFAULT '{}',

  output_summary TEXT,
  output_artifacts JSONB DEFAULT '[]',
  output_decisions JSONB DEFAULT '[]',
  output_metrics JSONB DEFAULT '{}',

  previous_version_id UUID REFERENCES handoff_packets(id),
  rejection_reason TEXT,
  diff_from_previous JSONB,

  activity_log JSONB DEFAULT '[]',

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(feature_id, phase, version)
);

CREATE INDEX IF NOT EXISTS idx_hp_feature ON handoff_packets(feature_id);
CREATE INDEX IF NOT EXISTS idx_hp_feature_phase ON handoff_packets(feature_id, phase, version);
CREATE INDEX IF NOT EXISTS idx_hp_active ON handoff_packets(status) WHERE status = 'in_progress';

-- RLS
ALTER TABLE handoff_packets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hp_select" ON handoff_packets FOR SELECT USING (true);
CREATE POLICY "hp_all_service" ON handoff_packets FOR ALL USING (
  current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'service_role'
);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE handoff_packets;

-- ============================================================
-- Phase 3: Phase Chat Messages
-- ============================================================

CREATE TABLE IF NOT EXISTS phase_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  handoff_packet_id UUID NOT NULL REFERENCES handoff_packets(id) ON DELETE CASCADE,
  feature_id UUID NOT NULL REFERENCES features(id) ON DELETE CASCADE,
  phase TEXT NOT NULL,

  author_id TEXT NOT NULL,
  author_type TEXT NOT NULL CHECK (author_type IN ('ai_agent','human')),
  author_name TEXT NOT NULL,
  author_avatar TEXT,

  content TEXT NOT NULL,
  mentions TEXT[] DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT now(),
  edited_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_pcm_packet ON phase_chat_messages(handoff_packet_id, created_at);
CREATE INDEX IF NOT EXISTS idx_pcm_feature_phase ON phase_chat_messages(feature_id, phase, created_at);

ALTER TABLE phase_chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pcm_select" ON phase_chat_messages FOR SELECT USING (true);
CREATE POLICY "pcm_insert" ON phase_chat_messages FOR INSERT WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE phase_chat_messages;

-- ============================================================
-- Phase 5: Epics / Module Chaining
-- ============================================================

CREATE TABLE IF NOT EXISTS feature_epics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active',
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS epic_features (
  epic_id UUID NOT NULL REFERENCES feature_epics(id) ON DELETE CASCADE,
  feature_id UUID NOT NULL REFERENCES features(id) ON DELETE CASCADE,
  sort_order INT DEFAULT 0,
  depends_on_feature_id UUID REFERENCES features(id),
  depends_on_phase TEXT,
  PRIMARY KEY (epic_id, feature_id)
);

-- updated_at trigger for handoff_packets
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER hp_updated_at BEFORE UPDATE ON handoff_packets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
