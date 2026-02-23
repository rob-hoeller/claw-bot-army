# IN6 QA Handoff: Live Pipeline Real-Time Board

**From:** IN2 (Code Factory)  
**To:** IN6 (QA)  
**Date:** 2026-02-23  
**Branch:** `hbx/live-pipeline-board`  
**Spec:** `specs/live-pipeline-automation.md`  
**Design:** `specs/handoffs/IN2-live-pipeline-build.md`

---

## 1. What Was Built

### New Files
| File | Purpose |
|------|---------|
| `src/hooks/useRealtimeFeatures.ts` | Supabase Realtime hook — subscribes to `features` table, tracks connection status, activity log, just-moved glow set |
| `src/components/features/ConnectionIndicator.tsx` | Green/yellow/red dot + label for realtime connection state |
| `src/components/features/PipelineActivityFeed.tsx` | Slide-in right sidebar showing last 20 pipeline events |
| `src/components/features/FeatureCard.tsx` | Standalone card component with stuck detection, time-in-stage, priority border (for future war room view) |

### Modified Files
| File | Changes |
|------|---------|
| `src/components/features/FeatureBoard.tsx` | Replaced inline realtime with `useRealtimeFeatures` hook; added `LayoutGroup` + `layoutId` on cards for animated transitions; top bar with ConnectionIndicator, clock, activity feed toggle; alternating lane backgrounds; stuck badge (⚠️ >30min); retry logic on feature creation (chat + form); `isJustMoved` glow class |
| `src/components/features/index.ts` | Added exports for new components |
| `src/app/api/features/[id]/approve/route.ts` | Added 1-retry (5s delay) on gateway webhook notification failure |
| `src/app/globals.css` | Added `@keyframes card-glow` and `animate-pulse-dot` animations |

---

## 2. Test Checklist

### Realtime Subscription
- [ ] With Supabase configured: board updates instantly when a feature's status is changed (via API, Supabase dashboard, or another tab)
- [ ] INSERT: new feature appears in the correct lane without refresh
- [ ] UPDATE: card moves to new lane with spring animation (layoutId)
- [ ] DELETE: card disappears from board without refresh
- [ ] No polling — verify via Network tab (only WebSocket, no repeated fetch calls)

### Connection Indicator
- [ ] Shows 🟢 "Live" when connected
- [ ] Shows 🟡 "Reconnecting…" with pulsing dot when connection drops temporarily
- [ ] Shows 🔴 "Disconnected · Last HH:MM" when fully disconnected
- [ ] On reconnect after disconnect: full data refetch occurs (check Network tab)

### Card Animations
- [ ] Cards animate smoothly between lanes (spring physics, ~300ms)
- [ ] "Just moved" cards have blue glow that fades after ~5s
- [ ] Glow uses `animate-card-glow` CSS class

### Stuck Detection
- [ ] Cards idle >30min in non-terminal stages show ⚠️ badge
- [ ] Cards in `done` or `cancelled` do NOT show stuck badge
- [ ] Badge tooltip says "Stuck >30min"

### Activity Feed
- [ ] Toggle button in top bar opens/closes right sidebar (320px)
- [ ] Sidebar slides in/out with animation
- [ ] Shows last 20 events, newest first
- [ ] Each event shows: time, feature title, new status, agent
- [ ] Empty state message when no events yet

### Create Feature from Chat
- [ ] "Create Feature from Chat" button works after ≥2 assistant messages
- [ ] On transient failure: retries once after 2s before showing error
- [ ] Error message includes the specific error reason
- [ ] Form-based creation also has retry logic

### Approve Button & Gateway Webhook
- [ ] Approve button on eligible cards triggers `/api/features/:id/approve`
- [ ] Gateway notification fires on approve
- [ ] If gateway is down: retries once after 5s (check server logs)

### Dark Theme & Layout
- [ ] Alternating lane backgrounds (subtle shade difference)
- [ ] Lane headers are uppercase with letter-spacing
- [ ] Empty lanes show "No features" text
- [ ] Clock in top bar updates every minute

### Demo Mode
- [ ] Without Supabase env vars: falls back to demo data
- [ ] Demo mode banner appears
- [ ] Cards render, status changes work locally
- [ ] Connection indicator shows "Disconnected"

### Build Quality
- [x] `tsc --noEmit` passes (0 errors)
- [x] `npm run build` passes
- [ ] No console errors in browser
- [ ] No auth or schema changes

---

## 3. Known Limitations / Notes

1. **Status enum**: Uses existing DB statuses (`planning`, `design_review`, `in_progress`, etc.) — NOT the new pipeline statuses from the spec (`pending`, `speccing`, `designing`, etc.). Status alignment is a separate task per spec §9.1.

2. **FeatureCard.tsx**: Created as a standalone component per the design handoff but the board still uses `SortableFeatureCard` (which now has `layoutId` and stuck detection added inline). The standalone `FeatureCard` is available for a future dedicated "war room" read-only view.

3. **Framer Motion `LayoutGroup`**: Wraps the entire DndContext. Cross-column layout animations depend on both Framer Motion and dnd-kit cooperating. If any visual glitches appear during drag-and-drop with layout animations, that's the interaction point to investigate.

4. **Lint warnings**: ~10 warnings (unused vars from destructuring patterns, missing deps in useCallback). No errors. The `_removed` pattern is intentional (object rest destructuring to omit a key).

5. **RLS**: The hook subscribes as the anon/authenticated client. If Supabase RLS blocks SELECT on `features`, realtime won't fire. Ensure RLS policy allows read access.

---

## 4. How to Test Locally

```bash
cd dashboard
npm run dev
# Open http://localhost:3000
# Without SUPABASE env vars → demo mode
# With SUPABASE env vars → live mode with realtime
```

To test realtime: open two tabs, change a feature status in one, verify instant update in the other.

To test stuck detection: create a feature, wait >30min (or temporarily change the threshold in `SortableFeatureCard` to 1000ms for testing).

---

**Verdict: Ready for QA ✅**
