# HBx + Humans Coordination Protocol

## Purpose

Prevent conflicts and wasted work when HBx agents and human developers (Rob L, Rob H) work on the same codebase simultaneously.

---

## Before Starting Any Feature

### 1. Sync Latest
```bash
git fetch origin && git pull origin main
```

### 2. Check for Conflicts
- Review open PRs on GitHub
- Check which files are being touched
- If overlap exists → coordinate before starting

### 3. Create Feature Branch
```bash
git checkout -b hbx/[feature-name]
```

### 4. Announce Work
Post in Telegram:
```
🔧 Starting: [feature name]
📁 Files: [list of files/directories]
⏱️ ETA: [estimated completion]
```

---

## File Ownership Signals

| Indicator | Meaning | Action |
|-----------|---------|--------|
| Open PR touching file | ⚠️ Conflict risk | Don't touch same files |
| Someone announced work | ⚠️ Potential overlap | Coordinate first |
| No signals | ✅ Clear | Safe to proceed |

---

## During Development

### Keep PRs Small
- One feature = one PR
- Easier to review
- Smaller conflict surface

### Rebase if Main Moves
```bash
git fetch origin
git rebase origin/main
```

### Commit Often
- Clear commit messages
- Atomic changes

---

## When PR is Ready

### 1. Final Sync
```bash
git fetch origin
git rebase origin/main
git push origin hbx/[feature-name]
```

### 2. Create PR
- Clear title and description
- List files changed
- Include test checklist

### 3. Announce
```
📬 PR Ready: [title]
🔗 [GitHub PR link]
📁 Files: [list]
```

---

## After Merge

### Announce Completion
```
✅ Merged: [feature name]
🔗 [PR link]
Main updated — safe to pull
```

### Clean Up
```bash
git checkout main
git pull origin main
git branch -d hbx/[feature-name]
```

---

## Quick Conflict Check (HBx Automated)

Before any code task, HBx will:
1. `git fetch origin`
2. Check open PRs via GitHub API
3. Identify files being touched by others
4. Flag potential conflicts before starting
5. Proceed only if clear, or coordinate if overlap

---

## Communication Templates

### Starting Work
```
🔧 Starting: [Feature Name]
📁 Touching: src/components/[X].tsx, src/lib/[Y].ts
⏱️ ETA: ~[X] hours
```

### PR Ready
```
📬 PR Ready: [Feature Name]
🔗 https://github.com/rob-hoeller/claw-bot-army/pull/[N]
📁 Changed: [file list]
✅ Build passing
```

### Work Complete
```
✅ Merged: [Feature Name]
Main updated — safe to pull
```

### Conflict Warning
```
⚠️ Conflict Alert
PR #[N] touches [files] — coordinate before editing
```

---

## Emergency: Merge Conflict Occurred

1. Don't panic
2. Pull latest main
3. Resolve conflicts locally
4. Test build
5. Push resolution
6. Notify team

---

## Who Owns What (General Guidelines)

| Area | Primary Owner | Backup |
|------|---------------|--------|
| Auth / Supabase | Rob H | — |
| UI Components | HBx | Rob L |
| Dashboard Pages | HBx | Rob L |
| Database Schema | Rob H | — |
| Agent Configs | HBx | Lance |
| Global Knowledge | HBx | Lance |

---

*Last Updated: 2026-02-11*
