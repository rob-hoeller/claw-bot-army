# Phase 1 Design Spec: Expandable Step Panels + Handoff Packets

**Feature:** Feature Card Audit Trail & Collaboration Hub  
**Phase:** 1 — Handoff Packets + Expandable Panels (Read-Only)  
**Designer:** IN5 (UI/UX Expert)  
**Date:** 2026-02-24  
**Handoff to:** IN2 (Code Factory)

---

## 1. Overview

Add an **"Audit Trail" tab** to the `FeatureDetailPanel`. This tab replaces the horizontal progress bar with a **vertical stepper** where each completed step is clickable and expands to reveal the handoff packet for that phase.

**Key principle:** Progressive disclosure. Collapsed = scannable summary. Expanded = full detail.

---

## 2. New Tab: "Audit Trail"

### Placement
Add a 4th tab alongside existing `Details | Specs | Chat`:

```tsx
<button onClick={() => setActiveTab('audit')}>
  <ClipboardList className="h-3 w-3 inline mr-1" />Audit Trail
</button>
```

Tab button classes (active state):
```
bg-emerald-500/20 text-emerald-300
```

### Tab icon
Use `ClipboardList` from lucide-react (import it).

---

## 3. Vertical Stepper Layout

Inside the Audit Trail tab, render a vertical stepper connecting all 8 pipeline phases.

### Structure

```
┌─ Audit Trail Tab Content ─────────────────┐
│                                            │
│  ● Plan              3h 12m         ▾      │
│  │  ┌─────────────────────────────┐        │
│  │  │  [Expanded Panel Content]   │        │
│  │  └─────────────────────────────┘        │
│  │                                         │
│  ● Design            1h 45m         ▸      │
│  │                                         │
│  ● Build (v2)        4h 20m    ⟲1   ▸     │
│  │                                         │
│  ◉ Test              2m elapsed     ▸      │
│  │                                         │
│  ○ Review                                  │
│  │                                         │
│  ○ Approved                                │
│  │                                         │
│  ○ PR Submitted                            │
│  │                                         │
│  ○ Done                                    │
│                                            │
└────────────────────────────────────────────┘
```

### Component: `AuditTrailTab`

```tsx
interface AuditTrailTabProps {
  feature: Feature;
  packets: HandoffPacket[];  // all packets for this feature, grouped by phase
}
```

**Container classes:**
```
flex-1 overflow-y-auto p-3
```

### Vertical line
Each step row is wrapped in a flex container. The vertical connector is a `div` with:
```
w-px bg-white/10 ml-[9px] my-0
```
(Centered under the 18px-wide status icon column.)

---

## 4. Step Header Row

Each phase renders a clickable header row.

### Component: `StepHeader`

```tsx
interface StepHeaderProps {
  phase: PipelinePhase;
  label: string;
  icon: LucideIcon;
  state: 'completed' | 'active' | 'future';
  packet: HandoffPacket | null;  // latest version
  versionCount: number;
  isExpanded: boolean;
  onToggle: () => void;
}
```

### Layout (flex row):
```
[StatusIcon 18px] [PhaseName + Duration] [RevisionBadge?] [ChevronToggle]
```

### Classes:
```tsx
// Outer row - clickable
<button
  onClick={onToggle}
  disabled={state === 'future'}
  className={cn(
    "w-full flex items-center gap-2 px-1 py-1.5 rounded-md transition-all text-left",
    state === 'completed' && "hover:bg-white/5 cursor-pointer",
    state === 'active' && "hover:bg-purple-500/5 cursor-pointer",
    state === 'future' && "opacity-40 cursor-default",
  )}
>
```

### Status Icons (18×18):

| State | Icon | Classes |
|-------|------|---------|
| Completed | `CheckCircle2` | `h-[18px] w-[18px] text-green-400` |
| Active | `Loader2` | `h-[18px] w-[18px] text-purple-400 animate-spin` — OR use a pulsing ring: `h-[18px] w-[18px] text-purple-400 animate-pulse` |
| Future | `Circle` (outline) | `h-[18px] w-[18px] text-white/20` |

Use `Circle` from lucide-react for future (empty circle).

### Phase Name:
```
text-[11px] font-medium text-white/80  (completed/active)
text-[11px] font-medium text-white/30  (future)
```

### Duration (inline, right of name):
```
text-[10px] text-white/40 ml-auto
```
Format: `formatDuration(packet.duration_ms)` → "3h 12m", "0h 38m", "< 1m"

Helper:
```tsx
function formatDuration(ms: number | null): string {
  if (!ms) return '';
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return '< 1m';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
```

For active (in-progress) packets, show elapsed time with a subtle pulse:
```
text-[10px] text-purple-400/60 animate-pulse
```
Compute from `started_at` to `now()`.

### Revision Badge (conditional):
Show if `versionCount > 1`:
```tsx
<span className="text-[9px] text-amber-400/70 bg-amber-500/10 px-1 rounded">
  ⟲ {versionCount - 1} revision{versionCount > 2 ? 's' : ''}
</span>
```

### Expand Chevron:
```tsx
{state !== 'future' && (
  <ChevronDown className={cn(
    "h-3 w-3 text-white/30 transition-transform",
    isExpanded && "rotate-180"
  )} />
)}
```

---

## 5. Expanded Panel Content

When a step is expanded, render a panel below the header.

### Animation
Use `framer-motion` `AnimatePresence` + `motion.div`:

```tsx
<AnimatePresence>
  {isExpanded && (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="overflow-hidden"
    >
      <div className="ml-[9px] pl-4 border-l border-white/10 pb-3">
        <StepPanelContent packet={packet} />
      </div>
    </motion.div>
  )}
</AnimatePresence>
```

The `ml-[9px]` aligns the left border with the center of the status icon. `pl-4` gives content indentation.

### Component: `StepPanelContent`

```tsx
interface StepPanelContentProps {
  packet: HandoffPacket;
}
```

### Panel sections (top to bottom):

#### 5a. Agent Info Bar
```tsx
<div className="flex items-center gap-2 mb-2 py-1">
  <Bot className="h-3 w-3 text-purple-400/60" />
  <span className="text-[10px] text-white/60">{packet.agent_name}</span>
  <span className="text-[9px] text-white/30">•</span>
  <span className="text-[9px] text-white/30">{packet.agent_type === 'ai_agent' ? 'AI Agent' : 'Human'}</span>
</div>
```

#### 5b. Summary
```tsx
<div className="mb-3">
  <p className="text-[11px] text-white/70 leading-relaxed whitespace-pre-wrap">
    {packet.output_summary}
  </p>
</div>
```

If summary is long (>300 chars), truncate with a "Show more" toggle:
```tsx
const [showFull, setShowFull] = useState(false);
const summary = packet.output_summary || '';
const truncated = summary.length > 300 && !showFull;

<p className="text-[11px] text-white/70 leading-relaxed whitespace-pre-wrap">
  {truncated ? summary.slice(0, 300) + '…' : summary}
</p>
{summary.length > 300 && (
  <button onClick={() => setShowFull(!showFull)} className="text-[10px] text-purple-400 hover:text-purple-300 mt-1">
    {showFull ? 'Show less' : 'Show more'}
  </button>
)}
```

#### 5c. Artifacts (chips)
```tsx
{packet.output_artifacts?.length > 0 && (
  <div className="mb-3">
    <div className="text-[9px] text-white/30 uppercase tracking-wider mb-1">Artifacts</div>
    <div className="flex flex-wrap gap-1">
      {packet.output_artifacts.map((artifact, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded bg-blue-500/10 text-blue-300 border border-blue-500/20 hover:bg-blue-500/20 cursor-pointer transition-colors"
          title={artifact.title}
        >
          <ArtifactIcon type={artifact.type} /> {/* 10px icon */}
          {artifact.title}
        </span>
      ))}
    </div>
  </div>
)}
```

Artifact type → icon mapping:
| Type | Icon |
|------|------|
| `spec` | `FileText` |
| `design_doc` | `PenTool` |
| `code_change` | `GitPullRequest` |
| `test_results` | `TestTube2` |
| `review_feedback` | `MessageSquare` |
| `pr_document` | `GitPullRequest` |
| `other` | `FileText` |

All icons: `h-2.5 w-2.5`

#### 5d. Decisions
```tsx
{packet.output_decisions?.length > 0 && (
  <div className="mb-3">
    <div className="text-[9px] text-white/30 uppercase tracking-wider mb-1">
      Decisions ({packet.output_decisions.length})
    </div>
    <div className="space-y-1.5">
      {packet.output_decisions.map((decision, i) => (
        <DecisionItem key={i} decision={decision} />
      ))}
    </div>
  </div>
)}
```

**DecisionItem** — collapsed by default, expandable:

Collapsed:
```tsx
<button className="w-full flex items-center gap-2 text-left px-2 py-1 rounded bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors">
  <ChevronRight className={cn("h-2.5 w-2.5 text-white/30 transition-transform", expanded && "rotate-90")} />
  <span className="text-[10px] text-white/60 flex-1 truncate">{decision.question}</span>
  <span className="text-[10px] text-emerald-400/70 truncate max-w-[120px]">{decision.chosen}</span>
</button>
```

Expanded (below):
```tsx
<div className="ml-5 mt-1 space-y-1 text-[10px]">
  <div><span className="text-white/30">Chosen:</span> <span className="text-emerald-400/80">{decision.chosen}</span></div>
  <div><span className="text-white/30">Rationale:</span> <span className="text-white/60">{decision.rationale}</span></div>
  {decision.alternatives?.length > 0 && (
    <div><span className="text-white/30">Alternatives:</span> <span className="text-white/40">{decision.alternatives.join(', ')}</span></div>
  )}
</div>
```

#### 5e. Cost Badge (Phase 2 will color-code, Phase 1 just shows data if present)
```tsx
{(packet.cost_usd || packet.cost_tokens_in) && (
  <div className="flex items-center gap-2 text-[9px] text-white/30 mt-2 pt-2 border-t border-white/5">
    {packet.cost_usd && <span>${Number(packet.cost_usd).toFixed(4)}</span>}
    {packet.cost_tokens_in && <span>↓{(packet.cost_tokens_in / 1000).toFixed(1)}k</span>}
    {packet.cost_tokens_out && <span>↑{(packet.cost_tokens_out / 1000).toFixed(1)}k</span>}
  </div>
)}
```

---

## 6. Visual States Summary

| State | Icon | Color | Clickable | Expandable | Line Segment |
|-------|------|-------|-----------|------------|--------------|
| Completed | ✓ filled | `text-green-400` | Yes | Yes — shows packet | `bg-green-400/30` |
| Active | Pulsing dot | `text-purple-400 animate-pulse` | Yes | Yes — shows live/partial | `bg-purple-400/30` |
| Future | Empty circle | `text-white/20` | No | No | `bg-white/10` |
| Expanded | Same as state | Same + panel visible | — | — | — |

### Vertical line color per segment:
Between two completed steps: `bg-green-400/30`  
Between completed and active: top half `bg-green-400/30`, bottom half `bg-purple-400/30` (use gradient or just `bg-white/10` for simplicity — **recommend `bg-white/10` for Phase 1**, color-code in Phase 2).

---

## 7. Empty State

When a step has no handoff packet (completed step with no data, or active step not yet started):

```tsx
<div className="py-2 px-3 text-center">
  <p className="text-[10px] text-white/30 italic">
    {state === 'active'
      ? 'Work in progress — data will appear as the agent completes this phase.'
      : 'No handoff data recorded for this phase.'}
  </p>
</div>
```

When the entire Audit Trail tab has zero packets (brand new feature):
```tsx
<div className="flex flex-col items-center justify-center h-32 text-center">
  <ClipboardList className="h-6 w-6 text-white/20 mb-2" />
  <p className="text-[11px] text-white/40">No audit trail yet</p>
  <p className="text-[10px] text-white/25 mt-1">
    Handoff data will appear as the pipeline runs.
  </p>
</div>
```

---

## 8. Data Fetching Strategy

### On tab open (lazy):
```tsx
const [packets, setPackets] = useState<HandoffPacket[] | null>(null);
const [loadingPackets, setLoadingPackets] = useState(false);

useEffect(() => {
  if (activeTab !== 'audit' || packets !== null) return;
  setLoadingPackets(true);
  fetch(`/api/features/${feature.id}/handoff-packets`)
    .then(r => r.json())
    .then(data => setPackets(data))
    .catch(() => setPackets([]))
    .finally(() => setLoadingPackets(false));
}, [activeTab, feature.id]);
```

### Realtime subscription:
Subscribe to `handoff_packets` where `feature_id = X` via Supabase Realtime. On INSERT/UPDATE, merge into local state. If the active phase gets a new packet, auto-expand it.

### Cache:
Completed packets are immutable — cache in state. Only refetch active/in-progress packets.

---

## 9. Expand/Collapse Behavior

- **Default:** All steps collapsed.
- **Active step:** Auto-expanded on first render of Audit Trail tab.
- **Only one expanded at a time:** Clicking a new step collapses the previously expanded one (accordion behavior). This keeps the narrow panel manageable.
- **Keyboard:** Not required for Phase 1, but structure supports it (each header is a `<button>`).

State management:
```tsx
const [expandedPhase, setExpandedPhase] = useState<string | null>(null);

// Auto-expand active phase on mount
useEffect(() => {
  if (packets && expandedPhase === null) {
    const activePacket = packets.find(p => p.status === 'in_progress');
    if (activePacket) setExpandedPhase(activePacket.phase);
  }
}, [packets]);

const handleToggle = (phase: string) => {
  setExpandedPhase(prev => prev === phase ? null : phase);
};
```

---

## 10. Mobile / Narrow Panel Considerations

The detail panel is already `max-w-md` (448px). Key decisions:

1. **No horizontal scroll** — all content wraps within the panel width.
2. **Artifact chips** — `flex-wrap` ensures they stack on narrow widths.
3. **Decision items** — full-width, truncated text with expand.
4. **Summary text** — `whitespace-pre-wrap` handles line breaks naturally.
5. **Phase labels** — use short labels from existing `columns` config (Plan, Design, Build, Test, Review, Approved, PR Submitted, Done).
6. **Touch targets** — step headers are full-width buttons with `py-1.5` padding (min 32px height).

---

## 11. Component File Structure

Create these new files:

```
dashboard/src/components/features/
├── AuditTrailTab.tsx          # Main tab content with vertical stepper
├── StepHeader.tsx             # Individual step header row
├── StepPanelContent.tsx       # Expanded panel showing packet data
├── DecisionItem.tsx           # Expandable decision row
└── hooks/
    └── useHandoffPackets.ts   # Fetch + realtime hook for packets
```

### Modify:
- `FeatureDetailPanel` in `FeatureBoard.tsx` — add 'audit' tab, render `<AuditTrailTab>`.

---

## 12. TypeScript Types

Add to a shared types file or top of `AuditTrailTab.tsx`:

```tsx
interface HandoffPacket {
  id: string;
  feature_id: string;
  phase: FeatureStatus;
  version: number;
  status: 'in_progress' | 'completed' | 'rejected' | 'skipped';
  agent_id: string | null;
  agent_type: 'ai_agent' | 'human' | null;
  agent_name: string | null;
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
  cost_tokens_in: number | null;
  cost_tokens_out: number | null;
  cost_usd: number | null;
  input_source_phase: string | null;
  input_source_packet_id: string | null;
  input_context: Record<string, unknown>;
  output_summary: string | null;
  output_artifacts: Artifact[];
  output_decisions: Decision[];
  output_metrics: Record<string, number>;
  previous_version_id: string | null;
  rejection_reason: string | null;
  diff_from_previous: unknown;
  activity_log: ActivityEvent[];
  created_at: string;
  updated_at: string;
}

interface Artifact {
  type: 'spec' | 'design_doc' | 'code_change' | 'test_results' | 'review_feedback' | 'pr_document' | 'other';
  title: string;
  content?: string;
  url?: string;
  mime_type?: string;
}

interface Decision {
  question: string;
  chosen: string;
  alternatives: string[];
  rationale: string;
  decided_by: string;
}

interface ActivityEvent {
  timestamp: string;
  actor: { id: string; type: string; name: string };
  action: string;
  detail: Record<string, unknown>;
}
```

---

## 13. API Endpoint Needed (Phase 1)

```
GET /api/features/[id]/handoff-packets
```

Returns: `HandoffPacket[]` ordered by phase pipeline position, then version DESC.

Group by phase on the client. For each phase, show the latest version's packet. If `versionCount > 1`, show revision badge.

---

## 14. Integration with Existing PipelineProgress

The **existing horizontal progress bar** on the card and detail panel header remains unchanged. It stays as a quick visual indicator. The Audit Trail tab provides the detailed, interactive version.

Do NOT modify the `PipelineProgress` component in Phase 1. Phase 2+ may add click-to-scroll behavior linking the horizontal bar to the vertical stepper.

---

## 15. Acceptance Criteria (Design)

1. ✅ New "Audit Trail" tab with `ClipboardList` icon appears in detail panel
2. ✅ Vertical stepper shows all 8 phases with correct icons and colors
3. ✅ Completed steps show green check, are clickable, expand on click
4. ✅ Active step shows purple pulse, auto-expands
5. ✅ Future steps show gray circle, not clickable
6. ✅ Expanded panel shows: agent info, summary, artifacts, decisions, cost
7. ✅ Accordion behavior (one expanded at a time)
8. ✅ Revision badge shows on steps with version > 1
9. ✅ Empty states for no-data and no-packets scenarios
10. ✅ Smooth expand/collapse animation via framer-motion
11. ✅ Lazy data fetch on first tab open
12. ✅ Realtime subscription for live updates
13. ✅ All content fits within max-w-md panel without horizontal scroll
