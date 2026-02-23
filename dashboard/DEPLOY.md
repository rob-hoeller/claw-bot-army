# Deployment Guide — HBx Dashboard

## Required Environment Variables (Vercel)

Before deploying, confirm **all** variables are set in **Vercel → Project → Settings → Environment Variables**.

### Supabase (Required)

| Variable | Scope | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Client + Server | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + Server | Client-side Supabase anon key (RLS-enforced) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Server-side Supabase admin key — **required for all API routes** |

### LLM / AI (Required for chat & planning features)

| Variable | Scope | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | Server only | Anthropic API key for LLM calls |
| `ANTHROPIC_MODEL` | Server only | Model name (e.g. `claude-sonnet-4-20250514`). Optional, has default. |
| `ANTHROPIC_MAX_TOKENS` | Server only | Max token limit. Optional, has default. |

### OpenClaw Gateway (Required for pipeline automation)

| Variable | Scope | Purpose |
|---|---|---|
| `OPENCLAW_GATEWAY_URL` | Server only | OpenClaw gateway endpoint for HBx notifications |
| `OPENCLAW_GATEWAY_TOKEN` | Server only | Bearer token for gateway auth |

### Webhooks (Optional)

| Variable | Scope | Purpose |
|---|---|---|
| `GITHUB_WEBHOOK_SECRET` | Server only | Secret for verifying GitHub webhook payloads |
| `VERCEL_WEBHOOK_SECRET` | Server only | Secret for verifying Vercel webhook payloads |

## Common Deployment Issues

### "Server misconfiguration" / 503 errors

If you see 503 errors mentioning missing environment variables:

1. Go to Vercel → Project → Settings → Environment Variables
2. Ensure `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set
3. Redeploy after adding variables (Vercel does not pick up new env vars without a redeploy)

### "Create Feature from Chat" fails

This is almost always a missing `SUPABASE_SERVICE_ROLE_KEY`. The API route returns a 503 with a specific error message — check the browser Network tab for details.
