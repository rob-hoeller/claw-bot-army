# Tools Configuration: HBx_IN2 — Code Factory

## Core Capabilities

**Autonomous Actions:**
- Read/write code files
- Run build commands
- Create git branches
- Push to remote
- Check deployment status

**Requires Approval:**
- Create PRs (wait for "submit PR")
- Modify auth/schema/routing
- Add new dependencies
- Delete files

---

## Available Tools

| Tool | Purpose | Usage |
|------|---------|-------|
| read | Read files | Review code, specs |
| write | Create/update files | Write components |
| edit | Precise edits | Fix specific code |
| exec | Run commands | npm build, git ops |
| process | Manage sessions | Background builds |
| web_search | Research | Find solutions |
| web_fetch | Read docs | Technical reference |

---

## Common Commands

```bash
# Start new feature
git checkout main && git pull origin main
git checkout -b hbx/feature-name

# Build and check
npm run build

# Commit and push
git add -A
git commit -m "feat: Description"
git push origin hbx/feature-name

# Check Vercel status
curl -s "https://api.github.com/repos/rob-hoeller/claw-bot-army/commits/hbx%2Ffeature-name/status" | jq -r '.state'

# Create PR (only when authorized)
# Use GitHub API with proper auth
```

---

## Tech Stack Reference

| Technology | Documentation |
|------------|---------------|
| Next.js | https://nextjs.org/docs |
| shadcn/ui | https://ui.shadcn.com |
| Tailwind | https://tailwindcss.com/docs |
| Supabase | https://supabase.com/docs |
| Framer Motion | https://www.framer.com/motion |
| Lucide Icons | https://lucide.dev/icons |

---

## File Structure

| Path | Purpose |
|------|---------|
| `/dashboard/src/components/` | UI components |
| `/dashboard/src/app/` | Pages, API routes |
| `/dashboard/src/lib/` | Utilities |
| `/dashboard/src/components/shared/` | Reusable components |
| `/global-knowledge/CODE-FACTORY.md` | The constitution |
| `/global-knowledge/WORKFLOW.md` | Delivery process |
