-- Migration: Token Usage Tracking
-- Created: 2026-02-12
-- Purpose: Track token usage and costs across agents, users, and sessions

-- =============================================================================
-- CORE TABLES
-- =============================================================================

-- Per-session snapshots (collected every 15 minutes)
-- Granular data for detailed analysis
CREATE TABLE IF NOT EXISTS token_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Session identification
  session_key TEXT NOT NULL,
  session_id UUID,
  
  -- Parsed from session key
  agent_id TEXT,
  user_id TEXT,
  
  -- Model info
  model TEXT NOT NULL,
  provider TEXT,
  
  -- Token counts (cumulative for session at snapshot time)
  input_tokens BIGINT DEFAULT 0,
  output_tokens BIGINT DEFAULT 0,
  cache_read_tokens BIGINT DEFAULT 0,
  cache_write_tokens BIGINT DEFAULT 0,
  total_tokens BIGINT DEFAULT 0,
  
  -- Context usage
  context_used BIGINT DEFAULT 0,
  context_limit BIGINT DEFAULT 0,
  context_percent DECIMAL(5,2) DEFAULT 0,
  
  -- Costs in USD (cumulative for session)
  cost_input DECIMAL(12,6) DEFAULT 0,
  cost_output DECIMAL(12,6) DEFAULT 0,
  cost_cache_read DECIMAL(12,6) DEFAULT 0,
  cost_cache_write DECIMAL(12,6) DEFAULT 0,
  cost_total DECIMAL(12,6) DEFAULT 0,
  
  -- Delta from previous snapshot (for trend analysis)
  delta_input_tokens BIGINT DEFAULT 0,
  delta_output_tokens BIGINT DEFAULT 0,
  delta_total_tokens BIGINT DEFAULT 0,
  delta_cost DECIMAL(12,6) DEFAULT 0,
  
  -- Request count in this snapshot period
  request_count INTEGER DEFAULT 0,
  
  -- Metadata
  hostname TEXT,
  
  -- Indexes for common queries
  CONSTRAINT token_usage_recorded_at_idx UNIQUE (session_key, recorded_at)
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_token_usage_recorded_at ON token_usage(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_token_usage_agent_id ON token_usage(agent_id);
CREATE INDEX IF NOT EXISTS idx_token_usage_user_id ON token_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_token_usage_session_key ON token_usage(session_key);
CREATE INDEX IF NOT EXISTS idx_token_usage_model ON token_usage(model);

-- =============================================================================
-- AGGREGATION TABLES
-- =============================================================================

-- Daily aggregates by agent and user
CREATE TABLE IF NOT EXISTS token_usage_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  
  -- Dimensions
  agent_id TEXT,
  user_id TEXT,
  model TEXT,
  
  -- Aggregated token counts
  total_input_tokens BIGINT DEFAULT 0,
  total_output_tokens BIGINT DEFAULT 0,
  total_cache_read_tokens BIGINT DEFAULT 0,
  total_cache_write_tokens BIGINT DEFAULT 0,
  total_tokens BIGINT DEFAULT 0,
  
  -- Aggregated costs
  total_cost_input DECIMAL(14,6) DEFAULT 0,
  total_cost_output DECIMAL(14,6) DEFAULT 0,
  total_cost_cache_read DECIMAL(14,6) DEFAULT 0,
  total_cost_cache_write DECIMAL(14,6) DEFAULT 0,
  total_cost DECIMAL(14,6) DEFAULT 0,
  
  -- Activity metrics
  request_count INTEGER DEFAULT 0,
  session_count INTEGER DEFAULT 0,
  active_minutes INTEGER DEFAULT 0,
  
  -- Stats
  avg_tokens_per_request DECIMAL(10,2) DEFAULT 0,
  avg_cost_per_request DECIMAL(10,6) DEFAULT 0,
  peak_context_percent DECIMAL(5,2) DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(date, agent_id, user_id, model)
);

CREATE INDEX IF NOT EXISTS idx_token_usage_daily_date ON token_usage_daily(date DESC);
CREATE INDEX IF NOT EXISTS idx_token_usage_daily_agent ON token_usage_daily(agent_id);
CREATE INDEX IF NOT EXISTS idx_token_usage_daily_user ON token_usage_daily(user_id);

-- Weekly aggregates for trend analysis
CREATE TABLE IF NOT EXISTS token_usage_weekly (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start DATE NOT NULL, -- Monday of the week
  
  -- Dimensions
  agent_id TEXT,
  user_id TEXT,
  
  -- Aggregated totals
  total_tokens BIGINT DEFAULT 0,
  total_cost DECIMAL(14,6) DEFAULT 0,
  request_count INTEGER DEFAULT 0,
  session_count INTEGER DEFAULT 0,
  
  -- Comparisons
  prev_week_tokens BIGINT DEFAULT 0,
  prev_week_cost DECIMAL(14,6) DEFAULT 0,
  tokens_change_percent DECIMAL(8,2) DEFAULT 0,
  cost_change_percent DECIMAL(8,2) DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(week_start, agent_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_token_usage_weekly_week ON token_usage_weekly(week_start DESC);

-- =============================================================================
-- VIEWS FOR REPORTING
-- =============================================================================

-- Current day summary
CREATE OR REPLACE VIEW token_usage_today AS
SELECT 
  agent_id,
  user_id,
  model,
  SUM(delta_input_tokens) as input_tokens,
  SUM(delta_output_tokens) as output_tokens,
  SUM(delta_total_tokens) as total_tokens,
  SUM(delta_cost) as total_cost,
  SUM(request_count) as requests,
  COUNT(DISTINCT session_key) as sessions
FROM token_usage
WHERE recorded_at >= CURRENT_DATE
GROUP BY agent_id, user_id, model;

-- Last 7 days by agent
CREATE OR REPLACE VIEW token_usage_7d_by_agent AS
SELECT 
  agent_id,
  SUM(total_tokens) as total_tokens,
  SUM(total_cost) as total_cost,
  SUM(request_count) as requests,
  SUM(session_count) as sessions,
  AVG(avg_cost_per_request) as avg_cost_per_request
FROM token_usage_daily
WHERE date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY agent_id
ORDER BY total_cost DESC;

-- Last 7 days by user
CREATE OR REPLACE VIEW token_usage_7d_by_user AS
SELECT 
  user_id,
  SUM(total_tokens) as total_tokens,
  SUM(total_cost) as total_cost,
  SUM(request_count) as requests,
  SUM(session_count) as sessions
FROM token_usage_daily
WHERE date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY user_id
ORDER BY total_cost DESC;

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Function to aggregate daily totals (run at end of day or on-demand)
CREATE OR REPLACE FUNCTION aggregate_daily_token_usage(target_date DATE DEFAULT CURRENT_DATE)
RETURNS void AS $$
BEGIN
  INSERT INTO token_usage_daily (
    date, agent_id, user_id, model,
    total_input_tokens, total_output_tokens, 
    total_cache_read_tokens, total_cache_write_tokens, total_tokens,
    total_cost_input, total_cost_output,
    total_cost_cache_read, total_cost_cache_write, total_cost,
    request_count, session_count,
    avg_tokens_per_request, avg_cost_per_request, peak_context_percent,
    updated_at
  )
  SELECT 
    target_date,
    agent_id,
    user_id,
    model,
    SUM(delta_input_tokens),
    SUM(delta_output_tokens),
    SUM(COALESCE(cache_read_tokens, 0)),
    SUM(COALESCE(cache_write_tokens, 0)),
    SUM(delta_total_tokens),
    SUM(COALESCE(cost_input, 0)),
    SUM(COALESCE(cost_output, 0)),
    SUM(COALESCE(cost_cache_read, 0)),
    SUM(COALESCE(cost_cache_write, 0)),
    SUM(delta_cost),
    SUM(request_count),
    COUNT(DISTINCT session_key),
    CASE WHEN SUM(request_count) > 0 
         THEN SUM(delta_total_tokens)::DECIMAL / SUM(request_count) 
         ELSE 0 END,
    CASE WHEN SUM(request_count) > 0 
         THEN SUM(delta_cost) / SUM(request_count) 
         ELSE 0 END,
    MAX(context_percent),
    now()
  FROM token_usage
  WHERE recorded_at >= target_date 
    AND recorded_at < target_date + INTERVAL '1 day'
  GROUP BY agent_id, user_id, model
  ON CONFLICT (date, agent_id, user_id, model) 
  DO UPDATE SET
    total_input_tokens = EXCLUDED.total_input_tokens,
    total_output_tokens = EXCLUDED.total_output_tokens,
    total_cache_read_tokens = EXCLUDED.total_cache_read_tokens,
    total_cache_write_tokens = EXCLUDED.total_cache_write_tokens,
    total_tokens = EXCLUDED.total_tokens,
    total_cost_input = EXCLUDED.total_cost_input,
    total_cost_output = EXCLUDED.total_cost_output,
    total_cost_cache_read = EXCLUDED.total_cost_cache_read,
    total_cost_cache_write = EXCLUDED.total_cost_cache_write,
    total_cost = EXCLUDED.total_cost,
    request_count = EXCLUDED.request_count,
    session_count = EXCLUDED.session_count,
    avg_tokens_per_request = EXCLUDED.avg_tokens_per_request,
    avg_cost_per_request = EXCLUDED.avg_cost_per_request,
    peak_context_percent = EXCLUDED.peak_context_percent,
    updated_at = now();
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

-- Enable RLS
ALTER TABLE token_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_usage_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_usage_weekly ENABLE ROW LEVEL SECURITY;

-- Service role can do everything
CREATE POLICY "Service role full access on token_usage" ON token_usage
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on token_usage_daily" ON token_usage_daily
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on token_usage_weekly" ON token_usage_weekly
  FOR ALL USING (auth.role() = 'service_role');

-- Authenticated users can read all (admins dashboard)
CREATE POLICY "Authenticated read on token_usage" ON token_usage
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated read on token_usage_daily" ON token_usage_daily
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated read on token_usage_weekly" ON token_usage_weekly
  FOR SELECT USING (auth.role() = 'authenticated');

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE token_usage IS 'Per-session token usage snapshots collected every 15 minutes';
COMMENT ON TABLE token_usage_daily IS 'Daily aggregated token usage by agent, user, and model';
COMMENT ON TABLE token_usage_weekly IS 'Weekly aggregated token usage for trend analysis';
COMMENT ON COLUMN token_usage.delta_cost IS 'Cost incurred since last snapshot (for summing)';
COMMENT ON COLUMN token_usage.cost_total IS 'Cumulative cost for the session (for current state)';
