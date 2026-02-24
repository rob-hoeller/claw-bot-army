-- Migration: Audit Trail Handoff Packets
-- Created: 2026-02-24
-- Purpose: Store phase handoff packets for audit trail and time/cost tracking

CREATE TABLE IF NOT EXISTS handoff_packets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_id UUID NOT NULL REFERENCES features(id) ON DELETE CASCADE,
  phase TEXT NOT NULL,
  phase_label TEXT NOT NULL,
  phase_order INTEGER NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  previous_version_id UUID REFERENCES handoff_packets(id),
  agent_id TEXT,
  agent_name TEXT,
  agent_type TEXT,
  output_summary TEXT,
  output_artifacts JSONB NOT NULL DEFAULT '[]'::jsonb,
  output_decisions JSONB NOT NULL DEFAULT '[]'::jsonb,
  output_metrics JSONB,
  activity_log JSONB NOT NULL DEFAULT '[]'::jsonb,
  input_source_phase TEXT,
  input_source_packet_id UUID REFERENCES handoff_packets(id),
  input_context JSONB,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ DEFAULT now(),
  duration_ms INTEGER,
  cost_usd NUMERIC(10, 4),
  cost_tokens_in INTEGER,
  cost_tokens_out INTEGER,
  rejection_reason TEXT,
  diff_from_previous JSONB,
  status TEXT NOT NULL DEFAULT 'completed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_handoff_packets_feature ON handoff_packets(feature_id);
CREATE INDEX idx_handoff_packets_feature_phase ON handoff_packets(feature_id, phase);
CREATE INDEX idx_handoff_packets_phase_order ON handoff_packets(feature_id, phase_order);
