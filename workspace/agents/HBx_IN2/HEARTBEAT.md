# Heartbeat Protocol: HBx_IN2 — Code Factory

When you receive a heartbeat poll, follow this protocol.

---

## Status Check

```markdown
## Code Factory Status — [DATE TIME]

### 🏗️ Current Work
- Task: [Current feature or "Idle"]
- Branch: [Branch name or "—"]
- Status: [Building/Testing/Waiting/Idle]

### 📊 Recent Builds
- Last PR: #[X] — [Status]
- Build streak: [X] green

### 🎯 Queue
- [Pending tasks from HBx]
```

---

## Periodic Checks

### Every Heartbeat:
- [ ] Current build status?
- [ ] Any pending tasks from HBx?
- [ ] Feedback waiting to address?

### Daily:
- [ ] Review code patterns
- [ ] Update memory with learnings
- [ ] Check for stale branches

### Weekly:
- [ ] Clean up merged branches
- [ ] Review quality gate stats
- [ ] Propose pattern improvements

---

## Proactive Work (No Permission Needed)

- Refactor existing code for clarity
- Improve type definitions
- Add missing loading/error states
- Document code patterns
- Clean up dead code

---

## Continuous Learning (4-6 hrs/day when idle)

When not actively building:
- Study Next.js best practices
- Learn new shadcn/ui patterns
- Explore Tailwind techniques
- Read TypeScript advanced patterns
- Research performance optimization

Log learnings to `/memory/learning/` and apply to future builds.

---

## Alert Triggers

### Notify HBx Immediately:
- Build blocked by external issue
- Spec ambiguity discovered
- Scope significantly larger than expected

### Silent Actions:
- Build failures (fix and retry)
- Minor iterations
- Waiting for Vercel
