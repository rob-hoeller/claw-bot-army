# IN5 Learning Report: Dashboard UX for AI Tools & Design Systems
**Date:** 2025-02-25 | **Focus:** AI-powered dashboard patterns for HBx

---

## Key Insights

### 1. Trace-Based Observability Is the Standard for Agent Dashboards
Platforms like **Langfuse** and **LangSmith** have established that AI agent dashboards need hierarchical trace views — not just flat logs. Each agent run is a tree: parent trace → child spans (LLM calls, tool use, retrieval). This is now table stakes for any serious agent management UI.

**Practical implication for HBx:** The audit trail should be modeled as nested traces (agent → sub-agent → individual tool calls), not flat event lists. Use a collapsible tree view component. Supabase's JSONB columns can store span trees efficiently.

### 2. shadcn/ui Has Become the De Facto Design System for Next.js + Tailwind
shadcn/ui's "open code" philosophy (copy components into your project, not install from npm) has won the Next.js ecosystem. It's composable, AI-friendly (LLMs can read/modify the code), and pairs perfectly with Tailwind. It now supports theming, charts, and complex data tables out of the box.

**Practical implication for HBx:** Adopt shadcn/ui as the component foundation. It eliminates the "wrapper hell" problem of traditional component libraries and gives full control over every component. The data-table, command palette, and sheet components directly map to HBx needs (agent lists, quick actions, detail panels).

### 3. Real-Time Feeds Need Optimistic UI + Supabase Realtime
The pattern for real-time activity feeds in 2024-2025 has converged on: Supabase Realtime (postgres changes) → client subscription → optimistic local state updates. The UX best practice is to show new items with a subtle animation/highlight rather than auto-scrolling, with a "X new items" pill at the top (like Twitter/X).

**Practical implication for HBx:** Use `supabase.channel().on('postgres_changes', ...)` for the activity feed. Implement a "new items" indicator rather than force-scrolling. This keeps the feed usable during high-throughput agent activity.

### 4. Agent Status Should Use State Machines, Not Boolean Flags
Modern agent dashboards (CrewAI, AutoGen Studio, Langfuse) represent agent state as explicit state machines: `idle → running → waiting_for_input → completed → failed`. This enables meaningful status indicators, proper error recovery UI, and reliable filtering.

**Practical implication for HBx:** Model agent status as an enum state machine in Supabase. Each state gets a distinct color/icon in the UI. This directly supports the agent registry table in AGENTS.md (Active/Deploying/etc.) and makes the dashboard scannable at a glance.

### 5. Command Palettes Are Replacing Traditional Navigation for Power Users
The `⌘K` command palette pattern (popularized by Vercel, Linear, Raycast) has become expected in developer/admin tools. For agent management, this means: spawn agent, view traces, jump to feature board — all from keyboard. shadcn/ui includes a `<Command>` component built on cmdk.

**Practical implication for HBx:** Add a command palette early. It becomes the fastest way to navigate between agents, tasks, and audit trails. Low implementation cost with shadcn/ui's Command component.

### 6. Feature Boards Should Follow Kanban with Agent-Aware Columns
AI-specific project boards (seen in Cursor, Devin, Factory) add agent-specific columns like "Agent Working" and "Awaiting Review" alongside standard Kanban columns. Cards show which agent is assigned and link directly to traces.

**Practical implication for HBx:** Extend standard Kanban with agent-aware swim lanes. Each card should show agent avatar + status badge + link to trace. Use drag-and-drop (dnd-kit) for column transitions.

### 7. Progressive Disclosure Is Critical for AI Dashboards
AI dashboards generate overwhelming amounts of data (tokens, latency, cost, traces, evaluations). The winning pattern is: summary → expandable detail → full trace. Top-level shows health/status; click-through reveals specifics. Langfuse does this well with dashboard → trace list → trace detail → span detail.

**Practical implication for HBx:** Design three levels of detail: (1) Dashboard overview with agent health cards, (2) Agent detail with recent activity, (3) Full trace/audit view. Never dump everything on one screen.

---

## Useful Sources

| Source | URL | Relevance |
|--------|-----|-----------|
| **shadcn/ui** | https://ui.shadcn.com | Component system for Next.js + Tailwind; composable, AI-ready |
| **Langfuse** | https://langfuse.com/docs | Open-source LLM observability; trace UI patterns, session tracking, agent graphs |
| **Vercel AI SDK** | https://sdk.vercel.ai | AI integration patterns for Next.js; streaming UI, tool calling |
| **cmdk (Command Menu)** | https://cmdk.paco.me | Command palette component used by shadcn/ui |
| **dnd-kit** | https://dndkit.com | Drag-and-drop for React; ideal for Kanban boards |
| **Supabase Realtime** | https://supabase.com/docs/guides/realtime | Postgres change subscriptions for live feeds |
| **LangSmith** | https://smith.langchain.com | LangChain's observability platform; trace/evaluation UI reference |
| **Linear** | https://linear.app | Gold standard for project management UX; command palette, keyboard-first |

---

## Practical Recommendations for HBx

### Recommendation 1: Adopt shadcn/ui + Hierarchical Trace View as Core UI Foundation

**What:** Use shadcn/ui as the component library. Build the audit trail as a collapsible trace tree (not a flat log) using shadcn's Collapsible + Tree components. Each agent run = a trace; each sub-agent call, LLM call, or tool use = a child span with timing, status, and expandable payload.

**Why:** This matches the industry standard set by Langfuse/LangSmith and gives operators real debugging power. Flat logs become unusable when agents spawn sub-agents (which HBx does heavily). shadcn/ui ensures we own the code, can customize freely, and stay aligned with the Next.js + Tailwind stack. No npm dependency risk.

**Scope:**
- Install shadcn/ui CLI and init with HBx's Tailwind config (~1 hour)
- Add core components: DataTable, Command, Sheet, Collapsible, Badge (~2 hours)
- Design trace schema in Supabase: `traces` table with `parent_trace_id`, `span_type`, `status`, `started_at`, `ended_at`, `metadata` JSONB (~2 hours)
- Build TraceTree component with expand/collapse, status badges, duration display (~4-6 hours)
- **Total estimate: ~1-2 days**

---

### Recommendation 2: Implement Real-Time Agent Activity Feed with Status State Machine

**What:** Build a real-time activity feed powered by Supabase Realtime subscriptions. Model agent status as a finite state machine (`idle | spawning | running | waiting | completed | failed | retired`). The feed shows agent state transitions, task completions, and errors with a "new items" indicator pattern (not auto-scroll).

**Why:** The dashboard needs to feel alive — operators must see agent activity without refreshing. The state machine approach (vs. boolean `is_active`) enables proper filtering ("show me all failed agents"), meaningful status badges, and transition animations. The "new items" pill pattern prevents the jarring UX of auto-scrolling during high activity (multiple agents running simultaneously).

**Scope:**
- Add `status` enum column to agents table in Supabase; create `activity_events` table (~1 hour)
- Set up Supabase Realtime channel subscription in a React hook `useActivityFeed()` (~2 hours)
- Build ActivityFeed component with virtual scrolling (for performance), status-colored event cards, and "X new events" pill (~3-4 hours)
- Build AgentStatusBadge component with state machine colors/icons, used across dashboard (~1 hour)
- Wire into existing agent registry views (~1-2 hours)
- **Total estimate: ~1-1.5 days**

---

*Report compiled by IN5 (UI/UX Expert) — February 2025*
