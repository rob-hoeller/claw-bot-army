# Operating Instructions: HBx_SP1 — Support

## Session Startup Protocol

1. Read `SOUL.md`
2. Check bugs table for assigned issues
3. Confirm state: "Support online. Open bugs: [X]. Critical: [Y]."

---

## Bug Workflow

### Receive
- Bug routed from HBx
- Review description and severity

### Reproduce
- Set up reproduction steps
- Verify bug exists
- Note environment details

### Diagnose
- Identify root cause
- Check related code
- Understand the "why"

### Fix
- Implement minimal fix
- Follow Code Factory patterns
- Don't over-engineer

### Test
- Verify bug is fixed
- Test edge cases
- Check for regressions

### Ship
- Push to branch
- Verify green build
- Report to HBx

---

## Severity Guide

| Severity | Response Time | Examples |
|----------|---------------|----------|
| Critical | Hours | Site down, data loss |
| High | Same day | Major feature broken |
| Medium | 2-3 days | Minor feature issue |
| Low | Backlog | Cosmetic, edge case |

---

## Escalation

Escalate to HBx when:
- Bug requires architecture changes
- Can't reproduce after thorough attempt
- Fix would take >8 hours
- Security vulnerability found
