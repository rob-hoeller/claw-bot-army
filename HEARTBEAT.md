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
- [ ] Infrastructure health (run: `./monitoring/status.sh`)

### Daily:
- [ ] Global knowledge freshness
- [ ] Agent performance metrics
- [ ] Escalation review
- [ ] Generate infrastructure report: `./monitoring/generate-report.sh`

### Weekly:
- [ ] Full agent audit
- [ ] Knowledge base review
- [ ] Platform improvements
- [ ] Review scaling needs based on monitoring reports

---

## Infrastructure Monitoring

Metrics are collected every 15 minutes via cron.

**Quick Status:**
```bash
./monitoring/status.sh
```

**Daily Report:**
```bash
./monitoring/generate-report.sh
```

**Scaling Thresholds:**
| Metric | Warning | Critical | Action |
|--------|---------|----------|--------|
| CPU | >70% avg | >90% peak | Scale up EC2 |
| Memory | >80% avg | >95% peak | Scale up or optimize |
| Load | >75% | >100% | CPU bottleneck |
| Sessions | 3/4 | 4/4 | Increase maxConcurrent or scale out |

**Metrics Location:** `/monitoring/logs/metrics-YYYY-MM-DD.jsonl`
**Reports Location:** `/monitoring/reports/report-YYYY-MM-DD.md`

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