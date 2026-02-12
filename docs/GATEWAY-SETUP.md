# OpenClaw Gateway Setup for HBx Dashboard

This guide connects the HBx Dashboard to your OpenClaw Gateway for real agent responses.

---

## Step 1: Enable Chat Completions API in OpenClaw

Edit your OpenClaw config (`~/.openclaw/config.json` or wherever it lives):

```json
{
  "gateway": {
    "auth": {
      "mode": "token",
      "token": "your-secret-token-here"
    },
    "http": {
      "endpoints": {
        "chatCompletions": {
          "enabled": true
        }
      }
    }
  }
}
```

Then restart the gateway:

```bash
openclaw gateway restart
```

**Verify it's working:**

```bash
curl -s http://127.0.0.1:18789/v1/chat/completions \
  -H "Authorization: Bearer your-secret-token-here" \
  -H "Content-Type: application/json" \
  -d '{"model":"openclaw","messages":[{"role":"user","content":"ping"}]}' \
  | head -c 200
```

You should get a JSON response (not a 404 or 401).

---

## Step 2: Expose Gateway to Internet

The dashboard on Vercel needs to reach your gateway. Choose one option:

### Option A: Tailscale (Recommended)

1. Install Tailscale on gateway machine: https://tailscale.com/download
2. Run `tailscale up`
3. Get your Tailscale IP: `tailscale ip -4`
4. Gateway URL: `http://100.x.x.x:18789`

**Pros:** Secure, no ports to open, works behind NAT

### Option B: Cloudflare Tunnel

```bash
# Install cloudflared
brew install cloudflared  # macOS
# or see https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/

# Create tunnel
cloudflared tunnel --url http://localhost:18789
```

This gives you a URL like `https://random-words.trycloudflare.com`

**Pros:** HTTPS, no firewall changes needed

### Option C: Direct Public IP

If your gateway machine has a public IP:

1. Gateway URL: `http://your-public-ip:18789`
2. Open port 18789 in your firewall
3. Consider adding HTTPS via reverse proxy (nginx, caddy)

**Pros:** Simple if you already have infrastructure

---

## Step 3: Add Environment Variables to Vercel

1. Go to **Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**

2. Add these variables:

| Name | Value | Environment |
|------|-------|-------------|
| `OPENCLAW_GATEWAY_URL` | `http://your-gateway-url:18789` | Production, Preview, Development |
| `OPENCLAW_GATEWAY_TOKEN` | The token from Step 1 | Production, Preview, Development |

3. Click **Save**

4. **Redeploy** the latest deployment (or merge a PR to trigger auto-deploy)

---

## Step 4: Verify Connection

1. Open the HBx Dashboard
2. Click any agent in the org chart
3. Go to the **Chat** tab
4. Look for connection status indicator:
   - 🟢 **"Gateway connected"** = Working!
   - 🟡 **"Demo mode"** = Gateway not reachable

5. Send a test message — you should get a real agent response

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| "Demo mode" showing | Gateway URL not reachable from Vercel | Check URL is publicly accessible |
| 401 Unauthorized | Token mismatch | Verify `OPENCLAW_GATEWAY_TOKEN` matches config |
| 404 Not Found | Chat completions not enabled | Set `chatCompletions.enabled: true` in config |
| Connection timeout | Firewall blocking | Open port 18789 or use Tailscale/Cloudflare |
| CORS errors | N/A | API routes proxy requests, CORS shouldn't apply |

### Debug: Test from command line

```bash
# Test gateway directly
curl -v http://your-gateway-url:18789/v1/chat/completions \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{"model":"openclaw:main","messages":[{"role":"user","content":"hello"}]}'
```

### Debug: Check Vercel logs

1. Vercel Dashboard → Your Project → **Deployments**
2. Click latest deployment → **Functions** tab
3. Look for `/api/chat/send` logs

---

## Architecture

```
User Browser
     ↓
HBx Dashboard (Vercel)
     ↓
/api/chat/send (Next.js API Route)
     ↓ (server-side, token hidden)
OpenClaw Gateway
     ↓
Agent (Claude/GPT/etc)
     ↓
Response streams back via SSE
```

The API route keeps your gateway token secure — it's never exposed to the browser.

---

## Questions?

Ping the team in the project chat or check OpenClaw docs: https://docs.openclaw.ai
