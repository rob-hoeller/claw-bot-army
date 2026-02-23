# IN2 Build Handoff: Live Pipeline Real-Time Board

**From:** IN5 (UI/UX Expert)  
**To:** IN2 (Code Factory)  
**Date:** 2026-02-23  
**Verdict:** ✅ APPROVED FOR BUILD  
**Spec:** `specs/live-pipeline-automation.md`

---

## 1. Board Layout

**Full-width dark Kanban, 8 columns, single viewport — no page scroll.**

```
┌─────────────────────────────────────────────────────────────────────┐
│  🟢 Live              PIPELINE BOARD              Activity Feed ▸  │
├────────┬─────────┬────────┬─────────┬────────┬─────┬───────┬───────┤
│ Pending│Approved │Speccing│Designing│Building│ QA  │Review │Shipped│
│        │         │        │         │        │     │       │       │
│ [card] │ [card]  │        │  [card] │ [card] │     │       │[card] │
│ [card] │         │        │         │        │     │       │[card] │
│        │         │        │         │        │     │       │       │
└────────┴─────────┴────────┴─────────┴────────┴─────┴───────┴───────┘
```

### Columns
- CSS Grid: `grid-template-columns: repeat(8, 1fr)` on the lane container
- Each lane has a header label + card stack below
- Lane header: uppercase, `font-size: 0.75rem`, `letter-spacing: 0.1em`, muted color
- Lane background: alternating subtle shades (`#1a1a2e` / `#16213e`) for visual separation
- Min-height: `calc(100vh - 64px)` (below top bar)

### Top Bar (64px)
- Left: Connection indicator (see §4) + "PIPELINE BOARD" title
- Right: Activity feed toggle button + clock (HH:MM, updates every minute)

### Responsive Note
- Target: 1920×1080 (Full HD office monitor). No mobile/tablet needed.
- If <1280px wide, allow horizontal scroll on lane container

---

## 2. Feature Card Design

```
┌──────────────────────┐
│ 🔴 P0  Feature Title │  ← priority badge + title (bold, 14px)
│ Assigned: IN2        │  ← agent or "Pending human" (12px, muted)
│ ⏱ 12m in stage       │  ← live elapsed timer (12px)
└──────────────────────┘
```

### Specs
- Background: `#1e293b` (slate-800), border-left: 4px solid priority color
- Priority colors: P0 `#ef4444`, P1 `#f97316`, P2 `#3b82f6`, default `#6b7280`
- Border-radius: `8px`, padding: `12px 14px`
- Title: `font-weight: 600`, `font-size: 0.875rem`, white, truncate with ellipsis at 2 lines
- Subtitle text: `font-size: 0.75rem`, `color: #94a3b8`
- Card gap within lane: `8px`
- Max cards visible per lane without scroll: 6. Beyond that, lane scrolls vertically (`overflow-y: auto`, thin custom scrollbar)

### Time-in-Stage
- Calculated client-side from `updated_at` timestamp on the feature row
- Updates every 60s via `setInterval`
- Format: `<1m` → `3m` → `1h 12m` → `2d 3h`

### Stuck Warning
- If time-in-stage > 30 min: show ⚠️ amber badge on card
- Use `updated_at` comparison, not a separate field

### "Just Moved" Glow
- When a card arrives in a new lane, apply a glow animation (see §3)
- Remove after 5 seconds

---

## 3. CSS Transitions & Animations

### Card Lane Transition (FLIP technique)
Use `layout` animations. Recommended: **Framer Motion `<AnimatePresence>` + `layoutId`**.

Each card gets `layoutId={feature.id}`. When the status changes and the card renders in a different column, Framer Motion auto-animates position.

```tsx
<motion.div
  layoutId={feature.id}
  layout
  transition={{ type: "spring", stiffness: 300, damping: 30 }}
>
  <FeatureCard feature={feature} />
</motion.div>
```

If Framer Motion is not in the project, use **CSS FLIP manually**:
```css
.card {
  transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}
```
But **prefer Framer Motion** — it handles layout shifts across parents cleanly.

### Just-Moved Glow
```css
@keyframes card-glow {
  0%   { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.6); }
  50%  { box-shadow: 0 0 20px 4px rgba(59, 130, 246, 0.3); }
  100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
}
.card-just-moved {
  animation: card-glow 2s ease-out;
}
```
- Apply class on arrival, remove after 5s via `setTimeout` or `onAnimationEnd`

### Lane Empty State
- Centered muted text: "No features" in `#475569`, `font-size: 0.75rem`

---

## 4. Connection Status Indicator

Top-left of top bar:

| State | Display | Behavior |
|-------|---------|----------|
| Connected | 🟢 `Live` (green dot + text) | Steady |
| Reconnecting | 🟡 `Reconnecting…` | Pulse animation on dot |
| Disconnected | 🔴 `Disconnected · Last update 01:23` | Shows last known `updated_at` |

```css
@keyframes pulse-dot {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}
.reconnecting .dot { animation: pulse-dot 1.5s infinite; }
```

---

## 5. Activity Feed

- **Position:** Right sidebar, 320px wide, slides in/out with `transform: translateX` transition (300ms)
- **Toggle:** Button in top bar. Default: **hidden** (passive display mode)
- **Content:** Last 20 events, newest on top
- **Event format:** `HH:MM  Feature Title → Status (Agent)`
- **Styling:** `font-size: 0.75rem`, monospace-ish (`font-family: 'JetBrains Mono', monospace`), `color: #94a3b8`
- **Auto-scroll:** New events push to top (prepend), no scrolling needed
- **Data source:** Derive from same Realtime subscription — on every status UPDATE, push an event to a local array (max 50, trim oldest)

---

## 6. Supabase Realtime Subscription Pattern

### Hook: `useRealtimeFeatures()`

```tsx
import { useEffect, useState, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Feature } from '@/types'

type ConnectionStatus = 'connected' | 'reconnecting' | 'disconnected'

export function useRealtimeFeatures() {
  const [features, setFeatures] = useState<Feature[]>([])
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected')
  const [activityLog, setActivityLog] = useState<ActivityEvent[]>([])
  const [justMoved, setJustMoved] = useState<Set<string>>(new Set())

  // Initial fetch
  const fetchAll = useCallback(async () => {
    const { data } = await supabase
      .from('features')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setFeatures(data)
  }, [])

  useEffect(() => {
    fetchAll()

    const channel = supabase
      .channel('features-realtime')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'features' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setFeatures(prev => [payload.new as Feature, ...prev])
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as Feature
            setFeatures(prev =>
              prev.map(f => f.id === updated.id ? updated : f)
            )
            // Track "just moved" for glow
            setJustMoved(prev => new Set(prev).add(updated.id))
            setTimeout(() => {
              setJustMoved(prev => {
                const next = new Set(prev)
                next.delete(updated.id)
                return next
              })
            }, 5000)
            // Activity log
            setActivityLog(prev => [{
              time: new Date(),
              featureTitle: updated.title,
              status: updated.status,
              agent: updated.assigned_agent,
            }, ...prev].slice(0, 50))
          } else if (payload.eventType === 'DELETE') {
            setFeatures(prev =>
              prev.filter(f => f.id !== payload.old.id)
            )
          }
        }
      )
      .on('system', { event: '*' }, (payload) => {
        // Not standard — see subscribe callback below
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected')
        } else if (status === 'CHANNEL_ERROR') {
          setConnectionStatus('disconnected')
        } else if (status === 'TIMED_OUT') {
          setConnectionStatus('reconnecting')
        }
      })

    return () => { supabase.removeChannel(channel) }
  }, [fetchAll])

  return { features, connectionStatus, activityLog, justMoved, refetch: fetchAll }
}
```

### Reconnection Strategy
- Supabase JS client auto-reconnects on WebSocket drop
- **On reconnect (`SUBSCRIBED` after a non-connected state):** call `fetchAll()` to catch missed events (spec §9.3 edge case)
- Track `lastConnectedAt` — show in disconnected banner

### RLS Prerequisite
- Ensure `features` table has `SELECT` granted for the role used by the board client (likely `anon` or `authenticated`)
- If RLS is on, add policy: `USING (true)` for SELECT on features (board is read-only, non-sensitive)

---

## 7. Human Gate Buttons (FeatureDetailPanel.tsx)

Not the main focus of this handoff (already specced in `approve-webhook-design.md`), but for completeness on the board:

- **"Approve" button**: Shown on cards in `pending` lane. Green outline button. On click → `PATCH /api/features/:id { status: 'approved' }` → triggers webhook to HBx.
- **"Ship" button**: Shown on cards in `review` lane. Blue solid button. On click → `PATCH /api/features/:id { status: 'ready_to_ship' }`.
- These are **optional on the war room display** — the passive board doesn't need them. They belong on the interactive detail panel accessed from a workstation.

---

## 8. Dark Theme Tokens

```ts
const theme = {
  bg:           '#0f172a',  // slate-900 — page bg
  laneBgA:      '#1a1a2e',  // odd lanes
  laneBgB:      '#16213e',  // even lanes
  cardBg:       '#1e293b',  // slate-800
  cardBorder:   '#334155',  // slate-700
  textPrimary:  '#f1f5f9',  // slate-100
  textMuted:    '#94a3b8',  // slate-400
  accent:       '#3b82f6',  // blue-500 (glow, links)
  success:      '#22c55e',  // green-500 (connected)
  warning:      '#f59e0b',  // amber-500 (stuck, reconnecting)
  danger:       '#ef4444',  // red-500 (P0, disconnected)
}
```

---

## 9. File Manifest

| File | Action | Notes |
|------|--------|-------|
| `hooks/useRealtimeFeatures.ts` | CREATE | Realtime hook per §6 |
| `components/FeatureBoard.tsx` | MODIFY | Replace polling with Realtime, add lane grid + animations |
| `components/FeatureCard.tsx` | CREATE or MODIFY | Card component per §2 |
| `components/ConnectionIndicator.tsx` | CREATE | Status dot per §4 |
| `components/ActivityFeed.tsx` | CREATE | Feed sidebar per §5 |
| `components/FeatureDetailPanel.tsx` | MODIFY | Add Ship button (Approve may already exist) |

---

## 10. Acceptance Criteria (for IN2 to verify before handoff to IN6)

- [ ] Board renders 8 lanes with correct statuses
- [ ] Cards animate between lanes on Realtime UPDATE (no page refresh)
- [ ] "Just moved" glow appears and fades after 5s
- [ ] Connection indicator reflects live/reconnecting/disconnected
- [ ] Reconnect triggers full refetch
- [ ] Stuck badge (⚠️) shows on cards idle >30min
- [ ] Activity feed toggles open/closed, shows last 20 events
- [ ] Dark theme, readable at 10ft on 1080p monitor
- [ ] No polling — purely push-based updates
- [ ] Typecheck passes, build passes, no console errors
- [ ] Empty lane states display gracefully

---

## Design Decision Log

| Decision | Rationale |
|----------|-----------|
| Framer Motion `layoutId` for card transitions | Cleanest cross-parent animation; avoids manual FLIP bookkeeping |
| Dark theme (slate-900 base) | Wall monitor in office — reduces glare, looks professional |
| Activity feed default hidden | Passive display should be clean; toggle for when you want detail |
| Client-side time-in-stage from `updated_at` | Avoids extra DB column; accurate enough for display purposes |
| 320px sidebar feed (not overlay) | Doesn't obscure cards; pushes board content left gracefully |
| Max 6 cards per lane before scroll | Keeps cards readable at distance; 20 features across 8 lanes rarely exceeds this |
| Full refetch on reconnect | Supabase Realtime can miss events during disconnect — only safe pattern |

---

**Verdict: ✅ APPROVED FOR BUILD**

No blockers. IN2 should confirm Framer Motion is available in the project (or install it: `npm i framer-motion`). If not permitted, fall back to CSS FLIP per §3.

Status prerequisite from spec §9.1 (status enum alignment) must be resolved by IN1/HBx before IN2 begins — IN2 should use the 8 statuses defined in this spec as canonical.
