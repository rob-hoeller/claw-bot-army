# Feature Card Audit Trail & Collaboration Hub — Research Report

**Feature ID:** 05610cd9-7132-44b8-8ed1-d2a67e097010  
**Date:** 2026-02-24  
**Researcher:** IN3 Research Lab

---

## 1. Competitive Analysis Summary

| Tool | Audit/Activity Structure | Step-by-Step Progress UI | Inline Collaboration | Revision/Rework Tracking | Key Takeaway |
|------|-------------------------|--------------------------|---------------------|--------------------------|--------------|
| **Linear** | Chronological activity stream on every issue; tracks field changes, status transitions, assignee changes, comments. API exposes `IssueHistory` nodes. | Kanban + status-based workflow. No expandable step panels—activity is a flat reverse-chronological feed. | Threaded comments with @-mentions; Slack-style notification routing. Rich markdown. | Status change history shows back-and-forth; no explicit "revision N" concept. | Best-in-class speed & minimal UI. Activity feed is clean but flat—no phase grouping. |
| **Shortcut** | Story activity feed shows all changes, comments, state transitions. Iteration-level tracking with burndown. | Stories flow through workflow states. Activity grouped by day, not by state. | Comments with @-mentions, threaded replies, emoji reactions. External link previews. | Iteration history + story history. Unstarted→Started→Done cycle visible but not diffed. | Good activity feed density. Iteration-level grouping is useful for our module-scale vision. |
| **Notion** | Database properties + relation links. No native audit trail—requires manual "Activity" relation DB or changelog automation. | Timeline view, Board view, Calendar view. No built-in pipeline stepper. | Comments on pages/blocks, @-mention people or pages. Inline discussions. | Page version history with diff. 30-day retention (free), unlimited (paid). | Page version history + diff is excellent. But no native audit trail on DB records—must be built. |
| **GitHub Projects + Actions** | Actions: Full workflow run logs with expandable job→step→log hierarchy. Projects: Activity feed on issues/PRs. | **Actions is the gold standard**: workflow → job → step, each expandable with streaming logs, timing, status badges. Collapsible groups via `::group::`. | Issue/PR comments, @-mentions, review threads, inline code comments. Slash commands. | PR revision history with full diff between pushes. "Force push" comparison. Re-run workflows. | **Steal the Actions step UI**. The job→step→expandable-log pattern is exactly what we need for handoff packets. |
| **Vercel** | Deployment audit log: who triggered, git ref, build log, function logs. Team activity feed. | **Deployment pipeline stepper**: Building → Deploying → Ready/Error. Each step expandable with real-time streaming logs. Build step timing shown. | Comments on deployments and preview URLs. @-mentions in team threads. | Redeployment creates new entry; previous deployments preserved with full logs. | **Steal the build step timeline UI** — clean vertical stepper with expand/collapse, timing per step, status icons. |
| **Plane.so** | Issue activity log tracks all field changes, comments, state transitions. Open-source so schema is visible. | Kanban/list/spreadsheet views. Activity feed per issue. No stepper UI. | Comments with @-mentions, reactions. | State change history preserved. Cycles (sprints) track velocity. | Being open-source, we can study their activity tracking schema directly. Good baseline, not innovative on UI. |
| **AI-Native Tools** | **Devin/Factory/Sweep**: Agent-driven workflows with step logs showing AI reasoning, tool calls, file changes. **Cursor**: Shows AI agent steps in sidebar. | Devin shows a "plan" with checkable steps, expandable to see terminal output, browser actions, code changes per step. | Chat-first interface; @-mention files or context. Human-in-the-loop approval gates. | Devin shows iteration loops explicitly—"attempt 1", "attempt 2" with diffs between attempts. | **Devin's agent step UI is closest to our vision**: plan steps, expandable details, revision loops, human checkpoints. |
| **Jira** | Comprehensive audit log (admin), issue changelog (API: `/issue/{key}/changelog`). Every field change timestamped with author. | Workflow statuses with transitions. No expandable step details—just status badges. Board/timeline views. | Comments, @-mentions, watchers. Automation comments for bot actions. | Extensive: every field change versioned. `fromString`/`toString` pattern. Automation audit logs separate. | Most complete audit data model but worst UX for displaying it. Heavy, noisy, enterprise-focused. |

---

## 2. Recommended Patterns to Adopt

### 2.1 GitHub Actions Step Hierarchy (⭐ Top Priority)
The `workflow → job → step` collapsible hierarchy maps perfectly to our `pipeline → phase → handoff_packet` model. Each step shows:
- Status icon (✅❌⏳⏭️)
- Duration badge
- Expandable log/detail area
- Groupable sub-sections (`::group::`)

**Apply to:** Our expandable step panels. Each pipeline phase becomes a collapsible panel. Inside: the handoff packet rendered as structured sections.

### 2.2 Vercel's Vertical Stepper UI
Clean visual design:
- Vertical line connecting steps
- Circle icons for status (filled=done, ring=active, empty=pending)
- Time elapsed shown inline
- Smooth expand/collapse animation
- Real-time streaming for active step

**Apply to:** Our pizza tracker upgrade. Replace horizontal dots with a vertical expandable stepper.

### 2.3 Devin's Revision Loop Display
Shows "Attempt 1" → "Attempt 2" with clear visual separation and the ability to diff between attempts. Human feedback is displayed as a distinct event between attempts.

**Apply to:** Our QA→Build rework loops. Show revision markers with diff capability.

### 2.4 Linear's Clean Activity Feed
Minimal, scannable, fast. Key pattern:
- Icon + actor + action + target + timestamp
- No unnecessary chrome
- Hover for details, click for full context
- Relative timestamps ("2h ago") with absolute on hover

**Apply to:** Within each expanded step panel, the detailed activity sub-feed.

### 2.5 Notion's Page Version Diff
Side-by-side or inline diff view for document revisions with additions/deletions highlighted.

**Apply to:** Our diff view for handoff packet revisions between v1→v2.

### 2.6 Shortcut's Iteration Grouping
Group stories by iteration with burndown charts and velocity tracking.

**Apply to:** Our module-scale vision — group features by epic/module with aggregate progress.

---

## 3. Patterns to Avoid

| Anti-Pattern | Where Seen | Why Avoid |
|-------------|-----------|-----------|
| **Flat chronological feed for structured workflows** | Linear, Jira | Our pipeline has distinct phases—a flat feed loses the structure. Group by phase first, chronological within. |
| **Audit log as admin-only afterthought** | Jira | Audit data should be first-class UI, not buried in admin panels. |
| **Requiring manual changelog databases** | Notion | Audit trail must be automatic, not user-maintained. |
| **Overwhelming detail by default** | Jira | Show summary first, expand for detail. Progressive disclosure is critical. |
| **No schema for activity events** | Many tools | Ad-hoc activity logging leads to inconsistent rendering. Define a strict event schema upfront. |
| **Comments disconnected from context** | Most tools | Comments should be attached to specific phases, not just floating on the issue. |
| **Real-time streaming for completed steps** | N/A | Don't waste resources streaming finished content. Stream only the active step; cache completed ones. |

---

## 4. Proposed Data Schema for Handoff Packets

```typescript
interface HandoffPacket {
  id: string;                          // UUID
  feature_id: string;                  // FK to feature card
  phase: PipelinePhase;                // 'plan' | 'design' | 'build' | 'test' | 'review' | 'approved' | 'pr_submitted' | 'done'
  version: number;                     // Increments on rework (v1, v2, ...)
  status: 'in_progress' | 'completed' | 'rejected' | 'skipped';
  
  // Execution metadata
  agent: {
    id: string;                        // Agent or human who performed the work
    type: 'ai_agent' | 'human';
    name: string;
  };
  started_at: string;                  // ISO 8601
  completed_at: string | null;
  duration_ms: number | null;
  cost: {                              // AI cost tracking
    tokens_in: number;
    tokens_out: number;
    usd: number;
  } | null;

  // I/O
  inputs: {
    source_phase: PipelinePhase | null;  // Which phase handed off to this one
    source_packet_id: string | null;     // FK to previous handoff packet
    context: Record<string, any>;        // Phase-specific input data
  };
  outputs: {
    artifacts: Artifact[];               // Files, documents, specs produced
    summary: string;                     // Human-readable summary of what was done
    decisions: Decision[];               // Key decisions made during this phase
    metrics: Record<string, number>;     // Phase-specific metrics (e.g., test pass rate)
  };

  // Revision tracking
  previous_version_id: string | null;    // FK to previous version of same phase
  rejection_reason: string | null;       // Why it was kicked back
  diff_from_previous: DiffSummary | null; // What changed from previous version

  // Raw activity log within this phase
  activity_log: ActivityEvent[];

  created_at: string;
  updated_at: string;
}

interface Artifact {
  id: string;
  type: 'spec' | 'design_doc' | 'code_change' | 'test_results' | 'review_feedback' | 'pr_document' | 'other';
  title: string;
  content: string | null;             // Inline content for small artifacts
  url: string | null;                 // Link for large artifacts (file storage, PR URL, etc.)
  mime_type: string;
}

interface Decision {
  id: string;
  question: string;                   // What was being decided
  chosen: string;                     // What was decided
  alternatives: string[];             // What other options were considered
  rationale: string;                  // Why this choice
  decided_by: string;                 // Agent/human ID
}

interface ActivityEvent {
  id: string;
  timestamp: string;
  actor: { id: string; type: 'ai_agent' | 'human'; name: string };
  action: string;                     // 'started_work' | 'produced_artifact' | 'made_decision' | 'requested_feedback' | 'completed' | 'rejected' | 'comment' | 'mention'
  detail: Record<string, any>;        // Action-specific payload
}

interface DiffSummary {
  added: string[];                    // List of additions (human-readable)
  removed: string[];
  changed: string[];
  full_diff: string | null;           // JSON patch or unified diff
}

type PipelinePhase = 'plan' | 'design' | 'build' | 'test' | 'review' | 'approved' | 'pr_submitted' | 'done';
```

### Supabase Table Design

```sql
-- Core handoff packets table
CREATE TABLE handoff_packets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_id UUID NOT NULL REFERENCES features(id),
  phase TEXT NOT NULL CHECK (phase IN ('plan','design','build','test','review','approved','pr_submitted','done')),
  version INT NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'in_progress',
  
  agent_id TEXT,
  agent_type TEXT,
  agent_name TEXT,
  
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  duration_ms INT,
  
  cost_tokens_in INT,
  cost_tokens_out INT,
  cost_usd NUMERIC(10,6),
  
  input_source_phase TEXT,
  input_source_packet_id UUID REFERENCES handoff_packets(id),
  input_context JSONB DEFAULT '{}',
  
  output_summary TEXT,
  output_artifacts JSONB DEFAULT '[]',
  output_decisions JSONB DEFAULT '[]',
  output_metrics JSONB DEFAULT '{}',
  
  previous_version_id UUID REFERENCES handoff_packets(id),
  rejection_reason TEXT,
  diff_from_previous JSONB,
  
  activity_log JSONB DEFAULT '[]',
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(feature_id, phase, version)
);

CREATE INDEX idx_handoff_feature ON handoff_packets(feature_id);
CREATE INDEX idx_handoff_phase ON handoff_packets(feature_id, phase);
```

---

## 5. UX Recommendations for Expandable Step Panels

### Layout: Vertical Stepper with Expandable Panels

```
┌─────────────────────────────────────────────────┐
│ Feature: Add User Authentication                │
│ Status: In Review  (6/8 steps)                  │
├─────────────────────────────────────────────────┤
│                                                 │
│  ✅ Plan          3h 12m    ▾  [Chat]           │
│  ┃  ┌──────────────────────────────────┐        │
│  ┃  │ Agent: Planning Agent            │        │
│  ┃  │ Summary: Defined auth spec...    │        │
│  ┃  │ Artifacts: [Spec Doc] [API Map]  │        │
│  ┃  │ Decisions: 2 made                │        │
│  ┃  │ Cost: $0.04 | 12k tokens        │        │
│  ┃  └──────────────────────────────────┘        │
│  ┃                                              │
│  ✅ Design        1h 45m    ▸                   │
│  ┃                                              │
│  ✅ Build (v2)    4h 20m    ▸   ⟲ 1 revision   │
│  ┃                                              │
│  ✅ Test          0h 38m    ▸                   │
│  ┃                                              │
│  🔵 Review        2h 10m    ▾  [Chat]           │
│  ┃  ┌──────────────────────────────────┐        │
│  ┃  │ 💬 Active discussion (3 msgs)   │        │
│  ┃  │ Waiting for: @john              │        │
│  ┃  └──────────────────────────────────┘        │
│  ┃                                              │
│  ○ Approved                                     │
│  ┃                                              │
│  ○ PR Submitted                                 │
│  ┃                                              │
│  ○ Done                                         │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Key UX Principles

1. **Progressive Disclosure** — Collapsed by default. Show: status icon, phase name, duration, revision badge. One click to expand.

2. **Active Step Auto-Expanded** — The currently active step starts expanded. Completed steps start collapsed.

3. **Revision Badge** — If a phase has v2+, show a "⟲ N revisions" badge. Click to see version selector with diff.

4. **Duration Prominence** — Time-in-phase is always visible (collapsed or expanded). Use color coding: green (<p50), yellow (p50-p90), red (>p90) relative to historical averages.

5. **Chat Indicators** — On Plan and Review steps, show [Chat] button. Unread message count badge when there are new messages.

6. **Keyboard Navigation** — Arrow keys to move between steps, Enter to expand/collapse, Tab to navigate within expanded panel.

7. **Summary-First Artifacts** — Inside expanded panel, show the `output_summary` first. Artifacts as clickable chips below. Full content on click.

8. **Diff Toggle on Revisions** — When a step has multiple versions, show a version selector dropdown and a "Show Diff" toggle that renders inline additions/deletions.

### Animation & Performance
- Use `height: auto` transitions (or `max-height` approach) for smooth expand/collapse
- Lazy-load expanded content — don't fetch handoff packet details until panel is opened
- Cache fetched packets client-side (they're immutable once completed)
- Virtual scroll if >20 activity events within a panel

---

## 6. Chat / @-Mention Implementation Approach

### Scope
Chat is available on **Plan** and **Review** phases only. These are the human decision points where feedback loops occur.

### Architecture

```
┌─────────────────────────────┐
│ Phase Chat Component        │
│                             │
│ [Message Feed]              │
│  - Chronological            │
│  - Rich text (markdown)     │
│  - @-mention rendering      │
│  - Agent vs Human badges    │
│                             │
│ [Input Box]                 │
│  - @ trigger → dropdown     │
│  - Markdown support         │
│  - Send on Enter            │
└─────────────────────────────┘
```

### @-Mention System

1. **Trigger**: User types `@` → dropdown appears with:
   - All agents involved in this feature's pipeline
   - Human team members
   - Special: `@all`, `@agents`, `@humans`

2. **Data Model**:
```typescript
interface ChatMessage {
  id: string;
  handoff_packet_id: string;     // Scoped to a specific phase
  author: { id: string; type: 'ai_agent' | 'human'; name: string; avatar?: string };
  content: string;                // Markdown with mention tokens
  mentions: string[];             // Array of mentioned entity IDs
  created_at: string;
  edited_at: string | null;
}
```

3. **Mention Token Format**: Store as `<@agent:planning_agent>` or `<@user:john_id>` in content. Render as styled badges client-side.

4. **Notifications**: When an agent is @-mentioned in a Review chat, it can trigger a re-evaluation or provide additional context. When a human is @-mentioned, push notification via the platform's notification system.

5. **Implementation**:
   - Use Supabase Realtime for live message sync
   - `chat_messages` table with RLS policies
   - Mention autocomplete via client-side filtering of participants list (small set, no need for server search)
   - Render mentions using a custom markdown plugin or regex replacement before render

### Chat Table Schema

```sql
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  handoff_packet_id UUID NOT NULL REFERENCES handoff_packets(id),
  author_id TEXT NOT NULL,
  author_type TEXT NOT NULL,
  author_name TEXT NOT NULL,
  content TEXT NOT NULL,
  mentions TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  edited_at TIMESTAMPTZ
);

CREATE INDEX idx_chat_packet ON chat_messages(handoff_packet_id, created_at);
```

---

## 7. Module-Scale Considerations

For chaining features into epics/modules with parallel pipelines:

1. **Epic Container** — An epic references multiple feature IDs. Each feature runs its own pipeline independently.
2. **Aggregate Progress View** — Epic-level view shows all child feature pipelines side-by-side (like a Gantt chart of pipeline steppers).
3. **Cross-Feature Dependencies** — Optional `depends_on` field on features. Pipeline won't start until dependencies reach a configurable phase.
4. **Shared Context** — Epic-level handoff packet that provides context to all child feature planning phases.

---

## 8. Summary of Key Findings

**Best model for our UI:** Hybrid of GitHub Actions (step hierarchy + expandable logs) and Vercel (clean vertical stepper with timing).

**Best model for our data:** Jira's changelog completeness + our custom handoff packet schema (structured, not just field diffs).

**Best model for collaboration:** Linear's comment threading + Supabase Realtime for live chat on decision-point phases.

**Most relevant precedent:** Devin's AI agent step UI — shows AI work in expandable steps with revision loops, closest to our AI-driven pipeline concept.

**Critical success factors:**
- Handoff packets must be immutable once phase completes (append-only for revisions)
- Progressive disclosure prevents information overload
- Time-in-phase tracking with percentile-based coloring surfaces bottlenecks instantly
- Chat scoped to Plan+Review only keeps signal-to-noise ratio high
- Diff view on rework loops is essential for understanding what changed and why
