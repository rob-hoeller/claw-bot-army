# Project Backlog

## 🔮 Concepts / Discovery

### Multi-Agent Fleet Management
**Status:** Discovery  
**Added:** 2025-02-12  
**Owner:** TBD

**Concept:**  
Apply fleet management principles to the HBx multi-agent architecture. Central monitoring of costs, health, and activity across agents with scheduled reporting.

**Existing Setup:**
- HBx_IN1 — Product Architect (specs, prioritization)
- HBx_IN2 — Code Factory (builds features)
- HBx_IN3 — Research Lab (learning, research)
- HBx_SP1 — Support (bug fixes)

**Open Questions:**
1. **Identity:** Who is the orchestrator?
   - Is this instance HBx (the parent)?
   - Or a separate Fleet Commander instance?

2. **Deployment Model:** How are sub-agents deployed?
   - Separate OpenClaw instances with own gateways?
   - Spawned sessions via sessions_spawn?
   - Conceptual roles not yet running?

3. **Monitoring Scope:** What to track?
   - Token costs across agents
   - Health/uptime
   - Work activity summaries
   - Task routing

4. **Stakeholders:** Who receives reports?
   - Lance
   - Others (Rob Lepard, Rob Hoeller)?

**Next Steps:**
- [ ] Answer open questions above
- [ ] Define deployment architecture
- [ ] Set up agent instances (if separate)
- [ ] Configure monitoring/reporting

**Reference:** Fleet Commander SOUL concept (shared in chat 2025-02-12)

---

## 📋 Planned

_Nothing yet_

---

## 🚧 In Progress

_Nothing yet_

---

## ✅ Done

_Nothing yet_
