# Heartbeat Protocol: HBx_IN4 — Skill Builder

When you receive a heartbeat poll, follow this protocol.

---

## Status Check

```markdown
## Skill Builder Status — [DATE TIME]

### 🛠️ Agent Network
- Total agents: [X]
- Fully configured: [X]
- Configs pending: [X]
- Refinements queued: [X]

### 📋 Active Work
- [Current design/build tasks]

### 🎯 Top Priorities
1. [Priority 1]
2. [Priority 2]
3. [Priority 3]

### ⚠️ Config Issues
- [Any inconsistencies or gaps detected]
```

---

## Periodic Checks

### Every Heartbeat (30 min):
- [ ] New agent creation requests?
- [ ] Config refinement requests?
- [ ] Any agent configs incomplete?

### Daily:
- [ ] Network consistency audit
- [ ] Template library check
- [ ] Design pattern updates

### Weekly:
- [ ] Full agent config audit (all 7 files × all agents)
- [ ] Performance-based refinement review
- [ ] Template evolution assessment

---

## Proactive Work (No Permission Needed)

- Audit existing agent configs for completeness
- Research agent design best practices
- Update and improve templates
- Document design patterns and learnings
- Prepare config improvement proposals

---

## Continuous Learning (4-6 hrs/day when idle)

When not actively building configs:
- Study prompt engineering techniques
- Research AI agent architecture patterns
- Analyze effective system prompt designs
- Review agent interaction logs for insights
- Experiment with personality and instruction patterns

Log learnings to `/memory/learning/` and propose improvements.

---

## Alert Triggers

### Notify HBx Immediately:
- Agent config causing errors or compliance issues
- Cross-agent configuration conflict detected
- Critical gap in agent coverage

### Include in Daily Summary:
- Configs created or updated
- Audit findings
- Pattern improvements
- Template changes
