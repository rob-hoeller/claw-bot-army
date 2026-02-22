# Feature Spec: Unified Feature Creation — Real IN1 Planning Chat + Auto Pipeline Trigger

**Feature ID:** `f03e11f5-2dd2-460e-a330-d6d5fd63a025`
**Author:** HBx_IN1 (Product Architect)
**Date:** 2026-02-21
**Priority:** High
**Status:** design_review

---

## 1. Problem Statement

The Feature Board's "+ New Item" planning chat is a fake keyword-matcher (`/api/features/plan/route.ts`) that returns canned responses. It doesn't use IN1's persona or any LLM. Meanwhile, features created via Telegram or the Dashboard HBx chat go through the real agent pipeline. This creates three inconsistent creation paths that produce different quality outputs.

## 2. Goals

1. **Real IN1 Planning Chat** — Replace the fake `/api/features/plan` endpoint with a streaming LLM chat using IN1's actual Supabase-configured persona
2. **Unified Creation** — All three creation paths (Telegram, Dashboard HBx chat, Feature Board) produce identical feature records with spec, acceptance criteria, and correct pipeline status
3. **Auto Pipeline Trigger** — When a spec is approved, automatically notify HBx to route the feature through the remaining pipeline stages
4. **Streaming UX** — Match the existing agent chat streaming experience (SSE) in the planning panel

## 3. Deliverables

### 3.1 Rewrite `/api/features/plan/route.ts` → Streaming LLM Endpoint

**File:** `dashboard/src/app/api/features/plan/route.ts`

**Changes:**
- Delete all keyword-matching logic
- Import `buildAgentSystemPrompt('HBx_IN1')` and `streamDirectLLM()` from `@/lib/llm-direct`
- Accept `{ messages: [...], featureContext?: { title?, description? } }` in POST body
- Build system prompt from IN1's Supabase config + inject planning-specific instructions:
  ```
  You are helping the user plan a new feature. Guide them through:
  1. Problem definition — what problem does this solve?
  2. User impact — who benefits and how?
  3. Scope — what's in/out?
  4. Acceptance criteria — how do we know it's done?
  5. Priority assessment

  When you have enough information, summarize the feature spec in a structured format
  the user can approve. Use markdown with clear sections.
  ```
- Return SSE stream (OpenAI-compatible format via `streamDirectLLM`)
- Add `export const maxDuration = 60` for Vercel

**Response format:** SSE stream identical to `/api/work-items/[id]/stream` and `/api/chat/send`

### 3.2 Update `CreateFeaturePanel` in `FeatureBoard.tsx`

**File:** `dashboard/src/components/features/FeatureBoard.tsx` (lines 358–580)

**Changes:**

#### A. Streaming Chat
- Replace `fetch → JSON` pattern with SSE streaming using `EventSource` or manual `ReadableStream` parsing (consistent with existing `ChatPanel` approach)
- Accumulate streamed tokens into the assistant message in real-time
- Show typing indicator during stream, replace with full message on completion

#### B. Chat Identity
- Change initial assistant message from "👋 I'm the Planning Assistant" to "👋 I'm **IN1** — your Product Architect. Let's plan this feature together. What problem are you looking to solve?"
- Change emoji from 📐 to 🏗️ (or fetch from agent config)

#### C. "Create Feature" Flow (replaces form-only creation)
- Add a "Create Feature" button at bottom of chat (not just in Form tab)
- On click:
  - Extract title/description from chat (IN1's final summary or user can edit)
  - Set `assigned_to: 'HBx_IN1'`
  - Set `status: 'planning'`
  - Store full chat transcript as `feature_spec` (markdown formatted)
  - Set `requested_by: 'Lance'` (current user)
  - Insert into Supabase `features` table
  - After insert, the feature detail panel opens with IN1 chat continuing

#### D. Form Tab Preserved
- Keep the form tab as a quick-create fallback
- Auto-populate form fields from chat conversation when switching tabs (best-effort extraction by IN1)

### 3.3 Spec Approval + Auto Pipeline Trigger

**File:** `dashboard/src/app/api/features/[id]/approve/route.ts`

**Changes:**
- When `target_status === 'design_review'` (spec approved, moving to design), send a gateway notification to HBx:
  ```typescript
  if (target_status === 'design_review') {
    await fetch(`${GATEWAY_URL}/api/v1/chat`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GATEWAY_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: `Feature "${feature.title}" (${id}) spec has been approved. Route it through the pipeline: assign to IN5 for design review.`,
      }),
    })
  }
  ```
- Also handle `target_status === 'in_progress'` to notify HBx to assign to the build agent (IN2)
- Add `assigned_to` update logic per status transition:
  - `planning` → `design_review`: assign to `HBx_IN5`
  - `design_review` → `in_progress`: assign to `HBx_IN2`
  - `in_progress` → `qa_review`: assign to `HBx_QA1` (if exists)

### 3.4 Feature Detail Panel — Continued Chat

**File:** `dashboard/src/components/features/FeatureBoard.tsx` (existing `FeatureDetail` or similar)

**Changes:**
- When a feature is in `planning` status and assigned to `HBx_IN1`, show the IN1 chat interface (reuse streaming chat component)
- Load chat history from `work_item_messages` table
- Add "Approve Spec" button that calls `/api/features/{id}/approve` with `target_status: 'design_review'`
- On approval, show confirmation and update board status in real-time

## 4. File Scope

| File | Action | Description |
|------|--------|-------------|
| `dashboard/src/app/api/features/plan/route.ts` | **Rewrite** | Replace keyword matcher with streaming IN1 LLM |
| `dashboard/src/components/features/FeatureBoard.tsx` | **Modify** | SSE streaming in CreateFeaturePanel, create-from-chat, approve flow |
| `dashboard/src/app/api/features/[id]/approve/route.ts` | **Modify** | Add gateway notification + auto-assign on status transitions |
| `dashboard/src/lib/llm-direct.ts` | **No change** | Already has `buildAgentSystemPrompt` + `streamDirectLLM` |
| `dashboard/src/app/api/chat/send/route.ts` | **No change** | Reference only |

## 5. Data Model Changes

**No schema changes required.** Existing `features` table columns are sufficient:
- `feature_spec` (text) — stores the IN1 planning chat summary/spec
- `acceptance_criteria` (jsonb) — stores checklist items extracted by IN1
- `assigned_to` (text) — agent ID for current pipeline stage
- `status` (text) — pipeline stage
- `work_item_messages` table — stores chat history (already used by work item stream)

## 6. Acceptance Criteria

- [ ] `/api/features/plan` returns SSE stream with real IN1 LLM responses (not canned text)
- [ ] IN1's persona (from Supabase `agents` table) is used as the system prompt
- [ ] Planning chat streams tokens in real-time in the CreateFeaturePanel
- [ ] User can create a feature directly from the chat with one click
- [ ] Created feature has `status: 'planning'`, `assigned_to: 'HBx_IN1'`, and chat transcript stored in `feature_spec`
- [ ] Feature detail panel shows continued IN1 chat for features in `planning` status
- [ ] "Approve Spec" button advances status to `design_review` and reassigns to `HBx_IN5`
- [ ] Approval sends gateway notification to HBx for pipeline routing
- [ ] Form tab still works as quick-create fallback
- [ ] No regressions in existing agent chat or work item streaming
- [ ] Typecheck passes (`npx tsc --noEmit`)
- [ ] Build passes (`npm run build`)

## 7. Out of Scope

- Telegram and Dashboard HBx chat creation paths (already work correctly)
- Agent persona editing
- Feature pipeline template changes
- New database tables or columns

## 8. Implementation Notes

- **SSE parsing in frontend:** Reuse the same `ReadableStream` + `TextDecoder` pattern from `ChatPanel.tsx` or extract into a shared `useSSEStream` hook
- **Planning context injection:** Append to IN1's system prompt: the feature title/description if provided, plus instructions to guide the user through structured planning
- **Gateway notification:** Fire-and-forget (`catch` errors, log but don't block approval). Gateway may be temporarily down.
- **Chat transcript → feature_spec:** Format as clean markdown with sections (Problem, Solution, Scope, Acceptance Criteria) — IN1 should be prompted to produce this structured output
