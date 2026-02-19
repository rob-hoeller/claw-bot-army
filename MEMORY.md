# Long-Term Memory: HBx

> This file stores platform state, agent registry, and significant events.
> Agent registry is **dynamically generated** from Supabase (single source of truth).
> Last synced: 2026-02-19T19:56:16Z

---

## Agent Registry

### Active Agents

| Agent ID | Name | Department | Role | Status | Last Active |
|----------|------|------------|------|--------|-------------|
| HBx | HBx | c726957c-9d6c-4b19-80c6-3f7a2f45adcf | Platform Director | ✅ Active | — |
| HBx_IN1 | Product Architect | 43f4e892-f114-419c-8099-219f8c118b78 | Product Architect | 🔄 Deploying | — |
| HBx_IN2 | Code Factory | 43f4e892-f114-419c-8099-219f8c118b78 | Code Factory | 🔄 Deploying | — |
| HBx_IN3 | Research Lab | 43f4e892-f114-419c-8099-219f8c118b78 | Research Lab | 🔄 Deploying | — |
| HBx_SK1 | Skill Builder | c726957c-9d6c-4b19-80c6-3f7a2f45adcf | Agent Designer & Skill Creator | 🔄 Deploying | — |
| HBx_SL1 | Schellie | a569a0b7-4d7a-4d6f-b235-25a70f9454fa | Digital Online Sales Counselor | ✅ Active | — |
| HBx_SL2 | Competitive Intel | a569a0b7-4d7a-4d6f-b235-25a70f9454fa | Market Intelligence Agent | 🔄 Deploying | — |
| HBx_SP1 | Bug Triage | 35eb92a0-f986-4c4f-a358-6aedab7e4991 | Bug Triage & Platform Maintenance | 🔄 Deploying | — |

### Agent Health Summary

| Metric | Value |
|--------|-------|
| Total Agents | 8 |
| Active | 2 |
| Deploying | 6 |
| Inactive | 0 |
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
### 2026-02-18T19:07:42Z
Test: add-memory.sh patch validation 2026-02-18T19:07:42Z
