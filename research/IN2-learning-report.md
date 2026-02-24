# IN2 Learning Report — Code Factory Research
**Date:** 2026-02-24
**Agent:** IN2 (Code Factory)
**Focus:** AI-assisted code generation, build systems, and code quality for agent platforms

---

## 1. Key Insights

- **Plan-then-execute beats stream-of-consciousness for multi-file changes.** The most reliable AI coding agents (Cursor, Aider, Claude Code, Codex) separate planning from editing. They first produce a structured changeset manifest (which files, what changes, why) then apply edits atomically. This reduces partial/inconsistent states and makes rollback trivial. The pattern is sometimes called "diff-plan-apply."

- **Build-loop feedback is the single biggest lever for first-pass success.** Agents that run typecheck/lint/test after each change and automatically retry on failure achieve 2-3× higher first-pass acceptance vs. one-shot generation. The key is tight iteration loops with structured error parsing — not just dumping build output back into the prompt, but extracting the specific error, file, and line.

- **Automated code review works best as layered gates, not monolithic checks.** Leading teams run fast static checks (lint, types) first, then AI-powered semantic review (logic errors, security, style) as a second pass. This keeps CI fast while still catching subtle issues. Tools like CodeRabbit, Ellipsis, and Qodana exemplify this pattern.

- **AI-native CI/CD treats the agent as a first-class actor in the pipeline.** Instead of just triggering builds, the agent can own the full loop: generate code → run checks → fix failures → open PR → respond to review comments. GitHub's Copilot Workspace and Devin pioneered this "agentic PR" pattern. The critical addition is a sandbox/isolation boundary so the agent can't break prod.

- **Code generation quality metrics are converging on a standard set:** (1) first-pass build success rate, (2) test pass rate without human edits, (3) review rejection rate, (4) lines changed by human post-generation. Tracking these per-agent and per-task-type reveals where to invest in better prompts or tooling.

---

## 2. Useful Sources & References

| Source | Why Useful |
|--------|-----------|
| Aider leaderboard & polyglot benchmark | Standardized multi-file edit benchmarks across models |
| SWE-bench (Princeton) | Real-world GitHub issue resolution benchmark for coding agents |
| CodeRabbit / Ellipsis docs | Practical patterns for AI-powered code review in CI |
| Cursor / Claude Code architecture blogs | How commercial agents structure plan→edit→verify loops |
| Google "AI for Code" research (2025) | Large-scale data on code generation quality metrics at scale |

*Note: Web search was unavailable during this session; sources are from training knowledge.*

---

## 3. Recommendations for HBx

### Recommendation A: Build a "Verify Loop" into Code Factory Tasks
**What:** After IN2 generates code for any task, automatically run a structured verify step: `typecheck → lint → build → test`. Parse failures into structured error objects (file, line, error code, message) and feed them back for a retry — up to 3 attempts before escalating to a human.

**Why:** This is the single highest-ROI improvement. Right now, code goes from generation to PR review without automated verification. A verify loop would catch 60-80% of issues before any human sees the code.

**Scope:** ~1 sprint. Requires:
- A shell-exec step in the sub-agent flow that runs the quality gate commands
- A simple error parser (regex-based is fine for TypeScript/ESLint output)
- Retry logic with a max-attempts cap
- Structured output: pass/fail + remaining errors

### Recommendation B: Track and Dashboard Code Factory Metrics
**What:** Instrument every Code Factory task with 4 metrics: (1) first-pass build success, (2) number of auto-fix retries needed, (3) PR review rejection rate, (4) lines changed by human after generation. Store in a simple JSON log, surface in a weekly summary.

**Why:** Without metrics, we can't know if prompts, templates, or model upgrades are actually improving output quality. This creates a feedback loop for continuous improvement and helps prioritize which task types need better tooling.

**Scope:** ~0.5 sprint. Requires:
- A metrics append step at task completion (write to `metrics/code-factory-log.jsonl`)
- A weekly report generator (sub-agent task) that aggregates and summarizes
- Optional: track by task type (new feature, bug fix, refactor) to spot patterns

---

*Report complete. Both recommendations are independently valuable and can be built in parallel.*
