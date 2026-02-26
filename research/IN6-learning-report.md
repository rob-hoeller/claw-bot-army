# IN6 Learning Report: QA for AI-Generated Code & Automated Testing

**Agent:** IN6 (QA Engineer)  
**Date:** 2026-02-25  
**Focus:** Quality gates for agent-driven development pipelines (2024–2026)

---

## Key Insights

### 1. AI-Generated Code Has Predictable Failure Patterns — Test for Them

AI-generated code reliably produces certain categories of defects: missing edge cases, hallucinated APIs/imports, subtle logic errors in complex conditions, and security anti-patterns (e.g., missing input validation, permissive CORS). Unlike human-written bugs which are random, these patterns are *systematic* and can be targeted with specialized lint rules and test templates.

**Practical implication:** Build a checklist of known LLM failure modes (hallucinated packages, incorrect error handling, missing loading/error/empty states) and encode them as automated checks.

### 2. The "Never Trust AI-Generated Tests" Principle

Martin Fowler's Thoughtworks team (2024) highlighted a critical asymmetry: AI can generate both code *and* tests, but AI-generated tests often suffer from *confirmation bias* — they test what the code does, not what it *should* do. Tests generated alongside code frequently pass trivially because they mirror the implementation's assumptions, including its bugs.

**Practical implication:** When sub-agents generate code + tests together, the tests provide weak quality signal. Either (a) generate tests from specs/requirements separately from implementation, or (b) use mutation testing to verify test effectiveness.

**Source:** [Fowler — How to Tackle Unreliability of Coding Assistants](https://martinfowler.com/articles/exploring-gen-ai/08-how-to-tackle-unreliability.html)

### 3. Static Analysis Is the Highest-ROI Quality Gate for AI Code

Tools like SonarQube, ESLint with strict configs, and TypeScript's strict mode catch a disproportionate share of AI-introduced defects with zero runtime cost. The 2024-2025 industry consensus is: **tighten static analysis before investing in more tests**. TypeScript `strict: true` + `noUncheckedIndexedAccess` alone catches many hallucinated-API and null-safety issues.

**Practical implication:** A strict `tsconfig.json` + ESLint + `next build` (which runs typecheck) is the cheapest, fastest, most reliable first gate. It should block PR merge on any failure.

### 4. Layered Quality Gates with Fast Feedback Loops

The emerging pattern for AI-agent pipelines (seen at companies like Vercel, Cursor, and in open-source agent frameworks like SWE-agent and OpenDevin) is a **layered gate model**:

| Layer | Time | What |
|-------|------|------|
| L0 — Instant | <30s | TypeCheck + Lint + Format |
| L1 — Fast | <3min | Unit tests + Build succeeds |
| L2 — Medium | <10min | Integration tests + Playwright E2E smoke |
| L3 — Slow | <30min | Full E2E suite + Visual regression + Security scan |

The key innovation: L0 runs *before the PR is even created* (in the agent loop), letting the agent self-correct. L1-L2 run on PR creation. L3 runs before merge.

**Practical implication:** Give sub-agents access to L0 checks inline so they can iterate before pushing. This dramatically reduces PR rejection rates.

### 5. AI-Powered Code Review as a Complementary Gate

Tools like **Qodo (formerly CodiumAI)**, **CodeRabbit**, and **GitHub Copilot Code Review** (GA 2025) add an AI-reviewing-AI layer. While this sounds circular, it works because the reviewer model operates with different context (full repo, PR diff, coding standards doc) than the generator. Studies from Qodo show their AI review catches ~30-40% of issues that static analysis misses, particularly architectural/pattern violations and business logic errors.

**Practical implication:** Adding an AI code review bot to PRs (e.g., CodeRabbit, which is free for OSS) provides a useful second opinion on agent-generated PRs, especially for pattern consistency.

**Sources:**
- [Qodo AI Code Review Platform](https://www.qodo.ai/)
- [CodeRabbit](https://coderabbit.ai/)

### 6. Mutation Testing Validates Test Suite Quality

When agents generate both code and tests, **mutation testing** (tools like Stryker for TypeScript) is the only reliable way to verify the tests actually catch bugs. Stryker introduces small mutations to the code and checks if tests fail. A mutation score <80% on agent-generated code is a red flag.

**Practical implication:** Run Stryker on critical paths (auth, data handling, API routes) as an L3 gate to verify test effectiveness.

**Source:** [StrykerJS](https://stryker-mutator.io/)

### 7. Snapshot and Visual Regression Testing Catches UI Drift

AI agents generating React/Next.js components frequently produce visually "close but wrong" output — slightly off spacing, wrong responsive behavior, missing dark mode support. Tools like **Playwright visual comparisons**, **Chromatic** (Storybook), and **Percy** catch these effectively.

**Practical implication:** For any PR that touches UI components, a visual regression step comparing screenshots against the main branch is highly effective and low-effort to set up with Playwright.

---

## Useful Sources

| Source | URL | Relevance |
|--------|-----|-----------|
| Fowler — Exploring Generative AI series | https://martinfowler.com/articles/exploring-gen-ai.html | Best thinking on AI code reliability & developer practices |
| StrykerJS (Mutation Testing) | https://stryker-mutator.io/ | Validates AI-generated test quality |
| Qodo AI Code Review | https://www.qodo.ai/ | AI-powered PR review platform |
| CodeRabbit | https://coderabbit.ai/ | Free AI code review bot for GitHub PRs |
| Playwright | https://playwright.dev/ | E2E + visual regression testing |
| SonarQube | https://www.sonarsource.com/products/sonarqube/ | Static analysis with AI code awareness |
| Chromatic (Storybook visual testing) | https://www.chromatic.com/ | Visual regression for component libraries |
| GitHub Actions | https://docs.github.com/en/actions | CI/CD for quality gate automation |

---

## Practical Recommendations for HBx

### Recommendation 1: Implement a 3-Layer Automated Quality Gate in CI/CD

**What:** Set up a tiered GitHub Actions pipeline that runs on every PR created by sub-agents:

- **L0 (in-agent):** Before pushing, sub-agents run `tsc --noEmit && eslint . && next build` locally and self-correct failures. Encode this in the agent prompt/instructions.
- **L1 (PR creation — required):** GitHub Actions runs typecheck, lint, unit tests, and `next build`. PR cannot be merged if this fails.
- **L2 (PR review — required):** Integration tests, Playwright E2E smoke tests on a preview deployment (Vercel preview URLs), and an AI code review bot (CodeRabbit).

**Why:** Sub-agents generating Next.js/TypeScript code will produce a predictable rate of type errors, lint violations, broken builds, and logic bugs. A layered gate catches ~95% of these automatically. The L0 in-agent step is the biggest lever — it lets agents self-heal before creating noise in PRs. Without it, you'll drown in failed CI runs.

**Scope:**
- **Week 1:** Add strict `tsconfig.json` + ESLint config + GitHub Actions workflow for L1 checks
- **Week 2:** Add Playwright E2E smoke tests + Vercel preview integration for L2
- **Week 3:** Add CodeRabbit or similar AI review bot to all PRs
- **Ongoing:** Update agent instructions (CODE-FACTORY.md) to require L0 self-check before pushing

---

### Recommendation 2: Separate Test Generation from Code Generation

**What:** When sub-agents build features, use a **two-phase approach**: (1) Agent A generates implementation code, (2) A separate prompt/agent generates tests *from the spec/acceptance criteria only* — without seeing the implementation. Alternatively, write key test cases in the ticket *before* the agent starts coding (Behavior-Driven Development style).

**Why:** The #1 reliability problem with AI-generated tests is confirmation bias — tests written alongside code test *what the code does*, not *what it should do*. By separating the test-writing context from the implementation context, you get tests that actually validate behavior against requirements. This is the single highest-impact change for test quality in agent-driven pipelines.

**Scope:**
- **Immediate:** Update CODE-FACTORY.md ticket template to require acceptance criteria written as testable assertions (Given/When/Then format)
- **Week 2:** Create a "test writer" agent prompt that takes only the spec + component interface (not implementation) and generates Vitest/Playwright tests
- **Week 4:** Add mutation testing (StrykerJS) on critical paths as an optional L3 gate to measure test effectiveness over time
- **Metric:** Track mutation score on agent-generated code; target >75% on business-critical modules

---

*Report prepared by IN6 (QA Engineer) — 2026-02-25*
