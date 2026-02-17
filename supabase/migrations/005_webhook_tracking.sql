-- Add Vercel deployment tracking columns
ALTER TABLE features ADD COLUMN IF NOT EXISTS vercel_deployment_url TEXT;
ALTER TABLE features ADD COLUMN IF NOT EXISTS vercel_deployment_id TEXT;

-- Index on branch_name for fast webhook lookups
CREATE INDEX IF NOT EXISTS idx_features_branch_name ON features (branch_name);
