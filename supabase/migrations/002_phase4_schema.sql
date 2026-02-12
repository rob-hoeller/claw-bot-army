-- =============================================
-- Phase 4: Innovation Department Schema
-- =============================================
-- Departments, Agents Registry, Features, Bugs, Learning Logs
-- =============================================

-- =============================================
-- DEPARTMENTS
-- =============================================
CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,  -- IN, SL, PL, SP, etc.
  name TEXT NOT NULL,
  description TEXT,
  color TEXT,  -- For UI display
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed initial departments
INSERT INTO departments (code, name, description, color) VALUES
  ('PL', 'Platform', 'Core platform operations and orchestration', '#8B5CF6'),
  ('IN', 'Innovation', 'Feature development, coding, research & learning', '#3B82F6'),
  ('SL', 'Sales', 'Sales support, OSC, competitive intelligence', '#10B981'),
  ('SP', 'Support', 'Bug fixes, maintenance, customer support', '#F59E0B'),
  ('WR', 'Warranty', 'Warranty and customer care', '#EF4444'),
  ('CN', 'Construction', 'Construction operations support', '#6366F1'),
  ('DS', 'Design', 'Design center and selections', '#EC4899'),
  ('ST', 'Start Up', 'New community launches', '#14B8A6'),
  ('SE', 'Settlement', 'Closing and settlement coordination', '#84CC16')
ON CONFLICT (code) DO NOTHING;

-- =============================================
-- AGENTS REGISTRY
-- =============================================
CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,  -- HBx, HBx_IN1, etc.
  name TEXT NOT NULL,
  department_id UUID REFERENCES departments(id),
  role TEXT NOT NULL,
  description TEXT,
  emoji TEXT,
  status TEXT DEFAULT 'standby' CHECK (status IN ('active', 'deploying', 'standby', 'retired')),
  soul_version TEXT DEFAULT '1.0',
  capabilities TEXT[],  -- Array of capability tags
  config_path TEXT,  -- Path to agent's workspace/config
  last_active TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed initial agents
INSERT INTO agents (id, name, department_id, role, description, emoji, status, capabilities) VALUES
  ('HBx', 'HBx', (SELECT id FROM departments WHERE code = 'PL'), 
   'Platform Director', 
   'Master orchestrator - routes, coordinates, reviews, approves all work',
   '🧠', 'active', 
   ARRAY['orchestration', 'routing', 'review', 'coordination', 'reporting']),
  
  ('HBx_SL1', 'Schellie', (SELECT id FROM departments WHERE code = 'SL'),
   'Digital Online Sales Counselor',
   'Handles buyer inquiries, schedules appointments, nurtures leads',
   '🏠', 'active',
   ARRAY['sales', 'scheduling', 'lead-nurturing', 'buyer-communication']),
  
  ('HBx_SL2', 'Competitive Intel', (SELECT id FROM departments WHERE code = 'SL'),
   'Market Intelligence Agent',
   'Monitors competitors, gathers market data, reports insights',
   '🔍', 'deploying',
   ARRAY['research', 'competitive-analysis', 'market-intelligence']),
  
  ('HBx_SK1', 'Skill Builder', (SELECT id FROM departments WHERE code = 'PL'),
   'Agent Designer & Skill Creator',
   'Creates and configures new agents, builds skills',
   '🛠️', 'deploying',
   ARRAY['agent-creation', 'skill-development', 'configuration'])
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  description = EXCLUDED.description,
  emoji = EXCLUDED.emoji,
  updated_at = now();

-- =============================================
-- FEATURES (Board)
-- =============================================
CREATE TABLE IF NOT EXISTS features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'backlog' CHECK (status IN ('backlog', 'planned', 'in_progress', 'review', 'done', 'cancelled')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  
  -- Relationships
  requested_by TEXT REFERENCES agents(id),  -- Agent who requested
  assigned_to TEXT REFERENCES agents(id),   -- Agent working on it
  approved_by TEXT,  -- Human who approved (Lance, Rob, etc.)
  
  -- Details
  acceptance_criteria TEXT,
  labels TEXT[],
  estimated_hours NUMERIC,
  actual_hours NUMERIC,
  
  -- Git/PR tracking
  branch_name TEXT,
  pr_url TEXT,
  pr_number INTEGER,
  pr_status TEXT CHECK (pr_status IN ('draft', 'open', 'merged', 'closed')),
  
  -- Timestamps
  approved_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- BUGS (Board)
-- =============================================
CREATE TABLE IF NOT EXISTS bugs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'triaged', 'in_progress', 'testing', 'resolved', 'closed', 'wont_fix')),
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  
  -- Relationships
  reported_by TEXT,  -- Could be agent ID or user identifier
  assigned_to TEXT REFERENCES agents(id),
  verified_by TEXT,
  
  -- Details
  steps_to_reproduce TEXT,
  expected_behavior TEXT,
  actual_behavior TEXT,
  environment TEXT,  -- Browser, OS, etc.
  labels TEXT[],
  
  -- Git/PR tracking
  branch_name TEXT,
  pr_url TEXT,
  pr_number INTEGER,
  
  -- Timestamps
  triaged_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- LEARNING LOGS
-- =============================================
CREATE TABLE IF NOT EXISTS learning_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT NOT NULL REFERENCES agents(id),
  
  -- Learning details
  topic TEXT NOT NULL,
  source_type TEXT CHECK (source_type IN ('course', 'article', 'video', 'documentation', 'experiment', 'other')),
  source_url TEXT,
  source_name TEXT,
  
  -- Content
  summary TEXT,
  key_takeaways TEXT[],
  hours_spent NUMERIC,
  
  -- Application
  applicable_to TEXT,  -- What project/feature this could apply to
  applied BOOLEAN DEFAULT false,
  applied_to_feature_id UUID REFERENCES features(id),
  
  -- Timestamps
  learned_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- ACTIVITY LOG (for tracking all agent actions)
-- =============================================
CREATE TABLE IF NOT EXISTS agent_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT NOT NULL REFERENCES agents(id),
  action_type TEXT NOT NULL,  -- 'feature_created', 'bug_fixed', 'learning_logged', etc.
  action_details JSONB,
  related_id UUID,  -- ID of related feature/bug/etc.
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_agents_department ON agents(department_id);
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
CREATE INDEX IF NOT EXISTS idx_features_status ON features(status);
CREATE INDEX IF NOT EXISTS idx_features_assigned ON features(assigned_to);
CREATE INDEX IF NOT EXISTS idx_features_priority ON features(priority);
CREATE INDEX IF NOT EXISTS idx_bugs_status ON bugs(status);
CREATE INDEX IF NOT EXISTS idx_bugs_severity ON bugs(severity);
CREATE INDEX IF NOT EXISTS idx_bugs_assigned ON bugs(assigned_to);
CREATE INDEX IF NOT EXISTS idx_learning_agent ON learning_logs(agent_id);
CREATE INDEX IF NOT EXISTS idx_activity_agent ON agent_activity(agent_id);
CREATE INDEX IF NOT EXISTS idx_activity_type ON agent_activity(action_type);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

-- Enable RLS
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE features ENABLE ROW LEVEL SECURITY;
ALTER TABLE bugs ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_activity ENABLE ROW LEVEL SECURITY;

-- Policies: Authenticated users can read all, service role can do everything
CREATE POLICY "Authenticated users can view departments" ON departments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can view agents" ON agents
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can view features" ON features
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can view bugs" ON bugs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can view learning logs" ON learning_logs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can view activity" ON agent_activity
  FOR SELECT TO authenticated USING (true);

-- Service role (for API routes) can do everything
CREATE POLICY "Service role full access to departments" ON departments
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to agents" ON agents
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to features" ON features
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to bugs" ON bugs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to learning logs" ON learning_logs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to activity" ON agent_activity
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================
-- FUNCTIONS
-- =============================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS departments_updated_at ON departments;
CREATE TRIGGER departments_updated_at
  BEFORE UPDATE ON departments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS agents_updated_at ON agents;
CREATE TRIGGER agents_updated_at
  BEFORE UPDATE ON agents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS features_updated_at ON features;
CREATE TRIGGER features_updated_at
  BEFORE UPDATE ON features
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS bugs_updated_at ON bugs;
CREATE TRIGGER bugs_updated_at
  BEFORE UPDATE ON bugs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
