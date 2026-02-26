-- Mission Control V2 Migration
-- Date: 2026-02-26
-- Purpose: Add agent activity streaming + feature attention gates

-- 1. Evolve agent_activity table (add columns for live streaming)
ALTER TABLE agent_activity ADD COLUMN IF NOT EXISTS feature_id UUID REFERENCES features(id) ON DELETE CASCADE;
ALTER TABLE agent_activity ADD COLUMN IF NOT EXISTS step_id TEXT;
ALTER TABLE agent_activity ADD COLUMN IF NOT EXISTS event_type TEXT;
ALTER TABLE agent_activity ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE agent_activity ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- 2. Indexes for realtime queries
CREATE INDEX IF NOT EXISTS idx_activity_feature ON agent_activity(feature_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_agent ON agent_activity(agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_step ON agent_activity(feature_id, step_id);

-- 3. Feature attention gates
ALTER TABLE features ADD COLUMN IF NOT EXISTS needs_attention BOOLEAN DEFAULT false;
ALTER TABLE features ADD COLUMN IF NOT EXISTS attention_type TEXT; -- 'review' | 'approve' | 'error'
ALTER TABLE features ADD COLUMN IF NOT EXISTS vercel_deploy_url TEXT;

-- 4. Enable realtime on agent_activity
ALTER PUBLICATION supabase_realtime ADD TABLE agent_activity;
