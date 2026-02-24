-- Migration: Epics and Epic-Feature linking
-- Created: 2026-02-24
-- Purpose: Phase 5 — Epic/Module Chaining

CREATE TABLE IF NOT EXISTS epics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed', 'archived')),
  color TEXT DEFAULT '#8B5CF6',
  owner TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_epics_status ON epics(status);

CREATE TABLE IF NOT EXISTS epic_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  epic_id UUID NOT NULL REFERENCES epics(id) ON DELETE CASCADE,
  feature_id UUID NOT NULL REFERENCES features(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(epic_id, feature_id)
);

CREATE INDEX IF NOT EXISTS idx_epic_features_epic ON epic_features(epic_id);
CREATE INDEX IF NOT EXISTS idx_epic_features_feature ON epic_features(feature_id);
