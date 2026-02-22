# Design Spec — Feature Board Persistence Bug UX

**Feature ID:** 0f5b0a96-c89c-41bd-8ef4-245cb6de048e  
**Scope:** Error handling, loading indicators, demo-mode visibility. Tight changes only.

## Goals
- Make persistence failures visible and recoverable.
- Provide clear saving feedback during create/status changes.
- Clarify when the board is running in demo mode (non‑persistent).

## 1) Error Handling UX
### When create fails (form or planning chat)
- **Surface error immediately** via toast (preferred) or inline alert in panel footer.
- **Message:** “Couldn’t create feature. Check connection and try again.”
- **Behavior:** Do **not** keep optimistic feature if server returns non‑2xx. Keep the panel open and allow retry.
- **Fallback:** If demo mode, message should indicate non‑persistent state: “Demo mode — changes won’t be saved.”

### When status change / drag-and-drop fails
- **Surface error** with a toast: “Status update failed. Reverted.”
- **Rollback:** Revert UI to previous status (either by reloading or restoring prior state). Avoid silent failure.
- **Optional:** Inline status-level indicator (small red dot or ‘failed’ tag) if toast system doesn’t exist.

### When reassign or approve fails
- **Surface error** with toast: “Update failed. Try again.”
- **Rollback**: revert assigned_to/status to last known value.

## 2) Loading / Saving Indicators
### Create feature (form/chat)
- **Disable primary action** during save.
- **Button label:** “Creating…” with spinner (already partially present). Keep spinner for both chat and form flows.
- **Optional:** Show a subtle line of helper text under button: “Saving to server…” when saving.

### Status change / drag-and-drop
- **Micro-loading indicator** on the card being updated (e.g., small spinner overlay or dim + spinner in corner).
- **Interaction lock:** Disable repeated status changes for the same card until the request resolves.

### Reassign / Approve actions
- **Existing button spinner** is good; ensure it’s tied to request status and includes error fallback.

## 3) Demo Mode Indicator
- **Keep the existing banner** (“Demo mode — Connect Supabase for live data”).
- Make it **persistent and visible** near the header (current placement is OK).
- **Add a short tooltip** or inline secondary text: “Changes won’t persist after refresh.”
- When demo mode is active, creation/status change errors should not show generic failure; instead show an **info toast**: “Demo mode — changes are local only.”

## UI Copy (Suggested)
- Create failure: “Couldn’t create feature. Check connection and try again.”
- Status failure: “Status update failed. Reverted.”
- Reassign failure: “Update failed. Try again.”
- Demo info: “Demo mode — changes are local only.”

## Non-Goals
- No new workflows or complex state management.
- No new visual design system.

## Acceptance Criteria (UX)
- User sees a visible error message on create/status/reassign/approve failures.
- UI does not silently keep optimistic state on failure.
- Users can tell when they are in demo mode and that data will not persist.
- Loading indicators are shown during create/status updates without blocking unrelated actions.
