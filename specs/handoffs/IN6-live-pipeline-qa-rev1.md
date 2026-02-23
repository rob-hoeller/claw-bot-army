# QA Handoff: Live Pipeline Board — Revision 1 Re-test

**From:** IN2 (Code Factory)
**To:** IN6 (QA Engineer)
**Date:** 2026-02-23
**Branch:** `hbx/live-pipeline-board`
**Commit:** `57cc16a`

---

## What Changed (Revision 1 Fixes)

### 1. API Routes: 503 instead of 500 for missing env vars
All API routes that depend on `SUPABASE_SERVICE_ROLE_KEY` (or other server env vars) now return **503** with a descriptive error message:
> "Server misconfiguration: missing required environment variables (SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY). Contact admin."

**Files changed:**
- `src/app/api/features/route.ts`
- `src/app/api/features/[id]/status/route.ts`
- `src/app/api/features/[id]/approve/route.ts`
- `src/app/api/config/route.ts`
- `src/app/api/metrics/route.ts`
- `src/app/api/chat/upload/route.ts`
- `src/app/api/chat/conversations/route.ts`
- `src/app/api/chat/messages/route.ts`
- `src/app/api/chat/send/route.ts`
- `src/app/api/work-items/[id]/stream/route.ts`

### 2. Frontend: Surfaces actual API error messages
- "Create Feature" flow now shows the API's error message directly (removed misleading "Check connection and try again" suffix)
- "Approve" button now parses JSON error body from the API response instead of showing generic "Update failed"

**File changed:** `src/components/features/FeatureBoard.tsx`

### 3. Deployment documentation
- New `dashboard/DEPLOY.md` listing all required Vercel environment variables with scope and purpose
- Includes troubleshooting section for common deployment issues

---

## QA Test Plan

### ✅ Test 1: Verify 503 on missing env vars (Vercel preview)
1. Deploy branch to Vercel preview **without** `SUPABASE_SERVICE_ROLE_KEY`
2. Hit `POST /api/features` with any valid body
3. **Expected:** 503 response with `"Server misconfiguration: missing required environment variables..."` message
4. **Not expected:** 500 or generic error

### ✅ Test 2: Frontend error surfacing
1. With env var missing on preview, click "Create Feature from Chat"
2. **Expected:** Error toast shows the actual 503 message from the API, NOT "Check connection and try again"
3. Repeat with the Approve button on any feature card
4. **Expected:** Error message from API is displayed

### ✅ Test 3: Happy path — Create Feature (env vars present)
1. Ensure all env vars are set on Vercel preview
2. Redeploy
3. Click "Create Feature from Chat" → complete planning → create
4. **Expected:** Feature created successfully, appears on board with status `planning`

### ✅ Test 4: Happy path — Approve flow (env vars present)
1. Click "Approve" on a feature card
2. **Expected:** Status transitions correctly, no errors

### ✅ Test 5: DEPLOY.md review
1. Open `dashboard/DEPLOY.md`
2. Cross-check listed env vars against `.env.local` and actual Vercel settings
3. **Expected:** All required vars documented, no missing entries

### ✅ Test 6: No regression — typecheck & build
- `npx tsc --noEmit` ✅ (passed)
- `npm run build` ✅ (passed)

---

## Acceptance Criteria Checklist

- [x] API routes return 503 with descriptive error when env vars are missing
- [x] Frontend displays the actual error from the API
- [x] DEPLOY.md documents all required env vars
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is set in Vercel (admin action — verify in Vercel dashboard)
- [x] No other API routes have silent-500-on-missing-env pattern (audited and fixed all routes)
- [x] Typecheck passes
- [x] Build passes

---

## ⚠️ Reminder: Test on Vercel Preview
Per the new QA process, **test on the deployed Vercel preview URL**, not just local. The original bug was invisible in local testing because `.env.local` had the key.

---

## Admin Action Required
Someone with Vercel access must set `SUPABASE_SERVICE_ROLE_KEY` in the production environment variables and trigger a redeploy. This is separate from the code fix.
