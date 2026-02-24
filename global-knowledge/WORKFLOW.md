# HBx Pipeline Workflow
## Automated CI/CD Pipeline Protocol

**Last updated:** 2026-02-24
**Owner:** HBx (Master Orchestrator)

---

## Pipeline Overview

Every feature flows through an automated pipeline. Humans touch it exactly **twice**:
1. **Start Pipeline** 🚀 — Lance clicks to begin
2. **Approve** ✅ — Lance reviews the Vercel preview and approves

Everything else is automated.

```
Lance: Start Pipeline 🚀
  ↓ auto-pickup (HBx watches for design_review status)
  ↓
IN5 (Design) → IN2 (Build) → push branch → IN6 (QA) → Vercel preview
  ↓
Status: review ⏸️ STOP — wait for human
  ↓
Lance: Reviews Vercel preview → Approve ✅
  ↓ auto-continue (HBx watches for approved status)
  ↓
Create PR → Conflict check → Assign reviewers → Status: pr_submitted
  ↓
Robs merge → poll-merged-prs cron → Status: done
```

---

## Pipeline Stages & Status Flow

| Stage | Status | Who | Auto/Manual |
|-------|--------|-----|-------------|
| Planning | `planning` | Human + IN1 | Manual (chat) |
| Start Pipeline | `design_review` | Human clicks 🚀 | Manual trigger |
| Design | `design_review` | IN5 | Auto |
| Build | `in_progress` | IN2 | Auto |
| QA | `qa_review` | IN6 | Auto |
| Review | `review` | Human | ⏸️ **STOP** — human must review |
| Approve | `approved` | Human clicks ✅ | Manual trigger |
| PR Submitted | `pr_submitted` | HBx | Auto |
| Done | `done` | Robs merge | Auto (cron detects) |

---

## Critical Rules

### 1. STOP at Review
The pipeline **MUST** stop at `review` status. The sub-agent:
- ✅ Pushes branch (for Vercel preview)
- ✅ Runs QA (typecheck, build, conflict check)
- ✅ Sets status to `review`
- ❌ Does NOT create the PR
- ❌ Does NOT assign reviewers
- ❌ Does NOT set status to `pr_submitted`

### 2. PR Creation Only After Approve
When Lance clicks Approve (status → `approved`):
- HBx auto-detects the status change
- Creates PR via GitHub API
- Runs `scripts/check-pr-conflicts.sh <pr_number>`
- Assigns `rob-hoeller` and `RobLepard` as reviewers
- Sets status to `pr_submitted`

### 3. One Sub-Agent at a Time
Only ONE sub-agent can use the git workspace at a time. Sub-agents sharing a filesystem must run sequentially, never in parallel. HBx queues work accordingly.

### 4. Write Back to Dashboard
Sub-agents MUST populate the dashboard at every stage:

| Stage | What to write |
|-------|---------------|
| Design complete | `features.design_spec` |
| Build complete | `features.branch_name` |
| PR created | `features.pr_url`, `features.pr_number` |
| Every stage | `handoff_packets` row with `output_summary`, `output_artifacts`, `output_decisions`, `activity_log` |
| Every transition | `features.status` |

Use **service role key** for `handoff_packets` (RLS blocks anon key).

### 5. Merge Conflict Protocol
**After creating a PR:** Run `scripts/check-pr-conflicts.sh <pr_number>`
**After merging a PR:** `poll-merged-prs.sh` cron auto-checks all remaining open PRs

---

## Auto-Triggers

### Start Pipeline → Auto-Pickup
When a feature moves to `design_review`:
- HBx detects the change (via cron or webhook)
- Spawns pipeline sub-agent with full context
- Sub-agent runs: Design → Build → Push → QA → review (stop)

### Approve → Auto-PR
When a feature moves to `approved`:
- HBx detects the change
- Creates PR, checks conflicts, assigns reviewers
- Updates status to `pr_submitted`

### Merge → Auto-Done
`poll-merged-prs.sh` cron (every 15 min):
- Detects merged PRs
- Updates feature status to `done`
- Prunes branches
- Checks remaining open PRs for new conflicts

---

## Sub-Agent Task Template

When spawning a pipeline sub-agent, HBx includes:

1. Feature ID and current spec
2. Workspace rules (one agent, start from clean main)
3. Supabase write-back instructions (keys, endpoints, what to write)
4. Status update commands
5. Quality gates (typecheck, build, no console.log)
6. **Explicit instruction: STOP at review, do NOT create PR**
7. GitHub credentials location
8. Branch naming convention: `feat/<feature-slug>`

---

## Quality Gates (Required Before Review)

- [ ] `npx tsc --noEmit` — zero errors
- [ ] `npm run build` — passes
- [ ] No `console.log` spam
- [ ] Follows existing component patterns
- [ ] Branch pushed, Vercel preview deploying
- [ ] Handoff packets written to Supabase
- [ ] Feature card metadata populated

---

## PR Reviewers

All PRs are assigned to:
- `rob-hoeller`
- `RobLepard`

---

## Vercel Previews

- Pattern: `claw-bot-army-{hash}-heartbeat-v2.vercel.app`
- Auto-deploy on branch push
- Fetch URL via Vercel API using `$VERCEL_TOKEN`
- Preview URL written to feature card after deploy confirmed

---

## Legacy Trigger Phrases (Deprecated)

The following manual triggers are **no longer used** in the automated pipeline:

| Old Phrase | Replaced By |
|-----------|-------------|
| `"plan approved"` | Start Pipeline button 🚀 |
| `"submit PR"` | Approve button ✅ → auto PR |
| Manual branch push | Auto push by sub-agent |
| Manual PR creation | Auto PR on approve |
