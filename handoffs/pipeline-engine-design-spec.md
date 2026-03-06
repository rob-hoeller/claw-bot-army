# Design Spec: Pipeline Automation Engine — Auto-Route, Auto-Advance, Audit Trail

**Feature ID:** f8e3b0c8-709e-4c68-943e-4da1d8fe5785  
**Author:** HBx_IN1 (Product Architect)  
**Date:** 2026-03-06  
**Priority:** Urgent  
**Status:** design_review → handoff to IN2  
**Complexity:** L  

---

## 1. Architecture Overview

### Problem
The pipeline state machine exists (`/src/lib/pipeline-engine.ts`) and the `run-pipeline` endpoint drives features through steps with simulated activity. But **nothing triggers it automatically**:
- Features created from chat sit in `pending` forever unless someone manually approves
- Phase transitions after human gates require manual API calls
- The `run-pipeline` endpoint uses fake `setTimeout` delays and mock activity — no real agent work happens
- No structured audit trail beyond the `pipeline_log` JSON array on the feature row
- No webhook/notification system to wake HBx when a gate is cleared

### Solution: Three New Components

```
┌─────────────────────────────────────────────────────────┐
│                   Dashboard (Next.js)                    │
├─────────────┬──────────────────┬────────────────────────┤
│  1. Router  │  2. Phase Runner │  3. Audit Service      │
│  Service    │  (Agent Spawner) │  (Event Log)           │
├─────────────┼──────────────────┼────────────────────────┤
│ Watches for │ Spawns real CCA  │ Writes immutable       │
│ status      │ sessions per     │ audit_events rows      │
│ changes,    │ phase, parses    │ with actor, action,    │
│ routes to   │ verdicts, calls  │ handoff packet ref,    │
│ next phase  │ advance API      │ and timestamps         │
└─────────────┴──────────────────┴────────────────────────┘
         ▲               ▲                ▲
         │               │                │
    Supabase         OpenClaw          Supabase
    Realtime         Gateway API       Insert
    (pg_notify)      (sessions_spawn)
```

**Component 1 — Router Service** (`/src/lib/pipeline-router.ts`)  
Server-side module that determines the next action when a feature's status changes. Called by API routes after any status mutation. Replaces the current inline routing logic scattered across `run-pipeline`, `auto-advance`, and `advance` routes.

**Component 2 — Phase Runner** (`/src/lib/phase-runner.ts`)  
Replaces the fake `runStep()` in `run-pipeline/route.ts`. For non-human-gate phases, calls the OpenClaw gateway to spawn a real CCA sub-agent with the appropriate prompt template and handoff context. Listens for the CCA's structured verdict response.

**Component 3 — Audit Service** (`/src/lib/audit-service.ts`)  
Centralizes all event logging. Every state transition, verdict, handoff, and human action writes to a new `audit_events` table. Replaces ad-hoc `agent_activity` inserts scattered across routes.

---

## 2. Database Schema Changes

### New Table: `audit_events`

```sql
CREATE TABLE audit_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_id    UUID NOT NULL REFERENCES features(id) ON DELETE CASCADE,
  event_type    TEXT NOT NULL,        -- 'phase_start' | 'phase_complete' | 'verdict' | 'handoff' | 'gate_approval' | 'revision' | 'escalation' | 'error'
  actor_type    TEXT NOT NULL,        -- 'agent' | 'human' | 'system'
  actor_id      TEXT NOT NULL,        -- agent ID (e.g. 'HBx_IN2') or user ID
  from_step     TEXT,                 -- pipeline step ID before transition
  to_step       TEXT,                 -- pipeline step ID after transition
  from_status   TEXT,                 -- feature status before
  to_status     TEXT,                 -- feature status after
  verdict       TEXT,                 -- 'APPROVED' | 'COMPLETE' | 'SHIP' | 'REVISE' | 'REJECT' | null
  handoff_packet JSONB,              -- structured handoff data (spec summary, file list, notes)
  metadata      JSONB DEFAULT '{}',  -- extensible (revision_count, error details, CCA session_id, etc.)
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_events_feature ON audit_events(feature_id);
CREATE INDEX idx_audit_events_created ON audit_events(created_at DESC);
CREATE INDEX idx_audit_events_type ON audit_events(event_type);
```

### New Columns on `features` Table

```sql
ALTER TABLE features ADD COLUMN IF NOT EXISTS
  last_audit_event_id UUID REFERENCES audit_events(id);
-- Denormalized pointer to latest event for quick status display
```

### No Changes To
- `agent_activity` table (keep for backward compat, phase-runner can dual-write during migration)
- Auth tables
- Any other existing tables

---

## 3. File Scope

### New Files

| File | Purpose |
|------|---------|
| `src/lib/pipeline-router.ts` | Routing logic: given a feature + event, determine next step/action |
| `src/lib/phase-runner.ts` | Spawn CCA agents per phase, collect verdicts |
| `src/lib/audit-service.ts` | Centralized audit event writer |
| `src/lib/pipeline-constants.ts` | Extract step configs, status maps, gate definitions from pipeline-engine.ts |
| `src/app/api/features/[id]/pipeline-webhook/route.ts` | Webhook endpoint for CCA verdict callbacks |
| `supabase/migrations/YYYYMMDD_audit_events.sql` | Migration for audit_events table |

### Modified Files

| File | Changes |
|------|---------|
| `src/lib/pipeline-engine.ts` | Refactor: extract constants to `pipeline-constants.ts`, simplify `advanceFeature` to delegate to router + audit service |
| `src/app/api/features/[id]/run-pipeline/route.ts` | Replace fake `runStep()` with real phase-runner calls; remove setTimeout simulations |
| `src/app/api/features/[id]/auto-advance/route.ts` | Simplify to: call router → phase-runner → audit-service |
| `src/app/api/features/[id]/advance/route.ts` | Add audit-service call on every verdict |
| `src/app/api/features/[id]/approve/route.ts` | Add audit event for human gate approval |
| `src/app/api/features/[id]/start-pipeline/route.ts` | Add audit event for pipeline start, call router |
| `src/components/features/audit-trail/AuditTrailTab.tsx` | Query `audit_events` table instead of/alongside `agent_activity` |
| `src/components/features/audit-trail/types.ts` | Add `AuditEvent` type matching new table |

### Do NOT Touch
- Auth logic / Supabase auth flow
- AppShell, Header, Sidebar
- Any component outside `/features/`
- Environment variables (use existing `SUPABASE_SERVICE_ROLE_KEY` and `NEXT_PUBLIC_SUPABASE_URL`)

---

## 4. API Endpoints

### Existing (Modified)

| Endpoint | Method | Changes |
|----------|--------|---------|
| `/api/features/[id]/run-pipeline` | POST | Replace mock activities with phase-runner; write audit events |
| `/api/features/[id]/advance` | POST | Add audit-service writes |
| `/api/features/[id]/auto-advance` | POST | Simplify, delegate to router |
| `/api/features/[id]/approve` | POST | Write `gate_approval` audit event, then trigger auto-advance |
| `/api/features/[id]/start-pipeline` | POST | Write `phase_start` audit event for intake |

### New

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/features/[id]/pipeline-webhook` | POST | Receives structured verdict from CCA agents. Validates verdict JSON, writes audit event, calls router to determine next action, triggers phase-runner for next step if auto-advance. |
| `/api/features/[id]/audit-log` | GET | Returns paginated audit_events for a feature. Query params: `limit`, `offset`, `event_type`. Used by AuditTrailTab. |

---

## 5. State Machine Definition

### Pipeline Steps with Gate Classification

| Step | Agent | Auto-Advance? | Human Gate? | Trigger |
|------|-------|---------------|-------------|---------|
| **Intake** | HBx | ✅ Yes | No | Feature created → auto-route to spec |
| **Spec** | HBx_IN1 | ❌ No | ✅ Yes | CCA completes spec → pause for human approval |
| **Design** | HBx_IN5 | ✅ Yes | No | Spec approved → auto-spawn design CCA → auto-advance on APPROVED verdict |
| **Build** | HBx_IN2 | ✅ Yes | No | Design done → auto-spawn build CCA → auto-advance on COMPLETE verdict |
| **QA** | HBx_IN6 | ✅ Yes (conditional) | No | Build done → auto-spawn QA CCA → SHIP auto-advances to ship; REVISE loops back to build (max 2) |
| **Ship** | HBx | ❌ No | ✅ Yes | QA passes → pause for human approval to merge/deploy |

### Verdict → Action Matrix

| Current Step | Verdict | Action |
|-------------|---------|--------|
| Any | `APPROVED` / `COMPLETE` | Write audit event → advance to next step → if next step is auto-advance, spawn CCA |
| Any | `SHIP` | Write audit event → advance to ship → pause at human gate |
| QA | `REVISE` (loop ≤ 2) | Write audit event → return to build → spawn build CCA with revision notes |
| QA | `REVISE` (loop > 2) | Write audit event → set `needs_attention=true, attention_type='error'` → escalate |
| Any | `REJECT` | Write audit event → set status `cancelled` → notify human |
| Spec gate | Human `approve` | Write `gate_approval` audit event → trigger design phase |
| Ship gate | Human `approve` | Write `gate_approval` audit event → create PR → mark `pr_submitted` |

### Auto-Routing on Feature Creation

When a feature is inserted with status `pending`:
1. Router detects new feature (called from `/api/features` POST route)
2. Sets `current_step=intake`, `current_agent=HBx`
3. Writes `phase_start` audit event
4. Since intake is auto-advance, immediately sets `current_step=spec`, spawns IN1 CCA
5. Writes `handoff` audit event with routing ticket

---

## 6. Acceptance Criteria

### Core Automation
- [ ] New features auto-route from `pending` → `intake` → `spec` without manual intervention
- [ ] CCA agents are spawned at each non-gate phase (design, build, QA) via OpenClaw gateway
- [ ] Structured verdict JSON from CCAs is parsed and drives state transitions
- [ ] Human gates at spec and ship properly pause the pipeline and set `needs_attention=true`
- [ ] Human approval at gates triggers auto-advance through subsequent auto-advance phases
- [ ] QA REVISE loops back to build (max 2 loops), then escalates

### Audit Trail
- [ ] Every phase transition writes an `audit_events` row with actor, timestamps, from/to state
- [ ] Every verdict (agent or human) is recorded with the full verdict payload
- [ ] Handoff packets (spec summary, file list, notes) are stored in `audit_events.handoff_packet`
- [ ] `AuditTrailTab` displays events from `audit_events` table with proper formatting
- [ ] Audit log is append-only — no updates or deletes

### Quality Gates (per Code Factory Constitution)
- [ ] TypeScript strict — no `any` types in new code
- [ ] All new API routes include error handling with proper HTTP status codes
- [ ] Loading/error/empty states for any new UI (audit log pagination)
- [ ] No console.log spam — use structured error reporting
- [ ] No auth or unrelated schema changes
- [ ] Existing `pipeline-engine.ts` exports remain backward-compatible
- [ ] Build passes (`next build`)
- [ ] Lint passes

### Integration
- [ ] Existing `FeatureBoard.tsx` realtime subscriptions continue to work (status field updates still drive board)
- [ ] Existing `run-pipeline` endpoint behavior preserved as fallback (mock mode) via env flag
- [ ] `agent_activity` table continues to receive writes during transition period

---

## 7. Constraints

| Constraint | Detail |
|------------|--------|
| **Stack** | Next.js App Router + Supabase only. No new infrastructure. |
| **No new dependencies** | Use existing packages only (supabase-js, etc.) |
| **Backward compat** | All existing exports from `pipeline-engine.ts` must remain. Old `run-pipeline` mock mode available via `PIPELINE_MOCK_MODE=true` env var. |
| **No auth changes** | Do not modify Supabase auth flow or RLS policies |
| **File boundaries** | Only touch files listed in Section 3 |
| **Incremental delivery** | Can be built in 3 PRs: (1) audit_events table + audit-service, (2) pipeline-router + phase-runner, (3) API route refactors + UI updates |
| **Gateway dependency** | Phase-runner calls OpenClaw gateway API. If gateway is unavailable, fall back to mock mode and set `needs_attention=true` with error. |

---

## 8. Implementation Notes for IN2

### Suggested Build Order

**PR 1 — Foundation (audit-service + schema)**
1. Create migration: `audit_events` table + indexes
2. Create `src/lib/audit-service.ts` with `writeAuditEvent()` function
3. Create `src/lib/pipeline-constants.ts` — extract from `pipeline-engine.ts`
4. Add `GET /api/features/[id]/audit-log` endpoint
5. Update `AuditTrailTab.tsx` to query new endpoint

**PR 2 — Router + Phase Runner**
1. Create `src/lib/pipeline-router.ts` — pure function: `(feature, event) → { nextStep, action }`
2. Create `src/lib/phase-runner.ts` — spawns CCA via gateway, returns verdict
3. Create `POST /api/features/[id]/pipeline-webhook` for CCA callbacks
4. Add `PIPELINE_MOCK_MODE` env flag

**PR 3 — Wire It Up**
1. Refactor `run-pipeline/route.ts` to use router + phase-runner
2. Refactor `advance/route.ts` and `auto-advance/route.ts`
3. Update `approve/route.ts` and `start-pipeline/route.ts` to write audit events and trigger auto-advance
4. Add auto-routing on feature creation in `/api/features/route.ts` POST handler

### CCA Verdict Contract

Every CCA spawned by phase-runner must return this JSON block in its final message:

```json
{
  "verdict": "APPROVED | COMPLETE | SHIP | REVISE | REJECT",
  "feature_id": "uuid",
  "agent": "HBx_IN1 | HBx_IN5 | HBx_IN2 | HBx_IN6",
  "handoff_packet": {
    "summary": "What was done",
    "files_changed": ["path/to/file.tsx"],
    "notes": "Any notes for next phase",
    "issues": []
  }
}
```

Phase-runner parses this from the CCA response and POSTs it to the pipeline-webhook endpoint.

### Router Decision Table (pseudocode)

```typescript
function route(feature: Feature, event: AuditEvent): RouteAction {
  if (event.verdict === 'REJECT') return { action: 'cancel' }
  if (event.verdict === 'REVISE' && feature.revision_count >= 2) return { action: 'escalate' }
  if (event.verdict === 'REVISE') return { action: 'loop_back', target: 'build' }
  
  const nextStep = getNextStep(feature.current_step)
  if (!nextStep) return { action: 'complete' }
  if (nextStep.humanGate) return { action: 'pause_at_gate', step: nextStep }
  return { action: 'auto_advance', step: nextStep }
}
```

---

*End of design spec. Ready for IN2 handoff.*
