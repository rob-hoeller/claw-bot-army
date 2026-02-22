# GitHub Webhook Setup — Auto PR Merge → Feature Board

## Overview

When a PR is merged on GitHub, this webhook automatically:
1. Updates the matching feature card to **"done"** status
2. Sets `pr_status: "merged"` and `completed_at` timestamp
3. Matches features by `branch_name` or `pr_number`

The endpoint already exists in the dashboard: `/api/webhooks/github`

## Setup (5 minutes)

### 1. Generate a webhook secret

```bash
openssl rand -hex 32
```

Save the output — you'll need it in two places.

### 2. Add to Vercel environment variables

Go to the dashboard project in Vercel → Settings → Environment Variables:

| Variable | Value |
|----------|-------|
| `GITHUB_WEBHOOK_SECRET` | The secret from step 1 |

Redeploy the dashboard after adding.

### 3. Configure GitHub webhook

Go to **GitHub repo → Settings → Webhooks → Add webhook**

| Field | Value |
|-------|-------|
| **Payload URL** | `https://<your-dashboard-url>/api/webhooks/github` |
| **Content type** | `application/json` |
| **Secret** | Same secret from step 1 |
| **SSL verification** | Enable |
| **Events** | Select **"Pull requests"** only |

### 4. Test

1. Open any test PR
2. Merge it
3. Check the feature board — the matching card should move to "done"
4. Check GitHub webhook → Recent Deliveries for 200 responses

## How matching works

The webhook handler (`dashboard/src/app/api/webhooks/github/route.ts`) matches PRs to features using:

```
OR(pr_number = <PR number>, branch_name = <head branch>)
```

This means features are matched if either:
- The feature's `pr_number` field matches the merged PR number
- The feature's `branch_name` field matches the PR's head branch name

## Events handled

| GitHub Event | Action | Result |
|-------------|--------|--------|
| `pull_request` | `opened` / `reopened` | Sets `pr_url`, `pr_number`, `pr_status: "open"` |
| `pull_request` | `closed` + `merged=true` | Sets `status: "done"`, `pr_status: "merged"`, `completed_at` |

## Fallback

A cron poller (`scripts/poll-merged-prs.sh`) runs every 15 min as a safety net. It performs the same updates via GitHub API + Supabase, plus pulls code and prunes branches. The webhook is real-time; the poller catches anything missed.
