# Feature Spec: Agent Pipeline Nervous System — Automated Agent-to-Agent Handoffs

**Author:** HBx (Master Orchestrator)  
**Date:** 2026-02-23  
**Priority:** P0 — Critical  
**Status:** pending  
**Complexity:** L  

---

## 1. Problem Statement

Today HBx manually spawns each pipeline stage and routes results between agents. There's no automated feedback loop — when IN6 issues a REVISE verdict, a human (HBx orchestrator) must manually read the result, spawn IN2 with fix instructions, and re-route to IN6.

The pipeline should be self-driving: agents communicate structured verdicts back to HBx, and HBx auto-routes the next step without manual intervention.

## 2. Goals

1. **Structured agent verdicts** — every pipeline agent outputs a machine-readable verdict (APPROVED/REVISE/REJECT) with structured metadata
2. **HBx auto-routing** — HBx receives verdicts and automatically routes to the next pipeline stage
3. **Revision loops** — on REVISE, HBx auto-routes back to the build agent with the fix list (max 2 loops)
4. **Escalation** — after 2 failed revision loops, HBx escalates to Lance
5. **Status tracking** — each handoff updates the feature status in Supabase automatically
6. **Human gates preserved** — only "Approve to start" and "Approve to ship" require Lance

## 3. Pipeline Flow (Automated)

```
Lance clicks "Approve" on dashboard
    ↓
Dashboard webhook → HBx receives notification
    ↓
HBx spawns IN1 (spec validation)
    ↓
IN1 returns: { verdict: "APPROVED", handoff: "path/to/handoff.md" }
    ↓
HBx updates status → spawns IN5 (design)
    ↓
IN5 returns: { verdict: "APPROVED", handoff: "path/to/handoff.md" }
    ↓
HBx updates status → spawns IN2 (build)
    ↓
IN2 returns: { verdict: "COMPLETE", handoff: "path/to/handoff.md" }
    ↓
HBx updates status → spawns IN6 (QA)
    ↓
IN6 returns: { verdict: "SHIP" } → HBx notifies Lance for review
        — OR —
IN6 returns: { verdict: "REVISE", issues: [...] }
    ↓
HBx auto-routes back to IN2 with fix list (revision loop 1)
    ↓
IN2 fixes → IN6 re-tests → SHIP or REVISE again
    ↓
If REVISE loop 2 → HBx escalates to Lance
```

## 4. Structured Verdict Format

Every agent must output a JSON block at the end of their response:

```json
{
  "verdict": "APPROVED | COMPLETE | SHIP | REVISE | REJECT",
  "feature_id": "uuid",
  "agent": "IN1 | IN5 | IN2 | IN6",
  "handoff_path": "/specs/handoffs/...",
  "revision_loop": 0,
  "issues": [],
  "next_agent": "IN5 | IN2 | IN6 | HBx",
  "status_update": "speccing | designing | building | qa | review"
}
```

## 5. HBx Orchestration Logic

HBx listens for completed sub-agent tasks and:

1. Parses the structured verdict from the response
2. Updates feature status in Supabase via API
3. Routes to the next agent based on verdict:
   - APPROVED/COMPLETE → next pipeline stage
   - SHIP → notify Lance for review gate
   - REVISE → route back to build agent with issues (increment loop counter)
   - REJECT → escalate to Lance immediately
4. Tracks revision loop count per feature
5. Escalates after max 2 revision loops

## 6. Deliverables

### 6.1 Pipeline Orchestration Module
- HBx receives webhook notification when feature is approved
- Spawns agents sequentially based on pipeline stage
- Parses structured verdicts from agent responses
- Updates Supabase feature status at each handoff
- Manages revision loops with counter

### 6.2 Agent Prompt Templates
- Standard prompt template for each pipeline agent that includes:
  - Feature context (spec, handoffs, constraints)
  - Required output format (structured verdict JSON)
  - Revision context when applicable (loop number, previous issues)

### 6.3 Supabase Schema Updates
- Add `revision_count` field to features table
- Add `current_agent` field to features table
- Add `pipeline_log` JSONB field for full pipeline history

### 6.4 Dashboard Updates
- Show current pipeline stage on feature card
- Show revision loop count if > 0
- Pipeline history/log viewable in feature detail panel

## 7. Acceptance Criteria

- [ ] When feature is approved, HBx automatically spawns IN1 without manual intervention
- [ ] Each agent outputs structured verdict JSON that HBx can parse
- [ ] HBx auto-routes between pipeline stages based on verdicts
- [ ] Feature status updates in Supabase at each handoff
- [ ] REVISE verdict auto-routes back to IN2 with issues list
- [ ] Revision loop counter increments correctly
- [ ] After 2 revision loops, HBx escalates to Lance
- [ ] SHIP verdict triggers notification to Lance for review
- [ ] REJECT verdict triggers immediate escalation
- [ ] Pipeline history logged for each feature
- [ ] Dashboard shows current agent and revision count
- [ ] Human gates (approve start, approve ship) still work
- [ ] Typecheck passes
- [ ] Build passes

## 8. Dependencies

- Live Pipeline Board (PR #62) — real-time status display
- Approve webhook — already built
- Gateway webhook endpoint — already built

## 9. Success Metric

A feature goes from "Approved" to "Ready for Review" with zero manual routing by HBx. Lance only touches it twice: approve to start, approve to ship.
