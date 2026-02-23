# Handoff: IN2 — Pipeline Nervous System Build

**From:** IN5 (UI/UX Expert)  
**To:** IN2 (Builder)  
**Date:** 2026-02-23  
**Feature:** Agent Pipeline Nervous System — Automated Agent-to-Agent Handoffs  
**Spec:** `/specs/agent-pipeline-nervous-system.md`  

---

## Design Decisions & Component Specs

### 1. Feature Card — Pipeline Stage Indicator

Add a **stage pill** to each feature card, bottom-left, showing current agent and stage:

```
┌─────────────────────────────────┐
│  Feature Title                  │
│  Brief description...           │
│                                 │
│  ⚡ IN2 — Building        🔄 1  │
└─────────────────────────────────┘
```

**Stage pill spec:**
- Component: `<PipelineStagePill agent={current_agent} status={status} />`
- Left icon: stage emoji (📋 Speccing, 🎨 Designing, 🔧 Building, 🧪 QA, 👀 Review, ⏸ Waiting)
- Text: `"{agent_id} — {stage_label}"` e.g. "IN6 — QA"
- Background: `bg-blue-500/10 text-blue-400` (normal), `bg-yellow-500/10 text-yellow-400` (stalled), `bg-red-500/10 text-red-400` (escalated)
- Font: `text-xs font-medium`, pill shape with `rounded-full px-2 py-0.5`

**Stage-to-label map:**
| `current_agent` | Label | Icon |
|---|---|---|
| `IN1` | Speccing | 📋 |
| `IN5` | Designing | 🎨 |
| `IN2` | Building | 🔧 |
| `IN6` | QA | 🧪 |
| `null` + status=review | Review | 👀 |
| `null` + status=escalated | Escalated | 🚨 |

### 2. Revision Badge

- Only visible when `revision_count > 0`
- Component: `<RevisionBadge count={revision_count} />`
- Position: right side of stage pill (inline, not stacked)
- Visual: `🔄 {count}` — circular badge style
- Color: `text-yellow-400` at count=1, `text-red-400` at count=2 (max/escalation imminent)
- Tooltip on hover: "Revision loop {count} of 2"

### 3. Stalled State

- If `current_agent` is set but no `pipeline_log` update for >5 minutes, show stalled state
- Logic: compare `pipeline_log[-1].timestamp` to `now()`. If delta > 300s → stalled
- Visual: stage pill bg changes to yellow, icon swaps to ⏳, text appends "(stalled)"
- Implementation: client-side timer, check every 30s

### 4. Pipeline History Log (Feature Detail Panel)

Add a **collapsible section** to the feature detail panel titled "Pipeline Log".

```
▼ Pipeline Log (6 events)
──────────────────────────────────
  02:41  📋 IN1 — Spec validated         ✅ APPROVED
  02:43  🎨 IN5 — Design complete        ✅ APPROVED  
  02:45  🔧 IN2 — Build complete         ✅ COMPLETE
  02:48  🧪 IN6 — QA failed              🔄 REVISE (3 issues)
  02:50  🔧 IN2 — Revision 1 complete    ✅ COMPLETE
  02:52  🧪 IN6 — QA passed              🚀 SHIP
```

**Component:** `<PipelineLog log={pipeline_log} />`

**Each log entry is a row with:**
- Timestamp (`HH:mm` format, relative date if not today)
- Stage icon + agent label
- Verdict badge: color-coded chip (green=APPROVED/COMPLETE/SHIP, yellow=REVISE, red=REJECT)
- If REVISE: show issue count as "(N issues)", expandable to show issue list

**Collapsed by default.** Header shows event count. Animate open with `max-height` transition.

**Data shape** (from `pipeline_log` JSONB — suggest this schema to IN2 for backend):
```ts
type PipelineLogEntry = {
  timestamp: string;       // ISO 8601
  agent: string;           // "IN1" | "IN5" | "IN2" | "IN6"
  stage: string;           // "speccing" | "designing" | "building" | "qa" | "review"
  verdict: string;         // "APPROVED" | "COMPLETE" | "SHIP" | "REVISE" | "REJECT"
  issues?: string[];       // only on REVISE
  revision_loop?: number;  // current loop number
};
```

### 5. Supabase Realtime Integration

All new fields (`current_agent`, `revision_count`, `pipeline_log`) must be subscribed to via the existing Supabase Realtime channel from PR #62. No new subscription needed — these are columns on the `features` table already being watched.

**On update:**
- `current_agent` change → re-render stage pill
- `revision_count` change → re-render revision badge
- `pipeline_log` change → append to log timeline (no full re-render; append last entry)

### 6. Escalation Banner

When status = `escalated` (after 2 failed revision loops):
- Feature card gets a red left-border (`border-l-4 border-red-500`)
- Stage pill shows 🚨 Escalated
- In detail panel: show a prominent banner above the pipeline log: "⚠️ This feature has been escalated after 2 revision loops. Awaiting Lance's review."

### 7. Wall Monitor / Glanceability

For the office monitor use case:
- Stage pills use high-contrast colors on dark backgrounds
- Emoji icons are scannable at 3–4 feet distance (feature cards should be large enough)
- Red escalation border is immediately visible
- Revision badge `🔄 2` in red is an instant signal something needs attention
- No interaction required to see pipeline state — all visible on the board view

---

## Files to Create/Modify

| File | Action | What |
|---|---|---|
| `src/components/PipelineStagePill.tsx` | Create | Stage indicator pill component |
| `src/components/RevisionBadge.tsx` | Create | Revision loop badge |
| `src/components/PipelineLog.tsx` | Create | Collapsible pipeline history timeline |
| Feature card component | Modify | Add PipelineStagePill + RevisionBadge |
| Feature detail panel | Modify | Add PipelineLog section |
| Supabase types | Modify | Add `current_agent`, `revision_count`, `pipeline_log` types |

## Supabase Schema Changes (Backend)

Add to `features` table:
```sql
ALTER TABLE features ADD COLUMN current_agent TEXT;
ALTER TABLE features ADD COLUMN revision_count INTEGER DEFAULT 0;
ALTER TABLE features ADD COLUMN pipeline_log JSONB DEFAULT '[]'::jsonb;
```

---

## Summary

This is a lightweight UI addition — 3 new components, 2 modified files, no new pages. The real complexity is in HBx's orchestration logic (not IN2-frontend's concern). Keep components simple, leverage existing Tailwind classes and Supabase Realtime from PR #62.
