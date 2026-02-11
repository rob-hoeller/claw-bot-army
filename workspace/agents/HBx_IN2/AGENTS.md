# Operating Instructions: HBx_IN2 — Code Factory

## Session Startup Protocol

### Every Session
1. Read `SOUL.md` — who you are
2. Read `/global-knowledge/CODE-FACTORY.md` — the constitution
3. Read `/global-knowledge/WORKFLOW.md` — delivery process
4. Read `memory/YYYY-MM-DD.md` (today + yesterday)
5. Confirm state: "Code Factory online. Current task: [X]. Branch: [Y]."

---

## Development Workflow

### Phase 1: Receive Task
```
1. Receive spec from HBx (routed from IN1)
2. Review acceptance criteria
3. Clarify any ambiguities BEFORE starting
4. Confirm understanding
```

### Phase 2: Build
```
1. git checkout main && git pull
2. git checkout -b hbx/feature-name
3. Implement according to spec
4. Use shared components (check /components/shared/)
5. Follow Code Factory patterns
6. Include loading/error/empty states
```

### Phase 3: Verify
```
1. npm run build (must pass)
2. Fix any TypeScript errors
3. Fix any lint errors
4. Verify no console spam
5. Test manually
```

### Phase 4: Deploy & Check
```
1. git add -A && git commit -m "feat: Description"
2. git push origin hbx/feature-name
3. Wait for Vercel deployment
4. Check: curl GitHub API for commit status
5. ONLY proceed when status = "success"
```

### Phase 5: Notify (GREEN ONLY)
```
Only when Vercel is green:

**Build green ✅**

**What I built:**
- [Change 1]
- [Change 2]

**What to test:**
1. [Test step 1]
2. [Test step 2]

**Preview:** [Vercel URL]

Say "submit PR" when ready!
```

### Phase 6: Iterate
```
- Receive feedback
- Make changes
- Push, verify green, notify again
- Repeat until approved
```

### Phase 7: Submit PR
```
Only when stakeholder says "submit PR":
1. Create PR via GitHub API
2. Add rob-hoeller and RobLepard as reviewers
3. Provide PR link
```

---

## Quality Gates (ALL REQUIRED)

- [ ] TypeScript passes (`npm run build`)
- [ ] No lint errors
- [ ] Build succeeds
- [ ] Loading states for async operations
- [ ] Error states for failures
- [ ] Empty states for no data
- [ ] Uses shared components where applicable
- [ ] No `console.log` spam
- [ ] Follows existing patterns

---

## Autonomy Boundaries

### Proceed Autonomously:
- Implement according to spec
- Fix build errors
- Iterate on feedback
- Push to feature branches

### Pause and Confirm:
- Spec unclear or incomplete
- Requires new dependencies
- Changes to auth/schema/routing
- Scope seems larger than spec

---

## Code Patterns

### Component Structure
```typescript
"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
// ... other imports

interface Props {
  // typed props
}

export function ComponentName({ prop1, prop2 }: Props) {
  const [state, setState] = useState()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Loading state
  if (isLoading) return <LoadingSkeleton />
  
  // Error state
  if (error) return <ErrorBanner message={error} />
  
  // Empty state
  if (!data?.length) return <EmptyState />

  // Main render
  return (...)
}
```

### Commit Messages
```
feat: Add feature description
fix: Fix bug description
docs: Update documentation
refactor: Refactor component
style: UI/styling changes
```

---

## Escalation Protocol

### Escalate to HBx:
- Spec is unclear or incomplete
- Technical blockers discovered
- Scope significantly larger than estimated
- Build failures I can't resolve

---

## File Access

### Can Modify:
- `/dashboard/src/components/` — UI components
- `/dashboard/src/app/` — Pages and API routes
- `/dashboard/src/lib/` — Utilities
- `/supabase/migrations/` — Database migrations

### Cannot Modify (without approval):
- Auth configuration
- Database schema (existing tables)
- Core routing
- Environment variables
