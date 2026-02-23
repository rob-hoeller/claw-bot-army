# QA Handoff: Pipeline Nervous System

**From:** IN2 (Code Factory)  
**To:** IN6 (QA)  
**Date:** 2026-02-23  
**Branch:** `hbx/pipeline-nervous-system` (based on `hbx/live-pipeline-board`)  
**Commit:** `fb8202e`  

---

## What Was Built

### New Components (3)
1. **`PipelineStagePill.tsx`** — Shows current agent + stage on feature cards (e.g. "🔧 IN2 — Building"). Color-coded: blue=normal, yellow=stalled, red=escalated.
2. **`RevisionBadge.tsx`** — Shows `🔄 N` when revision_count > 0. Yellow at 1, red at 2.
3. **`PipelineLog.tsx`** — Collapsible timeline in feature detail panel. Shows timestamps, agent, stage, verdict badges. REVISE entries have expandable issue lists.

### Modified Files (4)
4. **`FeatureBoard.tsx`** — Integrated all 3 new components into SortableFeatureCard and FeatureDetailPanel. Added stalled detection (5min threshold via `isStalledPipeline`). Escalation banner + red left border when `revision_count >= 2`. Updated demo data with new fields.
5. **`useRealtimeFeatures.ts`** — Added `current_agent`, `revision_count`, `pipeline_log` to Feature type.
6. **`features/index.ts`** — Exported new components.
7. **`approve/route.ts`** — Webhook now includes `branch_name`, `current_agent`, `revision_count`, `feature_spec` excerpt, and `acceptance_criteria` in gateway notification for HBx routing.

### Schema Migration
8. **`database/006_pipeline_nervous_system.sql`** — Adds `current_agent TEXT`, `revision_count INTEGER DEFAULT 0`, `pipeline_log JSONB DEFAULT '[]'` to features table. Includes index on `current_agent`.

---

## QA Checklist

### Components
- [ ] PipelineStagePill renders for each agent (IN1/IN5/IN2/IN6) with correct icon/label
- [ ] PipelineStagePill shows "Review" when agent=null, status=review
- [ ] PipelineStagePill shows "Escalated 🚨" when status=escalated
- [ ] PipelineStagePill shows "(stalled)" + yellow bg after 5min no pipeline_log update
- [ ] RevisionBadge hidden when count=0
- [ ] RevisionBadge yellow at count=1, red at count=2
- [ ] RevisionBadge has correct tooltip text
- [ ] PipelineLog collapsed by default, shows event count
- [ ] PipelineLog expands with animation
- [ ] PipelineLog entries show correct timestamps (HH:mm for today, date for older)
- [ ] PipelineLog REVISE entries have expandable issue lists
- [ ] Verdict badges are color-coded (green/yellow/red)

### Integration
- [ ] Feature cards show stage pill when `current_agent` is set
- [ ] Feature cards show red left border when `revision_count >= 2`
- [ ] Feature detail panel shows escalation banner when `revision_count >= 2`
- [ ] Feature detail panel shows PipelineLog in details tab
- [ ] Realtime updates for `current_agent`/`revision_count`/`pipeline_log` render correctly (no full re-render needed — existing Supabase channel handles it)
- [ ] Demo mode works with new fields (no crashes)

### Webhook
- [ ] Approve webhook for status=approved includes feature context (branch_name, spec excerpt, acceptance_criteria)

### Build Quality
- [x] TypeScript compiles with no errors (`npx tsc --noEmit`)
- [x] Build passes (`npm run build`)
- [x] No new lint errors introduced (all existing pre-PR)
- [x] No auth changes
- [x] No new dependencies added

### Schema
- [ ] SQL migration runs cleanly on fresh database
- [ ] SQL migration is idempotent (`IF NOT EXISTS`)
- [ ] Existing features get sensible defaults (null agent, 0 revision_count, empty array log)

---

## Not In Scope (Future Work)
- HBx orchestration auto-routing logic (backend/agent concern, not dashboard)
- Agent prompt templates with structured verdict format
- Actual `escalated` status value in DB — currently uses `revision_count >= 2` as proxy
- Real-time stalled detection push (currently client-side timer)

---

## How to Test
1. Checkout `hbx/pipeline-nervous-system`
2. Run migration `006_pipeline_nervous_system.sql` against Supabase
3. Manually update a feature's `current_agent`, `revision_count`, `pipeline_log` via Supabase SQL editor
4. Verify components render on board and detail panel
5. Test demo mode (no Supabase) — should not crash
