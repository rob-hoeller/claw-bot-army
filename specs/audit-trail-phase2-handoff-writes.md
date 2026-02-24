# Audit Trail Phase 2 — Handoff Packet Writes + Time/Cost Tracking

**Feature ID:** `bef9dd1c-a252-4b36-8488-403c6deac048`  
**Status:** `design_review`  
**Author:** IN1 (Product Architect)  
**Date:** 2026-02-24  

---

## 1. Overview

Phase 1 created the `handoff_packets` table, the GET API, and the UI (progress bar, step panels, event timeline). But nothing writes to the table yet — panels show "No handoff data."

Phase 2 adds:
1. A **POST API route** to write handoff packets with validation and auto-enrichment
2. **Orchestrator integration** — HBx calls the API after each sub-agent phase completes
3. **Time and cost tracking** — duration_ms, cost_usd, token counts captured per phase

---

## 2. Existing Schema (handoff_packets table)

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | auto-generated |
| `feature_id` | uuid FK→features | required |
| `phase` | text | pipeline phase key |
| `version` | integer | default 1 |
| `status` | text | default 'in_progress' |
| `agent_id` | text | e.g. 'IN1', 'IN2' |
| `agent_type` | text | e.g. 'architect', 'builder' |
| `agent_name` | text | e.g. 'Product Architect' |
| `started_at` | timestamptz | default now() |
| `completed_at` | timestamptz | nullable |
| `duration_ms` | integer | nullable |
| `cost_tokens_in` | integer | nullable |
| `cost_tokens_out` | integer | nullable |
| `cost_usd` | numeric | nullable |
| `input_source_phase` | text | previous phase key |
| `input_source_packet_id` | uuid FK→self | nullable |
| `input_context` | jsonb | context passed in |
| `output_summary` | text | handoff summary |
| `output_artifacts` | jsonb | files created/modified |
| `output_decisions` | jsonb | key decisions |
| `output_metrics` | jsonb | quality/perf metrics |
| `previous_version_id` | uuid FK→self | for revisions |
| `rejection_reason` | text | if rejected |
| `diff_from_previous` | jsonb | delta from prev version |
| `activity_log` | jsonb | event timeline |
| `created_at` | timestamptz | auto |
| `updated_at` | timestamptz | auto |

---

## 3. Phase Mapping

| phase_order | phase key | phase_label | Agent | agent_type |
|-------------|-----------|-------------|-------|------------|
| 1 | `planning` | Planning | IN1 | architect |
| 2 | `design_review` | Design | IN1 | architect |
| 3 | `in_progress` | Build | IN2 | builder |
| 4 | `qa_review` | Test | IN6 | qa |
| 5 | `review` | Review | IN1 | architect |
| 6 | `approved` | Approved | HBx | orchestrator |
| 7 | `pr_submitted` | PR Submitted | IN2 | builder |
| 8 | `done` | Done | HBx | orchestrator |

The POST API auto-resolves `phase` → `phase_order` and `phase_label` using this map. Callers only need to provide `phase`.

---

## 4. POST API Route

### Endpoint

```
POST /api/features/[id]/handoff-packets
```

### File Location

```
dashboard/src/app/api/features/[id]/handoff-packets/route.ts
```

If Phase 1's GET route already exists in this file, add the POST export to it. Otherwise create the file with both GET and POST.

### Request Schema

```typescript
interface CreateHandoffPacketRequest {
  // Required
  phase: string            // must be valid phase key
  agent_id: string         // e.g. 'IN2'
  agent_name: string       // e.g. 'Builder Agent'
  output_summary: string   // handoff summary text
  status: 'completed' | 'in_progress' | 'rejected'  // default 'completed'

  // Optional
  agent_type?: string
  started_at?: string      // ISO timestamp
  completed_at?: string    // ISO timestamp; defaults to now() if status=completed
  duration_ms?: number     // auto-calculated if started_at + completed_at provided
  cost_tokens_in?: number
  cost_tokens_out?: number
  cost_usd?: number
  input_source_phase?: string
  input_context?: object
  output_artifacts?: ArtifactEntry[]
  output_decisions?: DecisionEntry[]
  output_metrics?: object
  activity_log?: ActivityEntry[]
  rejection_reason?: string
  version?: number         // default 1
}

interface ArtifactEntry {
  type: 'file' | 'spec' | 'migration' | 'component' | 'test' | 'config'
  path: string
  action: 'created' | 'modified' | 'deleted'
  description?: string
}

interface DecisionEntry {
  decision: string
  rationale: string
  alternatives_considered?: string[]
}

interface ActivityEntry {
  timestamp: string
  event: string
  detail?: string
}
```

### Auto-Enrichment Logic

The POST handler performs:

1. **Phase validation** — reject if `phase` not in PHASE_MAP
2. **Auto-resolve phase_order & phase_label** from PHASE_MAP
3. **Auto-set completed_at** to `now()` if `status === 'completed'` and not provided
4. **Auto-calculate duration_ms** from `completed_at - started_at` if both present and duration_ms not provided
5. **Auto-link input_source_packet_id** — query the most recent completed packet for this feature with `phase_order < current_phase_order`, set as input source
6. **Auto-set version** — if a packet already exists for this feature+phase, increment version and set `previous_version_id`
7. **Validate feature_id** — confirm feature exists, return 404 if not

### Response

```json
{
  "packet": { /* full handoff_packets row */ },
  "phase_order": 3,
  "phase_label": "Build"
}
```

**Status codes:** 201 Created, 400 Bad Request, 404 Feature Not Found, 500 Server Error

### Implementation Pattern

Follow the existing pattern in `features/[id]/status/route.ts`:
- Use `createClient` with service role key
- Extract `id` from `params`
- Return NextResponse JSON

---

## 5. GET API Route (existing or to create alongside)

```
GET /api/features/[id]/handoff-packets
```

Returns all handoff packets for a feature, ordered by `phase_order ASC, version DESC`. This likely already exists from Phase 1; if not, create it in the same file.

---

## 6. Orchestrator Integration (HBx)

### How HBx Calls the API

After each sub-agent completes a phase, HBx constructs and POSTs a handoff packet. This is done via `curl` or `web_fetch` from the orchestrator environment.

#### Call Pattern (curl from OpenClaw)

```bash
DASHBOARD_URL="https://hbx-dashboard.vercel.app"  # or localhost:3000

curl -s -X POST "${DASHBOARD_URL}/api/features/${FEATURE_ID}/handoff-packets" \
  -H "Content-Type: application/json" \
  -d '{
    "phase": "design_review",
    "agent_id": "IN1",
    "agent_name": "Product Architect",
    "agent_type": "architect",
    "output_summary": "Spec written with 12 acceptance criteria...",
    "status": "completed",
    "started_at": "2026-02-24T03:00:00Z",
    "completed_at": "2026-02-24T03:15:00Z",
    "cost_usd": 0.12,
    "cost_tokens_in": 8500,
    "cost_tokens_out": 3200,
    "output_artifacts": [
      {"type": "spec", "path": "specs/my-feature.md", "action": "created", "description": "Feature specification"}
    ],
    "output_decisions": [
      {"decision": "Use API route over direct DB write", "rationale": "Better validation and consistency"}
    ],
    "activity_log": [
      {"timestamp": "2026-02-24T03:00:00Z", "event": "phase_started", "detail": "IN1 began spec work"},
      {"timestamp": "2026-02-24T03:15:00Z", "event": "phase_completed", "detail": "Spec written and saved"}
    ]
  }'
```

### Data Extraction from Sub-Agent Results

When a sub-agent completes, HBx receives text output. Extract:

| Field | How to Extract |
|-------|---------------|
| `output_summary` | The sub-agent's final summary/handoff text (first ~500 chars or explicit summary section) |
| `output_artifacts` | Parse file paths mentioned: "Created X", "Modified Y", "Wrote Z" |
| `output_decisions` | Look for "Decision:", "Chose X over Y", rationale patterns |
| `duration_ms` | Track `started_at` when spawning, `completed_at` when result returns |
| `cost_tokens_in/out` | From sub-agent session stats if available |
| `cost_usd` | From sub-agent session stats if available |
| `activity_log` | Construct from spawn time, key milestones, completion time |

**Pragmatic approach:** HBx doesn't need to parse perfectly. Start with:
- `output_summary` = full sub-agent result text (truncated to 5000 chars)
- `output_artifacts` = `[]` initially (can be enriched later)
- `output_decisions` = `[]` initially
- Time tracking = always available (spawn time → completion time)
- Cost = include if session stats provide it, otherwise null

---

## 7. Example Handoff Packets by Phase

### Planning (phase_order 1)
```json
{
  "phase": "planning",
  "agent_id": "IN1",
  "agent_name": "Product Architect",
  "agent_type": "architect",
  "output_summary": "Feature broken into tasks: API route, DB migration, UI component. Estimated 2-3 sub-agent cycles.",
  "status": "completed",
  "output_artifacts": [
    {"type": "spec", "path": "specs/feature-plan.md", "action": "created"}
  ],
  "output_decisions": [
    {"decision": "Split into 3 sub-tasks", "rationale": "Each is independently testable"}
  ]
}
```

### Design Review (phase_order 2)
```json
{
  "phase": "design_review",
  "agent_id": "IN1",
  "agent_name": "Product Architect",
  "agent_type": "architect",
  "output_summary": "Spec complete with 12 acceptance criteria. API schema defined, phase mapping documented.",
  "status": "completed",
  "output_artifacts": [
    {"type": "spec", "path": "specs/audit-trail-phase2.md", "action": "created"}
  ],
  "output_decisions": [
    {"decision": "POST API route (Option A)", "rationale": "Validation, enrichment, decoupled from orchestrator"}
  ]
}
```

### Build (phase_order 3)
```json
{
  "phase": "in_progress",
  "agent_id": "IN2",
  "agent_name": "Builder Agent",
  "agent_type": "builder",
  "output_summary": "POST route implemented with validation, auto-enrichment, tests passing.",
  "status": "completed",
  "duration_ms": 180000,
  "cost_usd": 0.35,
  "output_artifacts": [
    {"type": "file", "path": "dashboard/src/app/api/features/[id]/handoff-packets/route.ts", "action": "modified"},
    {"type": "test", "path": "dashboard/src/app/api/features/[id]/handoff-packets/__tests__/route.test.ts", "action": "created"}
  ]
}
```

### QA Review (phase_order 4)
```json
{
  "phase": "qa_review",
  "agent_id": "IN6",
  "agent_name": "QA Agent",
  "agent_type": "qa",
  "output_summary": "All 12 acceptance criteria verified. Build passes. No regressions.",
  "status": "completed",
  "output_metrics": {
    "criteria_passed": 12,
    "criteria_total": 12,
    "build_status": "pass",
    "type_check": "pass"
  }
}
```

---

## 8. Security Considerations

- The POST endpoint uses the **service role key** server-side (same as existing routes). No client-side auth needed since this is an internal API called by the dashboard server or orchestrator.
- **Rate limiting:** Not required for Phase 2 (internal callers only). Consider adding if exposed externally later.
- **Input validation:** Sanitize `output_summary` length (max 10,000 chars), validate JSONB arrays are actually arrays.

---

## 9. Acceptance Criteria

1. **POST endpoint exists** — `POST /api/features/[id]/handoff-packets` is implemented and returns 201 on success
2. **Phase validation** — Returns 400 if `phase` is not one of: planning, design_review, in_progress, qa_review, review, approved, pr_submitted, done
3. **Required fields validated** — Returns 400 if `phase`, `agent_id`, `agent_name`, or `output_summary` is missing
4. **Feature existence check** — Returns 404 if feature_id does not exist in features table
5. **Auto-enrichment: phase_order** — `phase_order` is automatically set from PHASE_MAP (not required in request)
6. **Auto-enrichment: completed_at** — When `status=completed` and `completed_at` not provided, it defaults to `now()`
7. **Auto-enrichment: duration_ms** — When both `started_at` and `completed_at` are present and `duration_ms` is not, it's auto-calculated
8. **Auto-enrichment: input linking** — `input_source_packet_id` is auto-set to the most recent prior-phase completed packet for the feature
9. **Auto-versioning** — If a packet already exists for the same feature+phase, version increments and `previous_version_id` links to the prior packet
10. **JSONB fields validated** — `output_artifacts`, `output_decisions`, `activity_log` must be arrays if provided
11. **Row written correctly** — A successful POST creates exactly one row in `handoff_packets` with all provided + enriched fields
12. **GET still works** — Existing GET endpoint continues to return packets ordered by phase_order ASC, version DESC
13. **Cost tracking** — `cost_usd`, `cost_tokens_in`, `cost_tokens_out` are stored when provided
14. **Summary truncation** — `output_summary` longer than 10,000 characters is truncated
15. **Response format** — Returns `{ packet, phase_order, phase_label }` with the created row

---

## 10. Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `dashboard/src/app/api/features/[id]/handoff-packets/route.ts` | Create or Modify | Add POST export with validation + enrichment |
| `specs/audit-trail-phase2-handoff-writes.md` | Create | This spec |

No database migrations needed — the `handoff_packets` table already has all required columns.

---

## 11. Out of Scope (Phase 3+)

- UI changes to display richer packet data
- Automatic sub-agent result parsing (NLP extraction of decisions/artifacts)
- Webhook notifications on packet creation
- Packet editing/deletion API
- Dashboard auth for the POST endpoint

---

## Handoff → IN5 (Design Review)

**What's ready:** Full spec for Audit Trail Phase 2. POST API route design with request schema, validation rules, auto-enrichment logic, phase mapping, and 15 acceptance criteria.

**Key design decisions:**
1. POST API route (Option A) over direct Supabase writes — validation + enrichment justify the indirection
2. Auto-enrichment handles phase_order, phase_label, duration_ms, input linking, and versioning — callers stay simple
3. Pragmatic data extraction — start with summary text + timestamps, enrich artifacts/decisions over time
4. No new migrations needed — Phase 1 schema is sufficient

**What IN5 should validate:**
- Phase mapping completeness (all 8 phases covered?)
- Request schema covers orchestrator's available data
- Auto-enrichment rules are correct and non-conflicting
- Acceptance criteria are testable and complete
