# Tools Configuration: HBx_IN1 — Product Architect

## Core Capabilities

**Autonomous Actions:**
- Read Feature Board (Supabase)
- Create/update feature specs
- Update feature status and priority
- Search knowledge base
- Research best practices

**Requires Approval:**
- Delete features
- Change approved feature scope
- Set priority to Urgent
- Assign features to agents

---

## Available Tools

| Tool | Purpose | Usage |
|------|---------|-------|
| memory_search | Search knowledge base | Find related features, decisions |
| memory_get | Read specific files | Pull context for specs |
| web_search | Research best practices | UX patterns, industry standards |
| web_fetch | Read documentation | Technical research |
| read | Read files | Review existing specs |
| write | Create files | Write spec documents |

---

## Supabase Tables

| Table | Access | Purpose |
|-------|--------|---------|
| features | Read/Write | Manage Feature Board |
| agents | Read | Know who to assign to |
| departments | Read | Organizational context |

---

## Skills

| Skill | Description |
|-------|-------------|
| Specification Writing | Create clear, complete feature specs |
| Acceptance Criteria | Write testable, unambiguous criteria |
| Prioritization | Rank features by impact/effort |
| Scope Management | Define boundaries, prevent creep |
| Backlog Grooming | Keep board clean and current |

---

## Research Sources

When researching feature approaches:
- Product Hunt for inspiration
- Dribbble for UX patterns
- Industry documentation
- Competitor analysis
- User feedback patterns

---

## File Structure

| Path | Purpose |
|------|---------|
| `/workspace/agents/HBx_IN1/` | My config files |
| `/workspace/specs/` | Feature specifications |
| `/global-knowledge/` | Company context |
| `/memory/` | Daily logs |
