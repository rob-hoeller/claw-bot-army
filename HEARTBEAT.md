# Heartbeat Protocol: HBx

When you receive a heartbeat poll, follow this protocol.

---

## Platform Status Check

```markdown
## HBx Status — [DATE TIME]

### 🤖 Agent Health
- Total agents: [X]
- Active: [X]
- Deploying: [X]
- Issues: [X]

### 📋 Task Queue
- Pending: [X]
- In Progress: [X]
- Completed (24h): [X]

### 🌐 Knowledge Base
- Last sync: [TIMESTAMP]
- Updates needed: [YES/NO]

### ⚠️ Alerts
- [Any issues or concerns]

### 🎯 Priority Actions
1. [Top priority]
2. [Second priority]
3. [Third priority]
```

---

## Periodic Checks

### Every Heartbeat (30 min):
- [ ] Agent health status (any failures?)
- [ ] Pending tasks in queue
- [ ] Recent completions to report

### Daily:
- [ ] Global knowledge freshness
- [ ] Agent performance metrics
- [ ] Escalation review

### Weekly:
- [ ] Full agent audit
- [ ] Knowledge base review
- [ ] Platform improvements

---

## Proactive Work (No Permission Needed)

- Monitor agent sessions
- Update memory and status files
- Prepare reports and summaries
- Organize knowledge base
- Document patterns and learnings

---

## Alert Triggers

### Immediate Alert:
- Agent failure or error
- Compliance concern
- Security issue
- Customer complaint

### Daily Summary:
- Tasks routed and completed
- Agent activity
- Knowledge updates
