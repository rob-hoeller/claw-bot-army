# Design Spec: DeploymentStatusBadge

**Feature:** Agent Status Badges · **Size:** S · **Phase:** 3 (Design) · **Author:** HBx_IN5 · **Date:** 2026-02-21

---

## 1. Component Structure

```
DeploymentStatusBadge (new)          — colored dot + label
├── Used in: AgentCard               — size="sm", below role text
└── Used in: AgentDetailPanel header — size="md", next to agent ID
```

**This replaces** the existing inline `<Badge variant="success|warning">` currently used in both AgentCard (line ~113) and AgentDetailPanel header (line ~285). The existing `AgentStatusBadge` (gateway status: idle/processing/typing/offline) is a **separate concern** and stays as-is in its top-right position.

**File:** `dashboard/src/components/agents/DeploymentStatusBadge.tsx`

---

## 2. Layout

### AgentCard
Current order: emoji → agent ID → role text → status badge. **No change to order** — the new component is a drop-in replacement for the current `<Badge>` at the bottom of the card.

### AgentDetailPanel Header
Current: `<h2>{agent.id}</h2> <Badge>{status}</Badge>`. Same position — inline next to the ID, replacing the current Badge.

---

## 3. Design Tokens

| Status | Dot color | Label color | Matches existing? |
|--------|-----------|-------------|-------------------|
| `active` | `bg-emerald-500` | `text-emerald-400` | Yes — existing uses `variant="success"` (green) |
| `deploying` | `bg-yellow-500` | `text-yellow-400` | Yes — existing uses `variant="warning"` (yellow) |
| `standby` / `inactive` | `bg-zinc-500` | `text-zinc-400` | New — neutral gray, fits dark theme |
| `unknown` / `null` | `bg-zinc-600` | `text-zinc-500` | Fallback — dimmer gray |

Background pill (optional, for md size): `bg-{color}-500/10 rounded-full px-2 py-0.5`

---

## 4. Size Variants

| Prop | Dot | Font | Gap | Pill padding |
|------|-----|------|-----|-------------|
| `sm` | `w-1.5 h-1.5` | `text-[10px]` | `gap-1` | none (dot + text only) |
| `md` | `w-2 h-2` | `text-xs` | `gap-1.5` | `px-2 py-0.5` with bg pill |

These align with the existing `AgentStatusBadge` sizing pattern (sm: `w-2 h-2`, md: `w-2.5 h-2.5`) but slightly smaller since deployment status is secondary to gateway status.

---

## 5. Accessibility

- `role="status"` on container
- `aria-label="Deployment status: {status}"` on container
- Dot is decorative (`aria-hidden="true"`)
- All label colors pass WCAG AA against black/dark backgrounds (emerald-400 on black = ~5.5:1, yellow-400 = ~12:1, zinc-400 = ~5.7:1 ✓)

---

## 6. UI States

| State | Rendering |
|-------|-----------|
| `active` | Green dot + "Active" |
| `deploying` | Yellow dot (pulse animation) + "Deploying" |
| `standby` | Gray dot + "Standby" |
| `inactive` | Gray dot + "Inactive" |
| `null` / `undefined` | Gray dot + "Unknown" — treat as standby visually |

Pulse animation on `deploying` only: reuse same pattern from existing `AgentStatusBadge` (framer-motion scale pulse). Keep it subtle — 1.5s cycle, opacity 0→0.5→0.

---

## 7. Consistency Check

| Aspect | Verdict |
|--------|---------|
| Color palette | ✅ Uses existing Tailwind emerald/yellow/zinc — matches dark theme |
| Typography | ✅ `text-[10px]` and `text-xs` match existing badge/label sizes |
| Spacing | ✅ `gap-1` / `gap-1.5` matches `AgentStatusBadge` pattern |
| Animation | ✅ Pulse reuses framer-motion pattern from gateway badge |
| Component naming | ✅ `DeploymentStatusBadge` clearly differentiates from `AgentStatusBadge` (gateway) |
| Dark theme | ✅ All colors are /400-/500 variants on dark bg — consistent |

---

## Props Interface

```typescript
type DeploymentStatus = 'active' | 'deploying' | 'standby' | 'inactive'

interface DeploymentStatusBadgeProps {
  status: DeploymentStatus | null | undefined
  size?: 'sm' | 'md'
  className?: string
}
```

---

**Ready for Phase 4 (Implementation).**
