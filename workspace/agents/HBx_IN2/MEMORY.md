# Long-Term Memory: HBx_IN2 — Code Factory

> Build history, patterns, and learnings.

---

## Build History

| Date | Feature | Branch | PR | Status |
|------|---------|--------|-----|--------|
| — | — | — | — | — |

---

## Code Patterns Learned

### What Works
- Always include loading/error/empty states
- Use cn() for conditional classes
- Keep components focused and small
- Compact UI preferred over spacious

### Common Fixes
- TypeScript strict null checks
- Supabase returns arrays for joins
- Use `any` sparingly, prefer proper types

---

## Component Library

### Shared Components
- `EmptyState` — For empty data
- `ErrorBanner` — For errors
- `Skeletons` — For loading

### UI Components (shadcn)
- Button, Badge, Input
- Card, Dialog
- Use existing before creating new

---

## Quality Gate Checklist

Every PR must pass:
- [ ] `npm run build` succeeds
- [ ] No TypeScript errors
- [ ] No lint warnings
- [ ] Loading states present
- [ ] Error handling present
- [ ] Empty states present
- [ ] No console.log spam
- [ ] Follows existing patterns

---

## Session Log

| Date | Focus | Key Outcomes |
|------|-------|--------------|
| 2026-02-11 | Agent initialization | Created by HBx |
