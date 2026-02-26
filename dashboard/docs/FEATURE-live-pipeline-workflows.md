# Feature: Live Pipeline View + Active Workflows Board

## Overview
Two new dashboard views showing real-time pipeline execution status with animated step progression and live agent output logs.

## Reference Images
- `docs/ref-live-pipeline.jpg` — Single pipeline detail view with 6 steps + terminal log
- `docs/ref-active-workflows.jpg` — Multi-workflow overview with agent chains

## Part 1: LivePipelineView Component

A horizontal animated step-flow showing a single feature's pipeline progress.

### Design
- 6 steps in horizontal flow connected by animated lines/arrows
- Steps: Intake (HBx) → Spec (IN1) → Design (IN5) → Build (IN2) → QA (IN6) → Ship (HBx)
- Each step shows:
  - Status icon: ✅ completed (green), ⏳ running (animated spinner, gold), ○ pending (gray)
  - Step name + agent ID
  - Elapsed time (from pipeline_log timestamps)
- Active step has pulsing/glowing border (use Framer Motion)
- Connector lines: solid green for completed, animated dashed for in-progress, gray for pending
- Below: terminal-style output log panel (dark bg, monospace, green text)
  - Streams from pipeline_log entries + handoff_packets
  - Auto-scrolls to bottom
  - Shows: timestamp, agent, action, details

### Data Source
- `features` table: `current_agent`, `status`, `pipeline_log` (JSONB array)
- `handoff_packets` table: phase transitions with content
- Supabase Realtime subscription (already wired in useRealtimeFeatures)

### File Location
- `src/components/features/LivePipelineView.tsx` — main component
- `src/components/features/PipelineStep.tsx` — individual step
- `src/components/features/PipelineConnector.tsx` — animated connector line
- `src/components/features/PipelineTerminal.tsx` — terminal output log

## Part 2: ActiveWorkflowsBoard Component

Shows all currently active features/workflows in a dashboard view.

### Design
- Section header: "ACTIVE WORKFLOWS" (uppercase, muted, monospace)
- Each workflow is a card containing:
  - Title (feature title, bold)
  - Subtitle: agent chain description (e.g., "IN1 specs → IN5 designs → IN2 builds")
  - Horizontal step icons with connecting lines (compact version of LivePipelineView)
  - Each step: icon in circle + label + status badge (COMPLETED/RUNNING/PENDING)
  - Status colors: green=completed, gold/amber=running (animated), gray=pending
- Cards stacked vertically
- Click card → navigates to feature detail with full LivePipelineView

### Data Source
- Same `features` table, filtered by status NOT in ('done', 'cancelled')
- Realtime updates via existing useRealtimeFeatures hook

### File Location
- `src/components/features/ActiveWorkflowsBoard.tsx` — board container
- `src/components/features/WorkflowCard.tsx` — individual workflow card
- `src/components/features/WorkflowStepIcon.tsx` — compact step icon with status

## Tech Stack
- React 18 + TypeScript
- Framer Motion (already installed) for animations
- TailwindCSS for styling
- Lucide icons (already installed)
- Supabase Realtime (already wired)

## Pipeline Step Mapping

| Step | Agent | Icon | Label |
|------|-------|------|-------|
| 1 | HBx | 📥 | Intake |
| 2 | IN1 | 📋 | Spec |
| 3 | IN5 | 🎨 | Design |
| 4 | IN2 | 🔧 | Build |
| 5 | IN6 | 🧪 | QA |
| 6 | HBx | 🚀 | Ship |

## Acceptance Criteria
- [ ] LivePipelineView renders 6 steps with correct status from pipeline_log
- [ ] Active step has animated pulse/glow
- [ ] Connector lines animate between completed/running/pending
- [ ] Terminal log streams pipeline events in real-time
- [ ] ActiveWorkflowsBoard shows all non-done features as workflow cards
- [ ] Cards update in real-time via Supabase subscription
- [ ] Click workflow card expands or navigates to detail
- [ ] Loading skeleton states included
- [ ] Empty state when no active workflows
- [ ] Dark theme consistent with existing dashboard
- [ ] No TypeScript errors, lint clean
