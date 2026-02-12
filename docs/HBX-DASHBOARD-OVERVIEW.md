# HBx Dashboard — Technical Overview for Robs

**Author:** HBx (AI Agent)  
**Date:** 2026-02-11  
**Status:** Active Development  
**Repo:** `rob-hoeller/claw-bot-army`

---

## Executive Summary

The HBx Dashboard is a web-based control surface for managing OpenClaw AI agents. It provides:

1. **Visual agent management** — See all agents in an org chart, their status, and health
2. **In-dashboard chat** — Talk to any agent directly from the browser (replacing Telegram for end users)
3. **Configuration editing** — Edit agent files (SOUL.md, TOOLS.md, etc.) and global knowledge
4. **Activity monitoring** — Live feed of all conversations across all agents
5. **Future: Autonomous agent workflows** — Agents request features, coding agents build them, HBx reviews and submits PRs

**Current blocker:** The dashboard needs to connect to an OpenClaw Gateway to send messages to real agents. Right now it runs in "demo mode" with simulated responses.

---

## Table of Contents

1. [Vision & Goals](#vision--goals)
2. [Architecture](#architecture)
3. [Current State](#current-state)
4. [Gateway Integration (What We Need From You)](#gateway-integration)
5. [Security & Risks](#security--risks)
6. [Development Workflow](#development-workflow)
7. [Roadmap](#roadmap)
8. [Technical Details](#technical-details)

---

## Vision & Goals

### The Problem

Lance manages multiple AI agents (HBx, Schellie, Competitive Intel, etc.) for Schell Brothers. Currently:

- Agents are configured via text files
- Communication happens through Telegram
- No unified view of agent status or activity
- No way for non-technical users to interact with agents
- No visibility into what agents are doing

### The Solution

A dashboard that provides:

| Capability | Description |
|------------|-------------|
| **Agent Org Chart** | Visual hierarchy of all agents with status indicators |
| **Chat Interface** | Browser-based chat with any agent (Supabase persistence) |
| **File Editor** | Edit agent configs without touching the filesystem |
| **Activity Feed** | Real-time ticker of all conversations |
| **Status Monitoring** | See which agents are idle/processing/offline |
| **Multi-user Support** | Each user has their own conversation history |
| **Admin View** | Admins can monitor (but not post to) all conversations |

### Long-Term Vision

**Autonomous Agent Development:**

```
1. Agent identifies need for new feature
2. Agent creates ticket on Feature Board
3. HBx (orchestrator) reviews and creates implementation plan
4. HBx assigns to Coding Agent (CX-Code)
5. Coding Agent builds feature, iterates with HBx
6. HBx verifies build passes, submits PR
7. Human (Robs) reviews and approves
8. Eventually: HBx auto-approves low-risk PRs
```

This creates a self-improving system where agents can request and build their own capabilities, with human oversight at key checkpoints.

---

## Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         USERS                                    │
│                  (Lance, Robs, Team)                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    HBx DASHBOARD                                 │
│                   (Vercel / Next.js)                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │ Agent Page  │  │ Chat Panel  │  │Activity Feed│             │
│  │ (Org Chart) │  │ (Messages)  │  │ (Live Log)  │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│         │                │                │                      │
│         └────────────────┼────────────────┘                      │
│                          ▼                                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              API Routes (Server-Side)                     │   │
│  │   /api/chat/send     →  Forward to Gateway               │   │
│  │   /api/chat/sessions →  List/manage sessions             │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
         │                                           │
         ▼                                           ▼
┌─────────────────────┐                 ┌─────────────────────────┐
│      SUPABASE       │                 │    OPENCLAW GATEWAY     │
│  ┌───────────────┐  │                 │    (Your Server)        │
│  │ conversations │  │                 │  ┌───────────────────┐  │
│  │ messages      │  │                 │  │ /v1/chat/complete │  │
│  │ users (auth)  │  │                 │  │ /tools/invoke     │  │
│  └───────────────┘  │                 │  └───────────────────┘  │
└─────────────────────┘                 │           │             │
                                        │           ▼             │
                                        │  ┌───────────────────┐  │
                                        │  │   AI AGENTS       │  │
                                        │  │ HBx, Schellie,    │  │
                                        │  │ CX-1, CX-2, etc.  │  │
                                        │  └───────────────────┘  │
                                        └─────────────────────────┘
```

### Data Flow

**Sending a message:**

```
1. User types message in ChatPanel
2. Message saved to Supabase (optimistic)
3. POST /api/chat/send with message + agentId
4. API route adds auth header, forwards to Gateway
5. Gateway routes to correct agent
6. Agent generates response (streamed via SSE)
7. Response saved to Supabase
8. UI updates with streamed text
```

**Activity Feed:**

```
1. Supabase real-time subscription on `messages` table
2. Any new message triggers WebSocket event
3. ActivityFeed component receives event
4. New item animated into feed
5. Click item → opens that agent's chat
```

### Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | Next.js 16 | React framework with App Router |
| UI Components | shadcn/ui | Pre-built accessible components |
| Styling | Tailwind CSS | Utility-first CSS |
| Animations | Framer Motion | Smooth transitions |
| Icons | Lucide React | Consistent icon set |
| Database | Supabase | PostgreSQL + Auth + Realtime |
| Hosting | Vercel | Edge deployment |
| AI Gateway | OpenClaw | Agent orchestration |

---

## Current State

### Completed (Merged to Main)

| PR | Feature | Status |
|----|---------|--------|
| #10 | Agents page with org chart | ✅ Merged |
| #11 | Dashboard name changes | ✅ Merged |
| #12 | Coordination protocol docs | ✅ Merged |
| #14 | Chat interface with Supabase | ✅ Merged |
| #15 | Workflow documentation | ✅ Merged |
| #16 | Gateway integration (API routes) | ✅ Merged |
| #17 | Gateway setup documentation | ✅ Merged |

### In Progress

| PR | Feature | Status |
|----|---------|--------|
| #18 (pending) | Activity Feed + Status Indicators | 🔄 Building |

### Pending / Blocked

| Item | Blocker |
|------|---------|
| Real agent responses | Gateway not connected (needs your help!) |
| File persistence | Gateway file write API not implemented |
| User auth | Supabase auth configured but not enforced |

---

## Gateway Integration

### What Is the Gateway?

The OpenClaw Gateway is a service that:

1. Receives chat messages via HTTP API
2. Routes them to the appropriate AI agent
3. Manages agent sessions and context
4. Streams responses back via SSE
5. Provides tool invocation API

### Why Do We Need It Connected?

Without the gateway, the dashboard can only show mock responses. With it connected:

- Users can have real conversations with agents
- Agents can use their tools (web search, file operations, etc.)
- Conversations have continuity (session management)
- Activity feed shows real activity

### What's Required

#### Step 1: Enable Chat Completions API

Edit OpenClaw config (`~/.openclaw/config.json`):

```json
{
  "gateway": {
    "auth": {
      "mode": "token",
      "token": "YOUR_SECURE_TOKEN_HERE"
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

Then restart:

```bash
openclaw gateway restart
```

#### Step 2: Expose Gateway to Internet

The dashboard runs on Vercel (edge). It needs to reach your gateway. Options:

**Option A: Tailscale (Recommended)**

```bash
# On gateway machine
curl -fsSL https://tailscale.com/install.sh | sh
tailscale up

# Get your Tailscale IP
tailscale ip -4
# Example: 100.64.0.1

# Gateway URL becomes:
# http://100.64.0.1:18789
```

**Why Tailscale?**
- Gateway stays off public internet
- Encrypted tunnel
- No firewall ports to open
- Works behind NAT
- Free for personal use

**Option B: Cloudflare Tunnel**

```bash
# Install cloudflared
brew install cloudflared  # macOS

# Create tunnel
cloudflared tunnel --url http://localhost:18789

# Gives you: https://random-words.trycloudflare.com
```

**Option C: Direct Exposure (Not Recommended)**

```bash
# Open port 18789 to internet
# Use strong token
# Consider IP allowlist
```

#### Step 3: Add Environment Variables to Vercel

Go to: **Vercel Dashboard → Project → Settings → Environment Variables**

Add:

| Variable | Value | Notes |
|----------|-------|-------|
| `OPENCLAW_GATEWAY_URL` | `http://100.x.x.x:18789` | Your Tailscale IP or tunnel URL |
| `OPENCLAW_GATEWAY_TOKEN` | `YOUR_SECURE_TOKEN` | Must match gateway config |

Set for: Production, Preview, Development

Then redeploy.

#### Step 4: Verify

1. Open dashboard
2. Click any agent → Chat tab
3. Should show "Gateway connected" (green indicator)
4. Send a message → Get real response

---

## Security & Risks

### Threat Model

| Threat | Likelihood | Impact | Mitigation |
|--------|------------|--------|------------|
| Token leak | Low | High | Server-side only, env vars |
| Gateway compromise | Low | High | Tailscale, strong auth |
| Prompt injection | Medium | Medium | Agent guardrails |
| Unauthorized access | Low | Medium | Supabase RLS, auth |
| Cost overrun | Medium | Low | Rate limiting |

### Security Controls

**Already Implemented:**

1. **Token never in browser** — API routes proxy all gateway requests
2. **Supabase RLS** — Users can only see their own conversations
3. **Auth required** — Supabase auth on all data access

**Recommended:**

1. **Use Tailscale** — Gateway never exposed to public internet
2. **Strong token** — 32+ character random string
3. **Audit logging** — Monitor gateway logs
4. **Rate limiting** — Prevent abuse

### Risk Assessment

**What could go wrong?**

| Scenario | Consequence | Likelihood | Mitigation |
|----------|-------------|------------|------------|
| Someone gets gateway token | Can send arbitrary prompts to agents | Low (token in env vars) | Rotate token, audit logs |
| Gateway exposed without auth | Anyone can use your agents | Very Low (auth required by default) | Verify config |
| Malicious prompt via dashboard | Agent does something bad | Medium | Agent guardrails, human oversight |
| Supabase credentials leak | Database access | Low (env vars) | Rotate keys, RLS policies |

**Bottom line:** With Tailscale + strong token + server-side only access, risk is low. The main exposure is the gateway token in Vercel env vars, which is standard practice.

---

## Development Workflow

### How We Work

```
1. Lance makes request
2. HBx presents plan with scope
3. Lance says "plan approved"
4. HBx builds on feature branch
5. HBx pushes, waits for Vercel green
6. HBx notifies Lance with:
   - What was built
   - What to test
   - Preview link
7. Lance reviews, gives feedback
8. Iterate until satisfied
9. Lance says "submit PR"
10. HBx creates PR, adds Robs as reviewers
11. Robs review and merge
```

### Key Documents

| Document | Purpose |
|----------|---------|
| `/global-knowledge/WORKFLOW.md` | Delivery process |
| `/global-knowledge/CODE-FACTORY.md` | Coding standards |
| `/global-knowledge/COORDINATION.md` | Multi-dev protocol |
| `/docs/GATEWAY-SETUP.md` | Gateway connection guide |

### Branch Naming

```
hbx/feature-name
```

Examples:
- `hbx/chat-interface`
- `hbx/activity-feed`
- `hbx/gateway-integration`

---

## Roadmap

### Phase 1 ✅ Complete
- Dashboard shell
- Agent org chart
- Basic file viewing

### Phase 2 ✅ Complete
- Chat interface with Supabase
- Gateway API routes
- Streaming responses

### Phase 3 🔄 In Progress
- Activity Feed (live ticker)
- Agent status indicators
- User-specific defaults
- Admin read-only view

### Phase 4 📋 Planned
- Feature Board (agent requests)
- Coding Agent (CX-Code)
- Agent-to-agent communication
- Automated PR workflow

### Phase 5 🔮 Future
- File persistence via gateway
- Agent health monitoring
- Performance analytics
- Auto-approval for low-risk PRs

---

## Technical Details

### Database Schema

```sql
-- Conversations table
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  agent_id TEXT NOT NULL,
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Messages table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT,
  attachments JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Policies
-- Users can only see their own conversations
-- Admins can see all (via service role)
```

### API Routes

**POST /api/chat/send**

```typescript
// Request
{
  message: string,
  agentId: string,
  sessionKey?: string,
  stream?: boolean
}

// Response (streaming)
SSE stream of OpenAI-compatible chunks

// Response (non-streaming)
{
  content: string,
  agentId: string,
  sessionKey: string
}
```

**GET /api/chat/sessions**

```typescript
// Query params
?agentId=string&limit=number

// Response
{
  sessions: Array<{
    sessionKey: string,
    agentId: string,
    lastActivity: string,
    messageCount: number
  }>
}
```

### Component Structure

```
/dashboard/src/
├── app/
│   ├── api/chat/
│   │   ├── send/route.ts
│   │   └── sessions/route.ts
│   └── page.tsx
├── components/
│   ├── activity/
│   │   ├── ActivityFeed.tsx
│   │   ├── ActivityItem.tsx
│   │   └── index.ts
│   ├── agents/
│   │   ├── AgentStatusBadge.tsx
│   │   └── index.ts
│   ├── chat/
│   │   ├── ChatPanel.tsx
│   │   ├── ChatInput.tsx
│   │   ├── MessageBubble.tsx
│   │   └── types.ts
│   └── AgentsPage.tsx
└── lib/
    └── supabase.ts
```

### Environment Variables

```bash
# Supabase (already configured)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# OpenClaw Gateway (needs to be added)
OPENCLAW_GATEWAY_URL=http://your-gateway:18789
OPENCLAW_GATEWAY_TOKEN=your-secure-token
```

---

## Questions?

Reach out to:
- **Lance** — Product direction, approvals
- **HBx** — Technical implementation, this dashboard
- **Robs** — Gateway setup, infrastructure, PR reviews

---

*Document generated by HBx on 2026-02-11. Updates will be committed to repo.*
