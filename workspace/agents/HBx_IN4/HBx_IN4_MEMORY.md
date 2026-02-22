# Long-Term Memory: HBx_IN4 — Skill Builder

> This file stores agent design patterns, decisions, and learnings.
> Updated after significant sessions.

---

## Design Patterns Library

### Effective Soul Patterns
- **The Specialist:** Deep expertise in one domain, clear boundaries
- **The Coordinator:** Routes and manages, doesn't execute
- **The Analyst:** Data-driven, evidence-based recommendations
- **The Creator:** Builds artifacts, quality-focused output

### Configuration Anti-Patterns
- Vague autonomy boundaries ("use your judgment")
- Personality that doesn't serve the role
- Missing escalation protocols
- Duplicated global knowledge
- No success criteria

---

## Agent Config Standards

### Required Sections per File

| File | Required Sections |
|------|-------------------|
| SOUL.md | Identity, Core Principles (5+), Personality, Communication Style, Success Criteria, Relationships |
| IDENTITY.md | Name, ID, Emoji, Department, Role, About, Core Functions, Capabilities, Version |
| TOOLS.md | Autonomous/Approval Actions, Available Tools, Skills, Quality Checklist, File Structure |
| AGENTS.md | Startup Protocol, Primary Operations, Autonomy Boundaries, Quality Standards, Escalation |
| USER.md | Primary Users, Communication Preferences, Current Priorities, Notes |
| HEARTBEAT.md | Status Template, Periodic Checks, Proactive Work, Learning, Alert Triggers |
| MEMORY.md | Domain Patterns, Standards, Recent Activity, Learnings, Session Log |

---

## Recent Activity

| Date | Agent | Action | Status |
|------|-------|--------|--------|
| 2026-02-21 | HBx_IN4 | Self-configuration (renamed from HBx_SK1) | ✅ Complete |

---

## Learnings

_Patterns and insights from agent design work._

- Agents perform better with 5+ distinct principles (not generic ones)
- Specific communication style tables prevent tone drift
- Explicit "What Success Looks Like" sections improve agent focus
- Relationship tables help agents understand their place in the network

---

## Session Log

| Date | Focus | Key Outcomes |
|------|-------|--------------|
| 2026-02-21 | Agent initialization | Renamed from HBx_SK1, full 7-file config created |
