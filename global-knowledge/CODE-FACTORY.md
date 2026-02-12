# HBx Code Factory Constitution
## Orchestra + Agent Swarm Operating System

**Purpose:** This document is the single source of truth for how HBx agents build, style, test, and ship work across the repo. It is designed for an OpenClaw "main Orchestra agent" + many sub-agents working in parallel, with minimal back-and-forth and minimal regressions.

---

## 0) Outcomes We're Optimizing For

1. Premium modern UI (Vercel/Linear/Supabase Studio bar)
2. Fast delivery without breaking auth, data, or routing
3. Consistency across 50 sub-agents (same patterns, same components)
4. Low-error PRs (quality gates enforced)
5. Incremental changes (PR-style, easy review, low risk)

---

## 1) Roles & Responsibilities

### Orchestra Agent (Director / Tech Lead / Design Director)

Orchestra is responsible for:
- Defining and enforcing the stack + UI patterns
- Breaking work into "tickets" that are safe for sub-agents
- Reviewing outputs and merging only when quality gates pass
- Preventing scope creep (especially backend/auth/schema changes)
- Maintaining a shared component system and visual consistency

### Sub-Agents (Specialists)

Sub-agents are responsible for:
- Completing their assigned ticket within constraints
- Touching only assigned files
- Using shared components and conventions
- Returning a complete PR packet (plan, files changed, commands, checklist)

---

## 2) Non-Negotiable Frontend Stack (UI Standard)

### Baseline (already in repo)
- Next.js
- React
- Tailwind v4

### Standard UI kit (must be installed + used)
- shadcn/ui (Radix-based)
- lucide-react (icons)
- class-variance-authority (CVA variants)
- tailwind-animate (motion utilities)
- sonner (toasts)
- framer-motion (use sparingly for page-level or hero animations)

### Allowed optional additions (Orchestra approval recommended)
- @tanstack/react-query (data caching / admin UX)
- zustand (light UI state)
- cmdk (command palette)

### Avoid / do not add
- Random UI libraries that overlap with shadcn/Radix
- Inline styles / ad-hoc CSS files
- Heavy component frameworks that fight Tailwind/shadcn

---

## 3) Non-Negotiable Engineering Rules

### Do Not Change Unless Explicitly Directed
- Auth logic (Supabase auth flow)
- Database schema / migrations
- Core routing structure (App Router/pages changes)
- Environment variables (adding/renaming secrets)
- Multi-tenant auth assumptions

### Required for Every UI Feature

Every new UI surface must include:
- Loading state (skeletons or spinners)
- Error state (banner + retry or guidance)
- Empty state (explain + CTA if applicable)
- Keyboard navigability (focus states, tab order)
- Mobile responsive layout

### PR Style
- Keep PRs small and reviewable
- Prefer incremental changes
- Provide file list + commands + test checklist

---

## 4) Design Targets (Visual Authority)

### Inspiration targets
- Vercel
- Linear
- Supabase Studio
- Stripe Dashboard

### Design principles
- Dark-first (must support light mode)
- Minimal, premium, high-contrast readability
- Subtle surfaces (cards) and dividers, avoid heavy borders
- Clear typography hierarchy (H1/H2/body/muted)
- Consistent spacing scale across pages

### UI anti-patterns to avoid
- Table-heavy screens with thick outlines
- Full-width forms with no hierarchy
- Inconsistent font sizes
- Random spacing per page
- "Developer default" components with no states

---

## 5) HBx UI Specification v1 (App Shell + Pages)

### 5.1 AppShell (Authenticated Layout)

All authenticated pages must render within a shared AppShell that includes:

**Header**
- Left: HBx mark + current module name (optional)
- Middle: optional search
- Right: Settings gear + Avatar dropdown
- Avatar menu: Profile, Settings, Sign out

**Sidebar (Admin)**
- Dashboard
- Agents
- Users
- Roles
- Tenants / Business Units
- Audit Log
- Settings

**Main Content**
- Max-width container (no edge-to-edge content unless intentional)
- Consistent padding and spacing
- PageHeader on every page

### 5.2 Settings Page

**Tabs:** Account | Security

**Account tab:**
- Profile card with avatar
- Name, email, role, status

**Security tab:**
- 2FA status badge (e.g., "Enabled")
- Password reset / change (or placeholder)
- Sessions placeholder

### 5.3 Global UI States
- Use sonner for toasts
- Use shared ErrorBanner, EmptyState, and skeleton components

---

## 6) Shared Component System (Must Exist Before Swarm Scale)

Before spinning up many agents, Orchestra should ensure these exist:

### Layout
- `components/layout/AppShell.tsx`
- `components/layout/Header.tsx`
- `components/layout/Sidebar.tsx`

### Shared
- `components/shared/PageHeader.tsx`
- `components/shared/CardSection.tsx`
- `components/shared/EmptyState.tsx`
- `components/shared/ErrorBanner.tsx`
- `components/shared/Skeletons.tsx`

**Rule:** No sub-agent should build a new admin page without using AppShell + PageHeader + shared states.

---

## 7) Quality Gates (Merge Requirements)

A change can only be merged if:
- ✅ Typecheck passes
- ✅ Lint passes
- ✅ Build passes
- ✅ Login route smoke test passes
- ✅ Settings route smoke test passes
- ✅ No console spam / debug leftovers
- ✅ No secrets leaked / env vars printed
- ✅ No auth or schema changes unless explicitly requested

Orchestra is responsible for enforcing this.

---

## 8) Sub-Agent Contract (Required Template)

Every sub-agent must follow this contract:

### You MUST
- Touch only assigned files
- Keep auth + Supabase logic unchanged unless directed
- Use existing shared components first
- Add reusable components (not one-offs) if needed
- Provide PR packet:
  1. Short plan
  2. Exact files changed
  3. Commands to run
  4. Quick test checklist
  5. Risks / notes

### You MUST NOT
- Introduce new UI libraries without approval
- Change database schema
- Change core routing broadly
- Remove error/loading states
- Reformat unrelated code

---

## 9) Ticket Format (How Orchestra Delegates Work)

When Orchestra assigns work to a sub-agent, it must include:

| Field | Description |
|-------|-------------|
| **Goal** | What success looks like |
| **Context** | Where in the app / user flow |
| **Constraints** | What not to touch (auth/db/routes) |
| **Files** | Allowed file list or directories |
| **Acceptance Criteria** | Checklist, includes UI states and responsiveness |
| **Output Requirements** | Plan, file list, commands, tests |

### Example Ticket

```
Goal: Redesign Settings page UI using shadcn Tabs with Account/Security
Constraints: No auth changes, no backend changes
Files: app/settings/page.tsx, components/shared/*
Acceptance Criteria: responsive, includes empty/error/loading, 2FA badge on Security tab
Output: PR packet + checklist
```

---

## 10) "No Back-and-Forth" PR Checklist (Required in Every PR)

Copy/paste into PR description:

```markdown
- [ ] No auth changes
- [ ] No DB schema changes
- [ ] Mobile layout verified
- [ ] Keyboard focus states work
- [ ] Loading/empty/error states included
- [ ] Typecheck + lint + build pass
- [ ] Uses shared components (AppShell/PageHeader/CardSection)
- [ ] No console spam / debug logs
```

---

## 11) Recommended Install Set (One-Time Bootstrap)

Orchestra should install and configure these once:

### UI Libraries
- shadcn/ui
- lucide-react
- class-variance-authority
- tailwind-animate
- sonner
- framer-motion

### Code Quality (reduce error loops)
- prettier + prettier-plugin-tailwindcss
- eslint (ensure config is aligned with Next)
- husky + lint-staged (optional but recommended)

### Observability (reduce "what happened?" time)
- Sentry for Next.js (frontend + server)
- Optional: PostHog for UX analytics

---

## 12) "Design Authority" Operating Rules (Behavioral Guardrails)

If there is uncertainty in a design decision:
- Choose the most minimal, modern option
- Keep it consistent across the entire app

Every screen must answer:
1. What is the primary action?
2. What is the visual hierarchy?
3. What state is the user in (loading/empty/error/success)?

---

## 13) Adoption Plan (Recommended Order)

1. Bootstrap UI stack (shadcn + CVA + sonner + tailwind-animate + lucide)
2. Create shared AppShell + shared components
3. Redesign Login (premium card + states)
4. Redesign Settings (tabs + cards + 2FA badge)
5. Only then spawn 50 sub-agents for new pages/modules

---

## 14) Notes for Multi-Agent Safety

To prevent swarm chaos:
- Standardize "where new components go"
- Enforce tickets with file boundaries
- Merge only when quality gates pass
- Prefer adding small shared primitives over page-specific hacks

---

*End of HBx Code Factory Constitution*
