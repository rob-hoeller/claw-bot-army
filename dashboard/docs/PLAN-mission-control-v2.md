# 🚀 Mission Control V2 — Complete Execution Plan

**Date:** 2026-02-26
**Author:** HBx (Master Orchestrator)
**Approved by:** Pending Lance approval
**Target:** Transform the HBx dashboard from a Kanban board into an AI-first Mission Control

---

## Executive Summary

We're replacing the legacy FeatureBoard (1,754-line Kanban designed for human bottlenecks) with a **Mission Control** interface purpose-built for AI agent automation. The new system lets Lance:

1. **Input** what needs to be built (text/screenshot/voice)
2. **Approve** the architect's plan with one click
3. **Watch live** as agents design, build, test, and deploy
4. **Review** the finished product on Vercel
5. **Ship** with automatic PR creation

The defining feature: **Live Agent Activity Streams** — real-time visibility into what every agent is thinking, which files they're editing, and how they're making decisions. This is a war room dashboard.

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                    MISSION CONTROL UI                         │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ 📥 COMMAND BAR — "What do you want built?"              │ │
│  │    [Text Input] [📎 Screenshot] [🎤 Voice] [Submit]     │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌─────────────────────────┐  ┌──────────────────────────┐  │
│  │ MISSION FEED (left)     │  │ DETAIL PANEL (right)     │  │
│  │                         │  │                          │  │
│  │ ⏸️ NEEDS ATTENTION (1)  │  │ ┌──────────────────────┐ │  │
│  │ ┌─────────────────────┐ │  │ │ LIVE PIPELINE        │ │  │
│  │ │ Feature Card        │ │  │ │ (animated 6-step)    │ │  │
│  │ │ [Review] [Approve]  │ │  │ └──────────────────────┘ │  │
│  │ └─────────────────────┘ │  │ ┌──────────────────────┐ │  │
│  │                         │  │ │ AGENT ACTIVITY STREAM│ │  │
│  │ 🤖 ACTIVE MISSIONS (2) │  │ │                      │ │  │
│  │ ┌─────────────────────┐ │  │ │ 🏭 IN2 thinking...  │ │  │
│  │ │ Feature Card + mini │ │  │ │ > Analyzing comp... │ │  │
│  │ │ pipeline animation  │ │  │ │ > Editing Button... │ │  │
│  │ └─────────────────────┘ │  │ │ > Running type...   │ │  │
│  │ ┌─────────────────────┐ │  │ │ ✅ Typecheck pass   │ │  │
│  │ │ Feature Card + mini │ │  │ │ > Committing...     │ │  │
│  │ │ pipeline animation  │ │  │ │ 📦 Handoff → QA     │ │  │
│  │ └─────────────────────┘ │  │ └──────────────────────┘ │  │
│  │                         │  │ ┌──────────────────────┐ │  │
│  │ ✅ COMPLETED (5)        │  │ │ CHAT / ITERATE       │ │  │
│  │ (collapsed)             │  │ │ (refine the request) │ │  │
│  │                         │  │ └──────────────────────┘ │  │
│  │                         │  │ ┌──────────────────────┐ │  │
│  │                         │  │ │ AUDIT TRAIL          │ │  │
│  │                         │  │ │ (handoffs, diffs)    │ │  │
│  │                         │  │ └──────────────────────┘ │  │
│  └─────────────────────────┘  └──────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

---

## The Live Agent Activity Stream

This is the centerpiece. When you click on any active mission, the detail panel shows a **real-time stream** of what the agent is doing:

### Stream Event Types

| Event | Example | Visual |
|-------|---------|--------|
| **Thinking** | "Analyzing component structure for accessibility gaps..." | 💭 italic, dimmed |
| **File Edit** | "Editing `src/components/features/WorkflowCard.tsx` (L145-L182)" | 📝 monospace, syntax highlighted filename |
| **File Create** | "Creating `src/components/mission/CommandBar.tsx`" | ✨ green highlight |
| **Command Run** | "Running `npx tsc --noEmit`" | ⚡ terminal style |
| **Command Result** | "✅ Typecheck passed (0 errors)" or "❌ 3 errors found" | green/red badge |
| **Decision** | "Choosing Framer Motion over CSS animations for smooth step transitions" | 🧠 highlighted box |
| **Handoff** | "Build complete. Packaging handoff for QA (IN6)..." | 📦 amber banner |
| **Human Gate** | "Ready for review. Vercel preview: [link]" | 🔔 red pulse, action buttons |
| **Revision** | "QA found 2 issues. Returning to Build..." | 🔄 yellow banner |

### Data Flow

```
Agent (sessions_spawn) 
  → writes activity events to Supabase `agent_activity` table
  → Supabase Realtime broadcasts to dashboard
  → Dashboard renders in Activity Stream component
  → Auto-scrolls, filterable by step/agent
```

### New Supabase Table: `agent_activity`

```sql
CREATE TABLE agent_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_id UUID REFERENCES features(id),
  agent_id TEXT NOT NULL,
  step_id TEXT NOT NULL,           -- intake|spec|design|build|qa|ship
  event_type TEXT NOT NULL,        -- thinking|file_edit|file_create|command|result|decision|handoff|gate|revision
  content TEXT NOT NULL,           -- human-readable description
  metadata JSONB DEFAULT '{}',    -- file paths, line numbers, command output, etc.
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_activity_feature ON agent_activity(feature_id, created_at DESC);
CREATE INDEX idx_activity_agent ON agent_activity(agent_id, created_at DESC);
```

---

## Workstream Breakdown

### WS1: Mission Control UI Shell
**Agent Team:** IN5 (Design Lead) + IN2 (Build)
**Estimated:** 6-8 hours agent time

#### Files to Create
| File | Purpose | Est. Lines |
|------|---------|-----------|
| `src/components/mission/MissionControl.tsx` | Main layout (replaces FeatureBoard as primary view) | ~200 |
| `src/components/mission/CommandBar.tsx` | Input bar (text/screenshot/voice) | ~250 |
| `src/components/mission/MissionFeed.tsx` | Left panel — grouped card list | ~150 |
| `src/components/mission/MissionCard.tsx` | Compact card with mini pipeline | ~200 |
| `src/components/mission/MissionDetailPanel.tsx` | Right panel — tabbed detail view | ~250 |
| `src/components/mission/AgentActivityStream.tsx` | Live streaming agent output | ~300 |
| `src/components/mission/ActivityEvent.tsx` | Individual event renderers | ~200 |
| `src/components/mission/HumanGate.tsx` | Approval/review action component | ~150 |
| `src/components/mission/mission.types.ts` | Type contracts | ~100 |
| `src/hooks/useAgentActivity.ts` | Realtime subscription for agent_activity | ~80 |
| `src/hooks/useMissionFeed.ts` | Feature grouping + filtering logic | ~80 |

#### Files to Modify
| File | Change |
|------|--------|
| `src/components/Dashboard.tsx` | Replace ActiveWorkflowsBoard import with MissionFeed summary |
| `src/components/Sidebar.tsx` | Add "Mission Control" nav item (replace or sit alongside Features) |
| `src/components/AppShell.tsx` | Add route for mission control |

#### Files to Preserve (reuse as-is)
| File | Why |
|------|-----|
| `LivePipelineView.tsx` | Perfect for detail panel expanded view |
| `PipelineTerminal.tsx` | Reuse for terminal log tab |
| `pipeline.types.ts` | Extend, don't replace |
| `pipeline-utils.ts` | Reuse derivePipelineSteps |
| `audit-trail/*` | Entire audit trail system reused in detail panel |
| `ChatInput.tsx` + `ChatPanel.tsx` | Reuse for iterate/chat tab |

#### Files to Deprecate (after migration)
| File | Reason |
|------|--------|
| `FeatureBoard.tsx` (1,754L) | Replaced by Mission Control. Keep accessible but not default. |
| `FeatureCard.tsx` (113L) | Replaced by MissionCard |
| `ActiveWorkflowsBoard.tsx` (140L) | Absorbed into MissionFeed |

---

### WS2: Pipeline Automation Engine
**Agent Team:** IN1 (Architect) + IN2 (Build) + HBx (Orchestration)
**Estimated:** 8-10 hours agent time

#### The Automation Loop

```
1. User submits via CommandBar
   → Creates feature in Supabase (status: planning)
   → Spawns IN1 (Architect) via sessions_spawn

2. IN1 writes spec + posts to feature chat
   → Writes activity events to agent_activity
   → Updates feature.pipeline_log
   → Sets status to "needs_approval" (human gate)
   → Dashboard shows notification

3. User approves spec
   → API: POST /api/features/[id]/approve
   → Triggers next phase: spawns IN5 (Design)

4. IN5 designs → writes activity → completes → auto-triggers IN2

5. IN2 builds → writes activity → commits → auto-triggers IN6

6. IN6 tests → writes activity → PASS: triggers Ship / FAIL: returns to IN2
   → Max 2 revision loops before escalation

7. Ship phase (HBx):
   → Deploy to Vercel preview
   → Notify user: "Ready for review"
   → User approves → Create PR → Add reviewers → Done
```

#### API Routes to Create
| Route | Purpose |
|-------|---------|
| `POST /api/features/[id]/submit` | User submits new feature from CommandBar |
| `POST /api/features/[id]/advance` | Move feature to next pipeline phase (auto or manual) |
| `POST /api/agent-activity` | Agents write activity events |
| `GET /api/agent-activity/[featureId]` | Fetch activity stream (with Realtime sub) |
| `POST /api/features/[id]/review-verdict` | User approve/revise/reject at human gates |

#### API Routes to Modify
| Route | Change |
|-------|--------|
| `POST /api/features/[id]/start-pipeline` | Wire to actually spawn agents via OpenClaw |
| `POST /api/features/[id]/approve` | Trigger next pipeline phase on approval |

#### Orchestration Script
| File | Purpose |
|------|---------|
| `scripts/pipeline-orchestrator.sh` | Called by API routes to spawn agent sessions with full context |

---

### WS3: Agent Team Coordination
**Agent Team:** HBx (Orchestrator) + IN4 (Skill Builder)
**Estimated:** 3-4 hours

#### What Gets Built
- **Shared context injection**: Every spawned agent gets global knowledge + feature context + schema docs
- **Activity event writer**: Utility function agents call to log what they're doing
- **Handoff packet automation**: Agent completes step → writes handoff → next agent reads it automatically
- **Team memory**: All agents on a feature share a thread in `agent_activity` so they can see what prior agents did

#### Agent Activity Writer (utility for all agents)
```typescript
// Used by every agent during pipeline execution
async function logActivity(params: {
  featureId: string
  agentId: string
  stepId: PipelineStepId
  eventType: 'thinking' | 'file_edit' | 'file_create' | 'command' | 'result' | 'decision' | 'handoff' | 'gate' | 'revision'
  content: string
  metadata?: Record<string, unknown>
})
```

---

### WS4: Database Schema Evolution
**Agent Team:** IN2 (Build)
**Estimated:** 1-2 hours

#### New Tables
| Table | Purpose |
|-------|---------|
| `agent_activity` | Live stream of agent work (see schema above) |

#### Modified Tables
| Table | Changes |
|-------|---------|
| `features` | Add `needs_attention BOOLEAN DEFAULT false`, `attention_type TEXT` (review/approve/error), `vercel_deploy_url TEXT` |

#### Migration File
`supabase/migrations/003_mission_control.sql`

---

### WS5: Agent Network Cleanup
**Agent Team:** HBx (Orchestrator)
**Estimated:** 1 hour

| Task | Details |
|------|---------|
| Remove duplicate agent dirs | Delete lowercase `hbx`, `hbx_in1`, `hbx_in2`, `hbx_sp1` |
| Remove stale root files | Delete `HBx_*.md` prefixed files from workspace root |
| Update SL1/SL2 status | Either deploy or mark as "standby" in Supabase |
| Verify all agent configs | Ensure Supabase ↔ local dirs are in sync |

---

### WS6: Legacy Bridge Discovery (Phase 1 only)
**Agent Team:** IN3 (Research Lab)
**Estimated:** 2-3 hours

| Task | Deliverable |
|------|-------------|
| Document legacy LAMP stack | Tables, endpoints, business logic inventory |
| Map data relationships | Entity relationship diagram |
| Identify integration points | Which legacy APIs can we call? |
| Propose bridge architecture | REST bridge? Direct DB read? Event-driven? |
| Deliverable: `docs/LEGACY-BRIDGE-DISCOVERY.md` | Full analysis |

*Note: Requires Lance to provide access/docs for the legacy system*

---

## Execution Order

```
Phase 1 (Parallel — Day 1):
  ├── WS4: Database migration (IN2) — 1-2 hrs, unblocks everything
  ├── WS5: Agent cleanup (HBx) — 1 hr, housekeeping
  └── WS1a: Mission Control types + shell layout (IN5) — 2 hrs

Phase 2 (Parallel — Day 1-2):
  ├── WS1b: Mission Control components (IN5 + IN2) — 4-6 hrs
  ├── WS2a: Pipeline API routes (IN2) — 3-4 hrs
  └── WS3: Agent team coordination utilities (IN4) — 3-4 hrs

Phase 3 (Sequential — Day 2):
  ├── WS2b: Wire pipeline automation end-to-end (IN1 + IN2 + HBx) — 4-5 hrs
  └── WS1c: Integration testing + polish (IN6) — 2-3 hrs

Phase 4 (Parallel — Day 3):
  ├── WS6: Legacy bridge discovery (IN3) — 2-3 hrs
  └── Full system QA + Vercel deploy + PR (IN6 + HBx) — 2-3 hrs
```

**Total estimated agent time:** ~25-35 hours
**Wall clock with parallel agents:** ~2-3 days

---

## Agent Team Assignments

| Agent | Role in This Build | Workstreams |
|-------|-------------------|-------------|
| **HBx** | Orchestrator — routes work, enforces quality, ships | WS2, WS5, Final Ship |
| **IN1** | Architect — designs the pipeline automation flow | WS2 |
| **IN2** | Code Factory — builds components, APIs, migrations | WS1, WS2, WS4 |
| **IN3** | Research Lab — legacy system discovery | WS6 |
| **IN4** | Skill Builder — agent coordination utilities | WS3 |
| **IN5** | UI/UX Expert — designs Mission Control layout | WS1 |
| **IN6** | QA Engineer — tests everything before ship | WS1c, Phase 4 |

All agents share:
- Global Knowledge Base (`/global-knowledge/`)
- Code Factory Constitution (`CODE-FACTORY.md`)
- Full Supabase schema awareness
- Feature context and pipeline state
- Agent activity stream (can see what other agents did)

---

## Success Criteria

- [ ] Mission Control renders with live data (no demo/mock data)
- [ ] User can input a new feature via CommandBar
- [ ] Feature flows through 6-step pipeline with real agent execution
- [ ] Live Agent Activity Stream shows real-time agent work
- [ ] Human gates pause pipeline and notify user
- [ ] User can approve/revise/reject at each gate
- [ ] QA passes before human review (100% testing)
- [ ] PR auto-created with reviewers on final approval
- [ ] Dashboard can display multiple active missions simultaneously
- [ ] All agents coordinate through shared context, not isolation
- [ ] FeatureBoard preserved but not default (accessible via nav)
- [ ] Zero regressions on existing functionality (chat, agents page, monitoring)

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| FeatureBoard removal breaks things | Keep it accessible, deprecate gradually |
| Agent activity table gets huge | TTL policy: auto-delete events >30 days |
| Pipeline gets stuck | Stalled detection (existing 5-min threshold) + escalation |
| Agents produce low-quality output | QA gate is mandatory, max 2 revisions before human escalation |
| Parallel agents conflict on files | Each workstream has clear file ownership, no overlap |

---

## Approval

**Lance:** Review this plan. When you approve, I will:
1. Run the database migration immediately
2. Clean up the agent network
3. Spawn the full agent team with workstream assignments
4. Monitor progress and report back at each phase completion

**Say "approved" to begin.**
