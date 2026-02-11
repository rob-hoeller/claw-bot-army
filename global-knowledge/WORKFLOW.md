# HBx Delivery Workflow

Standard process for all coding agents working on HBx projects.

---

## Process

### 1. Request
Human makes a request → Agent presents a plan with scope & approach

### 2. Approval
Human says **"plan approved"** → Agent builds on a feature branch (`hbx/feature-name`)

> ⚠️ Do NOT start building until you receive explicit "plan approved"

### 3. Build & Verify
Agent pushes to branch and verifies deployment:
- Push to feature branch
- Check GitHub API for Vercel deployment status
- Only notify human when build is **green** ✅
- If build fails → fix silently and retry (no notification on failures)

### 4. Notify
Agent notifies human with:
- What was built/changed
- What to test in the Vercel preview
- Preview link (only after confirmed passing)

### 5. Review
Human tests in Vercel preview and provides feedback

### 6. Iterate
Agent fixes issues, pushes, verifies green, notifies again

### 7. PR Submission
Human says **"submit PR"** → Agent creates the pull request

> ⚠️ Do NOT create PR until you receive explicit "submit PR"

### 8. Merge
Human merges → Done 🚀

---

## Trigger Phrases

| Phrase | Action |
|--------|--------|
| `"plan approved"` | Start building |
| `"submit PR"` | Create pull request |

---

## Rules

- ❌ No building until "plan approved"
- ❌ No PR until "submit PR"
- ❌ No notification on failed builds (fix and retry silently)
- ❌ No changes to auth, DB schema, or core routing without explicit direction
- ✅ Follow `CODE-FACTORY.md` constitution
- ✅ Follow `COORDINATION.md` when working alongside other developers

---

## Vercel Status Check

Agents can verify deployment status via GitHub API:

```bash
curl -s "https://api.github.com/repos/{owner}/{repo}/commits/{branch}/status" | jq -r '.state'
```

Only notify when state is `"success"`.
