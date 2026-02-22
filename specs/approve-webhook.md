# Feature Board Approve Webhook

**Author:** IN1 (Product Architect)  
**Date:** 2026-02-22  
**Status:** design_review  
**Assigned:** HBx_IN5  
**Requested by:** Lance  

---

## Problem

When Lance approves a feature on the Feature Board (moving `review` → `approved`), he must manually switch to Telegram to tell HBx to submit the PR. This is a manual step that should be automated.

## Solution

Add `approved` to the existing gateway notification logic in the approve API route. The route already fires notifications for `design_review`, `in_progress`, and `review` transitions — we simply extend it to also fire on `approved`, with a message that instructs HBx to submit the PR.

---

## Current State

**File:** `src/app/api/features/[id]/approve/route.ts`

The route already:
1. Updates feature status in Supabase
2. Posts an approval message to `work_item_messages`
3. Sends a fire-and-forget notification to the OpenClaw gateway for transitions to `design_review`, `in_progress`, `review`

The `notifyStatuses` array on **line ~90** excludes `approved`. That's the only gap.

---

## Changes Required

### 1. Extend `notifyStatuses` to include `approved`

```diff
- const notifyStatuses = ['design_review', 'in_progress', 'review']
+ const notifyStatuses = ['design_review', 'in_progress', 'review', 'approved']
```

### 2. Use a status-specific message for `approved`

When `target_status === 'approved'`, the gateway message should explicitly instruct HBx to submit the PR:

```typescript
let notificationContent: string

if (target_status === 'approved') {
  notificationContent = [
    `🚀 Feature "${data.title}" (ID: ${id}) has been APPROVED by ${approved_by || 'Lance'}.`,
    `Branch: ${data.branch || 'unknown'}`,
    `Please submit the PR to main now.`,
  ].join('\n')
} else {
  notificationContent = `Feature "${data.title}" (${id}) has been approved and moved to ${target_status.replace(/_/g, ' ')}. It has been auto-assigned to ${autoAssignMap[target_status] || 'the next agent'}. Please route accordingly.`
}
```

### 3. Message format — what HBx needs

| Field | Source | Purpose |
|-------|--------|---------|
| Feature title | `data.title` | Identify which feature |
| Feature ID | `id` (URL param) | DB lookup |
| Branch name | `data.branch` | Know which branch to PR from |
| Approved by | `approved_by` from request body | Audit trail |
| Action | Hardcoded: "submit PR" | Tell HBx what to do |

---

## Notification Mechanism

**Recommended: OpenClaw Gateway API (already in use)**

The route already calls `${GATEWAY_URL}/v1/chat/completions` with `model: 'openclaw:HBx'`. This delivers the message to HBx via its Telegram channel. No new infrastructure needed.

**Rejected alternatives:**
- Direct Telegram Bot API — adds a separate credential, bypasses OpenClaw routing
- Internal webhook — unnecessary indirection since gateway already works

---

## Error Handling

- **Notification is fire-and-forget** (existing pattern). If the gateway call fails, the feature remains approved.
- The existing `.catch(() => {})` swallows errors silently. Optionally enhance to log:
  ```typescript
  .catch((err) => {
    console.error('[API] Gateway notification failed for approved feature:', id, err)
  })
  ```
- No retry needed — Lance can see the approval succeeded on the board and manually message HBx if needed.

---

## Security Considerations

- **No new credentials.** Uses existing `OPENCLAW_GATEWAY_URL` and `OPENCLAW_GATEWAY_TOKEN` env vars.
- **No new attack surface.** Same fire-and-forget pattern already in production.
- **Auth on the approve endpoint itself** is unchanged (currently unauthenticated — that's a separate concern, not in scope).

---

## File Scope

| File | Change |
|------|--------|
| `src/app/api/features/[id]/approve/route.ts` | Add `'approved'` to `notifyStatuses`, add status-specific message |

**That's it.** One file, ~10 lines changed.

---

## Acceptance Criteria

- [ ] Clicking "Approve → Ready" on the Feature Board triggers a Telegram message to HBx
- [ ] Message includes feature title, ID, branch name, and "submit PR" instruction
- [ ] Feature status updates to `approved` regardless of notification success/failure
- [ ] No new env vars or infrastructure required
- [ ] Existing notifications for other status transitions still work
