# Revision Handoff: Live Pipeline Board — Revision 1

**From:** IN6 (QA Engineer)
**To:** IN2 (Developer)
**Date:** 2026-02-23
**Branch:** `hbx/live-pipeline-board`
**Priority:** HIGH — Production broken, user-facing failure

---

## Issue Summary

"Create Feature from Chat" button fails in production with: **"Couldn't create feature. Check connection and try again."** No item is created. Caught by Lance during live deployment testing.

**Root cause:** `dashboard/src/app/api/features/route.ts` requires `SUPABASE_SERVICE_ROLE_KEY` env var. Present in `.env.local` but missing from Vercel deployment. The route throws a 500 with no useful error info, and the frontend swallows it with a generic message.

---

## Required Fixes

### 1. API Route: Validate env vars on startup (`dashboard/src/app/api/features/route.ts`)

Add an explicit check at the top of the POST handler (or as a shared utility):

```ts
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  return NextResponse.json(
    { error: "Server misconfiguration: SUPABASE_SERVICE_ROLE_KEY is not set. Contact admin." },
    { status: 503 }
  );
}
```

- Return **503** (not 500) — this is a configuration issue, not a code bug.
- The error message must be specific enough for an admin to act on, but not leak secrets.
- Apply the same pattern to any other env vars the route depends on (e.g., `SUPABASE_URL`).

### 2. Frontend: Surface actual API error messages

In the component that calls the create-feature endpoint (likely where the toast/alert shows "Couldn't create feature. Check connection and try again."):

- Parse the JSON response body on non-2xx responses.
- Display `response.error` if present, falling back to the generic message only if parsing fails or the response is empty.
- Example:

```ts
if (!res.ok) {
  const body = await res.json().catch(() => null);
  const msg = body?.error ?? "Couldn't create feature. Check connection and try again.";
  // show msg to user
}
```

### 3. Document required env vars

Add a section to the project README (or a new `dashboard/DEPLOYMENT.md`):

```markdown
## Required Environment Variables (Vercel)

| Variable | Where | Purpose |
|---|---|---|
| `SUPABASE_URL` | Vercel env settings | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel env settings | Server-side Supabase admin key |
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel env settings | Client-side Supabase URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Vercel env settings | Client-side Supabase anon key |

**Before deploying**, confirm all vars are set in Vercel → Project → Settings → Environment Variables.
```

Audit for any other server-side env vars and include them.

### 4. Immediate: Add missing env var to Vercel

Set `SUPABASE_SERVICE_ROLE_KEY` in the Vercel project environment variables and redeploy. This unblocks production now.

---

## Acceptance Criteria

- [ ] API route returns 503 with descriptive error when env vars are missing
- [ ] Frontend displays the actual error from the API, not just "Check connection"
- [ ] README or DEPLOYMENT.md documents all required env vars
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is set in Vercel and "Create Feature from Chat" works in production
- [ ] No other API routes have the same silent-500-on-missing-env pattern

---

## QA Process Gap (IN6 Action Item)

**What was missed:** IN6 approved SHIP based on static code review and local build verification only. The missing env var was invisible in those checks.

**New requirement:** Before issuing SHIP on any PR that touches API routes or adds/changes env vars, IN6 must:
1. Verify the feature works on the **deployed preview URL** (Vercel preview deployment), not just local.
2. Specifically test any new API endpoints against the preview deployment.
3. Cross-check `.env.local` / `.env.example` against Vercel env var settings for new vars.

This is now part of the QA checklist going forward.

---

## Timeline

This is **revision loop 1 of 2**. Fix, redeploy, and ping IN6 for re-review.
