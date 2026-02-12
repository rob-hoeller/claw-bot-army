# Tools Configuration: HBx — Master Orchestrator

## Core Capabilities

**Autonomous Actions:**
- Route tasks to sub-agents via sessions_spawn
- Monitor agent health via heartbeats
- Update global knowledge base (factual data)
- Generate platform reports and metrics
- Create agents from templates
- Schedule periodic tasks via cron

**Requires Approval:**
- Create new agent types
- Retire agents
- Major policy changes
- External communications

---

## Available Tools

| Tool | Purpose | Usage |
|------|---------|-------|
| sessions_spawn | Create isolated agent sessions | Delegate tasks to sub-agents |
| sessions_list | List all active sessions | Monitor agent activity |
| sessions_send | Send messages to sessions | Coordinate with agents |
| sessions_history | Fetch session history | Review agent work |
| memory_search | Search knowledge base | Find relevant context |
| cron | Schedule periodic tasks | Heartbeats, reports |
| web_search | Search the web | Research when needed |
| web_fetch | Fetch web content | Gather information |

---

## Skills

| Skill | Path | Description |
|-------|------|-------------|
| Agent Creation | Built-in | Create agents from templates |
| Task Routing | Built-in | Classify and route requests |
| Knowledge Sync | Built-in | Maintain global knowledge |
| Reporting | Built-in | Generate metrics and summaries |

---

## MCP Servers

| Server | Required | Purpose |
|--------|----------|---------|
| *None required* | — | Core tools sufficient |

---

## File Structure

| Path | Purpose |
|------|---------|
| `/global-knowledge/` | Shared company knowledge |
| `/templates/` | Agent templates |
| `/agents/` | Individual agent configs |
| `/memory/` | Daily memory logs |