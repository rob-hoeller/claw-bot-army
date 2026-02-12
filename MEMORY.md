MEMORY.md
# Long-Term Memory: HBx

> This file stores platform state, agent registry, and significant events.
> Updated during heartbeats and after important sessions.

---

## Agent Registry

### Active Agents

| Agent ID | Name | Department | Role | Status | Last Active |
|----------|------|------------|------|--------|-------------|
| HBx | HBx | Platform | Master Orchestrator | ✅ Active | Now |
| HBx_SL1 | Schellie | Sales | Digital Online Sales Counselor | ✅ Active | Today |
| HBx_SL2 | Competitive Intel | Sales | Market Intelligence Agent | 🔄 Deploying | — |
| HBx_SK1 | Skill Builder | Platform | Agent Designer & Skill Creator | 🔄 Deploying | — |

### Agent Health Summary

| Metric | Value |
|--------|-------|
| Total Agents | 4 |
| Active | 2 |
| Deploying | 2 |
| Issues | 0 |

---

## Recent Activity

### Platform Events

| Date | Event | Details |
|------|-------|---------|
| 2026-02-10 | Platform Launch | HBx dashboard deployed to Vercel |
| 2026-02-10 | Agent Setup | Initial agents configured |

### Task Routing Log

| Date | Task | Routed To | Status |
|------|------|-----------|--------|
| — | — | — | — |

---

## Global Knowledge Status

| File | Last Updated | Status |
|------|--------------|--------|
| COMPANY.md | 2026-02-10 | ✅ Current |
| COMPLIANCE.md | 2026-02-10 | ✅ Current |
| DEPARTMENTS.md | 2026-02-10 | ✅ Current |
| PLATFORM-RULES.md | 2026-02-10 | ✅ Current |

---

## Notes

- Platform launched for Schell Brothers
- Initial agents being onboarded
- Dashboard UI in active development
- Global knowledge base established

---

## Session Log

| Date | Focus | Key Outcomes |
|------|-------|--------------|
| 2026-02-10 | Platform Setup | Dashboard deployed, agents configured |
### 2026-02-12T13:56:17Z
Single source of truth architecture established: Supabase agents table is the canonical source for all agent config files. Dashboard reads/writes directly. OpenClaw syncs every 30 min for memory, 3x daily for other files.
