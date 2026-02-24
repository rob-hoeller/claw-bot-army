# OpenAI Responses Session Parallelism: Diagnosis & Fix

**Date:** 2026-02-23  
**OpenClaw Version:** 2026.2.15  
**Status:** Safe to increase concurrency — no code changes needed

---

## Executive Summary

After thorough analysis of the OpenClaw v2026.2.15 codebase, **the parallel sub-agent architecture is already safe for concurrent execution**. The "session corruption" issue has been addressed through multiple fixes in recent versions. The current `maxConcurrent=1` / `subagents.maxConcurrent=1` settings are overly conservative; the system defaults are 4 and 8 respectively.

---

## Root Cause Analysis

### What Was the Problem?

The OpenAI Responses API requires `store=true` to maintain server-side conversation state across turns. In older OpenClaw versions, this flag was not being set, causing OpenAI's server-side prompt cache to not persist between turns. Under parallelism, this created inconsistent behavior that appeared as "session corruption."

**Key fix already applied in v2026.2.15:**
> `Agents/OpenAI: force store=true for direct OpenAI Responses/Codex runs to preserve multi-turn server-side conversation state` (#16803)

This is implemented in `createOpenAIResponsesStoreWrapper()` which wraps every agent's `streamFn` and injects `store=true` for direct OpenAI Responses API calls.

### Why Parallelism Is Safe Now

The codebase has **5 layers of concurrency protection**:

| Layer | Mechanism | Scope |
|-------|-----------|-------|
| 1. Per-session lane | `session:<key>` lane, always maxConcurrent=1 | Serializes all work on the same session |
| 2. Global lane | `main`/`subagent`/`cron` lanes | Controls total parallel runs |
| 3. File write lock | `acquireSessionWriteLock()` — exclusive file lock with stale detection | Prevents concurrent .jsonl writes |
| 4. Session store lock | `withSessionStoreLock()` + atomic write (tmp+rename) | Protects shared session metadata |
| 5. Session isolation | Each sub-agent gets unique session key, file, and UUID | No shared state between sub-agents |

**The critical insight:** Each sub-agent has its own:
- Session key (e.g., `agent:hbx:subagent:<uuid>`)
- Session file (separate `.jsonl`)
- Session lane (own `session:agent:hbx:subagent:<uuid>` lane)
- `prompt_cache_key` (unique session UUID sent to OpenAI)

10 parallel sub-agents use 10 independent sessions with zero shared mutable state. The per-session lane ensures each session is individually serialized, while the global `subagent` lane controls how many run simultaneously.

### Double-Queue Pattern

```
runEmbeddedPiAgent():
  enqueueSession(() =>          // Hold session lane slot (max 1 per session)
    enqueueGlobal(async () =>   // Hold global lane slot (configurable)
      { ...actual agent work... }
    )
  )
```

This pattern guarantees:
1. Same-session work is strictly serialized (session lane)
2. Total system load is bounded (global lane)
3. Different sessions run in parallel up to the global limit

---

## Fix: Configuration Change

No code changes are needed. Increase the concurrency settings:

```bash
# Step 1: Allow 10 parallel sub-agents
openclaw config set agents.defaults.subagents.maxConcurrent 10

# Step 2: Allow sufficient main lane concurrency
# (needed for announce processing and parent session work)
openclaw config set agents.defaults.maxConcurrent 4

# Step 3: Restart gateway to apply
openclaw gateway restart
```

### Recommended Gradual Rollout

To verify stability before going to 10:

```bash
# Phase 1: Test with 3 sub-agents
openclaw config set agents.defaults.subagents.maxConcurrent 3
openclaw config set agents.defaults.maxConcurrent 2
openclaw gateway restart
# Monitor for 24h

# Phase 2: Scale to 6
openclaw config set agents.defaults.subagents.maxConcurrent 6
openclaw config set agents.defaults.maxConcurrent 3
openclaw gateway restart
# Monitor for 24h

# Phase 3: Full 10
openclaw config set agents.defaults.subagents.maxConcurrent 10
openclaw config set agents.defaults.maxConcurrent 4
openclaw gateway restart
```

---

## Verification Steps

### 1. Confirm `store=true` is active
```bash
# Enable debug logging temporarily
openclaw config set diagnostics.level debug
openclaw gateway restart

# Trigger an agent run, then check logs for:
grep "store" ~/.openclaw/logs/*.log
# Should see store=true in OpenAI API payloads
```

### 2. Stress test with parallel sub-agents
Send a message to the bot requesting it spawn multiple sub-agents:
```
Spawn 3 sub-agents in parallel: one to search for "OpenClaw", one to read AGENTS.md, and one to list files in the workspace. Report all results.
```

### 3. Monitor session integrity
```bash
# Check for session repair events (should be zero)
grep "session file repair" ~/.openclaw/logs/*.log

# Check for stuck sessions
grep "stuck session" ~/.openclaw/logs/*.log

# Check lane health
grep "lane wait exceeded" ~/.openclaw/logs/*.log
```

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| OpenAI rate limits with 10 parallel calls | Medium | Sub-agents retry with backoff | OpenClaw has built-in failover + rate limit handling |
| Memory usage increase | Low | 10 concurrent contexts in memory | Monitor with `openclaw status` |
| Workspace file conflicts (sub-agents editing same files) | Medium | Tool-level conflicts, not session corruption | Use separate workspace dirs per sub-agent or coordinate via parent |
| Token cost increase | High (by design) | 10x parallel token consumption | Expected; monitor usage with `openclaw usage` |

### What This Does NOT Fix
- Sub-agents sharing the same workspace can still have file-level conflicts (e.g., two sub-agents trying to edit the same file). This is a coordination issue, not a session corruption issue.
- OpenAI API rate limits may throttle parallel requests. OpenClaw handles this with automatic retry/backoff.

---

## Architecture Notes for Future Reference

- **Lane defaults:** main=4, subagent=8, cron=1
- **Per-session lane:** Always maxConcurrent=1 (hardcoded in lane creation, not configurable)
- **SessionManager:** Uses synchronous `appendFileSync` for JSONL writes — safe within single-threaded per-session lane
- **OpenAI Responses API:** Does NOT use `previous_response_id` chaining; sends full history via `input` parameter each time
- **Prompt caching:** Uses `prompt_cache_key` = session UUID for OpenAI server-side caching
