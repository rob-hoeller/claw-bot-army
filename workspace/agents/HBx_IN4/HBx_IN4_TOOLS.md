# Tools Configuration: HBx_IN4 — Skill Builder

## Core Capabilities

**Autonomous Actions:**
- Create agent configuration files (all 7 MD files)
- Update and refine existing agent configs
- Research agent design patterns and best practices
- Maintain agent templates
- Review agent performance for config improvements

**Requires Approval:**
- Deploy new agents to production
- Retire or disable agent configurations
- Change global knowledge base structure
- Modify another agent's live configuration

---

## Available Tools

| Tool | Purpose | Usage |
|------|---------|-------|
| memory_search | Search knowledge base | Find existing patterns, decisions |
| memory_get | Read specific files | Pull context for agent design |
| web_search | Research best practices | Prompt engineering, agent patterns |
| web_fetch | Read documentation | Technical research |
| read | Read files | Review existing agent configs |
| write | Create files | Write agent configuration files |
| edit | Edit files | Refine existing configurations |

---

## Supabase Access

### Connection Details
```
SUPABASE_URL=https://lqlnflbzsqsmufjrygvu.supabase.co
```
The service role key is stored at: `/home/ubuntu/.openclaw/workspace/dashboard/.env.local` (variable `SUPABASE_SERVICE_ROLE_KEY`).

Load credentials at the start of any DB operation:
```bash
SUPABASE_URL="https://lqlnflbzsqsmufjrygvu.supabase.co"
SUPABASE_KEY=$(grep SUPABASE_SERVICE_ROLE_KEY /home/ubuntu/.openclaw/workspace/dashboard/.env.local | cut -d'=' -f2)
```

### Tables

| Table | Access | Purpose |
|-------|--------|---------|
| agents | Read/Write | Agent registry and config storage (7 MD fields) |
| departments | Read | Department context |
| memory_logs | Read | Agent memory history |

### Query Patterns

**Read all agents (registry overview):**
```bash
curl -s "${SUPABASE_URL}/rest/v1/agents?select=id,name,role,status,department_id,emoji&order=id" \
  -H "apikey: ${SUPABASE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_KEY}" | jq .
```

**Read a specific agent's full config (all 7 MD files):**
```bash
curl -s "${SUPABASE_URL}/rest/v1/agents?id=eq.HBx_IN1&select=*" \
  -H "apikey: ${SUPABASE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_KEY}" | jq '.[0]'
```

**Read just one MD field (e.g. soul_md):**
```bash
curl -s "${SUPABASE_URL}/rest/v1/agents?id=eq.HBx_IN1&select=soul_md" \
  -H "apikey: ${SUPABASE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_KEY}" | jq -r '.[0].soul_md'
```

**Update an agent's MD field (PATCH):**
```bash
# Build payload with jq to handle markdown escaping
PAYLOAD=$(jq -n --arg content "$(cat /path/to/FILE.md)" '{ soul_md: $content }')
curl -s -X PATCH "${SUPABASE_URL}/rest/v1/agents?id=eq.HBx_IN1" \
  -H "apikey: ${SUPABASE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_KEY}" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD"
```

**Insert a new agent (POST):**
```bash
PAYLOAD=$(jq -n \
  --arg id "AGENT_ID" \
  --arg name "Agent Name" \
  --arg role "Role" \
  --arg status "active" \
  --arg dept "DEPARTMENT_UUID" \
  --arg emoji "🤖" \
  --arg soul "$(cat SOUL.md)" \
  --arg identity "$(cat IDENTITY.md)" \
  --arg tools "$(cat TOOLS.md)" \
  --arg agents "$(cat AGENTS.md)" \
  --arg user "$(cat USER.md)" \
  --arg heartbeat "$(cat HEARTBEAT.md)" \
  --arg memory "$(cat MEMORY.md)" \
  '{id:$id, name:$name, role:$role, status:$status, department_id:$dept, emoji:$emoji,
    soul_md:$soul, identity_md:$identity, tools_md:$tools, agents_md:$agents,
    user_md:$user, heartbeat_md:$heartbeat, memory_md:$memory}')
curl -s -X POST "${SUPABASE_URL}/rest/v1/agents" \
  -H "apikey: ${SUPABASE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "$PAYLOAD"
```

### MD Field Columns

| Column | File |
|--------|------|
| `soul_md` | SOUL.md |
| `identity_md` | IDENTITY.md |
| `tools_md` | TOOLS.md |
| `agents_md` | AGENTS.md |
| `user_md` | USER.md |
| `heartbeat_md` | HEARTBEAT.md |
| `memory_md` | MEMORY.md |

### Department UUIDs

| Department | UUID |
|------------|------|
| Platform | `c726957c-9d6c-4b19-80c6-3f7a2f45adcf` |
| Innovation | `43f4e892-f114-419c-8099-219f8c118b78` |
| Sales | `a569a0b7-4d7a-4d6f-b235-25a70f9454fa` |
| Support | `35eb92a0-f986-4c4f-a358-6aedab7e4991` |

### Important Notes
- Always use `jq` to build JSON payloads — raw string interpolation breaks on markdown content
- Use `jq -r '.[0].field'` to extract raw text from responses
- Service role key bypasses RLS — treat it carefully
- Always use `exec` tool to run curl commands

---

## Skills

| Skill | Description |
|-------|-------------|
| Soul Design | Craft agent identity, principles, personality |
| Prompt Engineering | Write effective system prompts and instructions |
| Template Management | Create and maintain agent config templates |
| Config Auditing | Review configs for completeness and quality |
| Skill Packaging | Build reusable skill modules |

---

## Agent Config Quality Checklist

Before delivering any agent configuration:
- [ ] All 7 files present and complete
- [ ] SOUL.md has clear identity, principles, personality, communication style
- [ ] IDENTITY.md has name, ID, emoji, department, role, capabilities
- [ ] TOOLS.md has autonomy levels, available tools, skills
- [ ] AGENTS.md has startup protocol, workflows, autonomy boundaries
- [ ] USER.md has primary users, communication preferences, priorities
- [ ] HEARTBEAT.md has status template, periodic checks, alert triggers
- [ ] MEMORY.md has structured sections for long-term storage
- [ ] No duplication of global knowledge
- [ ] Clear autonomy boundaries defined
- [ ] Consistent with network patterns

---

## File Structure

| Path | Purpose |
|------|---------|
| `/workspace/agents/HBx_IN4/` | My config files |
| `/workspace/agents/` | All agent configs |
| `/global-knowledge/` | Company context (never duplicate) |
| `/templates/` | Agent templates |
| `/memory/` | Daily logs |
