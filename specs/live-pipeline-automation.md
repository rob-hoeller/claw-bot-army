# Feature Spec: Live Pipeline Automation & Real-Time Board

**Author:** HBx (Master Orchestrator)  
**Date:** 2026-02-23  
**Priority:** P0 — Critical  
**Status:** design_ready  
**Complexity:** L  

---

## 1. Problem Statement

The automated feature pipeline exists in concept (SOUL.md) but has no wiring. Today:
- "Create Feature from Chat" button fails (connection error)
- No trigger tells HBx to route an approved feature through the pipeline
- The board requires manual browser refresh to see status changes
- No real-time visibility into pipeline activity

Lance wants a **live war room board** on an office monitor showing features moving through pipeline lanes in real time — no refresh needed.

## 2. Goals

1. **Fix "Create Feature from Chat"** — button reliably inserts the feature into Supabase
2. **Human-gated pipeline trigger** — "Approve" button sets status to `approved`, which notifies HBx to start routing
3. **Automated agent handoffs** — HBx routes through IN1 → IN5 → IN2 → IN6, updating status at each stage
4. **Human review gate** — after QA, Lance reviews and approves to ship
5. **Real-time board** — Supabase Realtime subscriptions push status changes to the board instantly (no polling, no refresh)
6. **Live activity feed** — optional sidebar or overlay showing pipeline events as they happen

## 3. Human Gates (Only 3)

| Gate | Who | Action | Trigger |
|------|-----|--------|---------|
| 1. Start pipeline | Lance | Click "Approve" on feature card | Sets status `approved` → notifies HBx |
| 2. Ship approval | Lance | Review QA verdict → click "Ship" | Sets status `ready_to_ship` → HBx creates PR |
| 3. Merge & deploy | Rob | Merge PR on GitHub | Final deploy via Vercel |

Everything between gates 1 and 2 is fully automated by HBx.

## 4. Pipeline Statuses (Board Lanes)

```
pending → approved → speccing → designing → building → qa → review → shipped
           ↑ Human    ← All automated by HBx →    ↑ Human     ↑ Rob
```

## 5. Deliverables

### 5.1 Fix "Create Feature from Chat" Button
- Debug and fix the Supabase insert in the planning chat panel
- Ensure structured spec (title, description, acceptance criteria) is saved
- Status: `pending` on creation

### 5.2 Approve → Pipeline Trigger
- "Approve" button on feature card sets status to `approved`
- API route sends notification to HBx via gateway (per existing `approve-webhook` spec)
- HBx receives notification → spawns IN1 with routing ticket → pipeline begins

### 5.3 HBx Pipeline Orchestration
- HBx watches for `approved` features (via webhook notification)
- Routes sequentially: IN1 (spec) → IN5 (design) → IN2 (build) → IN6 (QA)
- Updates feature status in Supabase at each handoff
- Max 2 revision loops on QA failure before escalating to Lance
- Notifies Lance when QA passes and review is needed

### 5.4 Real-Time Board (Supabase Realtime)
- Subscribe to `features` table changes via Supabase Realtime
- On any `UPDATE` to status field → animate the card moving to the new lane
- No polling, no manual refresh
- Smooth CSS transition when cards move between columns
- Connection status indicator (green dot = live, red = reconnecting)

### 5.5 Live Activity Feed (Optional Enhancement)
- Small event log overlay or sidebar on the board
- Shows: "[timestamp] Feature X moved to Building — assigned to IN2"
- Auto-scrolls, last 20 events visible

## 6. File Scope

| File | Changes |
|------|---------|
| `FeatureBoard.tsx` | Add Supabase Realtime subscription, animate lane transitions |
| `FeatureDetailPanel.tsx` | Fix create button, add "Ship" approval button |
| `approve/route.ts` | Add HBx gateway notification on status `approved` |
| Pipeline (HBx config) | Pipeline routing logic for agent handoffs |

## 7. Acceptance Criteria

- [ ] "Create Feature from Chat" successfully inserts feature with status `pending`
- [ ] "Approve" button transitions to `approved` and notifies HBx
- [ ] HBx automatically routes feature through IN1 → IN5 → IN2 → IN6
- [ ] Status updates appear on board in real time (no refresh)
- [ ] Card animates smoothly between lanes on status change
- [ ] Connection indicator shows live/disconnected state
- [ ] QA completion triggers notification to Lance for review
- [ ] "Ship" approval creates PR and notifies Rob
- [ ] Max 2 QA revision loops before escalation
- [ ] Board works as a passive monitor (no interaction needed to stay current)
- [ ] Typecheck passes
- [ ] Build passes

## 8. Dependencies

- Existing specs: `unified-feature-creation.md`, `approve-webhook-design.md`
- Supabase Realtime enabled on `features` table
- HBx gateway webhook endpoint

## 9. Edge Cases & Risks

1. **Status naming**: `unified-feature-creation.md` uses `planning/design_review/in_progress/qa_review`. This spec introduces `pending/approved/speccing/designing/building/qa/review/shipped`. **Resolution required before build**: either migrate the unified spec's statuses to match this spec (preferred — cleaner lane model), or add a mapping layer. Recommend aligning on this spec's statuses as the canonical set since it covers the full lifecycle.
2. **Supabase Realtime row-level security**: Ensure the Realtime subscription works with existing RLS policies. If `features` table has RLS enabled, the anon/authenticated role must have SELECT access or Realtime won't fire.
3. **Stale WebSocket**: If the board tab sleeps (laptop lid close, monitor power-save), the Realtime connection drops. On reconnect, do a full refetch to catch missed events — don't rely solely on the subscription resuming cleanly.
4. **Agent failure mid-pipeline**: If an agent (e.g., IN2) crashes or times out during `building`, the feature gets stuck. Add a 30-min timeout per stage; if exceeded, HBx escalates to Lance via Telegram with the stuck feature ID.
5. **Concurrent features**: Multiple features can be in-pipeline simultaneously. Board must handle N features per lane. HBx should queue if agent capacity is exceeded (max 1 active build per IN2).
6. **Gateway down during approve**: Already fire-and-forget per `approve-webhook-design.md`, but add a retry (1 retry after 5s) to reduce silent failures on transient errors.

## 10. Success Metric

Lance can watch a monitor in the office and see features flow from "Approved" through every pipeline stage to "Shipped" — live, without touching anything.
