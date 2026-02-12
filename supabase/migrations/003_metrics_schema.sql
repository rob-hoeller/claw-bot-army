-- HBx Platform Metrics Schema
-- Stores infrastructure monitoring data for trends and analysis

-- ============================================
-- 1. Platform Metrics Table
-- ============================================
CREATE TABLE IF NOT EXISTS platform_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- System metrics
  cpu_percent DECIMAL(5,2),
  mem_total_bytes BIGINT,
  mem_used_bytes BIGINT,
  mem_percent DECIMAL(5,2),
  disk_total_bytes BIGINT,
  disk_used_bytes BIGINT,
  disk_percent DECIMAL(5,2),
  load_1m DECIMAL(6,2),
  load_5m DECIMAL(6,2),
  load_15m DECIMAL(6,2),
  cpu_count INTEGER,
  uptime_seconds DECIMAL(12,2),
  
  -- Gateway metrics
  gateway_status TEXT,
  gateway_latency_ms INTEGER,
  session_count INTEGER,
  process_cpu_percent DECIMAL(5,2),
  process_mem_percent DECIMAL(5,2),
  node_rss_bytes BIGINT,
  
  -- Computed fields
  load_percent DECIMAL(5,2) GENERATED ALWAYS AS (
    CASE WHEN cpu_count > 0 THEN (load_1m / cpu_count * 100) ELSE 0 END
  ) STORED,
  
  -- Metadata
  hostname TEXT,
  instance_type TEXT
);

-- Index for time-series queries
CREATE INDEX IF NOT EXISTS idx_metrics_recorded_at ON platform_metrics(recorded_at DESC);

-- Index for date-based partitioning queries
CREATE INDEX IF NOT EXISTS idx_metrics_recorded_date ON platform_metrics(DATE(recorded_at));

-- ============================================
-- 2. Metrics Summary View (for dashboard)
-- ============================================
CREATE OR REPLACE VIEW metrics_summary AS
SELECT 
  DATE(recorded_at) as date,
  COUNT(*) as sample_count,
  
  -- CPU
  ROUND(AVG(cpu_percent)::numeric, 1) as cpu_avg,
  MAX(cpu_percent) as cpu_max,
  MIN(cpu_percent) as cpu_min,
  
  -- Memory
  ROUND(AVG(mem_percent)::numeric, 1) as mem_avg,
  MAX(mem_percent) as mem_max,
  
  -- Load
  ROUND(AVG(load_percent)::numeric, 1) as load_avg,
  MAX(load_percent) as load_max,
  
  -- Sessions
  ROUND(AVG(session_count)::numeric, 1) as sessions_avg,
  MAX(session_count) as sessions_max,
  
  -- Gateway
  ROUND(AVG(gateway_latency_ms)::numeric, 0) as latency_avg,
  ROUND(
    COUNT(*) FILTER (WHERE gateway_status = 'ok')::numeric / COUNT(*)::numeric * 100, 
    1
  ) as uptime_percent

FROM platform_metrics
GROUP BY DATE(recorded_at)
ORDER BY date DESC;

-- ============================================
-- 3. Recent Metrics View (last 24 hours)
-- ============================================
CREATE OR REPLACE VIEW metrics_recent AS
SELECT 
  id,
  recorded_at,
  cpu_percent,
  mem_percent,
  load_percent,
  session_count,
  gateway_status,
  gateway_latency_ms
FROM platform_metrics
WHERE recorded_at > NOW() - INTERVAL '24 hours'
ORDER BY recorded_at DESC;

-- ============================================
-- 4. Alerts View (thresholds exceeded)
-- ============================================
CREATE OR REPLACE VIEW metrics_alerts AS
SELECT 
  id,
  recorded_at,
  CASE 
    WHEN cpu_percent > 90 THEN 'critical'
    WHEN cpu_percent > 70 THEN 'warning'
    ELSE 'ok'
  END as cpu_status,
  cpu_percent,
  CASE 
    WHEN mem_percent > 95 THEN 'critical'
    WHEN mem_percent > 80 THEN 'warning'
    ELSE 'ok'
  END as mem_status,
  mem_percent,
  CASE 
    WHEN load_percent > 100 THEN 'critical'
    WHEN load_percent > 75 THEN 'warning'
    ELSE 'ok'
  END as load_status,
  load_percent,
  gateway_status
FROM platform_metrics
WHERE recorded_at > NOW() - INTERVAL '1 hour'
  AND (cpu_percent > 70 OR mem_percent > 80 OR load_percent > 75 OR gateway_status != 'ok')
ORDER BY recorded_at DESC;

-- ============================================
-- 5. Data Retention Policy
-- ============================================
-- Delete metrics older than 90 days (run via cron or pg_cron)
-- DELETE FROM platform_metrics WHERE recorded_at < NOW() - INTERVAL '90 days';

-- ============================================
-- 6. RLS Policies (if needed)
-- ============================================
-- For now, metrics are admin-only readable
-- ALTER TABLE platform_metrics ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Admins can read metrics" ON platform_metrics
--   FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');

-- ============================================
-- 7. Function to get metrics for charting
-- ============================================
CREATE OR REPLACE FUNCTION get_metrics_for_chart(
  p_hours INTEGER DEFAULT 24,
  p_interval TEXT DEFAULT '15 minutes'
)
RETURNS TABLE (
  bucket TIMESTAMP WITH TIME ZONE,
  cpu_avg DECIMAL,
  mem_avg DECIMAL,
  load_avg DECIMAL,
  sessions_avg DECIMAL,
  latency_avg DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    date_trunc('hour', recorded_at) + 
      (EXTRACT(minute FROM recorded_at)::int / 15) * INTERVAL '15 minutes' as bucket,
    ROUND(AVG(cpu_percent)::numeric, 1),
    ROUND(AVG(mem_percent)::numeric, 1),
    ROUND(AVG(load_percent)::numeric, 1),
    ROUND(AVG(session_count)::numeric, 1),
    ROUND(AVG(gateway_latency_ms)::numeric, 0)
  FROM platform_metrics
  WHERE recorded_at > NOW() - (p_hours || ' hours')::INTERVAL
  GROUP BY bucket
  ORDER BY bucket;
END;
$$ LANGUAGE plpgsql;
