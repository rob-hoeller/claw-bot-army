# Feature Spec: Agent Status Badges

**ID:** 6fa54d75-a432-418c-b518-7ebd6333be4f
**Priority:** Low | **Complexity:** S
**Author:** HBx_IN1 (Product Architect)
**Date:** 2026-02-21

---

## Goal

Add colored status badges next to agent names on the Agents page so operators can instantly see each agent's deployment status at a glance.

- **Active** → green badge
- **Deploying** → yellow badge
- **Inactive** → gray badge

**Why:** Currently the page shows a small `Badge` component with "Active"/"Deploying" text and a success/warning variant, but there's no "inactive" state, the color mapping is incomplete (standby ≠ inactive), and the existing `AgentStatusBadge` component tracks *gateway* status (idle/processing/typing/offline) — a separate concern from deployment status. This feature normalizes the deployment-status badge across the UI.

---

## Current State Analysis

### What exists:
1. **`AgentStatusBadge`** (`src/components/agents/AgentStatusBadge.tsx`) — tracks real-time *gateway* status (idle/processing/typing/offline). This is **not** the deployment status badge. Keep as-is.
2. **Inline Badge in `AgentCard`** (AgentsPage.tsx ~line 108) — renders `<Badge variant="success"|"warning">` for `active` vs everything else. No `inactive`/gray variant.
3. **Inline Badge in `AgentDetailPanel`** header (~line 330) — same pattern.
4. **`useAgents` hook** (`src/hooks/useAgents.ts`) — derives status from config file completeness: all 7 files = `active`, fewer = `deploying`. The DB `status` column is ignored. No `inactive` state derived.
5. **Agent interface** defines `status: "active" | "deploying" | "standby"` — uses `standby` not `inactive`.

### Data model:
- Supabase `agents.status` column exists but is **ignored** by `useAgents` (status is derived from file count).
- The hardcoded agent tree in `AgentsPage` uses `"standby"` for inactive agents.

---

## Deliverables

1. **New `DeploymentStatusBadge` component** — a simple, reusable badge mapping `active|deploying|inactive|standby` to colored dots + labels.
2. **Update `AgentCard`** — replace inline Badge with `DeploymentStatusBadge`.
3. **Update `AgentDetailPanel` header** — same replacement.
4. **Normalize status type** — add `"inactive"` to the Agent status union (or map `standby` → display as "Inactive").

---

## Data Model Changes

**None required.** The `agents.status` column already exists. The status is currently derived client-side in `useAgents`. Two options:

- **Option A (recommended):** Keep derived status logic but map `standby` → display label "Inactive" with gray styling. No DB change.
- **Option B:** Add `inactive` as a DB enum value. Overkill for now.

---

## File Scope

| Path | Action | Description |
|------|--------|-------------|
| `src/components/agents/DeploymentStatusBadge.tsx` | **Create** | New component: colored dot + label for active/deploying/inactive |
| `src/components/agents/index.ts` | **Modify** | Export `DeploymentStatusBadge` |
| `src/components/AgentsPage.tsx` | **Modify** | Replace inline `<Badge>` in `AgentCard` and `AgentDetailPanel` with `<DeploymentStatusBadge>` |

---

## Acceptance Criteria

- [ ] `DeploymentStatusBadge` renders a colored dot + text label
- [ ] `active` status → green dot, "Active" label
- [ ] `deploying` status → yellow dot, "Deploying" label
- [ ] `standby` or `inactive` status → gray dot, "Inactive" label
- [ ] Badge appears in `AgentCard` below the agent role text
- [ ] Badge appears in `AgentDetailPanel` header next to agent ID
- [ ] Component accepts `size` prop (`sm` | `md`) for card vs detail panel use
- [ ] No layout shift or visual regression on the Agents page
- [ ] Existing `AgentStatusBadge` (gateway status dot, top-right of card) is unchanged

---

## Dependencies

- Existing `Badge` component from `@/components/ui/badge` (or replace with custom)
- Tailwind CSS classes for green/yellow/gray colors (already available)
- No new packages needed

---

## Unknowns

- **Should `standby` be renamed to `inactive` in the type system?** Recommendation: keep `standby` internally, display as "Inactive" in the UI. Revisit if more statuses are added later.
- **Should derived status logic in `useAgents` add an `inactive` derivation?** Currently it only produces `active` or `deploying`. Agents with zero files could be `inactive`. Low priority — address in a follow-up if needed.
