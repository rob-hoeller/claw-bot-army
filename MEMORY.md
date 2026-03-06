# Long-Term Memory: HBx

> This file stores platform state, agent registry, and significant events.
> Agent registry is **dynamically generated** from Supabase (single source of truth).
> Last synced: 2026-03-06T17:31:48Z

---

## Agent Registry

### Active Agents

| Agent ID | Name | Department | Role | Status | Last Active |
|----------|------|------------|------|--------|-------------|
| HBx | HBx | c726957c-9d6c-4b19-80c6-3f7a2f45adcf | Platform Director | ✅ Active | — |
| HBx_IN1 | Product Architect | 43f4e892-f114-419c-8099-219f8c118b78 | Product Architect | ✅ Active | — |
| HBx_IN2 | Code Factory | 43f4e892-f114-419c-8099-219f8c118b78 | Code Factory | ✅ Active | — |
| HBx_IN3 | Research Lab | 43f4e892-f114-419c-8099-219f8c118b78 | Research Lab | ✅ Active | — |
| HBx_IN4 | Skill Builder | 43f4e892-f114-419c-8099-219f8c118b78 | Agent Designer & Skill Creator | ✅ Active | — |
| HBx_IN5 | UI/UX Expert | 43f4e892-f114-419c-8099-219f8c118b78 | UI/UX Design & User Experience | ✅ Active | — |
| HBx_IN6 | QA Engineer | 43f4e892-f114-419c-8099-219f8c118b78 | Quality Assurance & Testing | ✅ Active | — |
| HBx_SP1 | Bug Triage | 35eb92a0-f986-4c4f-a358-6aedab7e4991 | Bug Triage & Platform Maintenance | ✅ Active | — |

### Agent Health Summary

| Metric | Value |
|--------|-------|
| Total Agents | 8 |
| Active | 8 |
| Deploying | 0 |
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
### 2026-02-19T20:00:30Z
Fixed memory logging gap. Created daily-memory-log.sh script + cron (11 PM ET). Memory now auto-logs to local files + Supabase memory_logs table daily.
### 2026-02-19T21:14:47Z
GitHub access: git credentials stored in ~/.git-credentials (credential.helper=store) for user clawd-schell. gh CLI is NOT authenticated — use GitHub REST API directly with token extracted from git-credentials. No daily re-auth needed. Example: TOKEN=$(cat ~/.git-credentials | grep github.com | head -1 | sed 's|https://[^:]*:\([^@]*\)@.*|\1|') then curl with -H 'Authorization: token $TOKEN'. PR creation works via POST to api.github.com/repos/{owner}/{repo}/pulls.
### 2026-03-06T14:25:36Z
Agent Teams architecture embedded in all agent SOULs. Every HBx agent (IN1-IN4, SP1) now has Sub-Team Operations section with CCA spawning protocols, cross-agent communication rules, and role-specific CCA task lists. HBx SOUL updated with two-layer model (orchestrators + execution workers) and cross-agent communication protocol. All synced to Supabase. Claude Code v2.1.70 confirmed operational on VPS with API key + agent teams experimental flag enabled.
### 2026-03-06T14:50:58Z
Removed HBx_SL1 (Schellie) and HBx_SL2 (Competitive Intel) from Supabase. Both agents fully deleted including memory_logs. Will rebuild after next strategy gate. Active agent count: 11 (HBx + 6 Innovation + 1 Support + 3 humans).
### 2026-03-06T16:32:31Z
Feature pipeline end-to-end demo complete. 'Replace UserSelector with Supabase Auth Integration' (88b10748) shipped via full pipeline: Intake→Spec(IN1+2CCAs)→Design(IN5)→Build(IN2+3CCAs)→QA(IN6, 6/6 pass)→Ship. PR #96 created with Rob H + Rob L as reviewers. Key learnings: agent_activity requires action_type field, Approve button doesn't auto-advance pipeline step, humans keep reappearing in agents table via sync. UX improvements logged: gate-aware button copy, auto-focus Activity tab at checkpoints, inline spec viewer.
