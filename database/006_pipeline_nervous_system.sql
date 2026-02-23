-- Pipeline Nervous System: schema additions for automated agent-to-agent handoffs
-- Date: 2026-02-23
-- Feature: Agent Pipeline Nervous System

-- Add current_agent: tracks which pipeline agent is actively working on this feature
ALTER TABLE features ADD COLUMN IF NOT EXISTS current_agent TEXT;

-- Add revision_count: tracks how many revision loops have occurred (max 2 before escalation)
ALTER TABLE features ADD COLUMN IF NOT EXISTS revision_count INTEGER DEFAULT 0;

-- Add pipeline_log: full history of pipeline events as JSONB array
-- Each entry: { timestamp, agent, stage, verdict, issues?, revision_loop? }
ALTER TABLE features ADD COLUMN IF NOT EXISTS pipeline_log JSONB DEFAULT '[]'::jsonb;

-- Index for querying features by current agent (useful for agent dashboards)
CREATE INDEX IF NOT EXISTS idx_features_current_agent ON features (current_agent) WHERE current_agent IS NOT NULL;

-- Comment for documentation
COMMENT ON COLUMN features.current_agent IS 'Pipeline agent currently working on this feature (IN1, IN5, IN2, IN6)';
COMMENT ON COLUMN features.revision_count IS 'Number of revision loops (escalate after 2)';
COMMENT ON COLUMN features.pipeline_log IS 'JSONB array of pipeline event entries';
