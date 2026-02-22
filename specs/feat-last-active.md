# Spec: "Last Active" Timestamp on Agent Cards

**Ticket:** feat-last-active  
**Priority:** Medium | **Size:** S  
**Author:** HBx_IN1 | **Date:** 2026-02-21  

---

## Goal

Display a human-readable relative timestamp ("2 hours ago", "Just now", etc.) on each agent card showing when the agent was last active.

## Files to Modify

| # | File | Change |
|---|------|--------|
| 1 | `src/hooks/useAgents.ts` | Add `last_active` to select query and `Agent` interface |
| 2 | `src/components/AgentsPage.tsx` | Add `last_active` to local `Agent` interface; render timestamp in `AgentCard` |

No new files. No new dependencies.

## Interface Changes

### `src/hooks/useAgents.ts` — `Agent` interface

```ts
export interface Agent {
  // ... existing fields ...
  last_active?: string | null  // ISO 8601 timestamptz from Supabase
}
```

### `src/components/AgentsPage.tsx` — local `Agent` interface

```ts
interface Agent {
  // ... existing fields ...
  last_active?: string | null
}
```

## Data Flow

```
Supabase agents.last_active (TIMESTAMPTZ)
  → useAgents.ts select(..., last_active)
  → parsed into Agent.last_active (ISO string)
  → AgentsPage.tsx receives it via agent tree
  → AgentCard renders relative time
```

### useAgents.ts changes

1. Add `last_active` to the `.select()` column list.
2. Map it in the parsed output:
   ```ts
   last_active: (row.last_active as string) || null,
   ```
3. Also pass it through in `AgentsPage.tsx`'s `fetchAgents` Supabase query (the inline one) — add `last_active` to the select and map it into the tree.

## UI Placement

Inside `AgentCard`, below the existing `DeploymentStatusBadge`, add the timestamp:

```tsx
{/* Existing */}
<div className="flex items-center gap-2 mt-2">
  <DeploymentStatusBadge status={agent.status} size="sm" />
</div>

{/* New — Last Active */}
<div className="flex items-center gap-1 mt-1.5">
  <Clock className="h-3 w-3 text-white/30" />
  <span className="text-[10px] text-white/30">
    {formatLastActive(agent.last_active)}
  </span>
</div>
```

The `Clock` icon is already imported from `lucide-react` in AgentsPage.tsx.

## Relative Time Formatter

**No new dependency.** `date-fns` is not in `package.json` and adding it for one function is unnecessary. Use a lightweight inline helper:

```ts
function formatLastActive(iso?: string | null): string {
  if (!iso) return "No activity"
  
  const now = Date.now()
  const then = new Date(iso).getTime()
  const diffSec = Math.floor((now - then) / 1000)
  
  if (diffSec < 60) return "Just now"
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
```

Place this helper at the top of `AgentsPage.tsx` near the existing utility functions.

## Edge Cases

| Scenario | Display |
|----------|---------|
| `last_active` is `null` / `undefined` | "No activity" |
| `last_active` is in the future (clock skew) | "Just now" (clamp) |
| `last_active` is > 7 days ago | Short date, e.g. "Feb 14" |

## Acceptance Criteria

- [ ] `last_active` field appears on every agent card
- [ ] Shows relative time that updates on re-render
- [ ] Shows "No activity" for agents with no `last_active` value
- [ ] No new npm dependencies added
- [ ] Typecheck passes (`npm run build`)
- [ ] Consistent with existing card styling (white/30 text, 10px size)
