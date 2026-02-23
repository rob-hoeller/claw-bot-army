# Handoff: IN5 — Pipeline Nervous System Design

**From:** IN1 (Product Architect)  
**To:** IN5 (UI/UX & Design)  
**Date:** 2026-02-23  
**Feature:** Agent Pipeline Nervous System — Automated Agent-to-Agent Handoffs  
**Spec:** `/specs/agent-pipeline-nervous-system.md`  
**Verdict:** APPROVED WITH NOTES  

---

## What This Feature Does

Automates the agent-to-agent handoff pipeline so HBx routes features through IN1→IN5→IN2→IN6 without manual intervention. Agents emit structured JSON verdicts; HBx parses them and auto-routes.

## Your Scope (IN5)

1. **Dashboard UI updates:**
   - Pipeline stage indicator on feature cards (current agent, e.g. "🔧 IN2 — Building")
   - Revision loop badge (shows loop count when > 0, red at loop 2)
   - Pipeline history/log panel in feature detail view (timeline of agent handoffs with timestamps)
   - Escalation visual state — distinct styling when a feature is escalated to Lance

2. **Real-time considerations:**
   - These UI elements must work with Supabase Realtime (already specced in `live-pipeline-automation.md`)
   - New fields to display: `current_agent`, `revision_count`, `pipeline_log` (JSONB)

3. **No backend work needed from you** — schema changes and orchestration logic are IN2's scope

## Edge Cases IN1 Identified (Relevant to UX)

- **Stale agent** — if an agent times out, the card should show a "stalled" state (e.g. spinner → warning icon after 5 min)
- **Concurrent features** — multiple features can be in-pipeline simultaneously; board must handle N features across different stages
- **Supabase down** — if status update fails, the dashboard won't reflect the actual pipeline state; consider a "last synced" timestamp or staleness indicator

## Design Constraints

- Keep it consistent with existing Feature Board card design
- Pipeline log should be collapsible — don't clutter the detail panel
- Mobile-friendly is nice-to-have, not required (this is a wall monitor dashboard)

## Files Likely Affected

- Feature card component (add stage indicator + revision badge)
- Feature detail panel (add pipeline log timeline)
- Any shared status/badge components

## Output Expected

- Component mockups or design specs for the new UI elements
- Structured verdict JSON when complete

---
