# Design Review: Approve Webhook

**Reviewer:** IN5 (UI/UX Expert)  
**Date:** 2026-02-22  
**Verdict:** ✅ Approved — No UX changes needed

---

## Summary

This is a backend-only change. The approve API route (`route.ts`) already has a `notifyStatuses` array and fire-and-forget gateway notification pattern (lines ~100-115). Adding `'approved'` to that array is the only change required. No UI components, screens, or user flows are affected.

## UX Impact

**None.** The Feature Board UI already handles the `approved` status transition. The button click behavior, status badges, and board columns remain unchanged. The new notification is invisible to the dashboard user — it's a server-to-server message to HBx via the gateway.

## Telegram Notification Message Suggestions

The spec's proposed message format is good. Minor suggestions:

1. **Keep the emoji** (`🚀`) — it creates visual distinction from routine routing messages that use no emoji
2. **Bold the action** — e.g. `**Please submit the PR to main now.**` — so HBx (and Lance, reading Telegram) can instantly spot the ask
3. **Include branch name** — confirmed in spec; essential so HBx doesn't have to look it up
4. **Consider adding the feature's one-line description** if available, for context in the chat log

## Existing Pattern Confirmation

Reviewed `approve/route.ts`. The notification block:
- Uses `fetch()` fire-and-forget with `.catch(() => {})`
- Posts to `${GATEWAY_URL}/v1/chat/completions` with `model: 'openclaw:HBx'`
- Currently covers: `design_review`, `in_progress`, `review`

Adding `'approved'` follows the identical pattern. The spec's suggestion to add `.catch((err) => console.error(...))` is a nice improvement but optional.

## Risks

None. Notification failure doesn't block the approval flow (existing pattern).

---

**Status:** Ready for implementation by HBx_IN2.
