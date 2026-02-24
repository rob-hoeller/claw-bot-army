# Feature Spec: Feature Card Audit Trail & Collaboration Hub

**Feature ID:** `05610cd9-7132-44b8-8ed1-d2a67e097010`  
**Author:** IN1 (Product Architect)  
**Date:** 2026-02-24  
**Status:** `design_review` → IN5 next  

---

## 1. Overview

Transform the pizza tracker progress bar from a passive status indicator into an interactive audit trail and collaboration hub. Each pipeline phase becomes an expandable panel showing structured handoff packets — the complete record of what each agent did, decided, produced, and handed off.

---

## 2. Database Schema Changes

### 2.1 New Table: `handoff_packets`

The core audit record. One row per phase per version. Immutable once `status = 'completed'`.

```sql
CREATE TABLE handoff_packets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_id UUID NOT NULL REFERENCES features(id) ON DELETE CASCADE,
  phase TEXT NOT NULL CHECK (phase IN ('planning','design_review','in_progress','qa_review','review','approved','pr_submitted','done')),
  version INT NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress','completed','rejected','skipped')),

  -- Who did the work
  agent_id TEXT,
  agent_type TEXT CHECK (agent_type IN ('ai_agent','human')),
  agent_name TEXT,

  -- Timing
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  duration_ms INT GENERATED ALWAYS AS (
    CASE WHEN completed_at IS NOT NULL
      THEN EXTRACT(EPOCH FROM (completed_at - started_at))::INT * 1000
      ELSE NULL
    END
  ) STORED,

  -- Cost (AI phases)
  cost_tokens_in INT,
  cost_tokens_out INT,
  cost_usd NUMERIC(10,6),

  -- Input context
  input_source_phase TEXT,
  input_source_packet_id UUID REFERENCES handoff_packets(id),
  input_context JSONB DEFAULT '{}',

  -- Output
  output_summary TEXT,
  output_artifacts JSONB DEFAULT '[]',   -- Array of {type, title, content?, url?, mime_type}
  output_decisions JSONB DEFAULT '[]',   -- Array of {question, chosen, alternatives[], rationale, decided_by}
  output_metrics JSONB DEFAULT '{}',     -- Phase-specific KPIs (e.g. {test_pass_rate: 0.95})

  -- Revision tracking
  previous_version_id UUID REFERENCES handoff_packets(id),
  rejection_reason TEXT,
  diff_from_previous JSONB,              -- {added:[], removed:[], changed:[], full_diff?}

  -- Activity sub-log within this phase
  activity_log JSONB DEFAULT '[]',       -- Array of {timestamp, actor, action, detail}

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(feature_id, phase, version)
);

CREATE INDEX idx_hp_feature ON handoff_packets(feature_id);
CREATE INDEX idx_hp_feature_phase ON handoff_packets(feature_id, phase, version);
CREATE INDEX idx_hp_status ON handoff_packets(status) WHERE status = 'in_progress';
```

### 2.2 New Table: `phase_chat_messages`

Scoped to Plan and Review phases only (enforced at API layer, not DB constraint for flexibility).

```sql
CREATE TABLE phase_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  handoff_packet_id UUID NOT NULL REFERENCES handoff_packets(id) ON DELETE CASCADE,
  feature_id UUID NOT NULL REFERENCES features(id) ON DELETE CASCADE,
  phase TEXT NOT NULL,

  author_id TEXT NOT NULL,
  author_type TEXT NOT NULL CHECK (author_type IN ('ai_agent','human')),
  author_name TEXT NOT NULL,
  author_avatar TEXT,

  content TEXT NOT NULL,                 -- Markdown with mention tokens: <@agent:IN1> <@user:Lance>
  mentions TEXT[] DEFAULT '{}',          -- Entity IDs mentioned

  created_at TIMESTAMPTZ DEFAULT now(),
  edited_at TIMESTAMPTZ
);

CREATE INDEX idx_pcm_packet ON phase_chat_messages(handoff_packet_id, created_at);
CREATE INDEX idx_pcm_feature_phase ON phase_chat_messages(feature_id, phase, created_at);
```

### 2.3 New Table: `feature_epics` (Phase 5)

For module-scale chaining.

```sql
CREATE TABLE feature_epics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active',
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Junction: features belong to epics (many-to-many)
CREATE TABLE epic_features (
  epic_id UUID NOT NULL REFERENCES feature_epics(id) ON DELETE CASCADE,
  feature_id UUID NOT NULL REFERENCES features(id) ON DELETE CASCADE,
  sort_order INT DEFAULT 0,
  depends_on_feature_id UUID REFERENCES features(id),
  depends_on_phase TEXT,                 -- Don't start until dependency reaches this phase
  PRIMARY KEY (epic_id, feature_id)
);
```

### 2.4 RLS Policies

```sql
-- handoff_packets: read for all authenticated, write for service role only
ALTER TABLE handoff_packets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hp_read" ON handoff_packets FOR SELECT USING (true);
CREATE POLICY "hp_write" ON handoff_packets FOR ALL USING (auth.role() = 'service_role');

-- phase_chat_messages: read for all, insert for authenticated
ALTER TABLE phase_chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pcm_read" ON phase_chat_messages FOR SELECT USING (true);
CREATE POLICY "pcm_insert" ON phase_chat_messages FOR INSERT WITH CHECK (true);
```

---

## 3. Migration File

See: `/home/ubuntu/.openclaw/workspace/database/migrations/007_audit_trail_handoff_packets.sql`

---

## 4. API Routes

### Phase 1 APIs

| Method | Route | Purpose |
|--------|-------|---------|
| `GET` | `/api/features/[id]/handoff-packets` | Get all handoff packets for a feature (ordered by phase, version) |
| `GET` | `/api/features/[id]/handoff-packets/[packetId]` | Get single packet with full detail |
| `POST` | `/api/features/[id]/handoff-packets` | Create/update handoff packet (agent-only, service role) |
| `PATCH` | `/api/features/[id]/handoff-packets/[packetId]` | Update in-progress packet (append activity, set outputs) |
| `POST` | `/api/features/[id]/handoff-packets/[packetId]/complete` | Mark packet completed, compute duration |

### Phase 3 APIs

| Method | Route | Purpose |
|--------|-------|---------|
| `GET` | `/api/features/[id]/phases/[phase]/chat` | Get chat messages for a phase |
| `POST` | `/api/features/[id]/phases/[phase]/chat` | Send a chat message (with @-mentions) |

### Phase 4 APIs

| Method | Route | Purpose |
|--------|-------|---------|
| `GET` | `/api/features/[id]/handoff-packets/[packetId]/diff` | Get diff between this version and previous |

---

## 5. Frontend Components

### 5.1 Component Tree (New/Modified)

```
FeatureDetailPanel (MODIFIED)
├── PipelineProgress (MODIFIED → interactive, clickable steps)
├── ExpandableStepPanel (NEW) — one per pipeline phase
│   ├── StepPanelHeader — status icon, phase name, duration, revision badge, expand toggle
│   ├── StepPanelContent (lazy-loaded on expand)
│   │   ├── HandoffPacketSummary — agent info, summary text
│   │   ├── ArtifactChips — clickable chips for outputs
│   │   ├── DecisionLog — expandable list of decisions made
│   │   ├── ActivityTimeline — mini activity feed within phase
│   │   └── CostBadge — tokens + USD
│   ├── VersionSelector (conditional, if version > 1)
│   └── DiffView (Phase 4, toggleable)
├── PhaseChatPanel (NEW, Phase 3) — shown for planning/review only
│   ├── ChatMessageFeed
│   ├── MentionAutocomplete
│   └── ChatInput
└── Tabs: Details | Audit Trail | Specs | Chat
```

### 5.2 Key Component: `ExpandableStepPanel`

```tsx
// Props
interface ExpandableStepPanelProps {
  featureId: string;
  phase: PipelinePhase;
  currentStatus: FeatureStatus;
  isActive: boolean;        // true if this is the current phase
  isComplete: boolean;
  packets: HandoffPacket[]; // All versions for this phase
}
```

**Behavior:**
- Collapsed by default (except active phase)
- Click header to toggle expand
- Lazy-fetch packet content on first expand (cache after)
- Show revision badge if `packets.length > 1`
- Active phase shows pulsing indicator
- Duration always visible in header

### 5.3 Modifications to `PipelineProgress`

Current: Non-interactive colored bars  
New: Clickable step indicators that scroll/focus the corresponding `ExpandableStepPanel`

### 5.4 New Detail Panel Tab: "Audit Trail"

Replace or augment the existing "Details" tab with an "Audit Trail" tab that shows the vertical stepper with expandable panels (per research UX wireframe).

---

## 6. Data Flow

### 6.1 How Agents Write Handoff Packets

Pipeline agents already write to `pipeline_log` JSONB on the features table. We add a parallel write to `handoff_packets`:

```
Agent starts phase work:
  1. INSERT INTO handoff_packets (feature_id, phase, version, status='in_progress', agent_id, agent_name, agent_type, started_at)
  2. As work proceeds: PATCH to append activity_log entries
  3. On completion: POST /complete with output_summary, output_artifacts, output_decisions, output_metrics
  4. On rejection (kicked back): INSERT new row with version+1, previous_version_id, rejection_reason
```

**Integration point:** Modify the existing pipeline agent code (the orchestrator that calls IN1→IN5→IN2→IN6→review) to create handoff packets at each transition. This is additive — existing `pipeline_log` JSONB continues working as fallback.

### 6.2 How Frontend Reads Them

```
FeatureDetailPanel mounts:
  1. Fetch GET /api/features/[id]/handoff-packets → array of packets grouped by phase
  2. Render ExpandableStepPanel for each phase
  3. Subscribe to Supabase Realtime on handoff_packets where feature_id = X
  4. On INSERT/UPDATE → update local state, auto-expand if active phase
```

### 6.3 Realtime

```sql
-- Enable realtime on new tables
ALTER PUBLICATION supabase_realtime ADD TABLE handoff_packets;
ALTER PUBLICATION supabase_realtime ADD TABLE phase_chat_messages;
```

---

## 7. Phased Delivery Plan

### Phase 1: Handoff Packets + Expandable Panels (Read-Only) ⬅️ START HERE
**Scope:**
- Migration: `handoff_packets` table
- API: CRUD for handoff packets
- Frontend: `ExpandableStepPanel` component, new "Audit Trail" tab
- Agent integration: Modify pipeline orchestrator to write handoff packets at each phase transition
- Realtime subscription for live updates

**Estimate:** 2-3 days  
**Dependencies:** None  
**Deliverable:** Users can click pipeline steps and see structured audit data

### Phase 2: Time-in-Phase Tracking + Cost Display
**Scope:**
- Duration computed column already in schema
- Frontend: Duration badges with percentile-based color coding (green/yellow/red)
- Cost display: tokens + USD per phase, total at feature level
- Historical percentile computation (background job or materialized view)

**Estimate:** 1 day  
**Dependencies:** Phase 1  
**Deliverable:** Bottleneck visibility, cost transparency

### Phase 3: Targeted Chat on Plan + Review
**Scope:**
- Migration: `phase_chat_messages` table
- API: Chat CRUD endpoints
- Frontend: `PhaseChatPanel` with `MentionAutocomplete`
- @-mention system: `<@agent:IN1>` tokens, autocomplete dropdown
- Supabase Realtime for live chat
- Notification hooks when agents are @-mentioned

**Estimate:** 2 days  
**Dependencies:** Phase 1  
**Deliverable:** Human-agent chat at decision points

### Phase 4: Diff View on Revisions
**Scope:**
- Diff computation: Compare `output_artifacts` and `output_summary` between versions
- Frontend: `DiffView` component (inline additions/deletions)
- Version selector dropdown on phases with v2+
- Use `diff-match-patch` or similar library for text diffing

**Estimate:** 1-2 days  
**Dependencies:** Phase 1 (needs version data)  
**Deliverable:** Clear visibility into what changed on rework

### Phase 5: Module/Epic Chaining
**Scope:**
- Migration: `feature_epics` + `epic_features` tables
- API: Epic CRUD, feature-to-epic linking
- Frontend: Epic view with parallel pipeline visualization
- Cross-feature dependency tracking
- Aggregate progress bars

**Estimate:** 3-4 days  
**Dependencies:** Phases 1-2  
**Deliverable:** Features chainable into larger modules

---

## 8. Acceptance Criteria

### Phase 1
1. A `handoff_packets` table exists in Supabase with proper indexes and RLS policies.
2. When a pipeline agent completes a phase, a handoff packet row is created with: agent info, started_at, completed_at, output_summary, and at least one artifact.
3. The feature detail panel has an "Audit Trail" tab showing a vertical stepper with one panel per pipeline phase.
4. Clicking a phase step expands it to show the handoff packet: agent, summary, artifacts, decisions.
5. Completed phases show a green check icon; the active phase shows a pulsing indicator; future phases show empty circles.
6. Handoff packet content is lazy-loaded on first expand and cached client-side.
7. Realtime: when an agent writes a handoff packet, it appears in the UI within 2 seconds without page refresh.
8. If a phase has multiple versions (rework), a revision badge shows "⟲ N revisions" on the collapsed header.

### Phase 2
9. Duration is displayed next to each phase name in the stepper (e.g., "Build — 4h 20m").
10. Duration is color-coded: green (fast), yellow (average), red (slow) relative to historical averages.
11. Cost per phase (tokens in/out, USD) is shown in the expanded panel.
12. A total cost summary is visible at the feature level.

### Phase 3
13. Plan and Review phases show a "Chat" button in their expanded panel.
14. Clicking Chat opens a message feed scoped to that phase's handoff packet.
15. Typing `@` in the chat input triggers an autocomplete dropdown of agents and team members.
16. Sent messages with @-mentions render mentioned names as styled badges.
17. Chat messages appear in realtime for all viewers via Supabase Realtime.
18. Chat is NOT available on Design, Build, Test, Approved, PR, or Done phases.

### Phase 4
19. Phases with version > 1 show a version selector dropdown.
20. A "Show Diff" toggle renders inline additions (green) and deletions (red) between the selected version and the previous one.
21. Diff covers: output_summary, output_artifacts content, and output_decisions.

### Phase 5
22. An "Epics" section exists for grouping features.
23. Features can be linked to an epic with optional dependency configuration.
24. Epic view shows all child features' pipeline steppers in a parallel layout.
25. A feature with a `depends_on` constraint cannot start its pipeline until the dependency reaches the specified phase.

---

## 9. Technical Notes

- **Backward compatibility:** The existing `pipeline_log` JSONB column on `features` continues to work. Handoff packets are a parallel, structured system. The UI can fall back to `pipeline_log` rendering if no handoff packets exist for a feature.
- **Immutability:** Completed handoff packets should not be mutated. New versions create new rows. This is enforced at the API layer with a check: reject PATCH on packets where `status = 'completed'`.
- **Migration safety:** All new tables, no column changes to `features`. Zero-downtime deployment.
- **Bundle size:** `DiffView` component (Phase 4) should be dynamically imported to avoid loading diff libraries upfront.

---

## 10. Handoff to IN5

**For IN5 (Design Review):**
- This spec is ready for design review.
- Key design decisions needed from IN5:
  1. Vertical stepper placement — new tab vs replacing the existing progress bar inline?
  2. Expanded panel max-height and scroll behavior
  3. Mobile responsiveness for expanded panels
  4. Animation style for expand/collapse (spring vs ease)
  5. Color palette for phase status indicators
- The research report at `/research/audit-trail-research.md` contains UX wireframes and competitive analysis.
- Phase 1 is the minimum viable delivery. Phases 2-5 are additive.
