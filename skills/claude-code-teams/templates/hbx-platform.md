# HBx Platform Team Template

## When to Use This Pattern

✅ **Use when:**
- Building or enhancing HBx Dashboard features (Next.js + Supabase)
- Feature pipeline work spanning UI, API routes, database, and QA
- Parallel development across components/features/audit-trail/epics/chat
- Need to ship fast with architectural integrity

❌ **Don't use when:**
- Single-file bug fix or style tweak
- Supabase migration only (do that solo)
- Exploratory research or prototyping

## Team Structure

**Lead (Opus):** HBx — Master Orchestrator. Defines contracts, reviews plans, coordinates integration.
**Teammates (Sonnet):** 4 specialists mapped to HBx agent roles:

| Teammate | Maps To | Role |
|----------|---------|------|
| product-architect | HBx_IN1 | System design, API contracts, Supabase schema, architectural decisions |
| code-factory | HBx_IN2 | Frontend components, API routes, business logic implementation |
| research-lab | HBx_IN3 | Data layer, Supabase queries, integrations, lib/ utilities |
| qa-engineer | HBx_IN6 | Tests, validation, error states, loading states, edge cases |

## File/Directory Boundaries

```
dashboard/src/
├── components/           # code-factory owns (UI implementation)
│   ├── features/         # code-factory: feature board, cards, pipeline
│   ├── chat/             # code-factory: chat panel, messages
│   ├── orchestrator/     # code-factory: orchestrator panel, sessions
│   ├── agents/           # code-factory: agent status badges
│   ├── activity/         # code-factory: activity feed
│   ├── shared/           # code-factory: empty states, errors, skeletons
│   └── ui/               # code-factory: shadcn primitives
├── app/api/              # research-lab owns (API routes + data layer)
│   ├── features/         # research-lab: feature CRUD, pipeline, handoffs
│   ├── epics/            # research-lab: epic CRUD
│   ├── chat/             # research-lab: chat sessions, messages, send
│   ├── orchestrator/     # research-lab: session management
│   ├── metrics/          # research-lab: platform metrics
│   ├── usage/            # research-lab: token usage
│   └── webhooks/         # research-lab: GitHub/Vercel hooks
├── lib/                  # research-lab owns (shared utilities)
│   ├── supabase.ts       # research-lab: Supabase client
│   ├── llm-direct.ts     # research-lab: LLM integration
│   ├── sse-utils.ts      # research-lab: SSE streaming
│   └── file-processor/   # research-lab: file parsing
├── app/layout.tsx        # product-architect owns (app shell decisions)
├── app/page.tsx          # product-architect owns (routing/layout)
└── tests/                # qa-engineer owns (all test files)

docs/                     # product-architect creates contracts, all read
migrations/               # product-architect owns (schema changes)
supabase/                 # product-architect owns (RLS policies, functions)
```

## Tech Stack

- **Frontend:** Next.js 14+ / React 18 / TypeScript / TailwindCSS / shadcn/ui
- **Backend:** Next.js API Routes (App Router)
- **Database:** Supabase (PostgreSQL + Realtime + Auth + RLS)
- **State:** React hooks + Supabase realtime subscriptions
- **Deployment:** Vercel

## Spawn Prompt (Copy-Paste Ready)

```markdown
I need to build a feature for the HBx Dashboard: [FEATURE NAME]

**Requirements:**
- [REQUIREMENT 1]
- [REQUIREMENT 2]
- [REQUIREMENT 3]
- [SUCCESS CRITERIA]

**Codebase:** Next.js dashboard at `dashboard/src/`. Uses Supabase for data, shadcn/ui for components, TailwindCSS for styling. All API routes are in `app/api/`. Supabase client is in `lib/supabase.ts`.

First, I will define the technical spec and API contract. Wait for my signal before teammates start.

---

**[AFTER DEFINING CONTRACT]**

Spec is defined. Now spawn 4 teammates using Sonnet:

1. **Product Architect** (product-architect)
   - Owns: `app/layout.tsx`, `app/page.tsx`, `migrations/`, `supabase/`, `docs/`
   - Tasks:
     * Define Supabase table schema + RLS policies for this feature
     * Create migration file
     * Write API contract doc in `docs/`
     * Review all teammate plans before they execute
     * Ensure architectural consistency with existing patterns

2. **Code Factory** (code-factory)
   - Owns: `components/**` (all UI components)
   - Tasks:
     * Implement React components following existing patterns (see `components/features/` for reference)
     * Use shadcn/ui primitives from `components/ui/`
     * Include loading states (see `shared/Skeletons.tsx`), error states (`shared/ErrorBanner.tsx`), and empty states (`shared/EmptyState.tsx`)
     * Follow existing styling patterns (TailwindCSS, dark theme support)
     * Wire up Supabase realtime subscriptions where needed

3. **Research Lab** (research-lab)
   - Owns: `app/api/**`, `lib/**`
   - Tasks:
     * Implement API route handlers following existing patterns (see `app/api/features/route.ts`)
     * Use Supabase server client from `lib/supabase.ts`
     * Add proper error handling (400/401/500 responses)
     * Implement any new lib utilities needed
     * Wire up SSE streaming if feature needs real-time updates (see `lib/sse-utils.ts`)

4. **QA Engineer** (qa-engineer)
   - Owns: `tests/**`, `__tests__/**`
   - Tasks:
     * Write integration tests for the full feature flow
     * Test error cases and edge cases
     * Verify loading/error/empty states render correctly
     * Test RLS policies work correctly
     * Verify no console errors or warnings

**Coordination rules:**
- Use delegate mode: I define contracts, teammates implement
- Product Architect reviews all plans before execution
- Code Factory reads API contracts but doesn't modify API routes
- Research Lab implements APIs exactly as specified in contract
- QA Engineer verifies both frontend and backend against contract
- No cross-boundary file edits
- Teammates message each other directly for dependency questions
- Broadcast for team-wide architecture decisions only

**Quality gates (before merge):**
- [ ] TypeScript compiles (`npm run build`)
- [ ] Lint passes (`npm run lint`)
- [ ] No console.log spam
- [ ] Loading/error/empty states included
- [ ] Uses existing shared components
- [ ] RLS policies in place
- [ ] Tests pass

**Integration checkpoint:**
After all teammates finish:
1. Product Architect reviews all changes for consistency
2. QA Engineer runs full test suite
3. Run `npm run build` to verify no type errors
4. If all pass → ready for PR
5. If issues → route specific fixes back to owning teammate
```

## Cost Estimate

**Team:** 1 Opus lead + 4 Sonnet specialists
**Duration:** ~30-60 minutes depending on feature complexity
**Estimated cost:** $25-50 per feature

## Expected Workflow

```
1. Lead (you) defines feature requirements
2. Product Architect writes spec + schema + contract  (5-10 min)
3. Lead approves contract
4. All 3 implementation teammates start in parallel   (15-30 min)
   - Code Factory builds UI
   - Research Lab builds API routes
   - QA Engineer writes tests
5. Teammates message each other for clarifications
6. QA Engineer runs validation
7. Product Architect reviews architecture
8. Lead does final quality gate check
9. Ship → PR → Vercel preview
```

## Mapping to HBx Pipeline Phases

| Pipeline Phase | Team Agent | What They Do |
|---------------|------------|--------------|
| Phase 1 — Intake | Lead (HBx) | Route feature, create ticket |
| Phase 2 — Spec | product-architect | Technical spec, schema, contracts |
| Phase 3 — Design | code-factory | Component design, UI patterns |
| Phase 4 — Build | code-factory + research-lab | Parallel implementation |
| Phase 5 — QA | qa-engineer | Testing, validation |
| Phase 6 — Ship | Lead (HBx) | Final review, PR, deploy |
