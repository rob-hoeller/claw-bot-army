# Project Backlog

## 🔮 Concepts / Discovery

_Empty — all items moved to In Progress or Done_

---

## 📋 Planned

### Security Policy Framework
**Status:** Planned  
**Added:** 2025-02-12  
**Owner:** HBx

**Concept:**  
Establish security policy framework for multi-OpenClaw instance deployments. Integrate with healthcheck skill.

**Next Steps:**
- [ ] Run security audit on this instance (`openclaw security audit --deep`)
- [ ] Define risk tolerance profile
- [ ] Document security policies for fleet

---

## 🚧 In Progress

### Multi-Agent Fleet Management
**Status:** In Progress  
**Added:** 2025-02-12  
**Owner:** HBx (Fleet Commander)

**Decisions Made:**
1. ✅ **Identity:** This instance (HBx) is the Fleet Commander
2. ✅ **Deployment Model:** Single EC2, multi-session via sessions_spawn
3. ✅ **Monitoring Scope:** Token costs, health, activity — stored in Supabase
4. ✅ **Stakeholders:** Lance, Rob Lepard, Rob Hoeller

**Existing Agents:**
| Agent ID | Name | Department | Status |
|----------|------|------------|--------|
| HBx | Fleet Commander | Platform | ✅ Active |
| HBx_SL1 | Schellie | Sales | ✅ Active |
| HBx_IN1 | Product Architect | Innovation | 🔄 Planned |
| HBx_IN2 | Code Factory | Innovation | 🔄 Planned |
| HBx_IN3 | Research Lab | Innovation | 🔄 Planned |
| HBx_SP1 | Support | Support | 🔄 Planned |

**Completed:**
- [x] Confirm deployment architecture (single EC2, multi-session)
- [x] Identify data sources (session JSONL files with full cost data)
- [x] Design Supabase schema for token_usage tables
- [x] Build collection script (collect-usage-db.sh)
- [x] Build dashboard API (/api/usage)
- [x] Build TokenUsagePage component

**Remaining:**
- [ ] **Run Supabase migration** (database/migrations/002_token_usage.sql)
- [ ] Test collection script with live data
- [ ] Add cron job for 15-minute collection
- [ ] Deploy dashboard to Vercel
- [ ] Configure alerts for cost thresholds

---

## ✅ Done

### Infrastructure Monitoring (PR #25-27)
**Completed:** 2025-02-12

- Database-backed metrics collection (CPU, memory, load, sessions)
- MonitoringPage dashboard component with charts
- 15-minute collection via collect-metrics-db.sh
- Scaling recommendations based on thresholds

### Token Usage & Cost Tracking (Current Session)
**Completed:** 2025-02-12

**Files Created:**
- `database/migrations/002_token_usage.sql` — Supabase schema
- `monitoring/collect-usage-db.sh` — JSONL parser and collector
- `dashboard/src/app/api/usage/route.ts` — API endpoint
- `dashboard/src/components/TokenUsagePage.tsx` — Dashboard UI

**Features:**
- Per-session token snapshots every 15 minutes
- Daily/weekly aggregates for trend analysis
- Cost breakdown (input, output, cache read/write)
- Drill-down by agent, user, model
- Leaderboards (top agents, top users by cost)
- Time range selector (7d, 14d, 30d, 90d)

**Schema:**
- `token_usage` — Granular snapshots
- `token_usage_daily` — Daily rollups
- `token_usage_weekly` — Weekly rollups with trend comparison
- Views: `token_usage_today`, `token_usage_7d_by_agent`, `token_usage_7d_by_user`
