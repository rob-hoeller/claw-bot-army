# Bug Spec: Feature Board UI Changes Not Persisting to Supabase

**ID:** 0f5b0a96-c89c-41bd-8ef4-245cb6de048e  
**Priority:** High  
**Labels:** bug, feature-board, supabase, vercel

## Summary
Feature Board optimistic UI updates (new feature creation and status changes) do not persist in the deployed Vercel environment. Refreshing the page drops new items and reverts status updates.

## Verification & Evidence
### Vercel env vars
- Vercel env list shows `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are defined for **production** and **preview** (values are encrypted/sensitive so not visible).  
- `OPENCLAW_GATEWAY_URL`, `OPENCLAW_GATEWAY_TOKEN` also present.

### Local `.env.local`
- Has `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` and `DATABASE_URL`.

### API routes
- `/api/features/[id]/status` and `/api/features/[id]/approve` create Supabase client using:
  ```ts
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ```
- If `SUPABASE_SERVICE_ROLE_KEY` is missing at runtime, API routes fall back to anon.

### Client create flow
- `FeatureBoard.tsx` creates features **directly from the client** using `supabase.from('features').insert(...)`.
- Client uses `src/lib/supabase.ts` which is instantiated from `NEXT_PUBLIC_SUPABASE_*` **at build time**. If these are missing in Vercel build, `supabase` is `null`, and the app silently switches to demo-mode (optimistic-only local state).

### RLS policies (features table)
- RLS enabled. Policies allow **anon insert/update/select** plus service role full access.
- So failures are **not** caused by RLS blocking anon by default.

## Root Cause (Most Likely)
**Supabase env vars are not consistently available to the deployed build/runtime**, causing one or both of:
1) **Client**: `NEXT_PUBLIC_SUPABASE_*` undefined at build → `supabase = null` → demo-mode insert/update only (no DB write).  
2) **Server**: `SUPABASE_SERVICE_ROLE_KEY` undefined at runtime → API routes fall back to anon and may silently fail if Supabase client cannot initialize or if auth is blocked by other policies/cors.

Because the UI applies optimistic updates without hard failure handling, it appears to work until refresh.

## Fix Plan
### 1) Make feature creation server-side (avoid client direct writes)
- Add API route: `src/app/api/features/route.ts` with POST to insert a feature using **service role**.
- Update `FeatureBoard.tsx` create handlers (`handleCreate`, `handleCreateFromChat`) to call `/api/features` instead of direct `supabase.from('features').insert(...)`.

### 2) Fail fast if service role missing in API routes
- In `/api/features/[id]/status/route.ts` and `/api/features/[id]/approve/route.ts`, require `SUPABASE_SERVICE_ROLE_KEY` and return 500 with explicit error if missing (avoid silent anon fallback).
- Update Supabase client creation to use only service role on server.

### 3) Improve error handling & UI feedback
- On create/status update failure, show toast or error message (not just console).  
- Do **not** keep optimistic state if API returns non-2xx.

### 4) Vercel config consistency
- Ensure env vars are present for **production** and **preview**, and **redeploy** after updates:
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## File Scope
- `src/app/api/features/route.ts` **(new)**
- `src/app/api/features/[id]/status/route.ts`
- `src/app/api/features/[id]/approve/route.ts`
- `src/components/features/FeatureBoard.tsx`
- (Optional) `src/lib/supabase.ts` (add guard + error log if env missing)

## Acceptance Criteria
1) Creating a feature from **Form** or **Planning Chat** persists in Supabase and survives refresh in Vercel.
2) Status changes via dropdown or drag-and-drop persist and survive refresh.
3) If server-side Supabase key is missing, API returns a clear 500 with error message (visible in logs and UI).
4) UI displays an error if persistence fails; optimistic state is rolled back.

## Test Plan
- **Local**: Create feature → reload page → feature persists. Change status → reload → status persists.
- **Vercel Preview/Production**: same as above.
- Simulate missing `SUPABASE_SERVICE_ROLE_KEY` on server → API returns 500 and UI shows error.
